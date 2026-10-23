import type { RequestDbContext } from '../api/db-context';

export interface EnqueueActivationParams {
  orderId: string;
  schoolId: string;
  durationMonths: number;
  studentCount: number;
  targetedIds?: string[];
}

export interface ActivationProgress {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  queuedJobs: number;
  processingJobs: number;
  orderStatus: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Enqueue individual candidate activation jobs for a settled cohort order.
 * Idempotently resolves student user IDs and inserts into school_activation_jobs.
 */
export async function enqueueCohortActivation(
  dbCtx: RequestDbContext,
  params: EnqueueActivationParams
): Promise<{ queuedCount: number; totalAssigned: number }> {
  const { orderId, schoolId, durationMonths, studentCount, targetedIds } = params;

  // 1. Check if jobs are already enqueued for this order
  const existingJobs = await dbCtx.sql<Array<{ id: string }>>`
    SELECT id FROM school_activation_jobs WHERE order_id = ${orderId}::uuid
  `;

  if (existingJobs.length > 0) {
    return {
      queuedCount: existingJobs.length,
      totalAssigned: existingJobs.length,
    };
  }

  // 2. Resolve eligible student records from school_students
  const resolvedStudentUserIds: string[] = [];

  if (targetedIds && targetedIds.length > 0) {
    const targetedRows = await dbCtx.sql<Array<{ student_user_id: string }>>`
      SELECT student_user_id 
      FROM school_students
      WHERE school_id = ${schoolId}::uuid
        AND id = ANY(${targetedIds}::uuid[])
    `;
    for (const row of targetedRows) {
      if (row.student_user_id && !resolvedStudentUserIds.includes(row.student_user_id)) {
        resolvedStudentUserIds.push(row.student_user_id);
      }
    }
  }

  // If fewer than studentCount, fill with inactive students from the school
  if (resolvedStudentUserIds.length < studentCount) {
    const needed = studentCount - resolvedStudentUserIds.length;
    const fallbackRows = await dbCtx.sql<Array<{ student_user_id: string }>>`
      SELECT student_user_id 
      FROM school_students
      WHERE school_id = ${schoolId}::uuid
        AND license_status != 'active'
        ${resolvedStudentUserIds.length > 0 ? dbCtx.sql`AND student_user_id != ALL(${resolvedStudentUserIds}::uuid[])` : dbCtx.sql``}
      ORDER BY created_at ASC
      LIMIT ${needed}
    `;
    for (const row of fallbackRows) {
      if (row.student_user_id && !resolvedStudentUserIds.includes(row.student_user_id)) {
        resolvedStudentUserIds.push(row.student_user_id);
      }
    }
  }

  // If still fewer than studentCount (e.g. fresh school without students enrolled yet),
  // pull any enrolled student regardless of status to reach the paid capacity
  if (resolvedStudentUserIds.length < studentCount) {
    const remaining = studentCount - resolvedStudentUserIds.length;
    const anyRows = await dbCtx.sql<Array<{ student_user_id: string }>>`
      SELECT student_user_id 
      FROM school_students
      WHERE school_id = ${schoolId}::uuid
        ${resolvedStudentUserIds.length > 0 ? dbCtx.sql`AND student_user_id != ALL(${resolvedStudentUserIds}::uuid[])` : dbCtx.sql``}
      ORDER BY created_at ASC
      LIMIT ${remaining}
    `;
    for (const row of anyRows) {
      if (row.student_user_id && !resolvedStudentUserIds.includes(row.student_user_id)) {
        resolvedStudentUserIds.push(row.student_user_id);
      }
    }
  }

  if (resolvedStudentUserIds.length === 0) {
    // No students enrolled yet in this school: order remains valid for future assignment
    return { queuedCount: 0, totalAssigned: 0 };
  }

  // 3. Bulk insert jobs into school_activation_jobs
  for (const studentUserId of resolvedStudentUserIds) {
    await dbCtx.sql`
      INSERT INTO school_activation_jobs (
        order_id,
        student_user_id,
        duration_months,
        status,
        retry_count
      )
      VALUES (
        ${orderId}::uuid,
        ${studentUserId}::uuid,
        ${durationMonths},
        'queued',
        0
      )
      ON CONFLICT DO NOTHING
    `;
  }

  return {
    queuedCount: resolvedStudentUserIds.length,
    totalAssigned: resolvedStudentUserIds.length,
  };
}

/**
 * Process a batch/chunk of queued activation jobs (default 50 items per chunk).
 * Updates student licences and platform entitlements atomically.
 */
export async function processActivationBatch(
  dbCtx: RequestDbContext,
  orderId: string,
  batchSize: number = 50
): Promise<ActivationProgress> {
  const now = new Date();

  // 1. Fetch order details to know duration
  const orderRows = await dbCtx.sql<Array<{
    id: string;
    duration_months: number;
    status: string;
  }>>`
    SELECT id, duration_months, status
    FROM school_orders
    WHERE id = ${orderId}::uuid
    LIMIT 1
  `;

  if (!orderRows[0]) {
    throw new Error(`Order ${orderId} not found.`);
  }

  const order = orderRows[0];
  const durationMonths = order.duration_months || 3;
  const expiryDate = new Date(now.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);

  // 2. Fetch the next chunk of queued or failed jobs (up to 3 retries)
  const pendingJobs = await dbCtx.sql<Array<{
    id: string;
    student_user_id: string;
    retry_count: number;
  }>>`
    SELECT id, student_user_id, retry_count
    FROM school_activation_jobs
    WHERE order_id = ${orderId}::uuid
      AND status IN ('queued', 'failed')
      AND retry_count < 3
    ORDER BY created_at ASC
    LIMIT ${batchSize}
  `;

  if (pendingJobs.length > 0) {
    const jobIds = pendingJobs.map((j) => j.id);
    const userIds = pendingJobs.map((j) => j.student_user_id);

    // Mark current chunk as processing
    await dbCtx.sql`
      UPDATE school_activation_jobs
      SET status = 'processing', updated_at = ${now.toISOString()}::timestamptz
      WHERE id = ANY(${jobIds}::uuid[])
    `;

    try {
      // Step A: Update school_students license status
      await dbCtx.sql`
        UPDATE school_students
        SET license_status = 'active',
            license_expires_at = ${expiryDate.toISOString()}::timestamptz
        WHERE student_user_id = ANY(${userIds}::uuid[])
      `;

      // Step B: Bulk upsert subscription_entitlements for each student
      for (const userId of userIds) {
        await dbCtx.sql`
          INSERT INTO subscription_entitlements (
            user_id,
            plan_code,
            expires_at,
            auto_renew,
            updated_at
          )
          VALUES (
            ${userId}::uuid,
            'SCHOOL_INSTITUTIONAL_1500',
            ${expiryDate.toISOString()}::timestamptz,
            false,
            ${now.toISOString()}::timestamptz
          )
          ON CONFLICT (user_id) DO UPDATE SET
            plan_code = 'SCHOOL_INSTITUTIONAL_1500',
            expires_at = ${expiryDate.toISOString()}::timestamptz,
            auto_renew = false,
            updated_at = ${now.toISOString()}::timestamptz
        `;
      }

      // Step C: Mark jobs as completed
      await dbCtx.sql`
        UPDATE school_activation_jobs
        SET status = 'completed',
            updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ANY(${jobIds}::uuid[])
      `;
    } catch (batchErr) {
      const errMsg = batchErr instanceof Error ? batchErr.message : String(batchErr);
      // Mark chunk failed and increment retry_count
      await dbCtx.sql`
        UPDATE school_activation_jobs
        SET status = 'failed',
            retry_count = retry_count + 1,
            last_error = ${errMsg},
            updated_at = ${now.toISOString()}::timestamptz
        WHERE id = ANY(${jobIds}::uuid[])
      `;
    }
  }

  // 3. Inspect aggregate progress for this order
  const counts = await dbCtx.sql<Array<{
    status: string;
    count: number;
  }>>`
    SELECT status, count(*)::int as count
    FROM school_activation_jobs
    WHERE order_id = ${orderId}::uuid
    GROUP BY status
  `;

  let totalJobs = 0;
  let completedJobs = 0;
  let failedJobs = 0;
  let queuedJobs = 0;
  let processingJobs = 0;

  for (const c of counts) {
    totalJobs += c.count;
    if (c.status === 'completed') completedJobs += c.count;
    if (c.status === 'failed') failedJobs += c.count;
    if (c.status === 'queued') queuedJobs += c.count;
    if (c.status === 'processing') processingJobs += c.count;
  }

  // 4. Update order status based on activation reconciliation
  let finalOrderStatus: 'pending' | 'processing' | 'completed' | 'failed' = 'processing';

  if (totalJobs > 0 && completedJobs >= totalJobs) {
    finalOrderStatus = 'completed';
    await dbCtx.sql`
      UPDATE school_orders
      SET status = 'completed',
          settled_at = COALESCE(settled_at, ${now.toISOString()}::timestamptz)
      WHERE id = ${orderId}::uuid
    `;
  } else if (totalJobs > 0 && failedJobs === totalJobs) {
    finalOrderStatus = 'failed';
  } else {
    finalOrderStatus = 'processing';
    await dbCtx.sql`
      UPDATE school_orders
      SET status = 'processing'
      WHERE id = ${orderId}::uuid AND status = 'pending'
    `;
  }

  return {
    totalJobs,
    completedJobs,
    failedJobs,
    queuedJobs,
    processingJobs,
    orderStatus: finalOrderStatus,
  };
}
