"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { Calendar, User, Newspaper, ArrowRight, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useTranslation } from "@/lib/store";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  image_url: string;
  created_at: string;
  profiles: {
    username: string;
    full_name: string;
  };
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=1200";

export default function NewsPage() {
  const { t, locale } = useTranslation();
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data, error } = await supabase
          .from('news')
          .select('*, profiles(username, full_name)')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setNewsList(data);
      } catch (err) {
        console.error("News fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const localeCode = locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ";
  const formatDate = (value?: string) =>
    value
      ? new Date(value).toLocaleDateString(localeCode, {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";

  const featured = newsList[0];
  const rest = newsList.slice(1);

  return (
    <main className="min-h-screen bg-background text-white">
      <Navbar />

      {/* Premium Header */}
      <section className="relative pt-36 pb-14 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,51,85,0.16),transparent_60%)]" />
        <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_85%_0%,rgba(139,92,246,0.12),transparent_55%)]" />

        <div className="container-app">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="chip mb-5 border-primary/25 bg-primary/10 text-primary"
            >
              <Newspaper size={14} />
              <span className="font-display uppercase tracking-[0.2em] text-[11px]">Maroqli.uz OAV</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-4xl sm:text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-[1.05] uppercase"
            >
              {locale === "ru" ? (
                <>Последние <span className="text-gradient">Новости</span></>
              ) : locale === "en" ? (
                <>Latest <span className="text-gradient">News</span></>
              ) : (
                <>So'nggi <span className="text-gradient">Yangiliklar</span></>
              )}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-secondary text-lg md:text-xl leading-relaxed"
            >
              {t("news_subtitle", "So'nggi yangiliklar, e'lonlar va maqolalar")}
            </motion.p>
          </div>
        </div>
      </section>

      {/* News Content */}
      <section className="pb-32">
        <div className="container-app">
          {loading ? (
            <div className="space-y-10">
              <div className="skeleton h-[320px] md:h-[440px] w-full rounded-3xl" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="glass-card overflow-hidden flex flex-col h-full">
                    <div className="skeleton aspect-[16/9] rounded-none" />
                    <div className="p-6 space-y-4">
                      <div className="skeleton h-4 w-1/2" />
                      <div className="skeleton h-6 w-3/4" />
                      <div className="skeleton h-16 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : newsList.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card py-24 px-6 text-center flex flex-col items-center"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="relative w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center animate-float">
                  <Newspaper size={40} className="text-primary" />
                </div>
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-black text-white mb-3 uppercase tracking-tight">
                {t("no_news", "Yangiliklar mavjud emas.")}
              </h3>
              <p className="text-secondary max-w-md">
                {locale === "ru"
                  ? "Новые сообщения будут опубликованы в ближайшее время."
                  : locale === "en"
                  ? "New messages will be published shortly."
                  : "Tez orada yangi xabarlar chop etiladi."}
              </p>
            </motion.div>
          ) : (
            <>
              {/* Featured Hero Article */}
              {featured && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-12"
                >
                  <Link
                    href={`/news/${featured.id}`}
                    className="card-interactive group grid grid-cols-1 lg:grid-cols-2 overflow-hidden hover:border-primary/40"
                  >
                    <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[420px] overflow-hidden bg-white/5">
                      <img
                        src={featured.image_url || FALLBACK_IMAGE}
                        alt={featured.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-background via-background/20 to-transparent" />
                      <span className="absolute top-5 left-5 chip border-primary/30 bg-primary/15 text-primary font-display uppercase tracking-widest text-[10px]">
                        {t("featured_news", "Bosh maqola")}
                      </span>
                    </div>

                    <div className="p-8 md:p-10 flex flex-col justify-center">
                      <div className="flex flex-wrap items-center gap-4 mb-5 text-xs font-bold text-secondary uppercase tracking-widest">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-primary" />
                          {formatDate(featured.created_at)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <User size={14} className="text-primary" />
                          {featured.profiles?.username || "Admin"}
                        </span>
                      </div>

                      <h2 className="font-display text-3xl md:text-4xl font-black text-white mb-5 leading-tight tracking-tight group-hover:text-primary transition-colors line-clamp-3">
                        {featured.title}
                      </h2>

                      <p className="text-secondary leading-relaxed mb-8 whitespace-pre-line line-clamp-3">
                        {featured.content}
                      </p>

                      <span className="inline-flex items-center gap-2 text-primary font-display font-bold uppercase tracking-widest text-sm">
                        {t("read_more", "Batafsil o'qish")}
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              )}

              {/* Grid of remaining articles */}
              {rest.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <AnimatePresence>
                    {rest.map((newsItem, i) => (
                      <motion.div
                        key={newsItem.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="card-interactive overflow-hidden group hover:border-primary/40 flex flex-col h-full"
                      >
                        <Link href={`/news/${newsItem.id}`} className="flex flex-col h-full">
                          {/* Image */}
                          <div className="aspect-[16/9] relative overflow-hidden bg-white/5">
                            <img
                              src={newsItem.image_url || FALLBACK_IMAGE}
                              alt={newsItem.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="absolute top-4 left-4 chip !bg-black/50 !border-white/10 backdrop-blur-md text-white font-bold text-[10px] uppercase tracking-widest">
                              <Clock size={11} className="text-primary" />
                              {formatDate(newsItem.created_at)}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="p-6 md:p-7 flex-1 flex flex-col">
                            <div className="flex items-center gap-1.5 mb-3 text-[11px] font-bold text-secondary uppercase tracking-widest">
                              <User size={13} className="text-primary" />
                              <span>{newsItem.profiles?.username || "Admin"}</span>
                            </div>

                            <h3 className="font-display text-xl font-black text-white mb-3 leading-tight tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                              {newsItem.title}
                            </h3>

                            <p className="text-secondary text-sm leading-relaxed mb-6 whitespace-pre-line flex-1 line-clamp-3">
                              {newsItem.content}
                            </p>

                            <span className="mt-auto pt-5 border-t border-white/5 inline-flex items-center gap-2 text-primary font-bold text-sm">
                              {t("read_more", "Batafsil o'qish")}
                              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
