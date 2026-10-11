import { createHmac, timingSafeEqual } from "node:crypto";

export function hasValidWebhookSignature(body: string, signature: string | null, secret: string): boolean {
  if (!secret || secret.includes("placeholder") || !signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac("sha512", secret).update(body).digest(), Buffer.from(signature, "hex"));
}

export function matchesPayment(data: unknown, reference: string, amountKobo: number): boolean {
  if (!data || typeof data !== "object") return false;
  const payment = data as Record<string, unknown>;
  return payment.status === "success" && payment.reference === reference
    && payment.currency === "NGN" && payment.amount === amountKobo;
}
