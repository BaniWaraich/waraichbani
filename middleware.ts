import { NextRequest, NextResponse } from "next/server";

/**
 * Two responsibilities:
 *
 * 1. Rate-limit /api/validate-token to 20 req/min per IP (in-memory; per edge
 *    instance — good enough as a guardrail against brute force).
 *
 * 2. For /reports/{slug} requests carrying ?token=, validate the token against
 *    /api/validate-token, and on success set the httpOnly cookie + redirect to
 *    the clean URL. When no token query is present, the request passes through
 *    and the page validates the cookie server-side (rendering the report or an
 *    inline "no access" message). This keeps DB access out of the edge runtime.
 */

const RESERVED = new Set(["cms", "signin", "signout"]);
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// ---- naive in-memory rate limiter ----------------------------------------
const WINDOW_MS = 60_000;
const LIMIT = 20;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// The single canonical host. next-auth v4 (App Router) derives the OAuth
// redirect_uri from the *request* host, so a visit via the bare *.vercel.app
// alias produces a callback URL that isn't registered in Google → a
// redirect_uri_mismatch. Funnel that alias to the custom domain before any auth
// flow can start so the callback is always the registered one.
const CANONICAL_HOST = "waraichbani.com";
const REDIRECT_HOSTS = new Set(["waraichbani.vercel.app"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- 0. Canonical-host redirect -----------------------------------------
  const host = req.headers.get("host") ?? "";
  if (REDIRECT_HOSTS.has(host)) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  // --- 1. Rate-limit the validate-token endpoint --------------------------
  if (pathname === "/api/validate-token") {
    if (rateLimited(clientIp(req))) {
      return NextResponse.json(
        { valid: false, reason: "rate_limited" },
        { status: 429 }
      );
    }
    return NextResponse.next();
  }

  // --- 2. Token exchange for the viewer -----------------------------------
  // Match /reports/{slug} exactly (one segment), excluding reserved segments.
  const match = pathname.match(/^\/reports\/([^/]+)\/?$/);
  if (!match) return NextResponse.next();

  const slug = decodeURIComponent(match[1]);
  if (RESERVED.has(slug)) return NextResponse.next();

  const queryToken = req.nextUrl.searchParams.get("token");
  if (!queryToken) {
    // No token in URL — let the page validate any existing cookie.
    return NextResponse.next();
  }

  // Validate the query token against our own API.
  const origin = req.nextUrl.origin;
  let valid = false;
  try {
    const res = await fetch(`${origin}/api/validate-token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: queryToken, slug }),
    });
    valid = res.ok && (await res.json()).valid === true;
  } catch {
    valid = false;
  }

  // Redirect to the clean URL regardless; set the cookie only if valid.
  const cleanUrl = req.nextUrl.clone();
  cleanUrl.searchParams.delete("token");
  const redirect = NextResponse.redirect(cleanUrl);

  if (valid) {
    redirect.cookies.set(`report_token_${slug}`, queryToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: `/reports/${slug}`,
      maxAge: COOKIE_MAX_AGE,
    });
  }

  return redirect;
}

export const config = {
  matcher: ["/reports/:slug*", "/api/validate-token", "/api/auth/:path*"],
};
