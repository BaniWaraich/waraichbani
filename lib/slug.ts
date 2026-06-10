// Pure, dependency-free slug helpers — safe to import from client components.

const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "cms",
  "auth",
  "signin",
  "signout",
  "reports",
]);

const SLUG_RE = /^[a-z0-9-]+$/;

export type SlugValidation =
  | { ok: true; slug: string }
  | { ok: false; error: string };

/** Validates and normalizes a slug per the security rules. */
export function validateSlug(input: string): SlugValidation {
  const slug = (input ?? "").trim().toLowerCase();
  if (!slug) return { ok: false, error: "Slug is required." };
  if (slug.length > 80) return { ok: false, error: "Slug must be 80 characters or fewer." };
  if (!SLUG_RE.test(slug)) {
    return { ok: false, error: "Slug may only contain lowercase letters, numbers, and hyphens." };
  }
  if (slug.startsWith("-") || slug.endsWith("-")) {
    return { ok: false, error: "Slug cannot start or end with a hyphen." };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, error: `"${slug}" is a reserved word.` };
  }
  return { ok: true, slug };
}

/** Turns an arbitrary title into a candidate slug. */
export function slugify(title: string): string {
  return (title ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-$/, "");
}
