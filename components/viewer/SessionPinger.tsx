"use client";

import { useEffect } from "react";

/**
 * Pings /api/session-ping every 30s with elapsed seconds so session duration
 * can be tracked, plus a final beacon on unload. Authed by the report cookie.
 */
export default function SessionPinger({ slug }: { slug: string }) {
  useEffect(() => {
    const start = Date.now();
    const elapsed = () => Math.round((Date.now() - start) / 1000);

    const ping = (useBeacon = false) => {
      const payload = JSON.stringify({ slug, seconds: elapsed() });
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/session-ping",
          new Blob([payload], { type: "application/json" })
        );
      } else {
        fetch("/api/session-ping", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    const interval = setInterval(() => ping(false), 30_000);

    const onHidden = () => {
      if (document.visibilityState === "hidden") ping(true);
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", () => ping(true));

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHidden);
      ping(true);
    };
  }, [slug]);

  return null;
}
