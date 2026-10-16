import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "Terms and Conditions",
  "Read the terms for using JAMBPrep’s UTME practice, progress and mock examination services.",
  "/terms/",
  true,
);

export default function TermsPage() {
  return (
    <LegalPage title="Terms and Conditions">
      <p><strong>Effective 16 October 2026.</strong> These Terms apply to JAMBPrep at jambprep.lecterniq.com and related services. By creating an account or using JAMBPrep, you agree to these Terms. If you do not agree, do not use the service.</p>

      <LegalSection title="About JAMBPrep">
        <p>JAMBPrep is operated by Clank Dynamics Solutions and VABytes Solutions under the LecternIQ brand. It provides independent educational practice, question review, progress insights and simulated UTME mock exams. JAMBPrep is not JAMB, does not conduct official examinations, and does not guarantee any score, admission decision or examination outcome.</p>
      </LegalSection>

      <LegalSection title="Accounts and eligibility">
        <p>Provide accurate account information, keep your sign-in credentials secure and tell us promptly if you believe someone accessed your account without permission. You are responsible for activity under your account, subject to rights you have under applicable law.</p>
        <p>If you are under 18, a parent or legal guardian must be involved and provide consent before you create an account or use paid features. Any payment must be authorised by the person legally responsible for it.</p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>You may use JAMBPrep for personal study and preparation. You must not use it to cheat in a live or official examination; copy, scrape, sell or redistribute questions or explanations without permission; bypass access controls or usage limits; interfere with or probe the service without authorisation; upload malicious code; impersonate another person; misuse referrals or payments; or violate the law or another person’s rights.</p>
        <p>We may restrict or suspend access when reasonably necessary to protect users, the service or legal rights. Where appropriate and lawful, we will provide notice or a way to challenge the action.</p>
      </LegalSection>

      <LegalSection title="Questions, study content and results">
        <p>Questions, explanations, topic and difficulty labels, and mock blueprints are provided for practice. Content may be corrected, revised, replaced or removed. Exam-year labels are references and do not guarantee that a question appeared in a particular official paper. Your JAMBPrep score is not an official JAMB score.</p>
        <p>JAMBPrep and its licensors retain rights in the software, design, question-bank curation, explanations and other original content. You retain rights in material you submit and allow us to use it as needed to operate the service, respond to you, moderate reports and improve JAMBPrep. We respect third-party rights.</p>
      </LegalSection>

      <LegalSection title="Practice and mock sessions">
        <p>Sessions may save answers on your device and sync them to our service. Where a connection is required, check that answers have synced before closing a session. We make reasonable efforts to recover sessions, but an interruption, device failure or unsynced local answer may prevent recovery.</p>
        <p>Where exam-conditions mode is offered, it may record events such as leaving or hiding the exam page as interruption events. An interruption event alone does not establish misconduct. The feature does not use a microphone or camera. The rules shown before each session apply.</p>
      </LegalSection>

      <LegalSection title="Free and paid access">
        <p>Free features may have limits shown in the app. Paid plan prices, duration, discounts, renewal terms and included features are displayed at checkout. The amount and terms shown before you authorise payment apply to that purchase.</p>
        <p>Payments are handled by a third-party payment processor. We may receive transaction references, payment status and limited tokenized details needed to confirm access or administer recurring billing. Do not send full card details or security codes to JAMBPrep.</p>
        <p>If checkout says a plan renews automatically and you authorise recurring billing, it renews at the price and interval disclosed at checkout until cancelled. A launch or referral discount applies only for the period stated at checkout; later renewals may use the then-current renewal price. We will not treat a plan as recurring unless that is clearly disclosed and authorised.</p>
        <p>You may turn off auto-renewal in Profile settings where available. Cancellation stops future renewal charges; paid access generally remains until the current paid period expires. If in-app cancellation is unavailable, email <a className="font-semibold text-[#116149] underline underline-offset-4" href="mailto:contact@clankdynamics.com">contact@clankdynamics.com</a> before the next renewal with your account email and subscription reference.</p>
      </LegalSection>

      <LegalSection title="Refunds">
        <p>Refund requests must include a reason and be emailed to <a className="font-semibold text-[#116149] underline underline-offset-4" href="mailto:contact@clankdynamics.com">contact@clankdynamics.com</a>. Requests are reviewed individually under our <a className="font-semibold text-[#116149] underline underline-offset-4" href="/refund-policy/">Refund Policy</a>. Nothing in these Terms removes a right or remedy that cannot lawfully be excluded.</p>
      </LegalSection>

      <LegalSection title="Referrals and promotions">
        <p>Referral rewards and promotions follow the rules shown when they are offered. Eligibility may depend on the referred person completing the stated account onboarding steps. Rewards may be limited, withdrawn or corrected in cases of fraud, duplicate accounts, self-referrals or system error, subject to applicable law and the rules that applied when earned.</p>
      </LegalSection>

      <LegalSection title="Availability and third-party services">
        <p>We work to keep JAMBPrep available but do not promise uninterrupted or error-free operation. Maintenance, network conditions, provider incidents, security events or other circumstances may temporarily limit access. We may add, change or discontinue features. Where a material change affects paid service, we will provide notice or a remedy as required by law.</p>
        <p>Some functions rely on independent service providers. Their services may be subject to their own terms, but this does not limit any responsibility imposed on us by applicable law.</p>
      </LegalSection>

      <LegalSection title="Suspension, termination and liability">
        <p>You may stop using JAMBPrep at any time and request account deletion under the Privacy Policy. We may suspend or terminate access for a material breach, security risk, unlawful use or operational reason, subject to applicable law and any required notice or remedy.</p>
        <p>To the extent permitted by law, we are not responsible for indirect loss that was not reasonably foreseeable when you began using the service. Nothing in these Terms excludes liability, consumer rights or remedies that cannot lawfully be excluded or limited, including remedies for deficient service.</p>
      </LegalSection>

      <LegalSection title="Governing law, complaints and updates">
        <p>These Terms are governed by the laws of the Federal Republic of Nigeria. This does not prevent you from bringing a complaint before a regulator or court with jurisdiction. To give us an opportunity to help, contact <a className="font-semibold text-[#116149] underline underline-offset-4" href="mailto:contact@clankdynamics.com">contact@clankdynamics.com</a>.</p>
        <p>We may update these Terms by publishing a revised version and effective date. We will give additional notice where required. Changes apply to future use and do not remove rights that have already accrued.</p>
      </LegalSection>
    </LegalPage>
  );
}
