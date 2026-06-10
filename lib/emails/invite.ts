import { getResend, fromAddress, baseUrl } from "./client";

export type InviteEmailParams = {
  recipientName: string;
  recipientEmail: string;
  reportTitle: string;
  slug: string;
  token: string;
};

function inviteHtml({
  reportTitle,
  slug,
  token,
}: InviteEmailParams): string {
  const url = `${baseUrl()}/reports/${encodeURIComponent(slug)}?token=${encodeURIComponent(token)}`;
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #ececec;border-radius:16px;padding:40px;">
            <tr>
              <td>
                <p style="margin:0 0 8px;font-size:14px;color:#737373;">Bani Waraich has shared a report with you.</p>
                <h1 style="margin:0 0 28px;font-size:24px;font-weight:600;line-height:1.25;letter-spacing:-0.01em;">${escapeHtml(reportTitle)}</h1>
                <a href="${url}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:500;padding:12px 24px;border-radius:10px;">View Report</a>
                <p style="margin:32px 0 0;font-size:12px;color:#a3a3a3;line-height:1.5;">This link is personal to you. Please don't share it.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendInviteEmail(params: InviteEmailParams) {
  const subject = `[Report] ${params.reportTitle} — shared by Bani Waraich`;
  return getResend().emails.send({
    from: fromAddress(),
    to: params.recipientEmail,
    subject,
    html: inviteHtml(params),
  });
}
