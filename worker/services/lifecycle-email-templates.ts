/**
 * Lifecycle Email Templates for JAMBPrep
 *
 * Minimalist, premium, cross-client responsive HTML templates:
 * 1. Welcome Email (Immediate upon registration)
 * 2. 24-Hour Non-Subscribed Upgrade Nudge
 * 3. Mock Exam Result & Performance Breakdown
 */

export function wrapBase64(str: string): string {
  const b64 = Buffer.from(str, 'utf8').toString('base64');
  const chunks = b64.match(/.{1,76}/g);
  return chunks ? chunks.join('\r\n') : b64;
}

export interface WelcomeEmailData {
  studentName: string;
  dashboardUrl?: string;
  practiceUrl?: string;
  profileUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
}

export interface UpgradeNudgeEmailData {
  studentName: string;
  pricingUrl?: string;
  dashboardUrl?: string;
  profileUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
}

export interface SubjectScoreBreakdown {
  name: string;
  score: number;
  maxScore: number;
}

export interface MockResultEmailData {
  studentName: string;
  attemptId: string;
  totalScore: number;
  maxTotalScore?: number;
  englishScore: number;
  subjectScores: SubjectScoreBreakdown[];
  totalCorrect: number;
  totalAnswered: number;
  timeSpentSeconds: number;
  resultUrl?: string;
  profileUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
}

