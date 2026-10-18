"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Trophy, Users, Shield, Gamepad2, Radio, Crown, TrendingUp, Code, MessageSquare, Newspaper, X, ShoppingCart, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/store";

type HeroStats = { users: number; tournaments: number; games: number };

const Hero = ({ stats }: { stats?: HeroStats }) => {
  const { t, locale } = useTranslation();
  const [showSections, setShowSections] = useState(false);
  const fmt = (n?: number) => (n && n > 0 ? n.toLocaleString() : "—");

  const quickPillars = [
    { name: t("games", "O'yinlar do'koni"), href: "/games", icon: Gamepad2, color: "text-violet hover:border-violet/40 hover:bg-violet/10" },
    { name: t("tournaments", "Turnirlar"), href: "/tournaments", icon: Trophy, color: "text-primary hover:border-primary/40 hover:bg-primary/10" },
    { name: t("streamers", "Streamerlar"), href: "/streamers", icon: Radio, color: "text-purple-400 hover:border-purple-400/40 hover:bg-purple-400/10" },
    { name: t("premium", "VIP Premium"), href: "/premium", icon: Crown, color: "text-amber-400 hover:border-amber-400/40 hover:bg-amber-400/10" },
    { name: t("leaderboard", "Reyting"), href: "/leaderboard", icon: TrendingUp, color: "text-emerald-400 hover:border-emerald-400/40 hover:bg-emerald-400/10" },
    { name: t("gamedev", "GameDev Hub"), href: "/gamedev", icon: Code, color: "text-cyan-400 hover:border-cyan-400/40 hover:bg-cyan-400/10" },
  ];

  const sectionsList = [
    { 
      name: t("tournaments", "Turnirlar"), 
      desc: t("tournaments_desc", "Haftalik turnirlarda qatnashing va sovrinlar yuting."), 
      href: "/tournaments", 
      icon: <Trophy size={24} />, 
      gradient: "from-red-500 to-rose-600" 
    },
    { 
      name: t("games", "O'yinlar do'koni"), 
      desc: t("games_desc", "Mahalliy va xalqaro o'yinlarni hamyonbop narxlarda xarid qiling."), 
      href: "/games", 
      icon: <ShoppingCart size={24} />, 
      gradient: "from-blue-500 to-indigo-600" 
    },
    { 
      name: t("streamers", "Streamerlar"), 
      desc: t("streamers_desc", "Taniqli streamerlarning jonli efirlarini saytimizda kuzating."), 
      href: "/streamers", 
      icon: <Radio size={24} />, 
      gradient: "from-purple-500 to-violet-600" 
    },
    { 
      name: t("premium", "Premium"), 
      desc: t("premium_desc", "Barcha yopiq funksiyalar va VIP imkoniyatlardan to'liq foydalaning."), 
      href: "/premium", 
      icon: <Crown size={24} />, 
      gradient: "from-amber-500 to-yellow-600" 
    },
    { 
      name: t("leaderboard", "Reyting"), 
      desc: t("leaderboard_desc", "Eng kuchli o'yinchilar va peshqadamlar ro'yxati."), 
      href: "/leaderboard", 
      icon: <TrendingUp size={24} />, 
      gradient: "from-green-500 to-emerald-600" 
    },
    { 
      name: t("gamedev", "GameDev Hub"), 
      desc: t("gamedev_desc", "O'zbekiston o'yin ishlab chiquvchilari jamoasi va studiyalari portali."), 
      href: "/gamedev", 
      icon: <Code size={24} />, 
      gradient: "from-orange-500 to-amber-600" 
    },
    { 
      name: t("forum", "Forum"), 
      desc: t("forum_desc", "Boshqa o'yinchilar bilan fikr almashing va savol-javob qiling."), 
      href: "/forum", 
      icon: <MessageSquare size={24} />, 
      gradient: "from-pink-500 to-rose-600" 
    },
    { 
      name: t("news", "Yangiliklar"), 
      desc: t("news_desc", "Geyming va texnologiya sohasidagi eng so'nggi yangiliklar."), 
      href: "/news", 
      icon: <Newspaper size={24} />, 
      gradient: "from-gray-500 to-slate-600" 
    },
  ];

  return (
    <section className="relative min-h-[92vh] flex items-center pt-28 pb-16 md:pt-40 md:pb-24 overflow-hidden bg-background">
      {/* Background — aurora and high-tech grid */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,_rgba(255,51,85,0.14),_transparent_60%)]" />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-violet/10 rounded-full blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.08] bg-[url('/hero_bg.png')] bg-cover bg-center mix-blend-overlay" />
        <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Main Hero Column */}
          <div className="lg:col-span-7 xl:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-display font-black tracking-widest uppercase mb-6"
            >
              <Sparkles size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
              <span>{t("national_platform_tag", "O'zbekiston Milliy Gaming Ekotizimi")}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] mb-6 text-white max-w-full uppercase"
            >
              {locale === 'ru' ? (
                <>
                  Национальная <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-orange-500">Игровая</span> Платформа
                </>
              ) : locale === 'en' ? (
                <>
                  National <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-orange-500">Gaming</span> Platform
                </>
              ) : (
                <>
                  Milliy <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-orange-500">Gaming</span> Platformasi
                </>
              )}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-base sm:text-lg md:text-xl text-secondary max-w-xl mb-9 leading-relaxed font-normal"
            >
              {t("hero_desc", "Turnirlar, jonli efirlar va hamjamiyat — barchasi bir joyda. O'zbekistonning eng yirik gaming platformasiga qo'shiling.")}
            </motion.p>

            {/* Primary Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row flex-wrap gap-4 mb-10"
            >
              <Link 
                href="/games" 
                className="btn-primary group relative overflow-hidden flex items-center justify-center space-x-3 !py-4 !px-8 w-full sm:w-auto font-display tracking-widest uppercase text-xs sm:text-sm"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
                <Gamepad2 size={19} />
                <span className="relative z-10">{t("explore_games", "O'YINLAR KATALOGI")}</span>
              </Link>

              <Link 
                href="/tournaments" 
                className="btn-outline flex items-center justify-center space-x-3 !py-4 !px-8 group bg-white/5 border-white/10 hover:border-white/25 w-full sm:w-auto font-display tracking-widest uppercase text-xs sm:text-sm"
              >
                <Trophy size={18} className="text-primary group-hover:scale-110 transition-transform" />
                <span>{t("view_tournaments", "TURNIRLARGA KIRISH")}</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowSections(true)}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-3.5 text-xs font-bold text-secondary hover:text-white transition-colors uppercase tracking-wider"
              >
                <span>{t("all_sections", "Bo'limlar")}</span>
                <ChevronRight size={14} />
              </button>
            </motion.div>

            {/* Quick Access Pillar Chips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="pt-2 border-t border-white/5"
            >
              <p className="text-[10px] font-display font-black text-secondary/60 uppercase tracking-widest mb-3">
                {t("quick_navigation", "TEZKOR BO'LIMLAR")}
              </p>
              <div className="flex flex-wrap gap-2 sm:gap-2.5">
                {quickPillars.map((p) => {
                  const Icon = p.icon;
                  return (
                    <Link
                      key={p.href}
                      href={p.href}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-card/60 backdrop-blur-md text-xs font-bold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${p.color}`}
                    >
                      <Icon size={14} className="shrink-0" />
                      <span>{p.name}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Stats Cards — Direct Links */}
          <div className="lg:col-span-5 xl:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-5">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Link
                href="/leaderboard"
                className="block glass-card p-5 border-primary/20 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,51,85,0.2)]">
                    <Users size={22} />
                  </div>
                  <ChevronRight size={18} className="text-secondary/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <p className="font-display text-4xl md:text-5xl font-black text-white mb-1.5 tracking-tight tabular-nums">{fmt(stats?.users)}</p>
                <p className="text-[11px] font-display font-black text-secondary uppercase tracking-widest">{t("active_players", "Faol O'yinchilar")}</p>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Link
                href="/tournaments"
                className="block glass-card p-5 border-violet/20 hover:border-violet/50 transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-violet/10 rounded-2xl flex items-center justify-center text-violet group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                    <Trophy size={22} />
                  </div>
                  <ChevronRight size={18} className="text-secondary/40 group-hover:text-violet group-hover:translate-x-1 transition-all" />
                </div>
                <p className="font-display text-4xl md:text-5xl font-black text-white mb-1.5 tracking-tight tabular-nums">{fmt(stats?.tournaments)}</p>
                <p className="text-[11px] font-display font-black text-secondary uppercase tracking-widest">{t("tournaments", "Turnirlar")}</p>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Link
                href="/games"
                className="block glass-card p-5 border-white/10 hover:border-white/25 transition-all duration-300 hover:-translate-y-1 group md:col-span-2 lg:col-span-1"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-white group-hover:scale-110 transition-transform">
                      <Gamepad2 size={22} />
                    </div>
                    <p className="font-display text-4xl md:text-5xl font-black text-white mb-1.5 tracking-tight">{fmt(stats?.games)}</p>
                    <p className="text-[11px] font-display font-black text-secondary uppercase tracking-widest">{t("available_games", "Mavjud O'yinlar")}</p>
                  </div>
                  <div className="hidden sm:block w-28 h-28 opacity-[0.06] text-white">
                    <Gamepad2 size={112} />
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>

        </div>
      </div>

      {/* Sections Modal — preserved for users who want the complete directory view */}
      <AnimatePresence>
        {showSections && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl overflow-y-auto p-4 md:p-10"
          >
            <div className="flex items-center justify-center min-h-full w-full">
              <div className="w-full max-w-6xl relative py-8">
                <button 
                  onClick={() => setShowSections(false)}
                  className="absolute -top-4 right-0 p-3 text-secondary hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full border border-white/10 z-10"
                >
                  <X size={20} />
                </button>

                <div className="text-center mb-8 md:mb-12">
                  <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight text-white uppercase mb-3">
                    {t("platform_sections", "Platforma Bo'limlari")}
                  </h2>
                  <p className="text-secondary text-xs md:text-sm max-w-md mx-auto">
                    {t("sections_desc", "Maroqli gaming platformasining barcha asosiy modullari va sahifalari")}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                  {sectionsList.map((sec, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      key={sec.href}
                    >
                      <Link 
                        href={sec.href}
                        onClick={() => setShowSections(false)}
                        className="group block glass-card p-5 border-white/5 hover:border-primary/50 transition-all duration-300 relative overflow-hidden bg-white/[0.01] hover:bg-white/[0.03]"
                      >
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${sec.gradient} opacity-5 group-hover:opacity-20 blur-xl transition-opacity duration-300`} />
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${sec.gradient} flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.3)]`}>
                          {sec.icon}
                        </div>
                        <h3 className="font-display text-base font-bold text-white mb-1.5 uppercase tracking-wide group-hover:text-primary transition-colors">
                          {sec.name}
                        </h3>
                        <p className="text-[11px] text-secondary leading-relaxed">
                          {sec.desc}
                        </p>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Hero;
