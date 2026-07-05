"use client";

import { useState } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";

export type ComboboxPlayer = { id: string; name: string; photoUrl?: string | null };

export function PlayerCombobox({
  players,
  value,
  onChange,
  placeholder,
  excludeIds,
}: {
  readonly players: ComboboxPlayer[];
  readonly value: string;
  readonly onChange: (playerId: string) => void;
  readonly placeholder: string;
  /** Player ids already picked in other scorer slots — shown disabled, not hidden. */
  readonly excludeIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = players.find((p) => p.id === value) ?? null;
  const filtered = players.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));

  function close() {
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="input-pill flex w-full items-center gap-2 text-left"
      >
        {selected ? (
          <>
            <PlayerAvatar name={selected.name} photoUrl={selected.photoUrl} size={20} />
            <span className="truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </button>

      {open && (
        <>
          {/* Fixed bottom-sheet instead of anchoring under the trigger — anchored
              popups collide with whatever's below them (e.g. the submit button)
              when a scorer slot near the bottom of the form is opened on a small
              mobile screen. A fixed sheet + backdrop always renders cleanly. */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={close}
            aria-hidden="true"
          />
          <div className="card fixed inset-x-4 bottom-4 z-50 max-h-[70vh] space-y-1 p-2 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:w-96 sm:-translate-x-1/2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players..."
              className="input-pill w-full text-sm"
            />
            <div className="max-h-[calc(70vh-3.5rem)] overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  close();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-gray-400 hover:bg-black/5 dark:hover:bg-white/10"
              >
                None
              </button>
              {filtered.length === 0 && (
                <p className="px-2 py-1.5 text-sm text-gray-400">No players match.</p>
              )}
              {filtered.map((player) => {
                const isExcluded = excludeIds.includes(player.id) && player.id !== value;
                return (
                  <button
                    key={player.id}
                    type="button"
                    disabled={isExcluded}
                    onClick={() => {
                      onChange(player.id);
                      close();
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                      isExcluded
                        ? "cursor-not-allowed opacity-40"
                        : player.id === value
                          ? "bg-accent/10 text-accent"
                          : "hover:bg-black/5 dark:hover:bg-white/10"
                    }`}
                  >
                    <PlayerAvatar name={player.name} photoUrl={player.photoUrl} size={24} />
                    <span className="truncate">{player.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
