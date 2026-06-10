import { NextRequest, NextResponse } from "next/server";
import { validateAccess } from "@/lib/access";

export const runtime = "nodejs";

// POST /api/validate-token  { token, slug } -> { valid: boolean, reason?: string }
// No auth: this is the gate the middleware calls to check a recipient's token.
// Rate-limited to 20 req/min per IP in middleware.ts.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const slug = typeof body.slug === "string" ? body.slug : "";

  if (!token || !slug) {
    return NextResponse.json({ valid: false, reason: "missing" }, { status: 400 });
  }

  const result = await validateAccess(token, slug);
  if (result.ok) {
    return NextResponse.json({ valid: true });
  }
  return NextResponse.json({ valid: false, reason: result.reason });
}
