-- Candidate only: apply after T16 schema reconciliation/backup, not blind migration replay.
BEGIN;
CREATE TABLE IF NOT EXISTS public.payment_checkout_requests (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 idempotency_key text NOT NULL, request_hash text NOT NULL,
 reference text NOT NULL UNIQUE REFERENCES public.payment_transactions(reference),
 status text NOT NULL CHECK (status IN ('initializing','ready','unknown')),
 authorization_url text, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,idempotency_key)
);
ALTER TABLE public.payment_checkout_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_checkout_requests FROM anon,authenticated;
-- Existing duplicates must be reconciled rather than silently discarded.
CREATE UNIQUE INDEX IF NOT EXISTS discount_transaction_unique_idx ON public.subscription_discounts(transaction_id);
CREATE TABLE IF NOT EXISTS public.payment_renewal_requests (
 reference text PRIMARY KEY REFERENCES public.payment_transactions(reference),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 status text NOT NULL CHECK(status IN ('initializing','ready','unknown')),
 plan_code text NOT NULL, customer_code text NOT NULL, authorization_code text NOT NULL,
 subscription_code text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_renewal_user_idx ON public.payment_renewal_requests(user_id,status);
ALTER TABLE public.payment_renewal_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_renewal_requests FROM anon,authenticated;
COMMIT;
