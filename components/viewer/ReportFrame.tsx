"use client";

/**
 * Renders the report HTML as a full-viewport, chrome-free document via an
 * iframe srcDoc. The content is authored by Bani and trusted, so its own
 * scripts/styles run intact — we add no header, nav, or footer.
 */
export default function ReportFrame({ html, title }: { html: string; title: string }) {
  return (
    <iframe
      title={title}
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads allow-modals"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        border: "none",
        margin: 0,
        padding: 0,
      }}
    />
  );
}
