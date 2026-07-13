"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { Send, Users, MessageSquare } from "lucide-react";

interface Msg {
  id: number;
  author_id: string;
  message: string;
  created_at: string;
}

export default function LiveChat() {
  const { user, isAuthenticated } = useAuthStore();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [input, setInput] = useState("");
  const [viewers, setViewers] = useState(1);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadNames = async (ids: string[]) => {
    const missing = Array.from(new Set(ids.filter((id) => id))).filter((id) => !names[id]);
    if (missing.length === 0) return;
    const { data } = await supabase.from("profiles").select("id, username, full_name").in("id", missing);
    if (data) {
      setNames((prev) => {
        const n = { ...prev };
        (data as any[]).forEach((p) => (n[p.id] = p.username || p.full_name || "Foydalanuvchi"));
        return n;
      });
    }
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from("global_chat")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40);
    const msgs = ((data as Msg[]) || []).reverse();
    setMessages(msgs);
    loadNames(msgs.map((m) => m.author_id));
  };

  useEffect(() => {
    loadMessages();
    const poll = setInterval(loadMessages, 5000);

    // Tomoshabinlar soni — Supabase realtime presence
    const channel = supabase.channel("tournament-live-room", {
      config: { presence: { key: (user?.id as string) || Math.random().toString(36).slice(2) } },
    });
    channel.on("presence", { event: "sync" }, () => {
      setViewers(Object.keys(channel.presenceState()).length || 1);
    });
    channel.subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") await channel.track({ at: Date.now() });
    });

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !user?.id) return;
    setSending(true);
    setInput("");
    setNames((prev) => ({ ...prev, [user.id as string]: user.username || user.nickname || "Siz" }));
    const { error } = await supabase.from("global_chat").insert({ author_id: user.id, message: text });
    if (!error) loadMessages();
    else setInput(text);
    setSending(false);
  };

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden">
      {/* Header — tomoshabinlar soni */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="inline-flex items-center gap-2 font-display text-sm font-bold text-white">
          <MessageSquare size={16} className="text-primary" /> Jonli chat
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-white">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <Users size={12} className="text-secondary" />
          <span className="tabular-nums">{viewers}</span>
        </span>
      </div>

      {/* Xabarlar */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 no-scrollbar" style={{ maxHeight: 380, minHeight: 220 }}>
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-secondary">Hali izohlar yo'q. Birinchi bo'lib yozing!</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-[10px] font-black text-white">
                {(names[m.author_id] || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="mr-2 text-xs font-bold text-primary">{names[m.author_id] || "Foydalanuvchi"}</span>
                <span className="break-words text-sm text-white/90">{m.message}</span>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Yozish */}
      {isAuthenticated ? (
        <form onSubmit={send} className="flex items-center gap-2 border-t border-white/10 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Izoh yozing..."
            maxLength={300}
            className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-primary/50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Yuborish"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </form>
      ) : (
        <div className="border-t border-white/10 p-3 text-center text-xs text-secondary">
          Izoh yozish uchun <a href="/login" className="font-bold text-primary hover:underline">tizimga kiring</a>
        </div>
      )}
    </div>
  );
}
