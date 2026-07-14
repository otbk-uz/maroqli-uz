"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Gamepad2, Star, Search, Monitor, Smartphone, ShoppingCart, ArrowRight, Sparkles, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { BackButton } from "@/components/ui/BackButton";
import { useTranslation, useAuthStore } from "@/lib/store";

interface StoreGame {
  id: number;
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
}

const GamesPage = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [games, setGames] = useState<StoreGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

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
        let query = supabase
          .from('developed_games')
          .select('*, profiles:developer_id(username, full_name)')
          .order('created_at', { ascending: false });

        if (filter !== "ALL") {
          query = query.eq('platform', filter);
        }
        if (debouncedSearch) {
          query = query.ilike('title', `%${debouncedSearch}%`);
        }

        const { data, error } = await query;
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
            cover: null,
            price: g.price?.toString() || '0',
            premium_price: g.premium_price?.toString() || null,
            platform: g.platform,
            rating: g.rating || 5.0,
            language: g.language || 'O\'zbek',
            description: g.description,
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
  }, [filter, debouncedSearch]);

  const platformTabs = [
    { value: "ALL", label: t("all_platforms", "Barcha platformalar") },
    { value: "PC", label: t("pc_games", "PC o'yinlar") },
    { value: "MOBILE", label: t("mobile_games", "Mobil o'yinlar") },
  ];

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />
      <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,51,85,0.16),transparent_60%)]" />
      <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_15%_0%,rgba(139,92,246,0.12),transparent_55%)]" />

      <div className="container-app pt-28 pb-24 relative z-10">
        <div className="mb-8 flex items-center justify-between">
          <BackButton />
        </div>

        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="chip mb-5 border-violet/25 bg-violet/10 text-violet"
            >
              <Gamepad2 size={14} />
              <span className="font-display uppercase tracking-[0.2em] text-[11px]">
                {t("games_store_badge", "Gaming do'koni")}
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.05] uppercase"
            >
              {t("games_title", "O'yinlar do'koni")}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-secondary text-base md:text-lg mt-4 leading-relaxed"
            >
              {t("games_desc", "Mahalliy va xalqaro o'yinlarni sotib oling")}
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

        {/* Filter row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap items-center justify-between gap-4 glass-card p-3 md:p-4 mb-8"
        >
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar p-1">
            {platformTabs.map((p) => (
              <button
                key={p.value}
                onClick={() => setFilter(p.value)}
                className={`px-5 py-2.5 rounded-full font-display text-[11px] font-bold uppercase tracking-[0.15em] transition-all whitespace-nowrap ${
                  filter === p.value
                    ? "bg-primary text-white shadow-glow"
                    : "text-secondary hover:text-white hover:bg-white/5"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {!loading && games.length > 0 && (
            <div className="flex items-center gap-2 text-secondary pr-2">
              <Sparkles size={15} className="text-violet" />
              <span className="font-display text-xs font-bold uppercase tracking-[0.18em]">
                {games.length} {t("games_count_label", "ta o'yin")}
              </span>
            </div>
          )}
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="glass-card overflow-hidden flex flex-col h-full">
                <div className="skeleton aspect-[16/10] rounded-none" />
                <div className="p-7 space-y-4">
                  <div className="skeleton h-3 w-24" />
                  <div className="skeleton h-6 w-2/3" />
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-3 w-4/5" />
                  <div className="flex items-center justify-between pt-6">
                    <div className="skeleton h-8 w-24" />
                    <div className="skeleton h-11 w-28 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : games.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card py-24 px-6 text-center flex flex-col items-center"
          >
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-violet/20 blur-2xl rounded-full" />
              <div className="relative w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center animate-float">
                <Gamepad2 size={40} className="text-violet" />
              </div>
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-black text-white mb-3 uppercase tracking-tight">
              {t("no_games_found", "Do'konda hech qanday o'yin topilmadi.")}
            </h3>
            <p className="text-secondary max-w-md">
              {t("try_changing_filters", "Qidiruv so'rovini yoki filtrlarni o'zgartirib ko'ring")}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {games.map((g, i) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  key={g.id}
                  className="card-interactive overflow-hidden group flex flex-col h-full hover:border-primary/40"
                >
                  {/* Cover */}
                  <div className="aspect-[16/10] relative overflow-hidden bg-white/5">
                    {g.cover ? (
                      <img
                        src={g.cover}
                        alt={g.title}
                        className="w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:opacity-85 transition-all duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/[0.07] to-white/[0.01]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,51,85,0.10),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Gamepad2 size={132} strokeWidth={1} className="absolute -bottom-5 -right-3 text-white/[0.04]" />
                        <span className="relative font-display text-5xl font-black uppercase tracking-tight text-white/90 group-hover:scale-110 transition-transform duration-500">
                          {(g.title || "?").charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                        {g.platform === "PC" ? <Monitor size={10} /> : <Smartphone size={10} />}
                        {g.platform}
                      </span>
                    </div>

                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Star size={12} className="text-warning fill-warning" />
                      <span className="text-xs font-bold text-white tabular-nums">{Number(g.rating).toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-7 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-2">
                        Dev: @{g.developer_details.username}
                      </p>
                      <h3 className="font-display text-lg md:text-xl font-bold text-white group-hover:text-primary transition-colors mb-3 line-clamp-1 tracking-tight">
                        {g.title}
                      </h3>
                      <p className="text-secondary text-xs line-clamp-2 leading-relaxed opacity-85 mb-6">
                        {g.description}
                      </p>
                    </div>

                    <div className="border-t border-white/5 pt-5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] text-secondary font-bold uppercase tracking-widest mb-1">{t("prize_label", "Narxi")}</p>
                        {Number(g.price) > 0 ? (
                          user?.is_premium ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <p className="font-display text-lg font-black text-amber-400 tabular-nums">
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
                              <p className="font-display text-lg font-black text-white tabular-nums">
                                {Number(g.price).toLocaleString()} UZS
                              </p>
                              <p className="text-[9px] text-amber-400/80 font-bold mt-0.5 flex items-center gap-1 tabular-nums">
                                <Crown size={9} className="fill-current" />
                                Premium: {g.premium_price ? Number(g.premium_price).toLocaleString() : Math.round(Number(g.price) * 0.8).toLocaleString()} UZS
                              </p>
                            </div>
                          )
                        ) : (
                          <p className="font-display text-lg font-black text-success">
                            {t("free", "BEPUL")}
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/games/${g.id}`}
                        className="px-5 py-3 bg-white/5 hover:bg-primary text-white border border-white/10 hover:border-primary hover:shadow-glow rounded-xl font-display font-bold uppercase tracking-widest text-[11px] transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap"
                      >
                        <ShoppingCart size={14} />
                        <span>{t("buy_game", "Sotib olish")}</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
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
