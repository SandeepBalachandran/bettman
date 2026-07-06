"use client";

import { MessageCircle } from "lucide-react";

export function ShareToWhatsApp({ text, label = "Share to WhatsApp" }: { readonly text: string; readonly label?: string }) {
  const href = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-outline inline-flex items-center gap-1.5 text-sm"
    >
      <MessageCircle size={16} className="text-[#25D366]" />
      {label}
    </a>
  );
}
