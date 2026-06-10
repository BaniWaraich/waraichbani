import { randomBytes } from "node:crypto";

// Re-export the client-safe slug helpers so existing server imports keep working.
export { validateSlug, slugify, type SlugValidation } from "./slug";

/** 256 bits of entropy, URL-safe. Not guessable. Server-only (node:crypto). */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}
