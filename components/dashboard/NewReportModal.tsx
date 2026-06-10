"use client";

import { useState } from "react";
import { slugify } from "@/lib/slug";

export default function NewReportModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [notify, setNotify] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onTitle = (v: string) => {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) return setError("Please choose an HTML file.");
    if (!file.name.toLowerCase().endsWith(".html")) {
      return setError("Only .html files are allowed.");
    }

    setSubmitting(true);
    const form = new FormData();
    form.set("title", title);
    form.set("slug", slug);
    form.set("recipientName", recipientName);
    form.set("recipientEmail", recipientEmail);
    form.set("notifyOnView", String(notify));
    form.set("file", file);

    const res = await fetch("/api/admin/reports", { method: "POST", body: form });
    setSubmitting(false);

    if (!res.ok) {
      setError((await res.json()).error ?? "Something went wrong.");
      return;
    }
    const data = await res.json();
    if (data.warning) alert(data.warning);
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        style={{ maxHeight: "90vh" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">New report</h2>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-ink">
            ✕
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="space-y-4">
          <Field label="Report title">
            <input
              required
              value={title}
              onChange={(e) => onTitle(e.target.value)}
              className="input"
              placeholder="Q3 Growth Proposal"
            />
          </Field>

          <Field label="URL slug">
            <div className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 focus-within:border-neutral-400">
              <span className="text-sm text-neutral-400">/reports/</span>
              <input
                required
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                className="flex-1 bg-transparent py-2 text-sm outline-none"
                placeholder="q3-growth-proposal"
              />
            </div>
          </Field>

          <Field label="HTML file">
            <input
              type="file"
              accept=".html,text/html"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm hover:file:bg-neutral-200"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Recipient name">
              <input
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="input"
                placeholder="Jane Doe"
              />
            </Field>
            <Field label="Recipient email">
              <input
                required
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="input"
                placeholder="jane@company.com"
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Notify me when they open it
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {submitting ? "Publishing…" : "Publish & send invite"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</label>
      {children}
    </div>
  );
}
