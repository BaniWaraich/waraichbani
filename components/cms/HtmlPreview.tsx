"use client";

/**
 * Renders untrusted/preview HTML in a sandboxed iframe. We use srcDoc with
 * sandbox="allow-scripts" (no allow-same-origin), so the preview cannot reach
 * cookies or same-origin APIs — safe for previewing a file before saving.
 */
export default function HtmlPreview({ html }: { html: string }) {
  return (
    <iframe
      title="HTML preview"
      srcDoc={html}
      sandbox="allow-scripts"
      className="h-[480px] w-full rounded-lg border border-neutral-200 bg-white"
    />
  );
}
