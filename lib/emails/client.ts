import { Resend } from "resend";

let cached: Resend | null = null;

/** Lazily constructs the Resend client so a missing key doesn't crash at import. */
export function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set.");
  }
  if (!cached) cached = new Resend(process.env.RESEND_API_KEY);
  return cached;
}

export function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "reports@waraichbani.com";
}

export function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    "https://waraichbani.com"
  );
}
