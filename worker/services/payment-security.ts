/**
 * Portable Web Crypto Payment Security Helpers (T03)
 *
 * Replaces Node `node:crypto` calls in `src/lib/payment-security.ts` with
 * native Web Crypto (`crypto.subtle`) for zero-polyfill Cloudflare Worker execution.
 */

export interface PaystackVerificationData {
  status?: string;
  reference?: string;
  amount?: number;
  requested_amount?: number;
  fees?: number;
  currency?: string;
  metadata?: {
    userId?: string;
    rewardId?: string | null;
    [key: string]: unknown;
  } | null;
}

/**
 * Constant-time byte array comparison to prevent timing side-channel attacks.
 */
export function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Converts a lowercase/uppercase hex string into a Uint8Array, or returns null if malformed.
 */
function hexToBytes(hex: string): Uint8Array | null {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Verifies a Paystack `x-paystack-signature` HMAC-SHA512 header using Web Crypto.
 */
export async function hasValidPaystackWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature || !secret || secret.trim().length === 0) {
    return false;
  }

  const providedSigBytes = hexToBytes(signature.trim());
  if (!providedSigBytes || providedSigBytes.length !== 64) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );

  const macBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const expectedSigBytes = new Uint8Array(macBuffer);

  return timingSafeEqualBytes(expectedSigBytes, providedSigBytes);
}

/**
 * Validates that a Paystack transaction payload matches our expected pending transaction
 * reference, exact kobo amount, currency, and optional owner userId.
 */
export function matchesPayment(
  verifyData: PaystackVerificationData | null | undefined,
  expectedReference: string,
  expectedAmountKobo: number,
  expectedUserId?: string
): boolean {
  if (!verifyData || verifyData.status !== 'success') {
    return false;
  }
  if (!expectedReference || verifyData.reference !== expectedReference) {
    return false;
  }
  if (!Number.isSafeInteger(expectedAmountKobo) || expectedAmountKobo <= 0 || !Number.isSafeInteger(verifyData.amount)) {
    return false;
  }
  if (verifyData.requested_amount !== undefined && verifyData.requested_amount !== expectedAmountKobo) {
    return false;
  }
  const exactAmount = verifyData.amount === expectedAmountKobo;
  const customerPaidFees = verifyData.requested_amount === expectedAmountKobo &&
    Number.isSafeInteger(verifyData.fees) && (verifyData.fees ?? 0) > 0 &&
    verifyData.amount === expectedAmountKobo + (verifyData.fees ?? 0);
  if (!exactAmount && !customerPaidFees) {
    return false;
  }
  if (verifyData.currency && verifyData.currency !== 'NGN') {
    return false;
  }
  if (
    expectedUserId &&
    verifyData.metadata &&
    typeof verifyData.metadata === 'object' &&
    typeof verifyData.metadata.userId === 'string' &&
    verifyData.metadata.userId.toLowerCase() !== expectedUserId.toLowerCase()
  ) {
    return false;
  }
  return true;
}
