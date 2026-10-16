import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "Refund Policy",
  "How to request a JAMBPrep refund, what details to provide and how requests are reviewed.",
  "/refund-policy/",
  true,
);

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund Policy">
      <p><strong>Effective 16 October 2026.</strong> This policy applies to paid JAMBPrep subscriptions and other paid access offered by Clank Dynamics Solutions and VABytes Solutions under the LecternIQ brand.</p>

      <LegalSection title="How to request a refund">
        <p>All refund requests must state the reason and be emailed to <a className="font-semibold text-[#116149] underline underline-offset-4" href="mailto:contact@clankdynamics.com">contact@clankdynamics.com</a>. Use the subject line “JAMBPrep refund request” and include:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>the email address on your JAMBPrep account;</li>
          <li>the payment transaction reference;</li>
          <li>the amount and approximate payment date;</li>
          <li>the reason for the request and a short description of what happened; and</li>
          <li>what outcome you would like us to consider, such as restoring access, correcting a billing issue or refunding an amount.</li>
        </ul>
        <p>Do not email card numbers, PINs, passwords, one-time passcodes or security codes. We may ask for non-sensitive information needed to locate and verify a transaction.</p>
      </LegalSection>

      <LegalSection title="How requests are assessed">
        <p>We review each request individually, considering whether payment was authorised and correctly recorded; whether paid access was made available and performed as described; how much of the paid period or service was available or used; any technical failure; and applicable law.</p>
        <p>Depending on the circumstances, we may restore access, correct an account or billing issue, provide another appropriate remedy, or approve a full or reasonable partial refund. Duplicate or unauthorised payments, payment without the promised access, and material service failures should be reported promptly with the transaction reference.</p>
        <p>A payment status may take time to reconcile. We do not treat a browser redirect or screenshot alone as confirmation of payment.</p>
      </LegalSection>

      <LegalSection title="Renewals and cancellation">
        <p>Turning off auto-renewal prevents future renewal charges but does not by itself refund a charge already made. Paid access normally continues until the end of the paid period. If you believe you were charged after cancellation or were otherwise billed incorrectly, email <a className="font-semibold text-[#116149] underline underline-offset-4" href="mailto:contact@clankdynamics.com">contact@clankdynamics.com</a> with your account email, cancellation date if known and transaction reference.</p>
      </LegalSection>

      <LegalSection title="Your legal rights">
        <p>This policy does not promise that every change-of-mind request will be refunded. It does not remove any right or remedy available under applicable law. Where a service has not been performed to the required standard, Nigerian consumer law may entitle you to require a remedy or a reasonable portion of the price back, having regard to the extent of the failure. We assess such requests on their facts and do not rely on this policy to waive a right that cannot lawfully be waived.</p>
      </LegalSection>

      <LegalSection title="Decision and payment timing">
        <p>We aim to acknowledge refund emails within 3 business days and provide a decision or update within 10 business days, subject to investigation or payment reconciliation. If approved, a refund is normally initiated through the original payment route where supported. The time for funds to appear depends on the payment processor and financial institution.</p>
      </LegalSection>
    </LegalPage>
  );
}
