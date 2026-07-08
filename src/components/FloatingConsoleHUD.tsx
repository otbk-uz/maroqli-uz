"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, User, LogOut, ChevronDown, Trophy, Gamepad2, Radio, Crown, TrendingUp, Code, MessageSquare, Newspaper, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore, useTranslation } from "@/lib/store";
import api from "@/lib/api";

export default function FloatingConsoleHUD() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const { t, locale, setLocale } = useTranslation();
  
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) {
      fetchNotifications();
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAuthenticated]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/users/notifications/");
      setNotifications(res.data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.post(`/users/notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/users/notifications/read_all/");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const navLinks = [
    { name: t("home", "Bosh sahifa"), href: "/" },
    { name: t("tournaments", "Turnirlar"), href: "/tournaments" },
    { name: t("games", "O'yinlar"), href: "/games" },
    { name: t("streamers", "Streamerlar"), href: "/streamers" },
    { name: t("premium", "Premium"), href: "/premium" },
    { name: t("leaderboard", "Reyting"), href: "/leaderboard" },
    { name: t("gamedev", "GameDev"), href: "/gamedev" },
    { name: t("forum", "Forum"), href: "/forum" },
    { name: t("news", "Yangiliklar"), href: "/news" },
  ];

  if (user && user.role === "ADMIN") {
    navLinks.push({ name: "Admin", href: "/admin" });
  }

  if (!mounted) return null;

  return (
    <>
      {/* Desktop Header */}
      <header 
        className={`fixed top-0 left-0 w-full z-50 hidden lg:flex flex-col justify-between px-4 xl:px-10 py-2 transition-all duration-300 ease-in-out border-b ${
          scrolled 
            ? "bg-background/95 backdrop-blur-xl border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" 
            : "bg-transparent border-white/5"
        }`}
      >
        {/* Row 1: Brand Logo + Actions */}
        <div className="flex items-center justify-between w-full pt-1 pb-2">
          {/* Brand logo */}
          <div className="flex items-center space-x-3 flex-shrink-0 z-10">
            <Link href="/" className="flex items-center space-x-2.5">
              <img src="/logo.jpg.png" alt="Logo" className="h-9 w-auto rounded-lg shadow-[0_0_15px_rgba(255,70,85,0.15)]" />
              <span className="font-display font-black text-lg tracking-widest text-white">
                MAROQLI
              </span>
            </Link>
          </div>

          {/* Right actions */}
          <div className="flex items-center space-x-4 z-10">
            
            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center space-x-1 text-xs font-display font-black text-secondary hover:text-white bg-white/5 px-3 py-2 rounded-lg transition-colors border border-white/5"
              >
                <span>{locale === 'uz' ? 'O\'Z' : locale === 'ru' ? 'РУ' : 'EN'}</span>
              </button>

              <AnimatePresence>
                {showLangMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-3 w-32 bg-card border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                  >
                    <button onClick={() => { setLocale('uz'); setShowLangMenu(false); }} className={`w-full text-left px-4 py-2 text-xs hover:bg-white/5 ${locale === 'uz' ? 'text-primary font-bold' : 'text-secondary'}`}>O'zbek</button>
                    <button onClick={() => { setLocale('ru'); setShowLangMenu(false); }} className={`w-full text-left px-4 py-2 text-xs hover:bg-white/5 ${locale === 'ru' ? 'text-primary font-bold' : 'text-secondary'}`}>Русский</button>
                    <button onClick={() => { setLocale('en'); setShowLangMenu(false); }} className={`w-full text-left px-4 py-2 text-xs hover:bg-white/5 ${locale === 'en' ? 'text-primary font-bold' : 'text-secondary'}`}>English</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2.5 text-secondary hover:text-white transition-colors relative bg-white/5 rounded-full border border-white/5"
                  >
                    <Bell size={16} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary text-[8px] items-center justify-center text-white font-bold border border-background">
                          {unreadCount}
                        </span>
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-4 w-80 bg-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                      >
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                          <h3 className="font-bold text-white text-xs">Bildirishnomalar</h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllRead}
                              className="text-[10px] text-primary hover:text-white transition-colors font-semibold"
                            >
                              Hammasini o'qish
                            </button>
                          )}
                        </div>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center text-secondary text-xs">Yangi xabarlar yo'q</div>
                          ) : (
                            notifications.map((notif) => (
                              <div
                                key={notif.id}
                                className={`p-3.5 border-b border-white/5 transition-colors ${
                                  notif.is_read ? "opacity-60 bg-transparent" : "bg-primary/5"
                                }`}
                                onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                              >
                                <p className="text-xs text-white mb-1">{notif.message}</p>
                                <span className="text-[9px] text-secondary">
                                  {new Date(notif.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Profile Avatar */}
                <Link href="/profile" className="flex items-center space-x-2.5 bg-white/5 hover:bg-white/10 pl-2.5 pr-4 py-1.5 rounded-full border border-white/5 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs relative">
                    {user.username?.[0]?.toUpperCase() || <User size={12} />}
                    {user.is_premium && (
                      <div className="absolute -top-1 -right-1 bg-amber-500 text-black rounded-full p-0.5 shadow-[0_0_5px_rgba(245,158,11,0.5)]">
                        <Crown size={6} className="fill-current" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-white truncate max-w-[80px] flex items-center gap-1">
                    <span>{user.username}</span>
                    {user.is_premium && (
                      <span className="text-amber-400 font-extrabold text-[8px] bg-amber-500/10 px-1 rounded">PRO</span>
                    )}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="text-xs font-display font-black text-white hover:text-primary transition-colors px-4 py-2"
                >
                  Kirish
                </Link>
                <Link
                  href="/register"
                  className="text-xs font-display font-black bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-full transition-all shadow-[0_4px_15px_rgba(255,70,85,0.3)] hover:shadow-[0_4px_25px_rgba(255,70,85,0.5)]"
                >
                  Ro'yxatdan o'tish
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Nav Links */}
        <div className="flex items-center justify-center w-full border-t border-white/5 pt-2 pb-1">
          <nav className="flex flex-wrap items-center justify-center gap-2 z-10 w-full">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-display font-black uppercase tracking-wider transition-all duration-200 ${
                    isActive 
                      ? "text-primary bg-primary/5" 
                      : "text-secondary hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Header (Sleek, transparent, modest) */}
      <header className="fixed top-0 left-0 w-full h-14 z-50 flex lg:hidden items-center justify-between px-4 bg-background/85 backdrop-blur-xl border-b border-white/5 shadow-md">
        <Link href="/" className="flex items-center space-x-2">
          <img src="/logo.jpg.png" alt="Logo" className="h-8 w-auto rounded-lg shadow-[0_0_10px_rgba(255,70,85,0.15)]" />
          <span className="font-display font-black text-sm tracking-widest text-white">MAROQLI</span>
        </Link>

        <div className="flex items-center space-x-3">
          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center space-x-1 text-[10px] font-display font-black text-secondary hover:text-white bg-white/5 px-2.5 py-1.5 rounded-lg transition-colors border border-white/5"
            >
              <span>{locale === 'uz' ? 'O\'Z' : locale === 'ru' ? 'РУ' : 'EN'}</span>
            </button>

            <AnimatePresence>
              {showLangMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-28 bg-card border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                >
                  <button onClick={() => { setLocale('uz'); setShowLangMenu(false); }} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 ${locale === 'uz' ? 'text-primary font-bold' : 'text-secondary'}`}>O'zbek</button>
                  <button onClick={() => { setLocale('ru'); setShowLangMenu(false); }} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 ${locale === 'ru' ? 'text-primary font-bold' : 'text-secondary'}`}>Русский</button>
                  <button onClick={() => { setLocale('en'); setShowLangMenu(false); }} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 ${locale === 'en' ? 'text-primary font-bold' : 'text-secondary'}`}>English</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isAuthenticated && user ? (
            <div className="flex items-center space-x-2">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-secondary hover:text-white transition-colors relative bg-white/5 rounded-full border border-white/5"
                >
                  <Bell size={14} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary text-[7px] items-center justify-center text-white font-bold border border-background">
                        {unreadCount}
                      </span>
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-3 w-64 bg-card border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                        <h3 className="font-bold text-white text-[10px]">Bildirishnomalar</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[8px] text-primary hover:text-white transition-colors font-semibold"
                          >
                            Barchasi
                          </button>
                        )}
                      </div>
                      <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-secondary text-[10px]">Xabarlar yo'q</div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`p-2.5 border-b border-white/5 transition-colors ${
                                notif.is_read ? "opacity-60 bg-transparent" : "bg-primary/5"
                              }`}
                              onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                            >
                              <p className="text-[10px] text-white mb-0.5">{notif.message}</p>
                              <span className="text-[8px] text-secondary">
                                {new Date(notif.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile Avatar */}
              <Link href="/profile" className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-white/5 flex-shrink-0 relative">
                {user.username?.[0]?.toUpperCase() || <User size={10} />}
                {user.is_premium && (
                  <div className="absolute -top-1 -right-1 bg-amber-500 text-black rounded-full p-0.5 shadow-[0_0_5px_rgba(245,158,11,0.5)]">
                    <Crown size={5} className="fill-current" />
                  </div>
                )}
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-[10px] font-display font-black bg-primary hover:bg-primary/95 text-white px-3 py-1.5 rounded-lg transition-all"
            >
              Kirish
            </Link>
          )}
        </div>
      </header>
    </>
  );
}
