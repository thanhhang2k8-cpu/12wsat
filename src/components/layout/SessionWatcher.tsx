"use client";

import { useEffect } from "react";

const POLL_MS = 15_000;

/**
 * Polls the server every ~15s so a revoked/suspended/deleted account (or a
 * device the admin removed) is kicked out of an already-open tab within the
 * ≤30s window, without waiting for the next navigation.
 */
export function SessionWatcher() {
  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/session/check", { cache: "no-store" });
        const data: { valid: boolean } = await res.json();
        if (!cancelled && !data.valid) {
          // Full reload (not router.push) so no stale client state survives a
          // revoked session.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/login";
        }
      } catch {
        // Network hiccup — don't kick the user out on a transient failure.
      }
    }

    const id = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return null;
}
