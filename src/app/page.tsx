"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Hero from "@/components/Hero";
import { Trophy, ArrowRight, Play, Gamepad2, Calendar, Eye, Users, ChevronRight, Activity, ShoppingCart, Sparkles, Star, Globe, Newspaper } from "lucide-react";
import { useTranslation } from "@/lib/store";
import { getCachedData, setCachedData } from "@/lib/cache";
import { MatchCenterSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

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

interface FeaturedGame {
  id: number | string;
  title: string;
  slug: string;
  price: string | number;
  cover: string | null;
  platform: string;
  rating?: number;
  description?: string;
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
  const [featuredGames, setFeaturedGames] = useState<FeaturedGame[]>([]);
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
      const cachedGames = getCachedData<FeaturedGame[]>("home_featured_games");
      const cachedNews = getCachedData<NewsItem[]>("home_news");
      const cachedStats = getCachedData<Stats>("home_stats");

      if (cachedTournaments) setTournaments(cachedTournaments);
      if (cachedGames) setFeaturedGames(cachedGames);
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
        
        // 1. Fetch Tournaments
        const { data: tData } = await supabase
          .from('tournaments')
          .select('*')
          .in('status', ['LIVE', 'UPCOMING'])
          .limit(5);
          
        if (tData) {
          setTournaments(tData);
          setCachedData("home_tournaments", tData);
        }

        // 2. Fetch Featured Games (National developer games)
        const { data: gData } = await supabase
          .from('developed_games')
          .select('id, title, slug, price, cover, platform, rating, description')
          .order('rating', { ascending: false })
          .limit(6);

        if (gData && gData.length > 0) {
          setFeaturedGames(gData);
          setCachedData("home_featured_games", gData);
        }

        // 3. Fetch News
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
          setNews(mappedNews);
          setCachedData("home_news", mappedNews);
        }

        // 4. Stats — Faqat haqiqiy bazaviy raqamlar
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

  const getGameImage = (gameName: string) => {
    const name = (gameName || "").toLowerCase();
    if (name.includes("aks") || name.includes("qorong")) {
      return "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070";
    }
    if (name.includes("shiroq")) {
      return "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=2070";
    }
    if (name.includes("death") || name.includes("mine")) {
      return "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2070";
    }
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

      {/* ===================== MATCH CENTER / TOURNAMENTS SECTION ===================== */}
      <section className="py-20 lg:py-28 relative overflow-hidden px-4 md:px-6">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="container mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12 lg:mb-16">
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
              className="group inline-flex items-center space-x-2 text-secondary hover:text-primary transition-all font-display font-bold text-xs uppercase tracking-widest"
            >
              <span>{t("view_all_tournaments", "Barcha turnirlar")}</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          {loading ? (
            <MatchCenterSkeleton />
          ) : tournaments.length === 0 ? (
            <EmptyState
              icon={<Trophy size={32} />}
              title={t("no_active_tournaments_title", "Hozirda Faol Turnirlar Yo'q")}
              description={t("no_active_tournaments_desc", "Tez kunda katta sovrin jamg'armasiga ega yangi rasmiy turnirlar start oladi. Tayyorgarlikni davom ettiring.")}
              actionText={t("explore_games", "O'yinlar katalogini ko'rish")}
              actionHref="/games"
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Featured Major Match */}
              <div className="lg:col-span-7 xl:col-span-8">
                {tournaments.slice(0, 1).map((tItem) => (
                  <div 
                    key={tItem.id} 
                    className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-card/40 to-card group hover:border-primary/50 transition-all duration-500 shadow-card hover:shadow-card-hover"
                  >
                    <div className="aspect-[21/10] relative overflow-hidden bg-muted">
                      <img 
                        src={getGameImage(tItem.game_name)} 
                        alt={tItem.title}
                        className="w-full h-full object-cover opacity-50 group-hover:scale-105 group-hover:opacity-65 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                      
                      <div className="absolute top-6 left-6">
                        <Badge variant={tItem.status === 'LIVE' ? 'live' : 'cyan'}>
                          {tItem.status}
                        </Badge>
                      </div>
                      
                      {tItem.status === 'LIVE' && (
                        <div className="absolute top-6 right-6 flex items-center space-x-2 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-primary/30">
                          <div className="w-2.5 h-2.5 bg-primary rounded-full animate-ping" />
                          <span className="text-[10px] font-display font-black text-white uppercase tracking-widest">{t("live_score", "LIVE SCORE")}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-7 md:p-9">
                      <span className="text-xs font-display font-black text-primary uppercase tracking-widest mb-2 block">
                        {tItem.game_name}
                      </span>
                      <h3 className="text-2xl md:text-3xl font-display font-black text-white mb-6 group-hover:text-primary transition-colors">
                        {tItem.title}
                      </h3>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mb-7">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-colors">
                          <p className="text-[9px] font-display font-bold text-secondary uppercase tracking-widest mb-1">{t("prize_label", "SOVRIN")}</p>
                          <p className="text-xl font-display font-black text-white">
                            {Number(tItem.prize_pool) > 0 ? `$${Number(tItem.prize_pool).toLocaleString()}` : t("free", "Bepul")}
                          </p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-colors">
                          <p className="text-[9px] font-display font-bold text-secondary uppercase tracking-widest mb-1">{t("teams_label", "ISHTIROKCHILAR")}</p>
                          <p className="text-xl font-display font-black text-white">{tItem.participant_count} / {tItem.max_participants}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-colors col-span-2 sm:col-span-1">
                          <p className="text-[9px] font-display font-bold text-secondary uppercase tracking-widest mb-1">{t("entry_label", "KIRISH")}</p>
                          <p className="text-xl font-display font-black text-primary">
                            {Number(tItem.entry_fee) > 0 ? `$${Number(tItem.entry_fee).toLocaleString()}` : t("free", "FREE").toUpperCase()}
                          </p>
                        </div>
                      </div>
                      
                      <Link 
                        href={tItem.status === 'LIVE' ? `/streamers` : `/tournaments/${tItem.id}`}
                        className="btn-primary w-full sm:w-auto inline-flex items-center justify-center space-x-3 !py-4 !px-9 font-display font-black tracking-widest uppercase text-xs"
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
              
              {/* Upcoming Matches Column */}
              <div className="lg:col-span-5 xl:col-span-4 space-y-3.5">
                <p className="text-[11px] font-display font-black text-secondary uppercase tracking-widest pl-2 mb-2">
                  {t("upcoming_tournaments", "BO'LAJAK TURNIRLAR").toUpperCase()}
                </p>
                {tournaments.slice(1).map((tItem) => (
                  <Link 
                    key={tItem.id} 
                    href={`/tournaments/${tItem.id}`}
                    className="flex items-center justify-between p-4.5 rounded-2xl border border-white/5 bg-card/50 hover:bg-card hover:border-primary/40 transition-all duration-300 group hover:-translate-y-0.5"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex-shrink-0 overflow-hidden relative border border-white/10 group-hover:border-primary/30">
                        <img src={getGameImage(tItem.game_name)} alt={tItem.title} className="w-full h-full object-cover opacity-60" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-display font-bold text-primary uppercase tracking-widest">
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
                    <div className="flex items-center space-x-3 ml-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-display font-black text-white">
                          {Number(tItem.prize_pool) > 0 ? `$${Number(tItem.prize_pool).toLocaleString()}` : "FREE"}
                        </p>
                        <p className="text-[9px] text-secondary uppercase font-bold tracking-wider">{t("prize", "PRIZE")}</p>
                      </div>
                      <ChevronRight size={16} className="text-secondary/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>

            </div>
          )}
        </div>
      </section>

      {/* ===================== FEATURED NATIONAL GAMES VITRINA ===================== */}
      {featuredGames.length > 0 && (
        <section className="py-20 border-t border-white/5 relative bg-[#060609] px-4 md:px-6">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
              <div>
                <div className="flex items-center space-x-2 text-violet font-display font-black text-xs uppercase tracking-widest mb-3">
                  <Sparkles size={14} className="text-violet animate-pulse" />
                  <span>{t("national_showcase", "MILLIY GAMEDEV VITRINA")}</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-display font-black text-white uppercase tracking-tight">
                  {t("featured_games_title", "Mashhur O'zbek O'yinlari")}
                </h2>
              </div>
              <Link 
                href="/games" 
                className="group inline-flex items-center space-x-2 text-secondary hover:text-violet transition-all font-display font-bold text-xs uppercase tracking-widest"
              >
                <span>{t("all_games", "Barcha o'yinlar")}</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredGames.map((game) => (
                <Link
                  key={game.id}
                  href={`/games`}
                  className="card-interactive overflow-hidden group flex flex-col h-full border-white/10 hover:border-violet/50 bg-card p-0"
                >
                  <div className="aspect-[16/10] relative overflow-hidden bg-black/60">
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet/20 via-black/80 to-black">
                      <Gamepad2 size={64} className="text-white/20" />
                    </div>
                    {game.cover && (
                      <img
                        src={game.cover}
                        alt={game.title}
                        className="relative z-10 w-full h-full object-cover opacity-75 group-hover:scale-105 group-hover:opacity-95 transition-all duration-500"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="absolute inset-0 z-20 bg-gradient-to-t from-background via-black/20 to-transparent pointer-events-none" />
                    
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <Badge variant={game.platform === 'WEB' ? 'violet' : 'cyan'}>
                        {game.platform === 'WEB' ? 'WEB ONLINE' : 'PC DOWNLOAD'}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-display text-lg font-bold text-white group-hover:text-violet transition-colors mb-1.5 leading-snug">
                        {game.title}
                      </h4>
                      <p className="text-xs text-secondary line-clamp-2 leading-relaxed mb-4">
                        {game.description || t("game_card_desc", "O'zbek gamedev studiyalari tomonidan yaratilgan interaktiv o'yin.")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <span className="font-display font-black text-sm text-white">
                        {Number(game.price) > 0 ? `${Number(game.price).toLocaleString()} UZS` : "BEPUL"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-violet group-hover:text-white transition-colors">
                        <span>Ko'rish</span>
                        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* ===================== NEWS STREAM & GLOBAL STATS ===================== */}
      <section className="py-20 border-t border-white/5 relative bg-[#050508] px-4 md:px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* News Stream Feed */}
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-display font-black text-white uppercase tracking-wider">{t("news_stream", "YANGILIKLAR OQIMI")}</h3>
                <Link href="/news" className="text-xs font-display font-bold text-secondary hover:text-primary uppercase tracking-wider flex items-center gap-1">
                  {t("all_news_btn", "Hammasi")} <ChevronRight size={14} />
                </Link>
              </div>
              
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </div>
              ) : news.length === 0 ? (
                <EmptyState
                  icon={<Newspaper size={24} />}
                  title={t("no_news_title", "Yangiliklar Topilmadi")}
                  description={t("no_news_desc", "Tez kunda platforma va geyming yangiliklari e'lon qilinadi.")}
                  actionText={t("view_forum", "Hamjamiyat forumiga o'tish")}
                  actionHref="/forum"
                />
              ) : (
                <div className="space-y-4">
                  {news.map((item) => (
                    <Link 
                      key={item.id} 
                      href={`/news/${item.id}`}
                      className="group block p-6 rounded-2xl border border-white/5 bg-card/30 hover:bg-card/70 transition-all duration-300 relative overflow-hidden"
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
