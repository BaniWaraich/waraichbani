import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import SignOutButton from "@/components/dashboard/SignOutButton";

/**
 * Auth guard for the entire admin area (/reports and /reports/cms).
 * Because this layout lives in the (admin) route group, it does NOT wrap the
 * public viewer at app/reports/[slug] — that subtree is physically separate.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) {
    redirect("/reports/signin");
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/reports" className="text-sm font-semibold tracking-tight">
              Reports
            </Link>
            <nav className="flex items-center gap-4 text-sm text-neutral-500">
              <Link href="/reports" className="hover:text-ink">
                Dashboard
              </Link>
              <Link href="/reports/cms" className="hover:text-ink">
                CMS
              </Link>
            </nav>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
