import { getResend, fromAddress, baseUrl } from "./client";

export type NotifyEmailParams = {
  recipientName: string;
  recipientEmail: string;
  reportTitle: string;
  viewedAt: Date;
};

function formatKolkata(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function notifyHtml({
  recipientName,
  recipientEmail,
  reportTitle,
  viewedAt,
}: NotifyEmailParams): string {
  const dashboard = `${baseUrl()}/reports`;
  return `<!doctype html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0a0a0a;font-size:15px;line-height:1.6;">
    <p><strong>${escapeHtml(recipientName)}</strong> (${escapeHtml(recipientEmail)}) just opened your report.</p>
    <p>
      Report: <strong>${escapeHtml(reportTitle)}</strong><br/>
      When: ${formatKolkata(viewedAt)} (Asia/Kolkata)
    </p>
    <p><a href="${dashboard}" style="color:#0a0a0a;">Open dashboard →</a></p>
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

export async function sendNotifyEmail(params: NotifyEmailParams) {
  const to = process.env.NEXTAUTH_ALLOWED_EMAIL;
  if (!to) throw new Error("NEXTAUTH_ALLOWED_EMAIL is not set; cannot notify Bani.");
  const subject = `${params.recipientName} just opened "${params.reportTitle}"`;
  return getResend().emails.send({
    from: fromAddress(),
    to,
    subject,
    html: notifyHtml(params),
  });
}
