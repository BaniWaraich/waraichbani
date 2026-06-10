import { listReportsWithStats } from "@/lib/db";
import { listReportBlobs, type BlobFile } from "@/lib/blob";
import FileUploader from "@/components/cms/FileUploader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports — CMS" };

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function CmsPage() {
  let blobs: BlobFile[] = [];
  let blobError: string | null = null;
  try {
    blobs = await listReportBlobs();
  } catch {
    blobError = "Could not list Blob storage (check BLOB_READ_WRITE_TOKEN).";
  }

  const reports = await listReportsWithStats();
  const reportOptions = reports.map((r) => ({ id: r.id, title: r.title, slug: r.slug }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CMS</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Upload, preview, and replace the HTML behind your reports.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium">Upload / replace HTML</h2>
        <FileUploader reports={reportOptions} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium">Stored files</h2>
        {blobError ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{blobError}</p>
        ) : blobs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
            No files in Blob storage yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-medium">File</th>
                  <th className="px-5 py-3 font-medium">Size</th>
                  <th className="px-5 py-3 font-medium">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {blobs.map((b) => (
                  <tr key={b.pathname}>
                    <td className="px-5 py-3 font-mono text-xs text-neutral-700">{b.pathname}</td>
                    <td className="px-5 py-3 text-neutral-600">{fmtSize(b.size)}</td>
                    <td className="px-5 py-3 text-neutral-600">{fmtDate(b.uploadedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
