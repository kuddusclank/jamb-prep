/**
 * Portable Subscription, Pricing, and Atomic Payment Settlement Service (T03)
 *
 * Extracted from:
 * - src/lib/subscription.ts
 * - src/lib/payment-settlement.ts
 * - src/app/actions/payment.ts
 *
 * Enforces:
 * - Zero Next/React/OpenNext imports.
 * - Explicit actor ownership checks.
 * - No Promise.race silent timeout fallback that masks database errors.
 * - Atomic committed transaction for payment settlement + single-use referral reward redemption.
 */

import { assertActorOwnership } from '../api/authorization';
import { RequestDbContext, SqlTagExecutor } from '../api/db-context';
import { ApiError } from '../api/errors';

export interface SubscriptionStatus {
  isPremium: boolean;
  expiresAt: string | null;
  daysRemaining: number;
  planCode: string | null;
  autoRenew: boolean;
  cancelledAt: string | null;
}

export interface PaystackMetadata {
  subscriptionCode?: string | null;
  emailToken?: string | null;
  authorizationCode?: string | null;
  customerCode?: string | null;
}

export interface CheckoutPricing {
  originalAmountKobo: number;
  finalAmountKobo: number;
  originalAmountNaira: number;
  finalAmountNaira: number;
  hasDiscount: boolean;
  rewardId: string | null;
  discountReason: string | null;
  userEmail: string;
  isAlreadyPremium: boolean;
  currentExpiresAt: string | null;
}

export const BASE_SUBSCRIPTION_AMOUNT_KOBO = 100_000; // ₦1,000
export const DISCOUNTED_SUBSCRIPTION_AMOUNT_KOBO = 50_000; // ₦500

/**
 * Fetches authoritative subscription status for a specific userId.
 */
export async function getUserSubscriptionStatus(
  sql: SqlTagExecutor,
  userId: string,
  now: Date = new Date()
): Promise<SubscriptionStatus> {
  const rows = await sql<
    Array<{
      expires_at: string | Date;
      plan_code: string | null;
      auto_renew: boolean | null;
      cancelled_at: string | Date | null;
    }>
  >`
    SELECT expires_at, plan_code, auto_renew, cancelled_at
    FROM subscription_entitlements
    WHERE user_id = ${userId}::uuid
    LIMIT 1
  `;

  const entitlement = rows[0];
  if (!entitlement) {
    return {
      isPremium: false,
      expiresAt: null,
      daysRemaining: 0,
      planCode: null,
      autoRenew: false,
      cancelledAt: null,
    };
  }

  const expiry = new Date(entitlement.expires_at);
  const isPremium = expiry.getTime() > now.getTime();
  const msRemaining = Math.max(0, expiry.getTime() - now.getTime());
  const daysRemaining = isPremium ? Math.ceil(msRemaining / (1000 * 60 * 60 * 24)) : 0;

  return {
    isPremium,
    expiresAt: expiry.toISOString(),
    daysRemaining,
    planCode: entitlement.plan_code,
    autoRenew: isPremium ? (entitlement.auto_renew ?? true) : false,
    cancelledAt: entitlement.cancelled_at ? new Date(entitlement.cancelled_at).toISOString() : null,
  };
}

/**
 * Computes checkout pricing and checks first-payment 50% referral discount eligibility.
 * Enforces PRD Feature 7: referral discount is strictly redeemable BEFORE or ON the first paid subscription.
 */
export async function getCheckoutPricing(
  sql: SqlTagExecutor,
  userId: string,
  userEmail: string,
  now: Date = new Date()
): Promise<CheckoutPricing> {
  const [subStatus, rewardRows, priorSuccessRows] = await Promise.all([
    getUserSubscriptionStatus(sql, userId, now),
    sql<Array<{ id: string }>>`
      SELECT id
      FROM referral_rewards
      WHERE user_id = ${userId}::uuid
        AND status = 'available' AND reward_type='FIRST_MONTH_50_PERCENT'
      ORDER BY created_at ASC
      LIMIT 1
    `,
    sql<Array<{ id: string }>>`
      SELECT id
      FROM payment_transactions
      WHERE user_id = ${userId}::uuid
        AND status = 'success'
      LIMIT 1
    `,
  ]);

  const hasPriorPaidSubscription = priorSuccessRows.length > 0;
  const availableReward = !hasPriorPaidSubscription ? rewardRows[0] ?? null : null;
  const hasDiscount = Boolean(availableReward);
  const finalAmountKobo = hasDiscount
    ? DISCOUNTED_SUBSCRIPTION_AMOUNT_KOBO
    : BASE_SUBSCRIPTION_AMOUNT_KOBO;

  return {
    originalAmountKobo: BASE_SUBSCRIPTION_AMOUNT_KOBO,
    finalAmountKobo,
    originalAmountNaira: BASE_SUBSCRIPTION_AMOUNT_KOBO / 100,
    finalAmountNaira: finalAmountKobo / 100,
    hasDiscount,
    rewardId: availableReward ? availableReward.id : null,
    discountReason: hasDiscount ? '50% Referral Milestone (2 Friends Completed Diagnostic)' : null,
    userEmail,
    isAlreadyPremium: subStatus.isPremium,
    currentExpiresAt: subStatus.expiresAt,
  };
}

