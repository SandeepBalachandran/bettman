"use client";

import { useEffect, useRef, useState } from "react";
import { logout } from "@/actions/auth";

export function ProfileMenu({
  name,
  avatarUrl,
}: {
  readonly name: string;
  readonly avatarUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full p-1 transition hover:bg-white/10"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            width={32}
            height={32}
            className="h-9 w-9 shrink-0 rounded-full bg-white/10 object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
            {initial}
          </span>
        )}
        <span className="hidden text-sm font-medium text-white sm:inline">{name}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="popover absolute right-0 top-[calc(100%+0.5rem)] z-50 w-48 overflow-hidden p-1 text-foreground"
        >
          <div className="px-3 py-2 text-sm font-medium sm:hidden">{name}</div>
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
