import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/api-guard";
import {
  listReportsWithStats,
  insertReport,
  insertAccessToken,
  slugExists,
  logActivity,
} from "@/lib/db";
import { uploadReportHtml } from "@/lib/blob";
import { generateToken, validateSlug } from "@/lib/tokens";
import { sendInviteEmail } from "@/lib/emails/invite";

export const runtime = "nodejs";

// GET /api/admin/reports — list all reports with token + view counts
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const reports = await listReportsWithStats();
  return NextResponse.json({ reports });
}

// POST /api/admin/reports — create report (upload HTML, insert rows, send invite)
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const title = String(form.get("title") ?? "").trim();
  const rawSlug = String(form.get("slug") ?? "").trim();
  const recipientName = String(form.get("recipientName") ?? "").trim();
  const recipientEmail = String(form.get("recipientEmail") ?? "").trim();
  const notifyOnView = String(form.get("notifyOnView") ?? "true") !== "false";
  const file = form.get("file");

  // --- Validation ----------------------------------------------------------
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (!recipientName) return NextResponse.json({ error: "Recipient name is required." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipientEmail)) {
    return NextResponse.json({ error: "A valid recipient email is required." }, { status: 400 });
  }

  const slugCheck = validateSlug(rawSlug);
  if (!slugCheck.ok) return NextResponse.json({ error: slugCheck.error }, { status: 400 });
  const slug = slugCheck.slug;

  if (await slugExists(slug)) {
    return NextResponse.json({ error: `Slug "${slug}" is already taken.` }, { status: 409 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "An HTML file is required." }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".html")) {
    return NextResponse.json({ error: "Only .html files are allowed." }, { status: 400 });
  }

  const html = await file.text();

  // --- Persist -------------------------------------------------------------
  let report;
  try {
    const { url } = await uploadReportHtml(slug, html);
    report = await insertReport({ title, slug, fileUrl: url });
  } catch (err) {
    console.error("Failed to upload/insert report:", err);
    return NextResponse.json({ error: "Failed to save the report." }, { status: 500 });
  }

  const token = generateToken();
  await insertAccessToken({
    reportId: report.id,
    token,
    recipientName,
    recipientEmail,
    notifyOnView,
  });

  await logActivity(report.id, "published", `Report "${title}" published`);

  // --- Invite email (best-effort; report is already created) ---------------
  let emailWarning: string | undefined;
  try {
    await sendInviteEmail({ recipientName, recipientEmail, reportTitle: title, slug, token });
    await logActivity(report.id, "invite_sent", `Invite sent to ${recipientEmail}`);
  } catch (err) {
    console.error("Failed to send invite email:", err);
    emailWarning = "Report created, but the invite email failed to send.";
  }

  revalidatePath("/reports");

  return NextResponse.json(
    { report, warning: emailWarning },
    { status: 201 }
  );
}
