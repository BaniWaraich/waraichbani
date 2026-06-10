import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/api-guard";
import { getReportById, insertAccessToken, logActivity } from "@/lib/db";
import { generateToken } from "@/lib/tokens";
import { sendInviteEmail } from "@/lib/emails/invite";

export const runtime = "nodejs";

// POST /api/admin/tokens — invite another person to an existing report
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const reportId = String(body.reportId ?? "").trim();
  const recipientName = String(body.recipientName ?? "").trim();
  const recipientEmail = String(body.recipientEmail ?? "").trim();
  const notifyOnView = body.notifyOnView !== false;

  if (!reportId) return NextResponse.json({ error: "reportId is required." }, { status: 400 });
  if (!recipientName) return NextResponse.json({ error: "Recipient name is required." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipientEmail)) {
    return NextResponse.json({ error: "A valid recipient email is required." }, { status: 400 });
  }

  const report = await getReportById(reportId);
  if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  const token = generateToken();
  const accessToken = await insertAccessToken({
    reportId: report.id,
    token,
    recipientName,
    recipientEmail,
    notifyOnView,
  });

  let warning: string | undefined;
  try {
    await sendInviteEmail({
      recipientName,
      recipientEmail,
      reportTitle: report.title,
      slug: report.slug,
      token,
    });
    await logActivity(report.id, "invite_sent", `Invite sent to ${recipientEmail}`);
  } catch (err) {
    console.error("Failed to send invite email:", err);
    warning = "Token created, but the invite email failed to send.";
  }

  revalidatePath("/reports");
  return NextResponse.json({ token: accessToken, warning }, { status: 201 });
}
