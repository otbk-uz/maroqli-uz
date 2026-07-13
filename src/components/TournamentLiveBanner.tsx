"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Radio, Maximize2 } from "lucide-react";

/**
 * Turnirlar sahifasi tepasidagi KATTA jonli efir pleyeri.
 * Faqat efir jonli bo'lsa ko'rinadi — HAMMA (mehmon ham) ko'radi.
 */
export default function TournamentLiveBanner() {
  const [videoId, setVideoId] = useState<string | null>(null);

  const fetchLive = async () => {
    const { data } = await supabase
      .from("live_streams")
      .select("stream_url")
      .eq("game_name", "TURNIR")
      .eq("is_live", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setVideoId((data?.stream_url as string) || null);
  };

  useEffect(() => {
    fetchLive();
    const t = setInterval(fetchLive, 15000);
    return () => clearInterval(t);
  }, []);

  if (!videoId) return null;

  return (
    <section className="container-app mb-10">
      <div className="overflow-hidden rounded-3xl border border-primary/25 bg-black shadow-glow">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <span className="inline-flex items-center gap-2.5 font-display text-sm font-black uppercase tracking-wide text-white">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            Hozir jonli efirда
          </span>
          <div className="flex items-center gap-2">
            <span className="chip">
              <Radio size={13} className="text-primary" /> MAROQLI TV
            </span>
            <Link
              href="/tournaments/live"
              aria-label="To'liq ekran"
              className="hidden h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-secondary transition-colors hover:text-white sm:flex"
            >
              <Maximize2 size={14} />
            </Link>
          </div>
        </div>
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&color=white`}
            title="Turnir jonli efiri"
            className="absolute left-0 w-full"
            style={{ top: "-52px", height: "calc(100% + 52px)" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
