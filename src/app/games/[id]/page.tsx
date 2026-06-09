"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Monitor, Smartphone, Star, Shield, Cpu, ChevronRight, Check, ShoppingCart, Key } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";

interface Review {
  id: number;
  user_details: {
    username: string;
    full_name: string;
  };
  rating: number;
  content: string;
  created_at: string;
}

interface GameDetail {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: string;
  platform: string;
  language: string;
  rating: number;
  sys_requirements: string;
  trailer_url: string | null;
  developer_details: {
    username: string;
    full_name: string;
  };
  cover: string | null;
  screenshots: { id: number; image: string }[];
  reviews: Review[];
}

const GameDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const { isAuthenticated } = useAuthStore();

  const [game, setGame] = useState<GameDetail | null>(null);
  const [libraryGames, setLibraryGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [boughtCdKey, setBoughtCdKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchGameData = async () => {
      try {
        const gameRes = await api.get(`/tournaments/store/${id}/`);
        setGame(gameRes.data);
        
        if (isAuthenticated) {
          const libraryRes = await api.get("/tournaments/library/");
          setLibraryGames(libraryRes.data);
        }
      } catch (err) {
        console.error("Game detail fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();
  }, [id, isAuthenticated]);

  const handleBuyGame = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!game) return;

    const confirmBuy = window.confirm(`${game.title} o'yinini sotib olishni tasdiqlaysizmi?`);
    if (!confirmBuy) return;

    setPurchaseLoading(true);
    try {
      const response = await api.post("/tournaments/library/", { game: game.id });
      setBoughtCdKey(response.data.cd_key);
      setShowKeyModal(true);
      
      // Update library list
      const libraryRes = await api.get("/tournaments/library/");
      setLibraryGames(libraryRes.data);
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.detail) {
        alert(err.response.data.detail);
      } else {
        alert("Sotib olish jarayonida xatolik yuz berdi.");
      }
    } finally {
      setPurchaseLoading(false);
    }
  };

  const getPlaceholderImage = (slug: string) => {
    if (slug.includes("tashkent")) {
      return "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200";
    }
    if (slug.includes("bukhara")) {
      return "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200";
    }
    return "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200";
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background relative flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!game) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-white mb-4">O'yin topilmadi</h1>
        <button onClick={() => router.push("/games")} className="btn-primary flex items-center space-x-2">
          <ArrowLeft size={16} />
          <span>Do'konga qaytish</span>
        </button>
      </main>
    );
  }

  const isPurchased = libraryGames.some((lg: any) => lg.game === game.id);
  const existingCdKey = libraryGames.find((lg: any) => lg.game === game.id)?.cd_key;

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />

      {/* Banner */}
      <div className="h-64 md:h-96 w-full bg-gradient-to-b from-primary/20 to-background relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${game.cover || getPlaceholderImage(game.slug)})` }}
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-32 relative z-10 pb-20 max-w-5xl">
        <button 
          onClick={() => router.push("/games")}
          className="group text-secondary hover:text-white flex items-center space-x-2 text-sm font-bold mb-8 transition-colors"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Do'konga qaytish</span>
        </button>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Main Content */}
          <div className="flex-1 space-y-8">
            <div className="glass-card p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="bg-white/10 px-3.5 py-1 rounded-full text-xs font-bold uppercase text-secondary flex items-center gap-1">
                  {game.platform === "PC" ? <Monitor size={12} /> : <Smartphone size={12} />}
                  {game.platform}
                </span>
                <span className="bg-white/10 px-3.5 py-1 rounded-full text-xs font-bold uppercase text-secondary">
                  {game.language}
                </span>
                <div className="bg-black/60 border border-white/5 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Star size={12} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-xs font-bold text-white">{game.rating}</span>
                </div>
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
                {game.title}
              </h1>

              <p className="text-xs text-secondary font-bold uppercase tracking-widest mb-3">Tavsif</p>
              <p className="text-secondary text-sm md:text-base leading-relaxed whitespace-pre-line opacity-95">
                {game.description}
              </p>
            </div>

            {/* Screenshots */}
            {game.screenshots && game.screenshots.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-black text-white">Screenshotlar</h3>
                <div className="grid grid-cols-2 gap-4">
                  {game.screenshots.map((s: any) => (
                    <div key={s.id} className="aspect-video bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                      <img src={s.image} alt="Screenshot" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Requirements */}
            <div className="glass-card p-6 md:p-8 space-y-4">
              <h3 className="font-black text-white flex items-center gap-2">
                <Cpu size={20} className="text-primary" />
                <span>Tizim talablari</span>
              </h3>
              <div className="text-secondary text-sm leading-relaxed whitespace-pre-line opacity-80 border-t border-white/5 pt-4">
                {game.sys_requirements || "Tizim talablari ko'rsatilmagan."}
              </div>
            </div>

            {/* Reviews */}
            <div className="space-y-6">
              <h3 className="text-lg font-black text-white px-2">Foydalanuvchilar sharhlari ({game.reviews.length})</h3>
              
              {game.reviews.length === 0 ? (
                <div className="bg-white/5 border border-white/5 p-6 rounded-2xl text-center text-xs text-secondary">
                  O'yinga hali sharhlar yozilmagan.
                </div>
              ) : (
                <div className="space-y-4">
                  {game.reviews.map((rev: Review) => (
                    <div key={rev.id} className="glass-card p-5 border-white/5 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white">@{rev.user_details.username}</span>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              size={12} 
                              className={i < rev.rating ? "text-yellow-500 fill-yellow-500" : "text-white/20"} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-secondary text-xs leading-relaxed opacity-90">{rev.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Purchase */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="glass-card p-6 sticky top-32 space-y-6">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Shield size={18} className="text-primary" />
                <span>Sotib olish</span>
              </h3>

              <div className="space-y-2 border-b border-white/5 pb-6">
                <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">O'yin narxi</p>
                <p className="text-3xl font-black text-white">
                  {Number(game.price) > 0 ? `${Number(game.price).toLocaleString()} UZS` : "BEPUL"}
                </p>
              </div>

              {isPurchased ? (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl p-4 flex items-start space-x-2">
                    <Check size={16} className="shrink-0 mt-0.5" />
                    <span className="font-bold uppercase tracking-wide">Kutubxonangizda mavjud</span>
                  </div>

                  {existingCdKey && (
                    <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2">
                      <p className="text-[9px] text-secondary uppercase font-bold tracking-widest">Sizning CD-KEYingiz</p>
                      <div className="flex items-center justify-between bg-black/40 px-3 py-2.5 rounded-lg border border-white/5">
                        <code className="text-xs text-white font-mono">{existingCdKey}</code>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleBuyGame}
                  disabled={purchaseLoading}
                  className="btn-primary w-full py-4 text-sm font-bold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {purchaseLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart size={16} />
                      <span>Sotib olish</span>
                    </>
                  )}
                </button>
              )}

              <div className="text-[10px] text-secondary leading-normal text-center opacity-75">
                Tasdiqlangandan so'ng o'yin CD-keyi taqdim etiladi va kutubxonangizga (/profile/library) qo'shiladi.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success CD Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-[#121214] border border-primary/30 p-8 rounded-3xl text-center relative overflow-hidden"
          >
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            
            <div className="w-16 h-16 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <Key size={28} />
            </div>

            <h3 className="text-2xl font-black text-white mb-2">Haridingiz uchun rahmat!</h3>
            <p className="text-secondary text-xs mb-6">Ushbu o'yin CD-keyini nusxalab oling. U kutubxonangizda saqlanib qoladi.</p>

            <div className="bg-black/60 border border-white/10 rounded-2xl p-4 mb-6 flex items-center justify-between">
              <code className="text-sm text-white font-mono select-all tracking-wider">{boughtCdKey}</code>
              <button 
                onClick={() => {
                  if (boughtCdKey) {
                    navigator.clipboard.writeText(boughtCdKey);
                    alert("CD-Key nusxalandi!");
                  }
                }}
                className="text-xs text-primary font-bold hover:underline"
              >
                Nusxalash
              </button>
            </div>

            <button
              onClick={() => setShowKeyModal(false)}
              className="btn-primary w-full py-4 text-xs uppercase tracking-wider font-bold"
            >
              Yopish
            </button>
          </motion.div>
        </div>
      )}
    </main>
  );
};

export default GameDetailPage;
