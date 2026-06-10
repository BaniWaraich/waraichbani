import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import SignInButton from "@/components/dashboard/SignInButton";

export const metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  if (await isAdmin()) {
    redirect("/reports");
  }

  const error = searchParams.error;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight">Admin sign in</h1>
        <p className="mt-2 text-sm text-neutral-500">
          This area is private. Sign in with the authorized Google account.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error === "AccessDenied"
              ? "That account isn't authorized for this dashboard."
              : "Sign-in failed. Please try again."}
          </p>
        )}

        <div className="mt-6">
          <SignInButton />
        </div>
      </div>
    </main>
  );
}
