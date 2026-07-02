"use client";

import { createPortal } from "react-dom";

export function LoadingOverlay({
  show,
  label = "Working...",
}: {
  readonly show: boolean;
  readonly label?: string;
}) {
  if (!show || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="alert"
      aria-busy="true"
      aria-live="assertive"
    >
      <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-6 py-5 shadow-xl dark:bg-neutral-900">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-accent/30 border-t-accent" />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>,
    document.body
  );
}
