"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Hero from "@/components/Hero";
import { Trophy, ArrowRight, Play, Gamepad2, Calendar, Eye, Users, ChevronRight, Activity, ShoppingCart } from "lucide-react";
import { useTranslation } from "@/lib/store";
import { getCachedData, setCachedData } from "@/lib/cache";

interface Tournament {
  id: number;
  title: string;
  description: string;
  game_name: string;
  status: string;
  prize_pool: string;
  entry_fee: string;
  max_participants: number;
  participant_count: number;
  start_date: string;
}

interface NewsItem {
  id: number;
  title: string;
  category_display: string;
  created_at: string;
}

interface Stats {
  users_count: number;
  tournaments_count: number;
  games_count: number;
  total_views: number;
  streamers_count: number;
}

export default function Home() {
  const { t, locale } = useTranslation();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    users_count: 0,
    tournaments_count: 0,
    games_count: 0,
    total_views: 0,
    streamers_count: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCachedData = () => {
      const cachedTournaments = getCachedData<Tournament[]>("home_tournaments");
      const cachedNews = getCachedData<NewsItem[]>("home_news");
      const cachedStats = getCachedData<Stats>("home_stats");

      if (cachedTournaments) setTournaments(cachedTournaments);
      if (cachedNews) setNews(cachedNews);
      if (cachedStats) setStats(cachedStats);

      if (cachedTournaments || cachedNews || cachedStats) {
        setLoading(false);
      }
    };

    loadCachedData();

    const fetchHomeData = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        
        // Fetch Tournaments
        const { data: tData } = await supabase
          .from('tournaments')
          .select('*')
          .in('status', ['LIVE', 'UPCOMING'])
          .limit(5);
          
        if (tData) {
          setTournaments(tData as any);
          setCachedData("home_tournaments", tData);
        }

        // Fetch News
        const { data: nData } = await supabase
          .from('news')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);
          
        let mappedNews: NewsItem[] = [];
        if (nData) {
          mappedNews = nData.map(n => ({
            id: n.id,
            title: n.title,
            category_display: t("news_badge", "YANGILIK"),
            created_at: n.created_at
          }));
          setNews(mappedNews as any);
          setCachedData("home_news", mappedNews);
        }

        // Stats — faqat HAQIQIY raqamlar (bazadan sanaladi)
        const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: tCount } = await supabase.from('tournaments').select('*', { count: 'exact', head: true });
        const { count: gCount } = await supabase.from('developed_games').select('*', { count: 'exact', head: true });
        const { count: sCount } = await supabase.from('streamers').select('*', { count: 'exact', head: true });

        const newStats = {
          users_count: usersCount || 0,
          tournaments_count: tCount || 0,
          games_count: gCount || 0,
          total_views: 0,
          streamers_count: sCount || 0,
        };
        setStats(newStats);
        setCachedData("home_stats", newStats);

      } catch (err) {
        console.error("Home page data fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [locale]);

  const formatViews = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M+";
    }
    return num.toLocaleString();
  };

  const getGameImage = (gameName: string) => {
    const name = gameName.toLowerCase();
    if (name.includes("counter-strike") || name.includes("cs")) {
      return "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070";
    }
    if (name.includes("dota")) {
      return "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071";
    }
    if (name.includes("valorant")) {
      return "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?q=80&w=2070";
    }
    if (name.includes("pubg")) {
      return "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1947";
    }
    return "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=2070";
  };

  return (
    <main className="bg-background min-h-screen relative overflow-hidden">
      <Hero stats={{ users: stats.users_count, tournaments: stats.tournaments_count, games: stats.games_count }} />

      {/* Dynamic Esports Section */}
      <section className="py-20 lg:py-28 relative overflow-hidden px-4 md:px-6">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-12 lg:mb-16">
            <div>
              <div className="flex items-center space-x-2 text-primary font-display font-black text-xs uppercase tracking-widest mb-3">
                <Activity size={14} className="animate-pulse" />
                <span>{t("match_center", "MATCH CENTER")}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-display font-black text-white uppercase tracking-tight">
                {t("active_tournaments", "Jonli & Bo'lajak O'yinlar")}
              </h2>
            </div>
            <Link 
              href="/tournaments" 
              className="group flex items-center space-x-2 text-secondary hover:text-primary transition-all font-display font-bold text-sm tracking-wider uppercase"
            >
              <span>{t("view_all_tournaments", "Barcha turnirlar")}</span>
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-20 bg-card border border-white/5 rounded-3xl">
              <p className="text-secondary text-sm">{t("no_active_tournaments", "Hozirda faol turnirlar mavjud emas.")}</p>
            </div>
          ) : (
            /* Immersive Grid Layout */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Side: Major Featured / Live Match */}
              <div className="lg:col-span-7 xl:col-span-8">
                {tournaments.slice(0, 1).map((tItem) => (
                  <div 
                    key={tItem.id} 
                    className="relative rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-b from-card/30 to-card group hover:border-primary/40 transition-all duration-500 shadow-2xl"
                  >
                    <div className="aspect-[21/10] relative overflow-hidden bg-muted">
                      <img 
                        src={getGameImage(tItem.game_name)} 
                        alt={tItem.title}
                        className="w-full h-full object-cover opacity-50 group-hover:scale-105 group-hover:opacity-60 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
                      
                      <div className="absolute top-6 left-6">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-display font-black uppercase tracking-widest shadow-lg ${
                          tItem.status === 'LIVE' 
                            ? 'bg-primary text-white animate-pulse shadow-primary/20' 
                            : 'bg-blue-600 text-white shadow-blue-600/20'
                        }`}>
                          {tItem.status}
                        </span>
                      </div>
                      
                      {tItem.status === 'LIVE' && (
                        <div className="absolute top-6 right-6 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                          <span className="text-[10px] font-display font-black text-white uppercase tracking-widest">{t("live_score", "LIVE SCORE")}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-8 md:p-10">
                      <span className="text-xs font-display font-black text-primary uppercase tracking-widest mb-3 block">
                        {tItem.game_name}
                      </span>
                      <h3 className="text-2xl md:text-4xl font-display font-black text-white mb-6 group-hover:text-primary transition-colors">
                        {tItem.title}
                      </h3>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-colors">
                          <p className="text-[10px] font-display font-bold text-secondary uppercase tracking-widest mb-1">{t("prize_label", "SOVRIN").toUpperCase()}</p>
                          <p className="text-xl font-display font-black text-white">
                            {Number(tItem.prize_pool) > 0 ? `$${Number(tItem.prize_pool).toLocaleString()}` : t("free", "Bepul")}
                          </p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-colors">
                          <p className="text-[10px] font-display font-bold text-secondary uppercase tracking-widest mb-1">{t("teams_label", "ISHTIROKCHILAR").toUpperCase()}</p>
                          <p className="text-xl font-display font-black text-white">{tItem.participant_count} / {tItem.max_participants}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-colors col-span-2 sm:col-span-1">
                          <p className="text-[10px] font-display font-bold text-secondary uppercase tracking-widest mb-1">{t("entry_label", "KIRISH")}</p>
                          <p className="text-xl font-display font-black text-primary">
                            {Number(tItem.entry_fee) > 0 ? `$${Number(tItem.entry_fee).toLocaleString()}` : t("free", "FREE").toUpperCase()}
                          </p>
                        </div>
                      </div>
                      
                      <Link 
                        href={tItem.status === 'LIVE' ? `/streamers` : `/tournaments/${tItem.id}`}
                        className="btn-primary w-full sm:w-auto inline-flex items-center justify-center space-x-3 !py-4 !px-10 font-display font-black tracking-widest uppercase text-sm"
                      >
                        {tItem.status === 'LIVE' ? (
                          <>
                            <Play size={16} fill="white" />
                            <span>{t("watch", "TOMOSHA QILISH").toUpperCase()}</span>
                          </>
                        ) : (
                          <>
                            <Gamepad2 size={16} />
                            <span>{t("participate_btn", "ISHTIROK ETISH").toUpperCase()}</span>
                          </>
                        )}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Right Side: List of Upcoming Matches (No boxy grids, sleek rows) */}
              <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                <p className="text-xs font-display font-black text-secondary uppercase tracking-widest pl-2 mb-2">{t("upcoming_tournaments", "BO'LAJAK TURNIRLAR").toUpperCase()}</p>
                {tournaments.slice(1).map((tItem) => (
                  <Link 
                    key={tItem.id} 
                    href={`/tournaments/${tItem.id}`}
                    className="flex items-center justify-between p-5 rounded-2xl border border-white/5 bg-card/40 hover:bg-card hover:border-primary/30 transition-all duration-300 group"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex-shrink-0 overflow-hidden relative border border-white/10 group-hover:border-primary/20">
                        <img src={getGameImage(tItem.game_name)} className="w-full h-full object-cover opacity-60" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-display font-bold text-primary uppercase tracking-widest">
                          {tItem.game_name}
                        </span>
                        <h4 className="text-sm font-display font-bold text-white group-hover:text-primary transition-colors truncate">
                          {tItem.title}
                        </h4>
                        <p className="text-[10px] text-secondary mt-0.5">
                          Slots: {tItem.participant_count}/{tItem.max_participants}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-display font-black text-white">
                          {Number(tItem.prize_pool) > 0 ? `$${Number(tItem.prize_pool).toLocaleString()}` : "FREE"}
                        </p>
                        <p className="text-[9px] text-secondary uppercase font-bold tracking-wider">{t("prize", "PRIZE")}</p>
                      </div>
                      <ChevronRight size={16} className="text-secondary group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>

            </div>
          )}
        </div>
      </section>
      
      {/* Immersive Dashboard Sections for Mobile & Desktop */}
      <section className="py-20 border-t border-white/5 relative bg-[#050508] px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* News Stream (Sleek List Feed) */}
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-display font-black text-white uppercase tracking-wider">{t("news_stream", "YANGILIKLAR OQIMI")}</h3>
                <Link href="/news" className="text-xs font-display font-bold text-secondary hover:text-primary uppercase tracking-wider flex items-center gap-1">
                  {t("all_news_btn", "Hammasi")} <ChevronRight size={14} />
                </Link>
              </div>
              
              {loading ? (
                <div className="w-full h-20 flex items-center justify-center">
                  <div className="w-6 h-6 border border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : news.length === 0 ? (
                <p className="text-secondary text-sm">{t("no_news", "Yangiliklar topilmadi.")}</p>
              ) : (
                <div className="space-y-4">
                  {news.map((item) => (
                    <Link 
                      key={item.id} 
                      href={`/news/${item.id}`}
                      className="group block p-6 rounded-2xl border border-white/5 bg-card/20 hover:bg-card/60 transition-all duration-300 relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 group-hover:bg-primary transition-colors" />
                      <div className="flex items-center gap-3 mb-2.5">
                        <span className="bg-primary/10 border border-primary/20 text-primary text-[9px] font-display font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {item.category_display}
                        </span>
                        <span className="text-[10px] text-secondary flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-base font-display font-bold text-white group-hover:text-primary transition-colors leading-snug">
                        {item.title}
                      </h4>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            
            {/* Global Activity Panel */}
            <div className="lg:col-span-4">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-display font-black text-white uppercase tracking-wider">{t("system_statistics", "TIZIM STATISTIKASI")}</h3>
              </div>
              
              <div className="bg-card border border-white/5 rounded-3xl p-6 space-y-5">
                {[
                  { icon: <Users size={20} />, tint: "bg-blue-500/10 text-blue-400", label: t("registered_users", "Foydalanuvchilar"), value: stats.users_count },
                  { icon: <Trophy size={20} />, tint: "bg-primary/10 text-primary", label: t("registered_tournaments", "Turnirlar"), value: stats.tournaments_count },
                  { icon: <Gamepad2 size={20} />, tint: "bg-white/5 text-white", label: t("registered_games", "O'yinlar"), value: stats.games_count },
                  { icon: <Activity size={20} />, tint: "bg-violet/10 text-violet", label: t("registered_streamers", "Streamerlar"), value: stats.streamers_count },
                ].map((row, i, arr) => (
                  <div key={row.label} className={`flex items-center justify-between ${i < arr.length - 1 ? "border-b border-white/5 pb-5" : ""}`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${row.tint}`}>
                        {row.icon}
                      </div>
                      <p className="text-xs text-secondary uppercase font-bold tracking-wider">{row.label}</p>
                    </div>
                    <p className="text-xl font-display font-black text-white tabular-nums">{row.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}
