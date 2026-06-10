"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HtmlPreview from "./HtmlPreview";

type ReportOption = { id: string; title: string; slug: string };

export default function FileUploader({ reports }: { reports: ReportOption[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [html, setHtml] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const accept = async (f: File | undefined) => {
    setError(null);
    setDone(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".html")) {
      setError("Only .html files are allowed.");
      return;
    }
    setFile(f);
    setHtml(await f.text());
  };

  const reset = () => {
    setFile(null);
    setHtml("");
    setProgress(0);
    setDone(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Use XHR so we can show real upload progress.
  const upload = () => {
    if (!file || !targetId) {
      setError("Choose a file and a target report.");
      return;
    }
    setUploading(true);
    setError(null);
    setProgress(0);

    const form = new FormData();
    form.set("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("PATCH", `/api/admin/reports/${targetId}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress(100);
        const target = reports.find((r) => r.id === targetId);
        setDone(`HTML replaced for "${target?.title ?? "report"}".`);
        reset();
        router.refresh();
      } else {
        try {
          setError(JSON.parse(xhr.responseText).error ?? "Upload failed.");
        } catch {
          setError("Upload failed.");
        }
      }
    };
    xhr.onerror = () => {
      setUploading(false);
      setError("Network error during upload.");
    };
    xhr.send(form);
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition ${
          dragOver ? "border-ink bg-neutral-50" : "border-neutral-300 bg-white"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".html,text/html"
          className="hidden"
          onChange={(e) => accept(e.target.files?.[0])}
        />
        <p className="text-sm font-medium">
          {file ? file.name : "Drop an .html file here, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          {file
            ? `${(file.size / 1024).toFixed(1)} KB`
            : "Only .html files are accepted"}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {done && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{done}</p>
      )}

      {file && (
        <>
          <div>
            <h4 className="mb-2 text-sm font-medium">Live preview</h4>
            <HtmlPreview html={html} />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Replace HTML for report
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="input"
              >
                <option value="">Select a report…</option>
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} (/reports/{r.slug})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={upload}
              disabled={uploading || !targetId}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {uploading ? `Uploading… ${progress}%` : "Save"}
            </button>
            <button
              onClick={reset}
              disabled={uploading}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Clear
            </button>
          </div>

          {uploading && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full bg-ink transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
