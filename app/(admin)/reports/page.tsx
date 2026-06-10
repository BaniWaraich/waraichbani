import { getDashboardStats, listReportsWithStats } from "@/lib/db";
import StatsRow from "@/components/dashboard/StatsRow";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports — Dashboard" };

export default async function DashboardPage() {
  const [stats, reports] = await Promise.all([
    getDashboardStats(),
    listReportsWithStats(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Reports you&apos;ve published and who has access.
          </p>
        </div>
      </div>

      <StatsRow stats={stats} />

      <DashboardClient reports={reports} />
    </div>
  );
}
