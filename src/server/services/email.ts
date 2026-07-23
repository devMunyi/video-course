import { Resend } from "resend"
import { env } from "@/env"

export const resend = new Resend(env.RESEND_API_KEY)

export function weeklyDigestHtml({
  name,
  currentStreak,
  longestStreak,
  studiedToday,
  readyCourses,
  inProgressCourses,
  reviewDue,
  appUrl,
}: {
  name: string
  currentStreak: number
  longestStreak: number
  studiedToday: boolean
  readyCourses: number
  inProgressCourses: number
  reviewDue: number
  appUrl: string
}): string {
  const streakMsg =
    currentStreak === 0
      ? "You haven't started a streak yet — today's a great day to begin!"
      : studiedToday
        ? `You're on a <strong>${currentStreak}-day streak</strong> 🔥 — keep it going!`
        : `Your <strong>${currentStreak}-day streak</strong> is at risk — study something today to keep it alive!`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your weekly learning digest</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#7c3aed;padding:32px 40px;text-align:center;">
              <p style="margin:0;color:#ede9fe;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">Weekly Digest</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">VideoCourse</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${name},</p>
              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Here's your weekly learning summary.</p>

              <!-- Streak -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-radius:12px;margin-bottom:20px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0;font-size:28px;">🔥</p>
                    <p style="margin:6px 0 0;font-size:15px;color:#92400e;">${streakMsg}</p>
                    ${longestStreak > 1 ? `<p style="margin:8px 0 0;font-size:12px;color:#b45309;">Personal best: ${longestStreak} days</p>` : ""}
                  </td>
                </tr>
              </table>

              <!-- Stats -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td width="33%" style="padding:4px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;">
                      <tr><td style="padding:16px;text-align:center;">
                        <p style="margin:0;font-size:24px;font-weight:700;color:#16a34a;">${readyCourses}</p>
                        <p style="margin:4px 0 0;font-size:12px;color:#15803d;">Courses ready</p>
                      </td></tr>
                    </table>
                  </td>
                  <td width="33%" style="padding:4px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-radius:12px;">
                      <tr><td style="padding:16px;text-align:center;">
                        <p style="margin:0;font-size:24px;font-weight:700;color:#2563eb;">${inProgressCourses}</p>
                        <p style="margin:4px 0 0;font-size:12px;color:#1d4ed8;">In progress</p>
                      </td></tr>
                    </table>
                  </td>
                  <td width="33%" style="padding:4px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border-radius:12px;">
                      <tr><td style="padding:16px;text-align:center;">
                        <p style="margin:0;font-size:24px;font-weight:700;color:#ea580c;">${reviewDue}</p>
                        <p style="margin:4px 0 0;font-size:12px;color:#c2410c;">Reviews due</p>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${
                reviewDue > 0
                  ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border-radius:12px;margin-bottom:20px;">
                <tr><td style="padding:16px 24px;">
                  <p style="margin:0;font-size:14px;color:#9a3412;">📌 You have <strong>${reviewDue} question${reviewDue !== 1 ? "s" : ""}</strong> due for review. Don't let them slip!</p>
                </td></tr>
              </table>`
                  : ""
              }

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-top:8px;">
                    <a href="${appUrl}/dashboard" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">
                      Continue learning →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                You're receiving this because you have a VideoCourse account.<br />
                © ${new Date().getFullYear()} VideoCourse
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
