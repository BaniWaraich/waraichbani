"use client";

import type { ReportRow } from "@/lib/db";

function statusFor(r: ReportRow): { label: string; className: string } {
  if (r.active_token_count === 0) {
    return { label: "Revoked", className: "bg-red-50 text-red-700" };
  }
  if (r.view_count > 0) {
    return { label: "Active", className: "bg-green-50 text-green-700" };
  }
  return { label: "Pending", className: "bg-amber-50 text-amber-700" };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ReportsTable({
  reports,
  selectedId,
  onSelect,
}: {
  reports: ReportRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (reports.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center text-sm text-neutral-500">
        No reports yet. Click <span className="font-medium">+ New Report</span> to publish one.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-5 py-3 font-medium">Title</th>
            <th className="px-5 py-3 font-medium">Recipient(s)</th>
            <th className="px-5 py-3 font-medium">Sent</th>
            <th className="px-5 py-3 font-medium text-right">Views</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {reports.map((r) => {
            const status = statusFor(r);
            return (
              <tr
                key={r.id}
                onClick={() => onSelect(r.id)}
                className={`cursor-pointer transition hover:bg-neutral-50 ${
                  selectedId === r.id ? "bg-neutral-50" : ""
                }`}
              >
                <td className="px-5 py-4">
                  <div className="font-medium text-ink">{r.title}</div>
                  <div className="text-xs text-neutral-400">/reports/{r.slug}</div>
                </td>
                <td className="px-5 py-4 text-neutral-600">
                  {r.recipient_count === 0 ? (
                    <span className="text-neutral-400">—</span>
                  ) : r.recipient_count === 1 ? (
                    r.recipients
                  ) : (
                    `${r.recipient_count} recipients`
                  )}
                </td>
                <td className="px-5 py-4 text-neutral-600">{formatDate(r.created_at)}</td>
                <td className="px-5 py-4 text-right tabular-nums text-neutral-600">
                  {r.view_count}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                  >
                    {status.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
