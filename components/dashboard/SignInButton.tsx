"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInButton() {
  const [loading, setLoading] = useState(false);
  return (
    <button
      onClick={() => {
        setLoading(true);
        signIn("google", { callbackUrl: "/reports" });
      }}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
    >
      {loading ? "Redirecting…" : "Continue with Google"}
    </button>
  );
}