/**
 * Atomically settles a verified Paystack transaction inside a committed database transaction.
 * - Locks `payment_transactions` row with FOR UPDATE.
 * - Enforces optional `expectedUserId` ownership.
 * - Idempotently returns existing entitlement if transaction was already settled (`status === 'success'`).
 * - Atomically consumes any attached referral reward (`status = 'available' -> 'redeemed'`).
 * - Extends `subscription_entitlements.expires_at = GREATEST(expires_at, now) + 30 days`.
 */
export async function settleVerifiedPaymentAtomic(
  dbCtx: RequestDbContext,
  params: {
    reference: string;
    paystackMeta?: PaystackMetadata;
    expectedUserId?: string;
    days?: number;
    now?: Date;
  }
): Promise<{
  expiresAt: string;
  amountKobo: number;
  alreadyProcessed: boolean;
}> {
  const now = params.now ?? new Date();
  const nowIso = now.toISOString();
  const days = params.days ?? 30;
  const meta = params.paystackMeta ?? {};

  return await dbCtx.runSerializableTransaction(async (tx) => {
    await tx`SELECT p.id FROM profiles p JOIN payment_transactions pt ON pt.user_id=p.id WHERE pt.reference=${params.reference} FOR UPDATE OF p`;
    const txnRows = await tx<
      Array<{
        id: string;
        user_id: string;
        reference: string;
        amount_kobo: number;
        status: string;
        paystack_payload: Record<string, unknown> | string | null;
      }>
    >`
      SELECT id, user_id, reference, amount_kobo, status, paystack_payload
      FROM payment_transactions
      WHERE reference = ${params.reference}
      FOR UPDATE
    `;

    const txn = txnRows[0];
    if (!txn) {
      throw new ApiError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Payment transaction record not found.',
      });
    }

    if (params.expectedUserId) {
      assertActorOwnership({ userId: params.expectedUserId }, txn.user_id);
    }

    if (txn.status === 'success') {
      const existingSub = await getUserSubscriptionStatus(tx, txn.user_id, now);
      return {
        expiresAt: existingSub.expiresAt ?? nowIso,
        amountKobo: txn.amount_kobo,
        alreadyProcessed: true,
      };
    }

    let payloadObj: Record<string, unknown> = {};
    if (txn.paystack_payload && typeof txn.paystack_payload === 'object') {
      payloadObj = txn.paystack_payload as Record<string, unknown>;
    } else if (typeof txn.paystack_payload === 'string') {
      try {
        payloadObj = JSON.parse(txn.paystack_payload) as Record<string, unknown>;
      } catch {
        payloadObj = {};
      }
    }

    const rewardId = typeof payloadObj.rewardId === 'string' ? payloadObj.rewardId : null;
    if (txn.amount_kobo !== BASE_SUBSCRIPTION_AMOUNT_KOBO && txn.amount_kobo !== DISCOUNTED_SUBSCRIPTION_AMOUNT_KOBO) throw new ApiError({status:409,code:'CONFLICT',message:'Unexpected subscription payment amount.'});
    if(txn.amount_kobo===DISCOUNTED_SUBSCRIPTION_AMOUNT_KOBO) {
      const prior=await tx`SELECT id FROM payment_transactions WHERE user_id=${txn.user_id}::uuid AND status='success' AND id<>${txn.id}::uuid LIMIT 1`;
      if(!rewardId||prior.length) throw new ApiError({status:409,code:'CONFLICT',message:'This first-payment discount is no longer eligible.'});
    }
    if (rewardId) {
      const redeemedRows = await tx<Array<{ id: string }>>`
        UPDATE referral_rewards
        SET
          status = 'redeemed',
          redeemed_at = ${nowIso}::timestamptz
        WHERE id = ${rewardId}::uuid
          AND user_id = ${txn.user_id}::uuid
          AND status = 'available'
        RETURNING id
      `;

      if (redeemedRows.length === 0 && txn.amount_kobo < BASE_SUBSCRIPTION_AMOUNT_KOBO) {
        throw new ApiError({
          status: 409,
          code: 'CONFLICT',
          message: 'Referral discount reward was already redeemed or is no longer available.',
        });
      }
    }

    if(rewardId&&txn.amount_kobo===DISCOUNTED_SUBSCRIPTION_AMOUNT_KOBO) await tx`INSERT INTO subscription_discounts (user_id,reward_id,transaction_id,original_amount_kobo,discounted_amount_kobo) VALUES (${txn.user_id}::uuid,${rewardId}::uuid,${txn.id}::uuid,${BASE_SUBSCRIPTION_AMOUNT_KOBO},${txn.amount_kobo}) ON CONFLICT(transaction_id) DO NOTHING`;
    const planCode =
      txn.amount_kobo === DISCOUNTED_SUBSCRIPTION_AMOUNT_KOBO
        ? 'MONTHLY_500_REFERRAL'
        : 'MONTHLY_1000';

    const existingEntRows = await tx<Array<{ expires_at: string | Date }>>`
      SELECT expires_at
      FROM subscription_entitlements
      WHERE user_id = ${txn.user_id}::uuid
      FOR UPDATE
    `;

    const existingExpiryMs = existingEntRows[0]
      ? new Date(existingEntRows[0].expires_at).getTime()
      : 0;
    const baseMs = Math.max(now.getTime(), existingExpiryMs);
    const newExpiresIso = new Date(baseMs + days * 24 * 60 * 60 * 1000).toISOString();

    await tx`
      INSERT INTO subscription_entitlements (
        user_id,
        plan_code,
        expires_at,
        auto_renew,
        cancelled_at,
        paystack_subscription_code,
        paystack_email_token,
        paystack_authorization_code,
        paystack_customer_code,
        updated_at
      )
      VALUES (
        ${txn.user_id}::uuid,
        ${planCode},
        ${newExpiresIso}::timestamptz,
        ${Boolean(meta.subscriptionCode)},
        NULL,
        ${meta.subscriptionCode ?? null},
        ${meta.emailToken ?? null},
        ${meta.authorizationCode ?? null},
        ${meta.customerCode ?? null},
        ${nowIso}::timestamptz
      )
      ON CONFLICT (user_id) DO UPDATE
      SET
        plan_code = EXCLUDED.plan_code,
        expires_at = EXCLUDED.expires_at,
        auto_renew = CASE WHEN EXCLUDED.paystack_subscription_code IS NOT NULL THEN TRUE ELSE subscription_entitlements.auto_renew END,
        cancelled_at = NULL,
        paystack_subscription_code = COALESCE(EXCLUDED.paystack_subscription_code, subscription_entitlements.paystack_subscription_code),
        paystack_email_token = COALESCE(EXCLUDED.paystack_email_token, subscription_entitlements.paystack_email_token),
        paystack_authorization_code = COALESCE(EXCLUDED.paystack_authorization_code, subscription_entitlements.paystack_authorization_code),
        paystack_customer_code = COALESCE(EXCLUDED.paystack_customer_code, subscription_entitlements.paystack_customer_code),
        updated_at = EXCLUDED.updated_at
    `;

    const mergedPayload = JSON.stringify({
      ...payloadObj,
      ...(meta.authorizationCode ? { authorizationCode: meta.authorizationCode } : {}),
      ...(meta.customerCode ? { customerCode: meta.customerCode } : {}),
      ...(meta.subscriptionCode ? { subscriptionCode: meta.subscriptionCode } : {}),
      ...(meta.emailToken ? { emailToken: meta.emailToken } : {}),
    });

    await tx`
      UPDATE payment_transactions
      SET
        status = 'success',
        paystack_payload = ${mergedPayload}::text::jsonb
      WHERE id = ${txn.id}::uuid
        AND user_id = ${txn.user_id}::uuid
    `;

    return {
      expiresAt: newExpiresIso,
      amountKobo: txn.amount_kobo,
      alreadyProcessed: false,
    };
  });
}
