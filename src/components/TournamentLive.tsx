"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { Radio, Play, Square, Tv, Youtube, Loader2, Link2 } from "lucide-react";

interface LiveRow {
  id: string;
  stream_url: string | null; // YouTube video ID
  is_live: boolean;
}

const TURNIR_MARKER = "TURNIR";

/** YouTube havolasi (yoki ID) dan video ID ni ajratib oladi. */
function parseYouTubeId(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s; // toza ID
  try {
    const url = new URL(s.startsWith("http") ? s : "https://" + s);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] || null;
    }
    const v = url.searchParams.get("v");
    if (v) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => ["live", "embed", "shorts", "v"].includes(p));
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  } catch {
    /* ignore */
  }
  return null;
}

export default function TournamentLive() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  const [stream, setStream] = useState<LiveRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [err, setErr] = useState("");

  const fetchLive = async () => {
    const { data } = await supabase
      .from("live_streams")
      .select("id, stream_url, is_live")
      .eq("game_name", TURNIR_MARKER)
      .eq("is_live", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setStream((data as LiveRow) || null);
    setLoading(false);
  };

  useEffect(() => {
    fetchLive();
    const t = setInterval(fetchLive, 15000);
    return () => clearInterval(t);
  }, []);

  const startLive = async () => {
    setErr("");
    const videoId = parseYouTubeId(linkInput);
    if (!videoId) {
      setErr("To'g'ri YouTube havolasini kiriting (masalan: https://youtube.com/live/XXXX yoki youtu.be/XXXX).");
      return;
    }
    setBusy(true);
    try {
      // Avvalgi turnir efirlarini yopamiz
      await supabase.from("live_streams").update({ is_live: false }).eq("game_name", TURNIR_MARKER).eq("is_live", true);
      const { data: inserted, error } = await supabase
        .from("live_streams")
        .insert({
          user_id: user?.id,
          title: "Turnir jonli efiri",
          game_name: TURNIR_MARKER,
          stream_url: videoId,
          stream_key: `youtube:${videoId}`,
          is_live: true,
        })
        .select("id, stream_url, is_live")
        .single();
      if (error) {
        setErr("Saqlashда xatolik: " + error.message);
        return;
      }
      setStream((inserted as LiveRow) || null);
      setLinkInput("");
    } catch (e: any) {
      setErr("Xatolik yuz berdi.");
    } finally {
      setBusy(false);
    }
  };

  const stopLive = async () => {
    setBusy(true);
    try {
      if (stream) await supabase.from("live_streams").update({ is_live: false }).eq("id", stream.id);
      setStream(null);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="skeleton h-72 w-full rounded-3xl" />;
  }

  return (
    <div className="space-y-6">
      {/* Jonli pleyer — hamma ko'radi */}
      {stream && stream.stream_url ? (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black shadow-card">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <span className="inline-flex items-center gap-2 text-sm font-display font-bold text-white">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              JONLI EFIR
            </span>
            <span className="chip">
              <Youtube size={13} className="text-primary" /> YouTube
            </span>
          </div>
          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${stream.stream_url}?autoplay=1&rel=0`}
              title="Turnir jonli efiri"
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-secondary">
            <Tv size={26} />
          </div>
          <p className="font-display text-lg font-bold text-white">Hozircha jonli efir yo'q</p>
          <p className="max-w-sm text-sm text-secondary">
            Turnir efirlari shu yerda jonli ko'rsatiladi. Efir boshlanganda avtomatik paydo bo'ladi.
          </p>
        </div>
      )}

      {/* Admin boshqaruvi */}
      {isAdmin ? (
        <div className="glass-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <Radio size={18} className="text-primary" />
            <h3 className="font-display text-base font-bold uppercase tracking-wide text-white">Efir boshqaruvi</h3>
            <span className="chip ml-auto">Faqat admin</span>
          </div>

          {err && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {err}
            </div>
          )}

          {stream ? (
            <button
              onClick={stopLive}
              disabled={busy}
              className="btn-outline gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />}
              Efirni to'xtatish
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-secondary">
                  YouTube jonli efir havolasi
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                    <input
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      placeholder="https://youtube.com/live/XXXXXXXX"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition-colors focus:border-primary/50"
                    />
                  </div>
                  <button onClick={startLive} disabled={busy} className="btn-primary shrink-0 gap-2 disabled:opacity-50">
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                    Efirni boshlash
                  </button>
                </div>
              </div>

              {/* Qisqa qo'llanma */}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs leading-relaxed text-secondary">
                <p className="mb-1.5 font-semibold text-white">Qanday efirga chiqiladi:</p>
                <ol className="list-inside list-decimal space-y-1">
                  <li>YouTube'да (telefon yoki OBS/Prism orqali) jonli efirni boshlang.</li>
                  <li>Efir <span className="text-white">havolasini</span> nusxalang (youtube.com/live/... yoki youtu.be/...).</li>
                  <li>Shu yerga qo'ying va <span className="text-white">«Efirni boshlash»</span> ni bosing.</li>
                  <li>Efir sayt ichida hammaga jonli ko'rinadi.</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
