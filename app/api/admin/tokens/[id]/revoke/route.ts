import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/api-guard";
import { revokeToken, logActivity } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: { id: string } };

// POST /api/admin/tokens/[id]/revoke
export async function POST(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const token = await revokeToken(params.id);
  if (!token) return NextResponse.json({ error: "Token not found." }, { status: 404 });

  await logActivity(token.report_id, "token_revoked", `Access revoked for ${token.recipient_email}`);

  revalidatePath("/reports");
  return NextResponse.json({ ok: true });
}
