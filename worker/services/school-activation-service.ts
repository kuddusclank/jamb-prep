import type { RequestDbContext } from '../api/db-context';

/**
 * The Worker DB client runs with fetch_types disabled, so JS arrays cannot be bound as
 * Postgres array parameters. UUID lists are sent as one comma-separated text parameter
 * and split inside SQL. Callers must pass UUIDs read from the database or validated upstream.
 */
function uuidListCsv(ids: string[]): string {
  return ids.filter((id) => /^[0-9a-fA-F-]{36}$/.test(id)).join(',');
}

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

  // 0. Serialize concurrent verify/webhook callers on the parent school_orders row
  await dbCtx.sql`
    SELECT id FROM school_orders WHERE id = ${orderId}::uuid FOR UPDATE
  `;

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
  const hasTargetedSelection = !!targetedIds && targetedIds.length > 0;

  if (hasTargetedSelection) {
    // The admin picked exact candidates: licence only those, never anyone else.
    const targetedRows = await dbCtx.sql<Array<{ student_user_id: string }>>`
      SELECT student_user_id 
      FROM school_students
      WHERE school_id = ${schoolId}::uuid
        AND id IN (SELECT unnest(string_to_array(${uuidListCsv(targetedIds)}::text, ',')::uuid[]))
    `;
    for (const row of targetedRows) {
      if (row.student_user_id && !resolvedStudentUserIds.includes(row.student_user_id)) {
        resolvedStudentUserIds.push(row.student_user_id);
      }
    }
  } else {
    // Legacy orders without a selection: licence the oldest unlicensed candidates up to the paid count.
    const fallbackRows = await dbCtx.sql<Array<{ student_user_id: string }>>`
      SELECT student_user_id 
      FROM school_students
      WHERE school_id = ${schoolId}::uuid
        AND license_status != 'active'
      ORDER BY created_at ASC
      LIMIT ${studentCount}
    `;
    for (const row of fallbackRows) {
      if (row.student_user_id && !resolvedStudentUserIds.includes(row.student_user_id)) {
        resolvedStudentUserIds.push(row.student_user_id);
      }
    }
  }

  if (resolvedStudentUserIds.length === 0) {
    // No students enrolled yet in this school: order remains valid for future assignment
    return { queuedCount: 0, totalAssigned: 0 };
  }

  // 3. Bulk insert jobs into school_activation_jobs in a single set-based query
  const targetUserCsv = uuidListCsv(resolvedStudentUserIds);
  if (targetUserCsv) {
    await dbCtx.sql`
      INSERT INTO school_activation_jobs (
        order_id,
        student_user_id,
        duration_months,
        status,
        retry_count
      )
      SELECT
        ${orderId}::uuid,
        u_id,
        ${durationMonths},
        'queued',
        0
      FROM unnest(string_to_array(${targetUserCsv}::text, ',')::uuid[]) AS u_id
      ON CONFLICT (order_id, student_user_id) DO NOTHING
    `;
  }

  return {
    queuedCount: resolvedStudentUserIds.length,
    totalAssigned: resolvedStudentUserIds.length,
  };
}

/**
 * Process queued activation jobs in batches (default 100 items per chunk),
 * looping until all eligible jobs for the order are drained so cohorts > 50
 * students activate completely in a single verification or webhook pass.
 */
export async function processActivationBatch(
  dbCtx: RequestDbContext,
  orderId: string,
  batchSize: number = 100
): Promise<ActivationProgress> {
  const now = new Date();

  // 1. Fetch order details to know duration
  const orderRows = await dbCtx.sql<Array<{
    id: string;
    school_id: string;
    duration_months: number;
    status: string;
  }>>`
    SELECT id, school_id, duration_months, status
    FROM school_orders
    WHERE id = ${orderId}::uuid
    LIMIT 1
  `;

  if (!orderRows[0]) {
    throw new Error(`Order ${orderId} not found.`);
  }

  const order = orderRows[0];
  const durationMonths = order.duration_months || 3;
  const addedDays = durationMonths * 30;
  const expiryDate = new Date(now.getTime() + addedDays * 24 * 60 * 60 * 1000);
  const chunkLimit = Math.max(1, Math.min(250, batchSize));
  const maxChunks = 40; // Supports up to 10,000 students safely

  // 2. Drain all queued/retryable chunks until none remain
  for (let chunkIndex = 0; chunkIndex < maxChunks; chunkIndex++) {
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
      LIMIT ${chunkLimit}
    `;

    if (pendingJobs.length === 0) {
      break;
    }

    const jobIds = pendingJobs.map((j) => j.id);
    const userIds = pendingJobs.map((j) => j.student_user_id);
    const jobIdsCsv = uuidListCsv(jobIds);
    const userIdsCsv = uuidListCsv(userIds);

    // Mark current chunk as processing
    await dbCtx.sql`
      UPDATE school_activation_jobs
      SET status = 'processing', updated_at = ${now.toISOString()}::timestamptz
      WHERE id IN (SELECT unnest(string_to_array(${jobIdsCsv}::text, ',')::uuid[]))
    `;

    try {
      // Step A: Update school_students license status scoped to this school — extend existing future expiry if already active
      await dbCtx.sql`
        UPDATE school_students
        SET license_status = 'active',
            license_expires_at = GREATEST(
              COALESCE(license_expires_at, ${now.toISOString()}::timestamptz),
              ${now.toISOString()}::timestamptz
            ) + (${addedDays} * interval '1 day')
        WHERE school_id = ${order.school_id}::uuid
          AND student_user_id IN (SELECT unnest(string_to_array(${userIdsCsv}::text, ',')::uuid[]))
      `;

      // Step B: Bulk upsert subscription_entitlements for all students in chunk — extend existing future expiry if already active
      await dbCtx.sql`
        INSERT INTO subscription_entitlements (
          user_id,
          plan_code,
          expires_at,
          auto_renew,
          updated_at
        )
        SELECT
          u_id,
          'SCHOOL_INSTITUTIONAL_1500',
          ${expiryDate.toISOString()}::timestamptz,
          false,
          ${now.toISOString()}::timestamptz
        FROM unnest(string_to_array(${userIdsCsv}::text, ',')::uuid[]) AS u_id
        ON CONFLICT (user_id) DO UPDATE SET
          plan_code = 'SCHOOL_INSTITUTIONAL_1500',
          expires_at = GREATEST(
            COALESCE(subscription_entitlements.expires_at, ${now.toISOString()}::timestamptz),
            ${now.toISOString()}::timestamptz
          ) + (${addedDays} * interval '1 day'),
          auto_renew = false,
          updated_at = ${now.toISOString()}::timestamptz
      `;

      // Step C: Mark jobs as completed
      await dbCtx.sql`
        UPDATE school_activation_jobs
        SET status = 'completed',
            updated_at = ${now.toISOString()}::timestamptz
        WHERE id IN (SELECT unnest(string_to_array(${jobIdsCsv}::text, ',')::uuid[]))
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
        WHERE id IN (SELECT unnest(string_to_array(${jobIdsCsv}::text, ',')::uuid[]))
      `;
      break;
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
