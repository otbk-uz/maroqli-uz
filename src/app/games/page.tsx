"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Gamepad2, Star, Search, Monitor, Smartphone, ShoppingCart, ArrowRight, Sparkles, Crown, Heart, Globe, PlayCircle, CalendarPlus, Layers, ShieldCheck, Flame, Bookmark, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { BackButton } from "@/components/ui/BackButton";
import { useTranslation, useAuthStore } from "@/lib/store";

interface StoreGame {
  id: number | string;
  title: string;
  slug: string;
  developer_details: {
    username: string;
    full_name: string;
  };
  cover: string | null;
  price: string;
  premium_price?: string | null;
  platform: string;
  rating: number;
  language: string;
  description: string;
  demo_url?: string | null;
  download_url?: string | null;
}

const GamesPage = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const [games, setGames] = useState<StoreGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [wishlistIds, setWishlistIds] = useState<Set<string | number>>(new Set());
  const [purchasePlanIds, setPurchasePlanIds] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    if (user) {
      const fetchWishlist = async () => {
        try {
          const { data } = await supabase
            .from('game_wishlist')
            .select('game_id')
            .eq('user_id', user.id);

          if (data) {
            setWishlistIds(new Set(data.map(item => item.game_id)));
          }
        } catch (err) {
          console.warn("Wishlist fetch error:", err);
        }
      };

      const fetchPurchasePlan = async () => {
        try {
          const { data } = await supabase
            .from('game_purchase_plan')
            .select('game_id')
            .eq('user_id', user.id);

          const localKey = `game_purchase_plan_${user.id}`;
          const savedLocal = localStorage.getItem(localKey);
          const localSet = new Set<string | number>(savedLocal ? JSON.parse(savedLocal) : []);

          if (data) {
            data.forEach(item => localSet.add(item.game_id));
          }
          setPurchasePlanIds(localSet);
        } catch (err) {
          console.warn("Purchase plan fetch error:", err);
          const localKey = `game_purchase_plan_${user.id}`;
          const savedLocal = localStorage.getItem(localKey);
          if (savedLocal) {
            setPurchasePlanIds(new Set(JSON.parse(savedLocal)));
          }
        }
      };

      fetchWishlist();
      fetchPurchasePlan();
    }
  }, [user]);

  const handleToggleWishlist = async (gameId: string | number) => {
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const isCurrentlyWishlisted = wishlistIds.has(gameId);
    setWishlistIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyWishlisted) next.delete(gameId);
      else next.add(gameId);
      return next;
    });

    try {
      if (isCurrentlyWishlisted) {
        await supabase
          .from('game_wishlist')
          .delete()
          .eq('user_id', user.id)
          .eq('game_id', gameId);
      } else {
        await supabase
          .from('game_wishlist')
          .insert({
            user_id: user.id,
            game_id: gameId
          });
      }
    } catch (err) {
      console.error("Wishlist update error:", err);
      setWishlistIds(prev => {
        const next = new Set(prev);
        if (isCurrentlyWishlisted) next.add(gameId);
        else next.delete(gameId);
        return next;
      });
    }
  };

  const handleTogglePurchasePlan = async (gameId: string | number) => {
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const isCurrentlyInPlan = purchasePlanIds.has(gameId);
    setPurchasePlanIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyInPlan) next.delete(gameId);
      else next.add(gameId);
      return next;
    });

    const localKey = `game_purchase_plan_${user.id}`;
    const savedLocal = localStorage.getItem(localKey);
    let localList: string[] = savedLocal ? JSON.parse(savedLocal) : [];

    if (isCurrentlyInPlan) {
      localList = localList.filter((gid: string) => String(gid) !== String(gameId));
      localStorage.setItem(localKey, JSON.stringify(localList));
      try {
        await supabase
          .from('game_purchase_plan')
          .delete()
          .eq('user_id', user.id)
          .eq('game_id', gameId);
      } catch (err) {
        console.warn("DB purchase plan delete fallback:", err);
      }
    } else {
      if (!localList.includes(String(gameId))) {
        localList.push(String(gameId));
      }
      localStorage.setItem(localKey, JSON.stringify(localList));
      try {
        await supabase
          .from('game_purchase_plan')
          .insert({
            user_id: user.id,
            game_id: gameId
          });
      } catch (err) {
        console.warn("DB purchase plan insert fallback:", err);
      }
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('developed_games')
          .select('*, profiles:developer_id(username, full_name)')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const mappedGames = data.map((g: any) => ({
            id: g.id,
            title: g.title,
            slug: g.slug,
            developer_details: {
              username: g.profiles?.username || 'developer',
              full_name: g.profiles?.full_name || 'Game Developer',
            },
            cover: g.cover || null,
            price: g.price?.toString() || '0',
            premium_price: g.premium_price?.toString() || null,
            platform: g.platform || 'WEB',
            rating: g.rating || 5.0,
            language: g.language || 'O\'zbek',
            description: g.description,
            demo_url: g.demo_url || null,
            download_url: g.download_url || null,
          }));
          setGames(mappedGames as any);
        }
      } catch (err) {
        console.error("Games store fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, []);

  const counts = {
    ALL: games.length,
    WEB: games.filter(g => g.platform === "WEB").length,
    DEMO: games.filter(g => g.platform !== "WEB" && (Boolean(g.demo_url) || Number(g.price) === 0)).length,
    PREMIUM: games.filter(g => Number(g.price) > 0).length,
    PC: games.filter(g => g.platform === "PC").length,
    MOBILE: games.filter(g => g.platform === "MOBILE").length,
  };

  const platformTabs = [
    { value: "ALL", label: "⚡ Barcha O'yinlar", count: counts.ALL },
    { value: "WEB", label: "🌐 Web Onlayn", count: counts.WEB },
    { value: "DEMO", label: "🎮 Demo & Sinov", count: counts.DEMO },
    { value: "PREMIUM", label: "💎 Pullik & PRO", count: counts.PREMIUM },
    { value: "PC", label: "💻 PC O'yinlar", count: counts.PC },
    { value: "MOBILE", label: "📱 Mobil O'yinlar", count: counts.MOBILE },
  ];

  const displayedGames = games.filter(g => {
    if (debouncedSearch) {
      return g.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
             g.developer_details.username.toLowerCase().includes(debouncedSearch.toLowerCase());
    }
    if (filter === "WEB") return g.platform === "WEB";
    if (filter === "DEMO") return g.platform !== "WEB" && (Boolean(g.demo_url) || Number(g.price) === 0);
    if (filter === "PREMIUM") return Number(g.price) > 0;
    if (filter === "PC") return g.platform === "PC";
    if (filter === "MOBILE") return g.platform === "MOBILE";
    return true;
  });

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />
      <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,51,85,0.16),transparent_60%)]" />
      <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_15%_0%,rgba(139,92,246,0.12),transparent_55%)]" />

      <div className="container-app pt-28 pb-24 relative z-10 max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <BackButton />
        </div>

        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="chip mb-4 border-violet/25 bg-violet/10 text-violet"
            >
              <Gamepad2 size={14} />
              <span className="font-display uppercase tracking-[0.2em] text-[11px]">
                {t("games_store_badge", "Gaming Katalogi")}
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-3xl md:text-5xl font-black text-white tracking-tight leading-[1.05] uppercase"
            >
              O'yinlar Katalogi
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-secondary text-sm md:text-base mt-2 leading-relaxed opacity-90"
            >
              Tartiblangan toza va qulay katalog orqali o'yinlarni o'ynang va sotib oling
            </motion.p>
          </div>

          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={16} />
            <input
              type="text"
              placeholder={t("search_game", "O'yin nomini yozing...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full pl-11 pr-4 py-3 outline-none focus:border-primary/50 text-sm text-white placeholder:text-secondary transition-colors"
            />
          </div>
        </div>

        {/* Clean Filter Tabs Bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap items-center justify-between gap-4 glass-card p-2.5 md:p-3 mb-8 border-white/10"
        >
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar p-1">
            {platformTabs.map((p) => (
              <button
                key={p.value}
                onClick={() => setFilter(p.value)}
                className={`px-4 py-2 rounded-xl font-display text-[11px] font-bold uppercase tracking-[0.12em] transition-all whitespace-nowrap flex items-center gap-2 ${
                  filter === p.value
                    ? "bg-primary text-white shadow-glow"
                    : "text-secondary hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{p.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  filter === p.value ? "bg-white/20 text-white" : "bg-white/10 text-secondary"
                }`}>
                  {p.count}
                </span>
              </button>
            ))}
          </div>

          {!loading && (
            <div className="flex items-center gap-2 text-secondary pr-2 shrink-0">
              <Sparkles size={14} className="text-violet" />
              <span className="font-display text-xs font-bold uppercase tracking-[0.15em]">
                {displayedGames.length} ta o'yin
              </span>
            </div>
          )}
        </motion.div>

        {/* Catalog Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="glass-card overflow-hidden flex flex-col h-full border-white/5">
                <div className="skeleton aspect-[16/10] rounded-none" />
                <div className="p-6 space-y-3">
                  <div className="skeleton h-3 w-24" />
                  <div className="skeleton h-5 w-2/3" />
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-3 w-4/5" />
                  <div className="flex items-center justify-between pt-4">
                    <div className="skeleton h-7 w-20" />
                    <div className="skeleton h-10 w-24 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayedGames.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card py-20 px-6 text-center flex flex-col items-center"
          >
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-violet/20 blur-2xl rounded-full" />
              <div className="relative w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Gamepad2 size={36} className="text-violet" />
              </div>
            </div>
            <h3 className="font-display text-xl md:text-2xl font-black text-white mb-2 uppercase tracking-tight">
              {t("no_games_found", "O'yinlar topilmadi")}
            </h3>
            <p className="text-secondary text-xs max-w-md">
              {t("try_changing_filters", "Qidiruv so'rovini yoki filtrlarni o'zgartirib ko'ring")}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {displayedGames.map((g, i) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  key={g.id}
                  className="card-interactive overflow-hidden group flex flex-col h-full border-white/10 hover:border-violet/40 bg-card"
                >
                  {/* Cover */}
                  <div className="aspect-[16/10] relative overflow-hidden bg-black/60">
                    {g.cover ? (
                      <img
                        src={g.cover}
                        alt={g.title}
                        className="w-full h-full object-cover opacity-70 group-hover:scale-108 group-hover:opacity-90 transition-all duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet/20 via-black/80 to-black">
                        <Gamepad2 size={96} strokeWidth={1} className="absolute -bottom-5 -right-3 text-white/[0.04]" />
                        <span className="relative font-display text-4xl font-black uppercase tracking-tight text-white/80 group-hover:scale-110 transition-transform duration-500">
                          {(g.title || "?").charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-black/20 to-transparent" />

                    {/* Platform / Tag Badge */}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      {g.platform === "WEB" ? (
                        <span className="bg-violet text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow-glow-violet border border-violet/30">
                          <Globe size={10} /> WEB ONLINE
                        </span>
                      ) : Number(g.price) > 0 ? (
                        <span className="bg-amber-500 text-black text-[9px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-400/30">
                          <Crown size={10} className="fill-current" /> PULLIK O'YIN
                        </span>
                      ) : (
                        <span className="bg-emerald-500 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-400/30">
                          <Gamepad2 size={10} /> DEMO / BEPUL
                        </span>
                      )}
                    </div>

                    {/* Action buttons on cover top-right */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {Number(g.price) > 0 && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleTogglePurchasePlan(g.id);
                          }}
                          className={`p-1.5 rounded-full backdrop-blur-md border transition-all active:scale-90 ${
                            purchasePlanIds.has(g.id)
                              ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                              : "bg-black/60 border-white/10 text-white/70 hover:text-white hover:bg-black/80"
                          }`}
                          title="Sotib olish rejasiga qo'shish"
                        >
                          <CalendarPlus size={13} className={purchasePlanIds.has(g.id) ? "text-amber-400" : ""} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleWishlist(g.id);
                        }}
                        className={`p-1.5 rounded-full backdrop-blur-md border transition-all active:scale-90 ${
                          wishlistIds.has(g.id)
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                            : "bg-black/60 border-white/10 text-white/70 hover:text-white hover:bg-black/80"
                        }`}
                        title="Sotib olish rejasiga (Wishlist) qo'shish"
                      >
                        <Bookmark size={13} className={wishlistIds.has(g.id) ? "fill-amber-400 text-amber-400" : ""} />
                      </button>
                    </div>

                    {/* Rating badge bottom-right */}
                    <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star size={11} className="text-amber-400 fill-amber-400" />
                      <span className="text-white text-[11px] font-bold tabular-nums">{Number(g.rating).toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-black text-secondary uppercase tracking-wider mb-1">
                        Dev: @{g.developer_details.username}
                      </p>
                      <h3 className="font-display text-base md:text-lg font-bold text-white group-hover:text-violet transition-colors mb-2 line-clamp-1 tracking-tight">
                        {g.title}
                      </h3>
                      <p className="text-secondary text-xs line-clamp-2 leading-relaxed opacity-85 mb-4">
                        {g.description}
                      </p>
                    </div>

                    <div className="border-t border-white/5 pt-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] text-secondary font-bold uppercase tracking-widest mb-0.5">{t("prize_label", "Narxi")}</p>
                        {Number(g.price) > 0 ? (
                          user?.is_premium ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <p className="font-display text-base font-black text-amber-400 tabular-nums">
                                  {g.premium_price ? Number(g.premium_price).toLocaleString() : Math.round(Number(g.price) * 0.8).toLocaleString()} UZS
                                </p>
                                <span className="bg-amber-500/15 text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                  <Crown size={8} className="fill-current" />
                                  {g.premium_price 
                                    ? `-${Math.round((1 - Number(g.premium_price) / Number(g.price)) * 100)}%`
                                    : "-20%"
                                  }
                                </span>
                              </div>
                              <p className="text-[10px] text-secondary line-through tabular-nums">
                                {Number(g.price).toLocaleString()} UZS
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-display text-base font-black text-white tabular-nums">
                                {Number(g.price).toLocaleString()} UZS
                              </p>
                              <p className="text-[9px] text-amber-400/80 font-bold mt-0.5 flex items-center gap-1 tabular-nums">
                                <Crown size={9} className="fill-current" />
                                Premium: {g.premium_price ? Number(g.premium_price).toLocaleString() : Math.round(Number(g.price) * 0.8).toLocaleString()} UZS
                              </p>
                            </div>
                          )
                        ) : (
                          <p className="font-display text-base font-black text-emerald-400">
                            {t("free", "BEPUL")}
                          </p>
                        )}
                      </div>

                      {g.platform === "WEB" ? (
                        <Link
                          href={isAuthenticated ? `/games/play/${g.slug}` : `/login?redirect=/games/play/${g.slug}`}
                          className="px-4 py-2.5 bg-violet hover:bg-violet/90 text-white border border-violet/30 rounded-xl font-display font-bold uppercase tracking-widest text-[11px] transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap shadow-glow-violet"
                        >
                          <PlayCircle size={14} />
                          <span>O'ynash</span>
                          <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                      ) : (
                        <Link
                          href={`/games/${g.id}`}
                          className="px-4 py-2.5 bg-white/5 hover:bg-primary text-white border border-white/10 hover:border-primary rounded-xl font-display font-bold uppercase tracking-widest text-[11px] transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
                        >
                          <ShoppingCart size={13} />
                          <span>{Number(g.price) > 0 ? "Sotib olish" : "Ko'rish"}</span>
                          <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
};

export default GamesPage;
