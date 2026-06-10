import { NextRequest, NextResponse } from "next/server";
import { validateAccess, cookieNameForSlug } from "@/lib/access";
import { getTodaysViewEvent, updateSessionDuration } from "@/lib/db";

export const runtime = "nodejs";

// POST /api/session-ping  { slug, seconds }
// Authed by the report_token_{slug} cookie. Bumps today's view event duration.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const slug = typeof body.slug === "string" ? body.slug : "";
  const seconds = Number.isFinite(body.seconds) ? Math.max(0, Math.floor(body.seconds)) : 0;

  if (!slug) return NextResponse.json({ ok: false }, { status: 400 });

  const tokenValue = req.cookies.get(cookieNameForSlug(slug))?.value;
  const access = await validateAccess(tokenValue, slug);
  if (!access.ok) return NextResponse.json({ ok: false }, { status: 401 });

  const event = await getTodaysViewEvent(access.token.id);
  if (event) {
    await updateSessionDuration(event.id, seconds);
  }

  return NextResponse.json({ ok: true });
}
