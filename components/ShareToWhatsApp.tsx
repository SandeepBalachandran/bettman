"use client";

import { MessageCircle } from "lucide-react";

export function ShareToWhatsApp({ text, label = "Share to WhatsApp" }: { readonly text: string; readonly label?: string }) {
  const href = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-outline inline-flex items-center gap-1.5 text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4"
    >
      <MessageCircle size={16} className="text-[#25D366] shrink-0" />
      <span className="hidden xs:inline">{label}</span>
      <span className="xs:hidden">Share</span>
    </a>
  );
}
