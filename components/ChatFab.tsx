"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChatModal } from "@/components/features/chat/ChatModal";

export function ChatFab() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session) return;

    const refreshUnreadCount = async () => {
      try {
        const flagsRes = await fetch("/api/feature-flags");
        if (flagsRes.ok) {
          const flags = await flagsRes.json();
          if (flags.chat === false) {
            setFeatureEnabled(false);
            return;
          }
          setFeatureEnabled(true);
        }

        const countRes = await fetch("/api/chat/unread-count");
        if (countRes.ok) {
          const data = await countRes.json();
          setUnreadCount(data.count);
        }
      } catch (error) {
        console.error("Error refreshing chat unread count:", error);
      }
    };

    refreshUnreadCount();
    // Re-check on every navigation so the badge stays current without polling.
  }, [session, pathname]);

  if (!session || !featureEnabled) return null;

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setUnreadCount(0);
        }}
        className="fixed bottom-40 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-2xl text-white shadow-lg transition-all hover:bg-secondary/90 hover:shadow-xl"
        title="Chat"
      >
        <span>💬</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <ChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
