import type { DashboardStats } from "@/lib/db";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="mt-1 text-sm text-neutral-500">{label}</div>
    </div>
  );
}

export default function StatsRow({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Stat label="Total Reports" value={stats.total_reports} />
      <Stat label="Active Access" value={stats.active_access} />
      <Stat label="Viewed" value={stats.viewed_reports} />
      <Stat label="Revoked" value={stats.revoked_tokens} />
    </div>
  );
}
