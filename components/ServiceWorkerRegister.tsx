"use client";

import { useEffect } from "react";
// Side effect: start listening for the install prompt on every page.
import "@/lib/install-prompt";

/** Registers /sw.js on load so the installed app has its worker (push, offline shell). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal: the site still works without the worker.
    });
  }, []);

  return null;
}
