"use client";

import { useEffect, useRef } from "react";

export function useLessonHeartbeat(slug: string, lessonId: string) {
  const sentInitial = useRef(false);

  useEffect(() => {
    if (!lessonId) return;
    const endpoint = `/api/organizations/${encodeURIComponent(slug)}/learning/heartbeat`;

    const send = (type: "LESSON_STARTED" | "LESSON_HEARTBEAT" | "LESSON_PAUSED", durationMs?: number, beacon = false) => {
      const body = JSON.stringify({ lessonId, type, ...(durationMs !== undefined ? { durationMs } : {}), clientTimestamp: new Date().toISOString() });
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
        return;
      }
      void fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
    };

    if (!sentInitial.current) {
      sentInitial.current = true;
      send("LESSON_STARTED");
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") send("LESSON_HEARTBEAT", 30_000);
    }, 30_000);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") send("LESSON_PAUSED", undefined, false);
    };
    const onUnload = () => send("LESSON_PAUSED", undefined, true);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
      send("LESSON_PAUSED", undefined, false);
    };
  }, [slug, lessonId]);
}
