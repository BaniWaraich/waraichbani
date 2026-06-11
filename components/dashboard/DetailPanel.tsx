"use client";

import { useCallback, useEffect, useState } from "react";
import type { Report, AccessToken, ActivityEvent, ReportView } from "@/lib/db";

type Detail = {
  report: Report;
  tokens: AccessToken[];
  activity: ActivityEvent[];
  views: ReportView[];
};

const ACTIVITY_LABEL: Record<string, string> = {
  published: "Report published",
  invite_sent: "Invite sent",
  token_revoked: "Access revoked",
  html_replaced: "HTML replaced",
  archived: "Report archived",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function DetailPanel({
  reportId,
  onClose,
  onChanged,
}: {
  reportId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/reports/${reportId}`);
    if (res.ok) setDetail(await res.json());
    setLoading(false);
  }, [reportId]);

  useEffect(() => {
    load();
  }, [load]);

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const reportUrl = detail ? `${baseUrl}/reports/${detail.report.slug}` : "";

  const copy = async () => {
    await navigator.clipboard.writeText(reportUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Update failed.");
      return;
    }
    await load();
    onChanged();
  };

  const revoke = async (tokenId: string) => {
    setBusy(true);
    await fetch(`/api/admin/tokens/${tokenId}/revoke`, { method: "POST" });
    setBusy(false);
    await load();
    onChanged();
  };

  const addRecipient = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reportId, recipientName: newName, recipientEmail: newEmail }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed to add recipient.");
      return;
    }
    setNewName("");
    setNewEmail("");
    setAdding(false);
    await load();
    onChanged();
  };

  const deleteReport = async () => {
    if (
      !confirm(
        `Permanently delete "${detail?.report.title ?? "this report"}"? This removes the report, all recipient access, and its view history. This cannot be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    await fetch(`/api/admin/reports/${reportId}`, { method: "DELETE" });
    setBusy(false);
    onChanged();
    onClose();
  };

  // Merge activity + views into one chronological feed.
  const feed = detail
    ? [
        ...detail.activity.map((a) => ({
          at: a.created_at,
          text: ACTIVITY_LABEL[a.kind] ?? a.kind,
          sub: a.detail ?? "",
        })),
        ...detail.views.map((v) => ({
          at: v.viewed_at,
          text: `${v.recipient_name} viewed the report`,
          sub: v.session_duration_seconds
            ? `${v.session_duration_seconds}s on page`
            : "",
        })),
      ].sort((a, b) => +new Date(b.at) - +new Date(a.at))
    : [];

  const notifyOn = detail ? detail.tokens.some((t) => t.notify_on_view) : false;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <aside className="relative z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-neutral-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 sm:px-6">
          <h2 className="text-sm font-semibold">Report details</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>

        {loading || !detail ? (
          <div className="p-6 text-sm text-neutral-500">Loading…</div>
        ) : (
          <div className="space-y-8 p-5 sm:p-6">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">{detail.report.title}</h3>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-700">
                  {reportUrl}
                </code>
                <button
                  onClick={copy}
                  className="shrink-0 rounded-lg border border-neutral-200 px-3 py-2 text-xs hover:bg-neutral-50"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            {/* Toggles */}
            <div className="space-y-3">
              <Toggle
                label="Notify me on view"
                checked={notifyOn}
                disabled={busy}
                onChange={(v) => patch({ notify_on_view: v })}
              />
              <Toggle
                label="Allow download"
                checked={detail.report.allow_download}
                disabled={busy}
                onChange={(v) => patch({ allow_download: v })}
              />
            </div>

            {/* Access tokens */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-medium">Access</h4>
                <button
                  onClick={() => setAdding((v) => !v)}
                  className="text-xs text-neutral-500 hover:text-ink"
                >
                  {adding ? "Cancel" : "+ Add recipient"}
                </button>
              </div>

              {adding && (
                <div className="mb-3 space-y-2 rounded-lg border border-neutral-200 p-3">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Recipient name"
                    className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-sm outline-none focus:border-neutral-400"
                  />
                  <input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="recipient@email.com"
                    className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-sm outline-none focus:border-neutral-400"
                  />
                  <button
                    onClick={addRecipient}
                    disabled={busy || !newName || !newEmail}
                    className="w-full rounded-md bg-ink px-3 py-1.5 text-sm text-white disabled:opacity-50"
                  >
                    Send invite
                  </button>
                </div>
              )}

              <ul className="space-y-2">
                {detail.tokens.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{t.recipient_name}</div>
                      <div className="truncate text-xs text-neutral-400">{t.recipient_email}</div>
                    </div>
                    {t.revoked ? (
                      <span className="text-xs text-red-600">Revoked</span>
                    ) : (
                      <button
                        onClick={() => revoke(t.id)}
                        disabled={busy}
                        className="text-xs text-neutral-500 hover:text-red-600"
                      >
                        Revoke
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Activity feed */}
            <div>
              <h4 className="mb-2 text-sm font-medium">Activity</h4>
              {feed.length === 0 ? (
                <p className="text-sm text-neutral-400">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {feed.map((e, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
                      <div>
                        <div className="text-ink">{e.text}</div>
                        {e.sub && <div className="text-xs text-neutral-400">{e.sub}</div>}
                        <div className="text-xs text-neutral-400">{fmt(e.at)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-neutral-200 pt-4">
              <button
                onClick={deleteReport}
                disabled={busy}
                className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 sm:w-auto"
              >
                Delete report
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      <span className="text-sm text-neutral-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-ink" : "bg-neutral-300"
        } disabled:opacity-50`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}
