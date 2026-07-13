"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { Radio, Copy, Check, Play, Square, Tv, ShieldAlert, Loader2 } from "lucide-react";

interface LiveRow {
  id: string;
  cf_live_input_id: string | null;
  stream_url: string | null;
  stream_key: string | null;
  rtmp_url: string | null;
  is_live: boolean;
}

const TURNIR_MARKER = "TURNIR";

export default function TournamentLive() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  const [stream, setStream] = useState<LiveRow | null>(null);
  const [creds, setCreds] = useState<{ rtmpUrl: string; streamKey: string; uid: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const fetchLive = async () => {
    const { data } = await supabase
      .from("live_streams")
      .select("*")
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
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/streams/live", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${useAuthStore.getState().token || ""}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Efir yaratishda xatolik");
        return;
      }
      // Avvalgi turnir efirlarini yopamiz
      await supabase.from("live_streams").update({ is_live: false }).eq("game_name", TURNIR_MARKER).eq("is_live", true);
      // Yangi efir yozuvi
      const { data: inserted } = await supabase
        .from("live_streams")
        .insert({
          user_id: user?.id,
          title: "Turnir jonli efiri",
          game_name: TURNIR_MARKER,
          stream_key: data.streamKey,
          rtmp_url: data.rtmpUrl,
          stream_url: data.uid,
          cf_live_input_id: data.uid,
          is_live: true,
        })
        .select()
        .single();
      setCreds({ rtmpUrl: data.rtmpUrl, streamKey: data.streamKey, uid: data.uid });
      setStream((inserted as LiveRow) || null);
    } catch {
      setErr("Serverga ulanishda xatolik");
    } finally {
      setBusy(false);
    }
  };

  const stopLive = async () => {
    setBusy(true);
    try {
      if (stream) await supabase.from("live_streams").update({ is_live: false }).eq("id", stream.id);
      setStream(null);
      setCreds(null);
    } finally {
      setBusy(false);
    }
  };

  const copy = (label: string, val: string) => {
    navigator.clipboard?.writeText(val);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const playbackUid = stream?.cf_live_input_id || stream?.stream_url;

  if (loading) {
    return <div className="skeleton h-72 w-full rounded-3xl" />;
  }

  return (
    <div className="space-y-6">
      {/* Jonli pleyer — hamma ko'radi */}
      {stream && playbackUid ? (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black shadow-card">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <span className="inline-flex items-center gap-2 text-sm font-display font-bold text-white">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              JONLI EFIR
            </span>
            <span className="chip">Cloudflare Stream</span>
          </div>
          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={`https://iframe.videodelivery.net/${playbackUid}`}
              title="Turnir jonli efiri"
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
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
            <button onClick={startLive} disabled={busy} className="btn-primary gap-2 disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
              Efirni boshlash
            </button>
          )}

          {/* Prism Live / OBS uchun ulanish ma'lumotlari */}
          {creds && (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-secondary">
                Quyidagi manzil va kalitni <span className="font-semibold text-white">PRISM Live Studio</span> (yoki OBS) ga kiriting —
                Settings → Stream → Custom/RTMP:
              </p>
              {[
                { label: "Server (RTMP URL)", value: creds.rtmpUrl },
                { label: "Stream kaliti (maxfiy!)", value: creds.streamKey },
              ].map((f) => (
                <div key={f.label}>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-secondary">{f.label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={f.value}
                      className="w-full truncate rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
                    />
                    <button
                      onClick={() => copy(f.label, f.value)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-secondary transition-colors hover:text-white"
                      aria-label="Nusxa olish"
                    >
                      {copied === f.label ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
                <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                <span>Stream kalitini hech kimga bermang — u bilan sizning nomingizdan efirga chiqish mumkin.</span>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
