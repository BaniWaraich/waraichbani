"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReportRow } from "@/lib/db";
import ReportsTable from "./ReportsTable";
import DetailPanel from "./DetailPanel";
import NewReportModal from "./NewReportModal";

export default function DashboardClient({ reports }: { reports: ReportRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedId = searchParams.get("report");

  const selectReport = (id: string) =>
    router.push(`/reports?report=${encodeURIComponent(id)}`);

  const closePanel = () => router.push("/reports");

  const refresh = () => router.refresh();

  const filtered = reports.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.slug.toLowerCase().includes(q) ||
      r.recipients.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by title, recipient, or slug…"
          className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
        />
        <button
          onClick={() => setModalOpen(true)}
          className="shrink-0 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          + New Report
        </button>
      </div>

      <ReportsTable
        reports={filtered}
        selectedId={selectedId}
        onSelect={selectReport}
      />

      {selectedId && (
        <DetailPanel
          reportId={selectedId}
          onClose={closePanel}
          onChanged={refresh}
        />
      )}

      {modalOpen && (
        <NewReportModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
