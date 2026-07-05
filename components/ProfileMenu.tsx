"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { logout } from "@/actions/auth";

export function ProfileMenu({ name }: { readonly name: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Standard next-themes hydration guard: theme is unknown on the server,
    // so we render a neutral state until after mount to avoid a mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const isDark = theme === "dark";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full px-1.5 py-1 transition hover:bg-white/20"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/25 text-sm font-bold text-white">
          {initial}
        </span>
        <span className="hidden text-sm font-medium text-white sm:inline">{name}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="popover absolute right-0 top-[calc(100%+0.5rem)] z-50 w-48 overflow-hidden p-1 text-foreground"
        >
          <div className="px-3 py-2 text-sm font-medium sm:hidden">{name}</div>
          <button
            type="button"
            role="menuitem"
            disabled={!mounted}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-accent/10 disabled:opacity-50"
          >
            {mounted ? (isDark ? "☀️ Light mode" : "🌙 Dark mode") : "Toggle theme"}
          </button>
          <form action={logout}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-danger transition hover:bg-danger/10"
            >
              🚪 Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
