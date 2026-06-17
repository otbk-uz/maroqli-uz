"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import { Trophy, ArrowRight, Play, Gamepad2, Calendar } from "lucide-react";
import { useTranslation } from "@/lib/store";

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
    total_views: 12450000,
    streamers_count: 15,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        
        // Fetch Tournaments
        const { data: tData } = await supabase
          .from('tournaments')
          .select('*')
          .in('status', ['LIVE', 'UPCOMING'])
          .limit(6);
          
        if (tData) setTournaments(tData as any);

        // Fetch News
        const { data: nData } = await supabase
          .from('news')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(4);
          
        if (nData) {
          const mappedNews = nData.map(n => ({
            id: n.id,
            title: n.title,
            category_display: t("news_badge", "YANGILIK"),
            created_at: n.created_at
          }));
          setNews(mappedNews as any);
        }

        // Stats (mock or count)
        const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: tCount } = await supabase.from('tournaments').select('*', { count: 'exact', head: true });
        
        setStats({
          users_count: usersCount || 0,
          tournaments_count: tCount || 0,
          games_count: 12,
          total_views: 12450000,
          streamers_count: 15,
        });

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

  // Static images mapping for games
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
      <Navbar />
      <Hero />
      
      {/* Featured Tournaments Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div>
              <div className="flex items-center space-x-2 text-primary font-bold text-xs uppercase tracking-widest mb-4">
                <Trophy size={14} />
                <span>{t("competitive_games", "Raqobatbardosh o'yinlar")}</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white">{t("active_tournaments", "Faol turnirlar")}</h2>
            </div>
            <Link href="/tournaments" className="group flex items-center space-x-2 text-secondary hover:text-primary transition-all font-bold">
              <span>{t("view_all_tournaments", "Barcha turnirlarni ko'rish")}</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-secondary text-sm">{t("no_active_tournaments", "Hozirda faol turnirlar mavjud emas.")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tournaments.map((tItem) => (
                <div key={tItem.id} className="glass-card overflow-hidden group hover:border-primary/50 transition-all duration-500">
                  <div className="aspect-[16/10] bg-white/5 relative overflow-hidden">
                    <img 
                      src={getGameImage(tItem.game_name)} 
                      alt={tItem.title}
                      className="w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:opacity-80 transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
                    
                    <div className="absolute top-4 left-4 flex space-x-2">
                      <span className={`${tItem.status === 'LIVE' ? 'bg-primary animate-pulse' : 'bg-blue-500'} px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-black/50`}>
                        {tItem.status}
                      </span>
                    </div>
                    
                    {tItem.status === 'LIVE' && (
                      <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">LIVE NOW</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-8">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 block">{tItem.game_name}</span>
                    <h3 className="text-xl font-bold text-white mb-6 group-hover:text-primary transition-colors line-clamp-1">{tItem.title}</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">{t("prize_label", "Sovrin")}</p>
                        <p className="text-lg font-black text-white">
                          {Number(tItem.prize_pool) > 0 ? `$${Number(tItem.prize_pool).toLocaleString()}` : t("free", "Bepul")}
                        </p>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">{t("slots_label", "Slots")}</p>
                        <p className="text-lg font-black text-white">{tItem.participant_count}/{tItem.max_participants}</p>
                      </div>
                    </div>
                    
                    <Link 
                      href={tItem.status === 'LIVE' ? `/streamers` : `/tournaments/${tItem.id}`}
                      className="w-full py-4 bg-white/5 hover:bg-primary text-white font-bold rounded-xl transition-all duration-300 border border-white/10 hover:border-primary active:scale-95 flex items-center justify-center space-x-2"
                    >
                      {tItem.status === 'LIVE' ? (
                        <>
                          <Play size={16} fill="white" />
                          <span>{t("watch", "Tomosha qilish")}</span>
                        </>
                      ) : (
                        <>
                          <Gamepad2 size={16} />
                          <span>{t("more_details", "Batafsil ma'lumot")}</span>
                        </>
                      )}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Latest News Feed Section */}
      <section className="py-20 border-t border-white/5 relative">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-4xl font-black text-white">{t("latest_news", "So'nggi Yangiliklar")}</h2>
              <p className="text-secondary text-sm mt-2">{t("news_desc", "Platforma va gaming koinotidagi yangiliklar")}</p>
            </div>
            <Link href="/news" className="group flex items-center space-x-2 text-secondary hover:text-primary transition-all font-bold">
              <span>{t("all_news", "Barcha yangiliklar")}</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : news.length === 0 ? (
            <p className="text-secondary text-sm text-center py-10">{t("no_news", "Yangiliklar mavjud emas.")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {news.map((item) => (
                <Link 
                  key={item.id} 
                  href={`/news/${item.id}`}
                  className="glass-card p-6 block hover:border-primary/40 transition-colors duration-300"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {item.category_display}
                    </span>
                    <div className="flex items-center text-[10px] text-secondary">
                      <Calendar size={12} className="mr-1" />
                      {new Date(item.created_at).toLocaleDateString(
                        locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ",
                        {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white hover:text-primary transition-colors duration-300 line-clamp-2">
                    {item.title}
                  </h3>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="py-20 bg-primary/5 border-t border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            <div>
              <p className="text-4xl md:text-6xl font-black text-white mb-2">{formatViews(stats.total_views)}</p>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest">{t("total_views", "Jami ko'rishlar")}</p>
            </div>
            <div>
              <p className="text-4xl md:text-6xl font-black text-white mb-2">{stats.tournaments_count}</p>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest">{t("tournaments_count", "Turnirlar soni")}</p>
            </div>
            <div>
              <p className="text-4xl md:text-6xl font-black text-white mb-2">{stats.users_count}</p>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest">{t("active_users", "Faol foydalanuvchilar")}</p>
            </div>
            <div>
              <p className="text-4xl md:text-6xl font-black text-white mb-2">{stats.games_count}</p>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest">{t("available_games", "Mavjud o'yinlar")}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
