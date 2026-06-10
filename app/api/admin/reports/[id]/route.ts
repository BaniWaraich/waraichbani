import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/api-guard";
import {
  sql,
  getReportById,
  getTokensForReport,
  getActivityForReport,
  getRecentViewsForReport,
  archiveReport,
  revokeAllTokensForReport,
  slugExists,
  logActivity,
} from "@/lib/db";
import { uploadReportHtml } from "@/lib/blob";
import { validateSlug } from "@/lib/tokens";

export const runtime = "nodejs";

type Params = { params: { id: string } };

// GET — full detail for the dashboard side panel (report + tokens + activity)
export async function GET(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const report = await getReportById(params.id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [tokens, activity, views] = await Promise.all([
    getTokensForReport(report.id),
    getActivityForReport(report.id),
    getRecentViewsForReport(report.id),
  ]);

  return NextResponse.json({ report, tokens, activity, views });
}

// PATCH — update title / slug / allow_download / notify_on_view / replace HTML
export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const report = await getReportById(params.id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";

  // Replace the HTML file (multipart) -------------------------------------
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "An HTML file is required." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".html")) {
      return NextResponse.json({ error: "Only .html files are allowed." }, { status: 400 });
    }
    const html = await file.text();
    const { url } = await uploadReportHtml(report.slug, html);
    await sql`UPDATE reports SET file_url = ${url}, updated_at = NOW() WHERE id = ${report.id}`;
    await logActivity(report.id, "html_replaced", "Report HTML replaced");
    revalidatePath("/reports");
    revalidatePath(`/reports/${report.slug}`);
    return NextResponse.json({ ok: true, file_url: url });
  }

  // Metadata / toggle update (JSON) ---------------------------------------
  const body = await req.json().catch(() => ({}));
  const updates: string[] = [];

  if (typeof body.title === "string" && body.title.trim()) {
    await sql`UPDATE reports SET title = ${body.title.trim()}, updated_at = NOW() WHERE id = ${report.id}`;
    updates.push("title");
  }

  if (typeof body.slug === "string" && body.slug !== report.slug) {
    const check = validateSlug(body.slug);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
    if (await slugExists(check.slug)) {
      return NextResponse.json({ error: `Slug "${check.slug}" is already taken.` }, { status: 409 });
    }
    await sql`UPDATE reports SET slug = ${check.slug}, updated_at = NOW() WHERE id = ${report.id}`;
    updates.push("slug");
  }

  if (typeof body.allow_download === "boolean") {
    await sql`UPDATE reports SET allow_download = ${body.allow_download}, updated_at = NOW() WHERE id = ${report.id}`;
    updates.push("allow_download");
  }

  // Per-report convenience: apply notify toggle to all of the report's tokens.
  if (typeof body.notify_on_view === "boolean") {
    await sql`UPDATE access_tokens SET notify_on_view = ${body.notify_on_view} WHERE report_id = ${report.id}`;
    updates.push("notify_on_view");
  }

  revalidatePath("/reports");
  return NextResponse.json({ ok: true, updated: updates });
}

// DELETE — soft delete: revoke all tokens + archive the report
export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const report = await getReportById(params.id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await revokeAllTokensForReport(report.id);
  await archiveReport(report.id);
  await logActivity(report.id, "archived", "Report archived; all tokens revoked");

  revalidatePath("/reports");
  return NextResponse.json({ ok: true });
}