export function renderWelcomeEmail(data: WelcomeEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    studentName,
    dashboardUrl = 'https://jambprep.lecterniq.com/dashboard',
    practiceUrl = 'https://jambprep.lecterniq.com/practice',
    profileUrl = 'https://jambprep.lecterniq.com/profile',
    privacyUrl = 'https://jambprep.lecterniq.com/privacy',
    termsUrl = 'https://jambprep.lecterniq.com/terms',
  } = data;

  const subject = `Welcome to JAMBPrep, ${studentName}! Your 300+ UTME journey begins`;

  const text = `Welcome to JAMBPrep, ${studentName}!

Your account is ready. JAMBPrep is engineered to help you achieve a 300+ UTME score through consistent daily practice and realistic CBT simulations.

3 Quick Steps to Get Started:
1. Choose Your 4 UTME Subjects on your dashboard
2. Take a 15-Question Diagnostic Session to assess your baseline
3. Build Your Daily Study Streak with 7:00 AM daily study reminders

Go to My Dashboard:
${dashboardUrl}

Or jump straight into practice:
${practiceUrl}

---
JAMBPrep · Your subjects. Your pace. Your next step.
Notification Settings: ${profileUrl}
Privacy Policy: ${privacyUrl}
`;

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to JAMBPrep</title>
  <style type="text/css">
    body { margin: 0 !important; padding: 0 !important; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }
    table { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    a { text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; }
      .content { padding: 32px 20px !important; }
      .step-table { width: 100% !important; }
      .cta-btn { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 48px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="540" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; width: 100%; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 24px 36px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <a href="https://jambprep.lecterniq.com" target="_blank" style="display: inline-block;">
                      <img src="https://jambprep.lecterniq.com/icon-192.png" width="32" height="32" alt="JAMBPrep" style="display: inline-block; vertical-align: middle; border-radius: 7px;" />
                      <span style="display: inline-block; vertical-align: middle; padding-left: 10px; font-size: 19px; font-weight: 700; color: #116149; letter-spacing: -0.3px;">
                        JAMB<span style="color: #0f172a;">Prep</span>
                      </span>
                    </a>
                  </td>
                  <td align="right" valign="middle">
                    <span style="font-size: 11px; font-weight: 600; color: #116149; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 20px;">
                      Welcome
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 36px;"><div style="height: 1px; background-color: #f3f4f6;">&nbsp;</div></td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content" style="padding: 36px 36px 32px 36px;">
              <h1 style="font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 12px 0; line-height: 1.3;">
                Welcome aboard, ${studentName}!
              </h1>
              <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 28px 0;">
                Your account is confirmed. JAMBPrep is built to turn consistency into a <strong>300+ score</strong> on your official UTME. Here is how to hit the ground running:
              </p>

              <!-- 3 Steps -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fafafa; border-radius: 8px; border: 1px solid #f3f4f6; padding: 18px 20px; margin-bottom: 28px;">
                <tr>
                  <td width="28" valign="top" style="padding-top: 2px;">
                    <span style="display: inline-block; width: 22px; height: 22px; line-height: 22px; text-align: center; border-radius: 50%; background-color: #116149; color: #ffffff; font-size: 11px; font-weight: 700;">1</span>
                  </td>
                  <td style="padding-left: 10px; padding-bottom: 14px;">
                    <div style="font-size: 13px; font-weight: 600; color: #111827;">Select your 4 UTME subjects</div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Tailor questions specifically to your intended course of study.</div>
                  </td>
                </tr>
                <tr>
                  <td width="28" valign="top" style="padding-top: 2px;">
                    <span style="display: inline-block; width: 22px; height: 22px; line-height: 22px; text-align: center; border-radius: 50%; background-color: #116149; color: #ffffff; font-size: 11px; font-weight: 700;">2</span>
                  </td>
                  <td style="padding-left: 10px; padding-bottom: 14px;">
                    <div style="font-size: 13px; font-weight: 600; color: #111827;">Take a 15-question practice session</div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Gauge your baseline recall with instant step-by-step explanations.</div>
                  </td>
                </tr>
                <tr>
                  <td width="28" valign="top" style="padding-top: 2px;">
                    <span style="display: inline-block; width: 22px; height: 22px; line-height: 22px; text-align: center; border-radius: 50%; background-color: #116149; color: #ffffff; font-size: 11px; font-weight: 700;">3</span>
                  </td>
                  <td style="padding-left: 10px;">
                    <div style="font-size: 13px; font-weight: 600; color: #111827;">Build your daily study streak</div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">You'll receive a quiet 7:00 AM study reminder to keep momentum.</div>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="left">
                    <a href="${dashboardUrl}" target="_blank" class="cta-btn" style="display: inline-block; background-color: #116149; color: #ffffff; font-size: 14px; font-weight: 600; text-align: center; padding: 13px 28px; border-radius: 7px; text-decoration: none;">
                      Go to My Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.5;">
                Direct link: <a href="${dashboardUrl}" style="color: #116149; text-decoration: underline;">${dashboardUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 20px 36px; border-top: 1px solid #f3f4f6; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="font-size: 11px; color: #9ca3af;">JAMBPrep &bull; by LecternIQ</td>
                  <td align="right" style="font-size: 11px; color: #9ca3af;">
                    <a href="${profileUrl}" style="color: #6b7280; text-decoration: underline;">Settings</a>
                    &nbsp;&bull;&nbsp;
                    <a href="${privacyUrl}" style="color: #6b7280; text-decoration: underline;">Privacy</a>
                    &nbsp;&bull;&nbsp;
                    <a href="${termsUrl}" style="color: #6b7280; text-decoration: underline;">Terms</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; margin-top: 16px;">
          <tr>
            <td align="center" style="font-size: 11px; color: #9ca3af;">
              &copy; ${new Date().getFullYear()} JAMBPrep. All rights reserved.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export function render24hUpgradeNudgeEmail(data: UpgradeNudgeEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    studentName,
    pricingUrl = 'https://jambprep.lecterniq.com/pricing',
    dashboardUrl = 'https://jambprep.lecterniq.com/dashboard',
    profileUrl = 'https://jambprep.lecterniq.com/profile',
    privacyUrl = 'https://jambprep.lecterniq.com/privacy',
    termsUrl = 'https://jambprep.lecterniq.com/terms',
  } = data;

  const subject = `Unlock unlimited UTME mocks & full explanations on JAMBPrep`;

  const text = `Hi ${studentName},

We noticed you've started exploring JAMBPrep on the free tier.

To guarantee you're fully prepared for exam day, JAMBPrep Premium unlocks everything you need to reach 300+:

• Unlimited Full-Length CBT Mock Exams under authentic JAMB hall timer conditions
• Complete Step-by-Step AI Explanations for all 30+ subjects (1994–2025 past questions)
• Subject & Topic Weakness Analytics so you never waste study time on topics you've already mastered
• Full Offline PWA Access to practice even without data

Upgrade today with our 50% off launch offer for ₦1,000 (regular ₦2,000 / 30 days):
${pricingUrl}

---
JAMBPrep · Your subjects. Your pace. Your next step.
Notification Settings: ${profileUrl}
Privacy Policy: ${privacyUrl}
`;

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unlock JAMBPrep Premium</title>
  <style type="text/css">
    body { margin: 0 !important; padding: 0 !important; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }
    table { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    a { text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; }
      .content { padding: 32px 20px !important; }
      .cta-btn { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 48px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="540" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; width: 100%; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 24px 36px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <a href="https://jambprep.lecterniq.com" target="_blank" style="display: inline-block;">
                      <img src="https://jambprep.lecterniq.com/icon-192.png" width="32" height="32" alt="JAMBPrep" style="display: inline-block; vertical-align: middle; border-radius: 7px;" />
                      <span style="display: inline-block; vertical-align: middle; padding-left: 10px; font-size: 19px; font-weight: 700; color: #116149; letter-spacing: -0.3px;">
                        JAMB<span style="color: #0f172a;">Prep</span>
                      </span>
                    </a>
                  </td>
                  <td align="right" valign="middle">
                    <span style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px;">
                      Upgrade
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 36px;"><div style="height: 1px; background-color: #f3f4f6;">&nbsp;</div></td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content" style="padding: 36px 36px 32px 36px;">
              <h1 style="font-size: 21px; font-weight: 700; color: #111827; margin: 0 0 12px 0; line-height: 1.3;">
                Ready to take your UTME prep all the way?
              </h1>
              <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                Hi ${studentName}, free practice is a great start, but unlocking your full score potential requires realistic CBT exam conditions and in-depth explanations.
              </p>

              <!-- Feature Grid -->
              <div style="background-color: #fafafa; border-radius: 8px; border: 1px solid #f3f4f6; padding: 20px; margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 700; color: #116149; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 12px;">
                  What Premium Unlocks:
                </div>
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="font-size: 13px; color: #1f2937; padding: 6px 0; line-height: 1.5;">
                      <strong>&bull; Unlimited Timed CBT Mocks:</strong> Full 400-mark simulations matching actual JAMB conditions.
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #1f2937; padding: 6px 0; line-height: 1.5;">
                      <strong>&bull; Full Step-by-Step Explanations:</strong> Understand why the right answer is correct across 30+ subjects.
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #1f2937; padding: 6px 0; line-height: 1.5;">
                      <strong>&bull; Weak-Spot Analytics:</strong> Pinpoint exactly which topics cost you marks before the real exam.
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #1f2937; padding: 6px 0; line-height: 1.5;">
                      <strong>&bull; Offline Practice:</strong> Study anywhere, even when internet access is limited.
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Price Box -->
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 26px; font-weight: 800; color: #116149;">&#8358;1,000</span>
                <span style="font-size: 15px; color: #9ca3af; text-decoration: line-through; margin-left: 6px;">&#8358;2,000</span>
                <span style="display: inline-block; margin-left: 8px; font-size: 11px; font-weight: 700; color: #047857; background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 12px; vertical-align: middle;">50% OFF</span>
                <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Launch offer &bull; 30 days unlimited access</div>
              </div>

              <!-- CTA -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${pricingUrl}" target="_blank" class="cta-btn" style="display: inline-block; background-color: #116149; color: #ffffff; font-size: 14px; font-weight: 600; text-align: center; padding: 14px 32px; border-radius: 7px; text-decoration: none;">
                      Upgrade to Premium Now &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0; line-height: 1.5;">
                Or continue on free plan: <a href="${dashboardUrl}" style="color: #6b7280; text-decoration: underline;">Go to Dashboard</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 20px 36px; border-top: 1px solid #f3f4f6; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="font-size: 11px; color: #9ca3af;">JAMBPrep &bull; by LecternIQ</td>
                  <td align="right" style="font-size: 11px; color: #9ca3af;">
                    <a href="${profileUrl}" style="color: #6b7280; text-decoration: underline;">Notification settings</a>
                    &nbsp;&bull;&nbsp;
                    <a href="${privacyUrl}" style="color: #6b7280; text-decoration: underline;">Privacy</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; margin-top: 16px;">
          <tr>
            <td align="center" style="font-size: 11px; color: #9ca3af;">
              &copy; ${new Date().getFullYear()} JAMBPrep. All rights reserved.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export function renderMockResultEmail(data: MockResultEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    studentName,
    attemptId,
    totalScore,
    maxTotalScore = 400,
    englishScore = 0,
    subjectScores = [],
    totalCorrect = 0,
    totalAnswered = 0,
    timeSpentSeconds = 0,
    resultUrl = `https://jambprep.lecterniq.com/mock/result?attemptId=${attemptId}`,
    profileUrl = 'https://jambprep.lecterniq.com/profile',
    privacyUrl = 'https://jambprep.lecterniq.com/privacy',
    termsUrl = 'https://jambprep.lecterniq.com/terms',
  } = data;

  const safeSubjectScores = Array.isArray(subjectScores) ? subjectScores : [];

  const minutesSpent = Math.max(1, Math.round(timeSpentSeconds / 60));
  const accuracyPercent = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  let ratingLabel = 'Developing';
  let ratingColor = '#b45309';
  if (totalScore >= 280) {
    ratingLabel = 'Excellent & Competitive';
    ratingColor = '#116149';
  } else if (totalScore >= 240) {
    ratingLabel = 'Strong Baseline';
    ratingColor = '#059669';
  } else if (totalScore >= 200) {
    ratingLabel = 'Good Foundation';
    ratingColor = '#0f172a';
  }

  const subject = `Your UTME Mock Result: ${totalScore}/${maxTotalScore} • Performance Breakdown`;

  const textSubjectLines = safeSubjectScores
    .map((s) => `  • ${s.name}: ${s.score} / ${s.maxScore}`)
    .join('\n');

  const text = `Hi ${studentName},

Your UTME Mock Exam has been scored and analyzed.

Overall Result:
• Total Score: ${totalScore} / ${maxTotalScore} (${ratingLabel})
• Accuracy: ${totalCorrect} of ${totalAnswered} Correct (${accuracyPercent}%)
• Time Spent: ${minutesSpent} minutes / 120 minutes

Subject Breakdown:
  • Use of English: ${englishScore} / 100
${textSubjectLines}

Review Your Full Questions, Corrections & Explanations:
${resultUrl}

---
JAMBPrep · Your subjects. Your pace. Your next step.
Notification Settings: ${profileUrl}
Privacy Policy: ${privacyUrl}
`;

  const htmlSubjectRows = safeSubjectScores
    .map(
      (s) => `<tr>
        <td style="padding: 8px 12px; font-size: 13px; color: #1f2937; border-bottom: 1px solid #f3f4f6;">${s.name}</td>
        <td align="right" style="padding: 8px 12px; font-size: 13px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f3f4f6;">${s.score} <span style="font-size: 11px; font-weight: 400; color: #9ca3af;">/ ${s.maxScore}</span></td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your UTME Mock Result</title>
  <style type="text/css">
    body { margin: 0 !important; padding: 0 !important; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }
    table { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    a { text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; }
      .content { padding: 32px 20px !important; }
      .stat-cell { display: block !important; width: 100% !important; border-right: none !important; border-bottom: 1px solid #f3f4f6 !important; padding: 12px 0 !important; }
      .stat-cell-last { border-bottom: none !important; }
      .cta-btn { display: block !important; width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 48px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="540" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; width: 100%; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 24px 36px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <a href="https://jambprep.lecterniq.com" target="_blank" style="display: inline-block;">
                      <img src="https://jambprep.lecterniq.com/icon-192.png" width="32" height="32" alt="JAMBPrep" style="display: inline-block; vertical-align: middle; border-radius: 7px;" />
                      <span style="display: inline-block; vertical-align: middle; padding-left: 10px; font-size: 19px; font-weight: 700; color: #116149; letter-spacing: -0.3px;">
                        JAMB<span style="color: #0f172a;">Prep</span>
                      </span>
                    </a>
                  </td>
                  <td align="right" valign="middle">
                    <span style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px;">
                      Mock Scorecard
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 36px;"><div style="height: 1px; background-color: #f3f4f6;">&nbsp;</div></td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content" style="padding: 36px 36px 32px 36px;">
              <h1 style="font-size: 21px; font-weight: 700; color: #111827; margin: 0 0 10px 0; line-height: 1.3;">
                Here is your mock result, ${studentName}
              </h1>
              <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                Your CBT mock exam has been scored. Review your performance breakdown across all 4 subjects:
              </p>

              <!-- Hero Score Panel -->
              <div style="background-color: #fafafa; border-radius: 10px; border: 1px solid #f3f4f6; padding: 24px 20px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px;">Total Aggregate Score</div>
                <div style="font-size: 42px; font-weight: 800; color: #116149; line-height: 1.1; margin: 6px 0;">
                  ${totalScore} <span style="font-size: 16px; font-weight: 500; color: #9ca3af;">/ ${maxTotalScore}</span>
                </div>
                <div style="display: inline-block; font-size: 12px; font-weight: 600; color: ${ratingColor}; background-color: #ffffff; border: 1px solid #e5e7eb; padding: 3px 12px; border-radius: 14px;">
                  ${ratingLabel}
                </div>

                <!-- Secondary stats -->
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 18px; padding-top: 16px; border-top: 1px solid #f3f4f6;">
                  <tr>
                    <td class="stat-cell" width="50%" align="center" style="border-right: 1px solid #f3f4f6;">
                      <div style="font-size: 11px; color: #6b7280; text-transform: uppercase;">Accuracy</div>
                      <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">
                        ${accuracyPercent}% <span style="font-size: 11px; font-weight: 400; color: #9ca3af;">(${totalCorrect}/${totalAnswered})</span>
                      </div>
                    </td>
                    <td class="stat-cell stat-cell-last" width="50%" align="center">
                      <div style="font-size: 11px; color: #6b7280; text-transform: uppercase;">Time Spent</div>
                      <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">
                        ${minutesSpent}m <span style="font-size: 11px; font-weight: 400; color: #9ca3af;">/ 120m</span>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Subject Breakdown Table -->
              <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                <div style="background-color: #fafafa; padding: 10px 14px; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb;">
                  Subject Breakdown
                </div>
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 8px 12px; font-size: 13px; color: #1f2937; border-bottom: 1px solid #f3f4f6;">Use of English</td>
                    <td align="right" style="padding: 8px 12px; font-size: 13px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f3f4f6;">${englishScore} <span style="font-size: 11px; font-weight: 400; color: #9ca3af;">/ 100</span></td>
                  </tr>
                  ${htmlSubjectRows}
                </table>
              </div>

              <!-- CTA -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${resultUrl}" target="_blank" class="cta-btn" style="display: inline-block; background-color: #116149; color: #ffffff; font-size: 14px; font-weight: 600; text-align: center; padding: 13px 28px; border-radius: 7px; text-decoration: none;">
                      Review Question Explanations &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0; line-height: 1.5;">
                Direct link: <a href="${resultUrl}" style="color: #116149; text-decoration: underline;">${resultUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 20px 36px; border-top: 1px solid #f3f4f6; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="font-size: 11px; color: #9ca3af;">JAMBPrep &bull; by LecternIQ</td>
                  <td align="right" style="font-size: 11px; color: #9ca3af;">
                    <a href="${profileUrl}" style="color: #6b7280; text-decoration: underline;">Settings</a>
                    &nbsp;&bull;&nbsp;
                    <a href="${privacyUrl}" style="color: #6b7280; text-decoration: underline;">Privacy</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; margin-top: 16px;">
          <tr>
            <td align="center" style="font-size: 11px; color: #9ca3af;">
              &copy; ${new Date().getFullYear()} JAMBPrep. All rights reserved.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export function encodeRfc2047Subject(subj: string): string {
  // If pure ASCII without special chars, return as is, otherwise Base64 MIME encode
  if (/^[\x20-\x7E]+$/.test(subj)) {
    return subj;
  }
  return `=?UTF-8?B?${Buffer.from(subj, 'utf8').toString('base64')}?=`;
}

export function buildLifecycleMimeMessage(params: {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
}): { subject: string; rawMessage: string } {
  const boundary = `====_JAMBPrep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}====`;
  const messageId = `<lifecycle-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@send.lecterniq.com>`;
  const dateHeader = new Date().toUTCString();
  const encodedSubject = encodeRfc2047Subject(params.subject);

  const textB64 = wrapBase64(params.text);
  const htmlB64 = wrapBase64(params.html);

  const rawLines = [
    `From: "JAMBPrep" <${params.from}>`,
    `To: <${params.to}>`,
  ];

  if (params.replyTo) {
    rawLines.push(`Reply-To: <${params.replyTo}>`);
  }

  rawLines.push(
    `Subject: ${encodedSubject}`,
    `Date: ${dateHeader}`,
    `Message-ID: ${messageId}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    textB64,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    htmlB64,
    '',
    `--${boundary}--`,
    '.',
    ''
  );

  return {
    subject: params.subject,
    rawMessage: rawLines.join('\r\n'),
  };
}
