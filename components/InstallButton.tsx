"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { getInstallPrompt, promptInstall, subscribeInstallPrompt } from "@/lib/install-prompt";

type Platform = "standalone" | "ios" | "other";

function detectPlatform(): Platform {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone) {
    return "standalone";
  }
  const isIos =
    /iphone|ipad|ipod/i.test(nav.userAgent) ||
    (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
  return isIos ? "ios" : "other";
}

/**
 * "Install app" button. Chrome/Edge/Android get the native install prompt;
 * iPhone/iPad (no prompt API) get Share → Add to Home Screen instructions.
 * Hidden when already running as an installed app or when the browser can't install.
 */
export function InstallButton({ className }: { readonly className?: string }) {
  const promptEvent = useSyncExternalStore(subscribeInstallPrompt, getInstallPrompt, () => null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Browser-only detection; render nothing on the server to avoid a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(detectPlatform());
  }, []);

  useEffect(() => {
    if (!showIosHelp) return;
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setShowIosHelp(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showIosHelp]);

  if (platform === null || platform === "standalone") return null;
  if (platform === "other" && !promptEvent) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={className}
        onClick={() => (promptEvent ? promptInstall() : setShowIosHelp((v) => !v))}
        aria-expanded={platform === "ios" ? showIosHelp : undefined}
      >
        <Download className="h-4 w-4 shrink-0" aria-hidden />
        <span>Install app</span>
      </button>

      {showIosHelp && (
        <div
          role="dialog"
          aria-label="Install Bettman"
          className="popover absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 p-3 text-left text-sm text-foreground"
        >
          <p className="font-semibold">Install Bettman</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-gray-600 dark:text-gray-400">
            <li>
              Tap the <strong>Share</strong> button in Safari&apos;s toolbar
            </li>
            <li>
              Choose <strong>Add to Home Screen</strong>
            </li>
            <li>
              Tap <strong>Add</strong>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
