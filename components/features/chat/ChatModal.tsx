"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Send, Trash2, RotateCw, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { sendChatMessage, deleteChatMessage } from "@/actions/chat";

type ChatMessage = {
  id: string;
  text: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: string;
  };
};

const AVATAR_COLORS = ["bg-accent", "bg-secondary", "bg-highlight", "bg-success", "bg-danger"];

function avatarColorFor(userId: string) {
  const hash = [...userId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function CartoonAvatar({
  userId,
  name,
  avatarUrl,
}: {
  readonly userId: string;
  readonly name: string;
  readonly avatarUrl: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name.slice(0, 2).toUpperCase();

  if (failed) {
    return (
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColorFor(userId)}`}
      >
        {initials}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl || `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(userId)}`}
      alt=""
      width={32}
      height={32}
      className="h-8 w-8 shrink-0 rounded-full bg-gray-100 object-cover dark:bg-white/10"
      onError={() => setFailed(true)}
    />
  );
}

export function ChatModal({ isOpen, onClose }: { readonly isOpen: boolean; readonly onClose: () => void }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatMuted, setChatMuted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat/messages");
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setChatMuted(data.chatMuted);
        setIsAdmin(data.isAdmin);
      }
    } catch (error) {
      console.error("Error loading chat messages:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    loadMessages();
    fetch("/api/chat/mark-read", { method: "POST" }).catch(() => {});

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  if (!isOpen) return null;

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;

    startTransition(async () => {
      try {
        const message = await sendChatMessage({ text: trimmed });
        setMessages((prev) => [
          ...prev,
          { ...message, createdAt: message.createdAt.toISOString() },
        ]);
        setText("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to send message.");
      }
    });
  }

  function handleDelete(messageId: string) {
    startTransition(async () => {
      try {
        await deleteChatMessage(messageId);
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete message.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-600/40 p-3 backdrop-blur-sm">
      <div className="card flex h-[65vh] w-[90vw] max-w-lg flex-col overflow-hidden rounded-2xl sm:h-[80vh] sm:w-full">
        <div className="flex items-center justify-between border-b border-gray-200 p-3 dark:border-gray-700">
          <h2 className="text-base font-bold gradient-text">💬 Chat</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={loadMessages}
              disabled={loading}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
              title="Refresh"
              aria-label="Refresh"
            >
              <RotateCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
              title="Close"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3">
          <p className="text-center text-[11px] text-gray-400">Showing the last 50 messages</p>
          {loading && messages.length === 0 && (
            <p className="text-center text-sm text-gray-500">Loading…</p>
          )}
          {!loading && messages.length === 0 && (
            <p className="text-center text-sm text-gray-500">No messages yet. Say hello!</p>
          )}
          {messages.map((message) => {
            const isCurrentUser = message.user.id === session?.user?.id;
            return (
              <div key={message.id} className={`flex gap-2 ${isCurrentUser ? "flex-row-reverse" : ""}`}>
                <CartoonAvatar userId={message.user.id} name={message.user.name} avatarUrl={message.user.avatarUrl} />
                <div className={`flex max-w-[75%] flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                      {message.user.name}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(message.id)}
                        disabled={isPending}
                        className="text-gray-400 hover:text-danger"
                        title="Delete message"
                        aria-label="Delete message"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <div
                    className={`rounded-2xl px-3 py-1.5 text-sm ${
                      isCurrentUser ? "gradient-header text-white" : "bg-gray-100 dark:bg-white/10"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-200 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-gray-700">
          {chatMuted ? (
            <p className="text-center text-xs text-danger">You&apos;ve been muted by an admin.</p>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={text}
                maxLength={500}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message…"
                disabled={isPending}
                className="input-pill flex-1"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isPending || !text.trim()}
                className="btn gradient-header flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-0 text-white disabled:opacity-50"
                title="Send"
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
