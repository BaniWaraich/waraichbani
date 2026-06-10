import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

/**
 * Guards an admin API route. Returns a 401 NextResponse if the caller is not
 * the authorized admin, or null if the request may proceed.
 *
 *   const denied = await requireAdmin();
 *   if (denied) return denied;
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (await isAdmin()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
