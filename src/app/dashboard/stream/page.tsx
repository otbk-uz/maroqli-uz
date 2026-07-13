"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Radio, Copy, Check, Eye, EyeOff, Save, ExternalLink, Monitor, Smartphone, Info, AlertCircle } from "lucide-react";

interface StreamSettings {
  id: string;
  title: string;
  game_name: string;
  stream_key: string;
  donation_url: string;
  is_live: boolean;
}

export default function StreamDashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  
  const [settings, setSettings] = useState<StreamSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [guideTab, setGuideTab] = useState<"PC" | "MOBILE">("MOBILE");
  const [hasHydrated, setHasHydrated] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("");
  const [donationUrl, setDonationUrl] = useState("");
  const [isLive, setIsLive] = useState(false);

  // Dummy Server URL for MUX / OBS
  const SERVER_URL = "rtmps://global-live.mux.com:5222/app";

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchSettings();
  }, [isAuthenticated, router, hasHydrated]);

  const fetchSettings = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      // Call the MUX backend API to get or create stream keys
      const res = await fetch("/api/streams/setup", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${useAuthStore.getState().token || ""}`
        },
        body: JSON.stringify({ userId: user.id }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to setup stream");

      if (data.stream) {
        setSettings(data.stream);
        setTitle(data.stream.title || "");
        setGame(data.stream.game_name || "");
        setDonationUrl(data.stream.donation_url || "");
        setIsLive(data.stream.is_live || false);
      }
    } catch (err: any) {
      console.error("Error fetching stream settings:", err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !settings) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("live_streams")
        .update({
          title,
          game_name: game,
          donation_url: donationUrl,
        })
        .eq("id", settings.id);

      if (error) throw error;
      alert("Sozlamalar saqlandi!");
    } catch (err) {
      console.error("Error saving stream settings:", err);
      alert("Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const toggleLiveStatus = async () => {
    if (!user || !settings) return;
    const newStatus = !isLive;
    
    try {
      setIsLive(newStatus);
      await supabase
        .from("live_streams")
        .update({ is_live: newStatus })
        .eq("id", settings.id);
    } catch (err) {
      console.error("Error toggling live status", err);
      setIsLive(!newStatus); // revert on error
    }
  };
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (!confirm("Efir kalitini yangilamoqchimisiz? Eskisi bekor qilinadi va OBS-ga yangi kalitni kiritishingiz kerak bo'ladi.")) return;
    if (!user) return;
    try {
      setRegenerating(true);
      const res = await fetch("/api/streams/setup", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${useAuthStore.getState().token || ""}`
        },
        body: JSON.stringify({ userId: user.id, forceRegenerate: true }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to setup stream");

      if (data.stream) {
        setSettings(data.stream);
        setTitle(data.stream.title || "");
        setGame(data.stream.game_name || "");
        setDonationUrl(data.stream.donation_url || "");
        setIsLive(data.stream.is_live || false);
        alert("Yangi efir kaliti yaratildi! Iltimos OBS sozlamalarini yangilang.");
      }
    } catch (err: any) {
      console.error("Error regenerating stream:", err);
      alert(err.message || "Xatolik yuz berdi");
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!hasHydrated || loading) {
    return (
      <main className="min-h-screen bg-background text-white">
        <Navbar />
        <div className="container mx-auto px-4 pt-32 text-center text-secondary">
          Yuklanmoqda...
        </div>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="min-h-screen bg-background text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center container mx-auto px-4 pt-32 pb-20">
          <div className="glass-card p-8 rounded-3xl border border-red-500/30 bg-red-500/10 text-center max-w-lg shadow-xl shadow-red-500/5">
            <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black mb-2 text-white">Ruxsat etilmagan</h2>
            <p className="text-secondary mb-6">{errorMsg}</p>
            <button
              onClick={() => router.push("/tournaments")}
              className="bg-primary hover:bg-primary-hover text-white py-3 px-6 rounded-xl font-bold transition-all"
            >
              Turnirlarni ko'rish
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-white">
      <Navbar />

      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black mb-2 flex items-center gap-3">
            <Radio className="text-primary" size={32} />
            Streamer Boshqaruvi
          </h1>
          <p className="text-secondary">Jonli efir ma'lumotlarini tahrirlang va OBS sozlamalarini oling.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Form & Guides */}
          <div className="md:col-span-2 space-y-6">
            <form onSubmit={handleSave} className="glass-card p-6 md:p-8 rounded-3xl border border-white/5 space-y-6 shadow-xl">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold">Efir Ma'lumotlari</h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-secondary">Holat:</span>
                  <button
                    type="button"
                    onClick={toggleLiveStatus}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                      isLive ? "bg-green-500" : "bg-white/10"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        isLive ? "translate-x-8" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className={`text-sm font-black uppercase ${isLive ? "text-green-400 animate-pulse" : "text-white/30"}`}>
                    {isLive ? "LIVE" : "OFFLINE"}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">Sarlavha</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#18181c] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                  placeholder="Efir nomini kiriting"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">O'yin Nomi</label>
                <input
                  type="text"
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                  className="w-full bg-[#18181c] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                  placeholder="Masalan: CS2, Dota 2, yoki Just Chatting"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">Donat Linki (Ixtiyoriy)</label>
                <input
                  type="url"
                  value={donationUrl}
                  onChange={(e) => setDonationUrl(e.target.value)}
                  className="w-full bg-[#18181c] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                  placeholder="https://donat.uz/..."
                />
              </div>

              <div className="pt-4 border-t border-white/5 flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary hover:bg-primary-hover text-white py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  <Save size={18} /> {saving ? "Saqlanmoqda..." : "Saqlash"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/streams/${user?.username}`)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink size={18} /> Kanalni ko'rish
                </button>
              </div>
            </form>

            {/* How to stream guides */}
            <div className="glass-card p-6 md:p-8 rounded-3xl border border-white/5 space-y-6 shadow-xl">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Info size={20} className="text-primary" /> Efirni qanday boshlayman?
              </h2>

              {/* Guide Tabs */}
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-full">
                <button
                  onClick={() => setGuideTab("MOBILE")}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${
                    guideTab === "MOBILE" ? "bg-primary text-white" : "text-secondary hover:text-white"
                  }`}
                >
                  <Smartphone size={16} /> Telefon orqali
                </button>
                <button
                  onClick={() => setGuideTab("PC")}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${
                    guideTab === "PC" ? "bg-primary text-white" : "text-secondary hover:text-white"
                  }`}
                >
                  <Monitor size={16} /> Kompyuter orqali
                </button>
              </div>

              {guideTab === "MOBILE" ? (
                <div className="space-y-4 text-sm text-secondary/90 leading-relaxed">
                  <p>Siz telefoningizda (PUBG, Mobile Legends, Free Fire) o'ynayotgan o'yiningizni ushbu saytda namoyish qilish uchun maxsus ilovadan foydalanishingiz kerak.</p>
                  
                  <div className="space-y-3">
                    <div className="flex gap-3 bg-white/5 p-4 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">1</div>
                      <div>
                        <strong className="text-white">Ilovani yuklab oling:</strong>
                        <p>Play Market (Android) yoki App Store (iOS) ga kiring va <strong>PRISM Live Studio</strong> yoki <strong>Streamlabs</strong> ilovasini telefoningizga yuklab oling.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 bg-white/5 p-4 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">2</div>
                      <div>
                        <strong className="text-white">Ulanishni sozlash:</strong>
                        <p>Ilovaga kiring, ulanish turlari (Destinations) joyidan <strong>"Custom RTMP"</strong> (Boshqa turdagi) opsiyasini tanlang.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 bg-white/5 p-4 rounded-xl border border-primary/20">
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">3</div>
                      <div>
                        <strong className="text-primary">Kalitlarni kiritish (Juda muhim):</strong>
                        <p>Ilova sizdan <strong>Stream URL</strong> va <strong>Stream Key</strong> so'raydi. O'ng tomondagi (kompyuterda) yoki pastdagi "OBS Sozlamalari" oqnasidan manzil va kalitni nusxalab aynan o'sha joyga yozing.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 bg-white/5 p-4 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">4</div>
                      <div>
                        <strong className="text-white">O'yinni boshlang:</strong>
                        <p>Ilovada <strong>"Screen Cast"</strong> (Ekranni uzatish) tugmasini bosib Go Live qiling va o'yiningizga kiring. Tabriklaymiz, siz Maroqli.uz da jonli efirdasiz!</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-sm text-secondary/90 leading-relaxed">
                  <p>Kompyuterda o'yin (CS2, Dota 2, GTA 5) ekranini efirga uzatish uchun asosan <strong>OBS Studio</strong> ishlatiladi.</p>
                  
                  <div className="space-y-3">
                    <div className="flex gap-3 bg-white/5 p-4 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">1</div>
                      <div>
                        <strong className="text-white">Dasturni o'rnatish:</strong>
                        <p>Kompyuteringizga obsproject.com saytidan <strong>OBS Studio</strong> dasturini yuklab o'rnating.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 bg-white/5 p-4 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">2</div>
                      <div>
                        <strong className="text-white">Sozlamalarga kirish:</strong>
                        <p>OBS ni ochib, pastki o'ng burchakdagi <strong>Settings</strong> (Sozlamalar) -&gt; <strong>Stream</strong> bo'limiga kiring.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 bg-white/5 p-4 rounded-xl border border-primary/20">
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">3</div>
                      <div>
                        <strong className="text-primary">Kalitlarni ulash:</strong>
                        <p>Service (Xizmat) joyidan <strong>Custom...</strong> ni tanlang. O'ng tomondagi panelda ko'rsatilgan <strong>Server URL</strong> va <strong>Stream Key</strong> dan nusxa olib, OBS'ga xuddi shu nomli maydonlarga joylashtiring (Paste qiling).</p>
                      </div>
                    </div>

                    <div className="flex gap-3 bg-white/5 p-4 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0">4</div>
                      <div>
                        <strong className="text-white">Efirga chiqish:</strong>
                        <p>OBS'da asosiya oynaga qaytib <strong>"Start Streaming"</strong> (Efirni boshlash) tugmasini bosing va Maroqli.uz dagi kanalingizga o'tib natijani ko'ring!</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* OBS Settings Sidebar */}
          <div className="md:col-span-1 space-y-6">
            <div className="glass-card p-6 rounded-3xl border border-white/5 shadow-xl bg-gradient-to-b from-white/[0.02] to-transparent">
              <h2 className="text-lg font-bold mb-4">OBS Sozlamalari</h2>
              <p className="text-xs text-secondary mb-6 leading-relaxed">
                Ushbu ma'lumotlarni OBS Studio yoki Streamlabs dasturlarining <strong>Stream</strong> bo'limiga kiriting. Server turi qilib "Custom..." ni tanlang.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-secondary uppercase tracking-wider mb-1 block">Server URL</label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={SERVER_URL}
                      className="w-full bg-black/40 border border-white/10 rounded-lg pl-3 pr-10 py-2 text-xs font-mono text-white/90"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(SERVER_URL)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-secondary hover:text-white transition-colors"
                      title="Nusxa olish"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-secondary uppercase tracking-wider mb-1 block">Stream Key (Efir Kaliti)</label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      readOnly
                      value={settings?.stream_key || ""}
                      className="w-full bg-black/40 border border-white/10 rounded-lg pl-3 pr-16 py-2 text-xs font-mono text-white/90 focus:outline-none"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="p-1 text-secondary hover:text-white transition-colors"
                      >
                        {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(settings?.stream_key || "")}
                        className="p-1 text-secondary hover:text-white transition-colors"
                        title="Nusxa olish"
                      >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[9px] text-red-400 mt-2 font-semibold">Hech qachon bu kalitni boshqalarga ko'rsatmang!</p>
                  
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 transition-colors mt-4"
                  >
                    {regenerating ? "Yangilanmoqda..." : "Efir kalitini yangilash (Regenerate)"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
