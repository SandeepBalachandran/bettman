"use client";

import { useEffect } from "react";

/** Scrolls the element with `targetId` to the middle of the screen once, after the page loads. */
export function ScrollIntoViewOnMount({ targetId }: { readonly targetId: string }) {
  useEffect(() => {
    document.getElementById(targetId)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [targetId]);

  return null;
}
