"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Trophy, Users, Shield, Gamepad2, Radio, Crown, TrendingUp, Code, MessageSquare, Newspaper, X, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/store";

const Hero = () => {
  const { t, locale } = useTranslation();
  const [showSections, setShowSections] = useState(false);

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
      desc: t("gamedev_desc", "O'zbekiston o'yin ishlab chiquvchilari jamoasi va studiyalari portal."), 
      href: "/gamedev", 
      icon: <Code size={24} />, 
      gradient: "from-orange-500 to-amber-600" 
    },
    { 
      name: t("lessons", "Dev Darslari"), 
      desc: t("lessons_desc", "O'yin yaratish bo'yicha maxsus darsliklar va o'quv videolari."), 
      href: "/gamedev?tab=lessons", 
      icon: <Play size={24} fill="currentColor" />, 
      gradient: "from-cyan-500 to-blue-600" 
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
    <section className="relative min-h-[95vh] flex items-center pt-28 pb-16 md:pt-48 md:pb-32 overflow-hidden bg-background">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,_#ff2d5533,_transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,_#3b82f61a,_transparent_50%)]" />
        <div className="absolute inset-0 opacity-25 bg-[url('/hero_bg.png')] bg-cover bg-center mix-blend-overlay" />
        
        {/* Animated Orbs */}
        <motion.div 
          animate={{ 
            x: [0, 100, 0], 
            y: [0, -50, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, -80, 0], 
            y: [0, 60, 0],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px]" 
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7 xl:col-span-8">

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight leading-[1.1] mb-8 text-white max-w-full uppercase"
            >
              {locale === 'ru' ? (
                <>
                  Будущее <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-orange-500">гейминга</span> в Узбекистане
                </>
              ) : locale === 'en' ? (
                <>
                  Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-orange-500">gaming</span> in Uzbekistan
                </>
              ) : (
                <>
                  O'zbekistonda <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-orange-500">gaming</span> kelajagi
                </>
              )}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-lg md:text-xl text-secondary max-w-xl mb-12 leading-relaxed"
            >
              {t("hero_desc", "Turnirlar, jonli efirlar va hamjamiyat — barchasi bir joyda. O'zbekistonning eng yirik gaming platformasiga qo'shiling.")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-5"
            >
              <button 
                onClick={() => setShowSections(true)} 
                className="btn-primary group relative overflow-hidden flex items-center justify-center sm:justify-start space-x-3 !py-4 !px-10 w-full sm:w-auto font-display tracking-widest uppercase text-sm cursor-pointer"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
                <Gamepad2 size={20} />
                <span className="relative z-10">{t("open_sections", "Bo'limlarni ochish")}</span>
              </button>
              <a 
                href="https://github.com/otbk-uz/PlayNationUz/releases/download/v0.1.0/MAROQLI.Setup.0.1.0.exe" 
                download
                rel="noopener noreferrer"
                className="btn-outline flex items-center justify-center sm:justify-start space-x-3 !py-4 !px-10 group bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40 w-full sm:w-auto font-display tracking-widest uppercase text-sm text-amber-400 hover:text-amber-300 transition-all duration-200"
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-black transition-all">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M0 3.449L9.75 2.1v9.45H0V3.449zM0 12.45h9.75v9.45L0 20.551v-8.1zM10.95 1.937L24 0v11.55H10.95V1.937zM10.95 12.45H24v11.55l-13.05-1.937v-9.613z"/>
                  </svg>
                </div>
                <span>Windows App</span>
              </a>
              <Link href="/tournaments" className="btn-outline flex items-center justify-center sm:justify-start space-x-3 !py-4 !px-10 group bg-white/5 border-white/10 hover:border-white/20 w-full sm:w-auto font-display tracking-widest uppercase text-sm">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                  <Play size={14} fill="currentColor" />
                </div>
                <span>{t("learn_more", "Ko'proq bilish")}</span>
              </Link>
            </motion.div>
          </div>

          {/* Stats Cards */}
          <div className="lg:col-span-5 xl:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-5">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-5 border-primary/20 hover:border-primary/50 transition-colors group"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <p className="font-display text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">5,000+</p>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest">{t("active_players", "Faol o'yinchilar")}</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="glass-card p-5 border-blue-500/20 hover:border-blue-500/50 transition-colors group"
            >
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 text-blue-500 group-hover:scale-110 transition-transform">
                <Shield size={24} />
              </div>
              <p className="font-display text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">42</p>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest">{t("verified_tournaments", "Tasdiqlangan turnirlar")}</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="glass-card p-5 border-yellow-500/20 hover:border-yellow-500/50 transition-colors group md:col-span-2 lg:col-span-1"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-6 text-yellow-500 group-hover:scale-110 transition-transform">
                    <Trophy size={24} />
                  </div>
                  <p className="font-display text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">$8,500+</p>
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest">{t("total_prize_pool", "Jami sovrin jamg'armasi")}</p>
                </div>
                <div className="hidden sm:block w-32 h-32 opacity-10">
                   <Trophy size={128} />
                 </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Fullscreen sections overlay modal */}
      <AnimatePresence>
        {showSections && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 md:p-10 overflow-y-auto"
          >
            <div className="w-full max-w-6xl relative my-auto py-8">
              {/* Close button */}
              <button 
                onClick={() => setShowSections(false)}
                className="absolute top-0 right-0 p-3 text-secondary hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full border border-white/10"
              >
                <X size={24} />
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
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Hero;
