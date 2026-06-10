import { getTokenByValue, getReportBySlug, type AccessToken, type Report } from "@/lib/db";

export type AccessResult =
  | { ok: true; token: AccessToken; report: Report }
  | { ok: false; reason: "missing" | "invalid" | "revoked" | "mismatch" | "archived" };

/**
 * Server-side source of truth for "may this token view this slug?".
 * Used by both /api/validate-token (called from middleware) and the viewer page.
 */
export async function validateAccess(
  tokenValue: string | undefined | null,
  slug: string
): Promise<AccessResult> {
  if (!tokenValue) return { ok: false, reason: "missing" };

  const token = await getTokenByValue(tokenValue);
  if (!token) return { ok: false, reason: "invalid" };
  if (token.revoked) return { ok: false, reason: "revoked" };

  const report = await getReportBySlug(slug);
  if (!report) return { ok: false, reason: "invalid" };
  if (report.archived) return { ok: false, reason: "archived" };
  if (token.report_id !== report.id) return { ok: false, reason: "mismatch" };

  return { ok: true, token, report };
}

export function cookieNameForSlug(slug: string): string {
  return `report_token_${slug}`;
}
