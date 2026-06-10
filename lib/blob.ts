import { put, list, del, head } from "@vercel/blob";

/**
 * Vercel Blob helpers. HTML report files are stored at `reports/{slug}.html`.
 * Blobs are uploaded with `access: "public"` (Vercel Blob's only mode), but the
 * URL is treated as a server-side secret: the viewer fetches it server-side and
 * never exposes it to the recipient's browser.
 */

function blobPath(slug: string): string {
  return `reports/${slug}.html`;
}

export async function uploadReportHtml(
  slug: string,
  content: string | Buffer | Blob
): Promise<{ url: string; pathname: string }> {
  const blob = await put(blobPath(slug), content, {
    access: "public",
    contentType: "text/html; charset=utf-8",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
  return { url: blob.url, pathname: blob.pathname };
}

/** Fetches the stored HTML for rendering. Server-side only. */
export async function fetchReportHtml(fileUrl: string): Promise<string> {
  const res = await fetch(fileUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch report HTML (${res.status})`);
  }
  return res.text();
}

export type BlobFile = {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
};

export async function listReportBlobs(): Promise<BlobFile[]> {
  const { blobs } = await list({ prefix: "reports/" });
  return blobs.map((b) => ({
    url: b.url,
    pathname: b.pathname,
    size: b.size,
    uploadedAt:
      b.uploadedAt instanceof Date ? b.uploadedAt.toISOString() : String(b.uploadedAt),
  }));
}

export async function deleteBlob(url: string): Promise<void> {
  await del(url);
}

export async function blobExists(url: string): Promise<boolean> {
  try {
    await head(url);
    return true;
  } catch {
    return false;
  }
}
