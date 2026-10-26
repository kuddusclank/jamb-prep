/**
 * Daily Study Reminder Email Template Generator & RFC-compliant MIME Builder
 *
 * Minimalist, premium, cross-client compatible HTML for the daily 7:00 AM WAT study reminder.
 * Features:
 * - Official JAMBPrep branding
 * - Minimalist Material design icons (no emojis)
 * - Restrained single-accent palette (Emerald #116149 + Slate neutrals)
 * - 15 Questions target (~10 minutes)
 * - Production routes on jambprep.lecterniq.com
 * - 76-character wrapped Base64 MIME transport for zero-bounce delivery
 */

export interface StudyReminderEmailData {
  studentName: string;
  targetQuestions?: number;
  estimatedMinutes?: number;
  streakDays?: number;
  dateString?: string;
  practiceUrl?: string;
  profileUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
}

export function wrapBase64(str: string): string {
  const b64 = Buffer.from(str, 'utf8').toString('base64');
  const chunks = b64.match(/.{1,76}/g);
  return chunks ? chunks.join('\r\n') : b64;
}

export function renderStudyReminderEmail(data: StudyReminderEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    studentName,
    targetQuestions = 15,
    estimatedMinutes = 10,
    streakDays = 3,
    dateString = 'Today',
    practiceUrl = 'https://jambprep.lecterniq.com/practice',
    profileUrl = 'https://jambprep.lecterniq.com/profile',
    privacyUrl = 'https://jambprep.lecterniq.com/privacy',
    termsUrl = 'https://jambprep.lecterniq.com/terms',
  } = data;

  const subject = `Your daily practice: 15 questions on JAMBPrep`;

  const text = `Good morning, ${studentName},

Your daily JAMB practice goal is ready:

  • Target: ${targetQuestions} questions
  • Estimated time: ~${estimatedMinutes} minutes
  • Current streak: ${streakDays} day${streakDays === 1 ? '' : 's'}

Start today's session:
${practiceUrl}

Daily Strategy:
Short, consistent daily recall strengthens memory retention far better than weekend cramming.

---
JAMBPrep · Your subjects. Your pace. Your next step.
Manage notification settings: ${profileUrl}
Privacy Policy: ${privacyUrl}
`;

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="format-detection" content="telephone=no" />
  <title>Daily Study Reminder</title>
  <style type="text/css">
    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      color: #0f172a;
    }
    table {
      border-collapse: collapse !important;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    a {
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0 !important;
        border-left: 0 !important;
        border-right: 0 !important;
      }
      .content {
        padding: 32px 20px !important;
      }
      .stat-cell {
        display: block !important;
        width: 100% !important;
        border-right: none !important;
        border-bottom: 1px solid #f1f5f9 !important;
        padding: 14px 0 !important;
      }
      .stat-cell-last {
        border-bottom: none !important;
      }
      .cta-button {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 48px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" class="container" width="540" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; width: 100%; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
          
          <!-- Header with Official JAMBPrep Logo -->
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
                      Daily Goal
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Subtle hairline divider -->
          <tr>
            <td style="padding: 0 36px;">
              <div style="height: 1px; background-color: #f3f4f6; line-height: 1px; font-size: 1px;">&nbsp;</div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="content" style="padding: 36px 36px 32px 36px;">
              <h1 style="font-size: 21px; font-weight: 700; color: #111827; margin: 0 0 10px 0; line-height: 1.3; letter-spacing: -0.3px;">
                Good morning, ${studentName}
              </h1>
              <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 28px 0;">
                Here is your scheduled study checkpoint. Complete your ${targetQuestions} questions this morning to maintain consistent exam momentum.
              </p>

              <!-- Minimalist Metrics Row (Single clean panel, subtle borders, no colorful boxes) -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fafafa; border-radius: 8px; border: 1px solid #f3f4f6; margin-bottom: 28px;">
                <tr>
                  <!-- Target -->
                  <td class="stat-cell" width="33%" align="center" style="padding: 18px 12px; border-right: 1px solid #f3f4f6;">
                    <div style="font-size: 24px; font-weight: 700; color: #111827; line-height: 1.1;">${targetQuestions}</div>
                    <div style="font-size: 11px; font-weight: 500; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Questions</div>
                  </td>
                  <!-- Time -->
                  <td class="stat-cell" width="33%" align="center" style="padding: 18px 12px; border-right: 1px solid #f3f4f6;">
                    <div style="font-size: 24px; font-weight: 700; color: #111827; line-height: 1.1;">~${estimatedMinutes}m</div>
                    <div style="font-size: 11px; font-weight: 500; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Estimated</div>
                  </td>
                  <!-- Streak -->
                  <td class="stat-cell stat-cell-last" width="33%" align="center" style="padding: 18px 12px;">
                    <div style="font-size: 24px; font-weight: 700; color: #116149; line-height: 1.1;">${streakDays}</div>
                    <div style="font-size: 11px; font-weight: 500; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Day Streak</div>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA (Single focal point) -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="left">
                    <a href="${practiceUrl}" target="_blank" class="cta-button" style="display: inline-block; background-color: #116149; color: #ffffff; font-size: 14px; font-weight: 600; text-align: center; padding: 13px 28px; border-radius: 7px; text-decoration: none; letter-spacing: 0.1px;">
                      Start Practice &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Minimal Pro-Tip Note (Material symbol, clean neutral background) -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="padding-top: 20px; border-top: 1px solid #f3f4f6;">
                <tr>
                  <td width="20" valign="top" style="padding-top: 1px;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                      <line x1="9" y1="18" x2="15" y2="18"></line>
                      <line x1="10" y1="22" x2="14" y2="22"></line>
                      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path>
                    </svg>
                  </td>
                  <td style="padding-left: 8px;">
                    <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
                      <strong style="color: #374151;">Strategy tip:</strong> Daily spaced practice trains question retrieval faster than bulk cramming.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Minimalist Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 20px 36px; border-top: 1px solid #f3f4f6; text-align: left; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="font-size: 11px; color: #9ca3af; line-height: 1.5;">
                    JAMBPrep &bull; by LecternIQ
                  </td>
                  <td align="right" style="font-size: 11px; color: #9ca3af;">
                    <a href="${profileUrl}" style="color: #6b7280; text-decoration: underline;">Notification settings</a>
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

        <!-- Micro Copyright -->
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

export function buildStudyReminderMimeMessage(params: {
  from: string;
  to: string;
  replyTo?: string;
  data: StudyReminderEmailData;
}): { subject: string; rawMessage: string } {
  const { subject, html, text } = renderStudyReminderEmail(params.data);
  const boundary = `====_JAMBPrep_Boundary_${Date.now()}_${Math.random().toString(36).substring(2, 8)}====`;
  const messageId = `<reminder-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@send.lecterniq.com>`;
  const dateHeader = new Date().toUTCString();

  const textB64 = wrapBase64(text);
  const htmlB64 = wrapBase64(html);

  const rawLines = [
    `From: "JAMBPrep" <${params.from}>`,
    `To: <${params.to}>`,
  ];

  if (params.replyTo) {
    rawLines.push(`Reply-To: <${params.replyTo}>`);
  }

  rawLines.push(
    `Subject: ${subject}`,
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
    subject,
    rawMessage: rawLines.join('\r\n'),
  };
}
