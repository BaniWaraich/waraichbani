import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * Admin auth. Only Bani's Google account (NEXTAUTH_ALLOWED_EMAIL) may sign in.
 * Everyone else is rejected at the signIn callback, so no session is ever issued
 * for an unauthorized account. Sessions are JWT-backed (no DB session table).
 */
/**
 * Read a required env var, failing loudly if it is missing or empty.
 * This turns a misconfigured deploy (e.g. an empty GOOGLE_CLIENT_ID) into an
 * immediate, named error instead of a cryptic Google "redirect_uri_mismatch".
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const allowedEmail = requireEnv("NEXTAUTH_ALLOWED_EMAIL").toLowerCase();

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: requireEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/reports/signin",
    error: "/reports/signin",
  },
  callbacks: {
    async signIn({ user }) {
      // Hard gate: only the one allowed email is ever permitted.
      if (!allowedEmail) return false;
      return (user.email ?? "").toLowerCase() === allowedEmail;
    },
    async jwt({ token, user }) {
      if (user?.email) token.email = user.email;
      return token;
    },
    async session({ session }) {
      return session;
    },
  },
};

/** True when the current request carries a valid admin session. */
export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  return !!email && email === allowedEmail;
}

export { getServerSession };
