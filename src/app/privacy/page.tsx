import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "Privacy Policy",
  "Learn how JAMBPrep’s joint controllers collect, use, protect and retain your account and study information.",
  "/privacy/",
  true,
);

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>JAMBPrep is an independent online study service for students preparing for the Joint Admissions and Matriculation Board (JAMB) Unified Tertiary Matriculation Examination (UTME). JAMBPrep is not JAMB and is not affiliated with or endorsed by JAMB.</p>

      <LegalSection title="Who is responsible for your information?">
        <p>Clank Dynamics Solutions and VABytes Solutions jointly operate JAMBPrep under the LecternIQ brand. They jointly determine how and why personal information is processed through JAMBPrep and act as joint controllers. You can contact either joint controller at <a className="font-semibold text-[#116149] underline underline-offset-4" href="mailto:contact@clankdynamics.com">contact@clankdynamics.com</a>.</p>
      </LegalSection>

      <LegalSection title="Information we collect">
        <ul className="list-disc space-y-2 pl-6">
          <li><strong>Account information:</strong> account ID, email address, display name, sign-in/session information and account status.</li>
          <li><strong>Study profile:</strong> selected subjects, subject combination, target score, onboarding answers and any exam-year reference you provide.</li>
          <li><strong>Learning activity:</strong> practice and mock sessions, questions issued, answers, results, timing, saved progress and topic insights.</li>
          <li><strong>Submissions:</strong> question flags or reports, ratings, support messages and information you choose to include.</li>
          <li><strong>Referrals:</strong> referral codes, attribution, eligibility and reward status.</li>
          <li><strong>Payments:</strong> transaction references, amount, currency, payment/subscription status, access dates, cancellation details and limited tokenized authorization details needed to verify or renew access. A third-party payment processor handles card entry and processing. Do not send us your card number, PIN or security code.</li>
          <li><strong>Technical and device information:</strong> browser/device information, IP address and security or error logs made available to us, where needed to operate and protect the service.</li>
          <li><strong>Browser storage:</strong> session information and locally saved study data used for sign-in, session recovery or answer syncing. On shared devices, this information may remain until you sign out or clear the browser’s site data.</li>
        </ul>
        <p>Please avoid including sensitive personal information in support requests or question reports unless it is needed to resolve your issue.</p>
      </LegalSection>

      <LegalSection title="How we use information and our lawful grounds">
        <p>We use information to create and secure accounts; deliver practice, mock exams, grading and progress features; administer subscriptions, payments, referrals and rewards; answer support requests; improve question quality and the service; prevent fraud and misuse; and meet legal obligations or handle disputes.</p>
        <p>Depending on the activity, our lawful grounds include providing a service you request or performing a contract, complying with legal obligations, legitimate interests such as security and service reliability where your rights do not override them, and consent where required. You may withdraw consent where processing relies on it; this does not affect processing already carried out or processing supported by another lawful ground.</p>
        <p>JAMBPrep does not use your mock answers to make decisions about admission, school placement or your official JAMB result.</p>
      </LegalSection>

      <LegalSection title="Service providers and transfers">
        <p>We use external providers for service hosting and delivery, account authentication and data storage, payment processing, and transactional email such as account-recovery messages. They receive information needed to perform their services. We may also disclose information to professional advisers, regulators, law-enforcement authorities or other parties where required by law, needed to protect users or our rights, or necessary to resolve a dispute or suspected fraud. We do not sell student personal information.</p>
        <p>Some providers may process information outside Nigeria. The joint controllers have safeguards in place for such processing. You may contact us for information about the relevant transfer arrangements and safeguards.</p>
      </LegalSection>

      <LegalSection title="Browser storage">
        <p>We use browser storage and similar technologies needed for authentication, security, saved study sessions, preferences and service operation. Clearing browser storage may sign you out or remove study data that has not synced. This notice does not describe optional advertising or analytics tracking.</p>
      </LegalSection>

      <LegalSection title="Retention and security">
        <p>We retain information for as long as needed to provide the service, maintain study history, administer payments, protect exam integrity, resolve support issues and meet legal obligations. We then delete it or remove identifying details, subject to lawful retention, backup and dispute-resolution needs. The joint controllers have retention and deletion arrangements in place.</p>
        <p>We use technical and organisational safeguards intended to protect information. No online service can guarantee complete security. Use a unique password, protect your email and device, sign out on shared devices, and tell us promptly if you suspect account misuse.</p>
      </LegalSection>

      <LegalSection title="Your choices and rights">
        <p>Subject to applicable law, you may request access to or correction of your personal information, ask for erasure or restriction, object to certain processing, request portable information, withdraw consent where consent is the lawful ground, and ask how your information is handled. You may also complain to the Nigeria Data Protection Commission (NDPC).</p>
        <p>Email <a className="font-semibold text-[#116149] underline underline-offset-4" href="mailto:contact@clankdynamics.com">contact@clankdynamics.com</a> from your account email and describe your request. We may need to verify your identity or ask for clarification. We will respond within the period required by applicable law. NDPC information is available at <a className="font-semibold text-[#116149] underline underline-offset-4" href="https://ndpc.gov.ng/" rel="noreferrer">ndpc.gov.ng</a>.</p>
      </LegalSection>

      <LegalSection title="Children">
        <p>JAMB candidates may be under 18. If you are under 18, a parent or legal guardian must be involved and provide consent before you create an account or use paid features. A parent or guardian may contact us about a child’s information. We may take reasonable steps to verify the request and the parent or guardian’s authority.</p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>We may update this policy when our service or legal obligations change. The current version and effective date will appear on this page. We will provide additional notice where required by law.</p>
      </LegalSection>
    </LegalPage>
  );
}
