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
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) {
      fetchNotifications();
    }
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

  const coreLinks = [
    { name: t("home", "Bosh"), href: "/", icon: <TrendingUp size={16} /> },
    { name: t("tournaments", "Turnirlar"), href: "/tournaments", icon: <Trophy size={16} /> },
    { name: t("games", "O'yinlar"), href: "/games", icon: <Gamepad2 size={16} /> },
    { name: t("streamers", "Streamerlar"), href: "/streamers", icon: <Radio size={16} /> },
  ];

  const moreLinks = [
    { name: t("premium", "Premium"), href: "/premium", icon: <Crown size={16} className="text-amber-400" /> },
    { name: t("leaderboard", "Reyting"), href: "/leaderboard", icon: <TrendingUp size={16} /> },
    { name: t("gamedev", "GameDev"), href: "/gamedev", icon: <Code size={16} /> },
    { name: t("forum", "Forum"), href: "/forum", icon: <MessageSquare size={16} /> },
    { name: t("news", "Yangiliklar"), href: "/news", icon: <Newspaper size={16} /> },
  ];

  if (user && user.role === "ADMIN") {
    moreLinks.push({ name: "Admin", href: "/admin", icon: <ShieldAlert size={16} className="text-red-500" /> });
  }

  if (!mounted) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 w-[92%] max-w-7xl h-16 bg-card/65 backdrop-blur-2xl border border-white/10 rounded-full z-50 hidden lg:flex items-center justify-between px-8 shadow-[0_12px_40px_rgba(0,0,0,0.6)] hover:border-primary/20 transition-all duration-300">
      
      {/* HUD Glow Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-full pointer-events-none" />

      {/* Brand logo */}
      <div className="flex items-center space-x-3 flex-shrink-0 z-10">
        <Link href="/" className="flex items-center space-x-2.5">
          <img src="/logo.jpg.png" alt="Logo" className="h-9 w-auto rounded-lg shadow-[0_0_15px_rgba(255,70,85,0.2)]" />
          <span className="font-display font-black text-lg tracking-widest text-white">MAROQLI</span>
        </Link>
      </div>

      {/* Center navigation links */}
      <nav className="flex items-center space-x-1 z-10 bg-white/5 border border-white/5 p-1 rounded-full">
        {coreLinks.map((link) => {
          const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center space-x-2 px-5 py-2 rounded-full text-xs font-display font-black uppercase tracking-wider transition-all duration-300 ${
                isActive 
                  ? "bg-primary text-white shadow-[0_4px_15px_rgba(255,70,85,0.3)]" 
                  : "text-secondary hover:text-white hover:bg-white/5"
              }`}
            >
              {link.icon}
              <span>{link.name}</span>
            </Link>
          );
        })}

        {/* More dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex items-center space-x-1.5 px-5 py-2 rounded-full text-xs font-display font-black uppercase tracking-wider transition-all ${
              showMoreMenu ? "bg-white/10 text-white" : "text-secondary hover:text-white hover:bg-white/5"
            }`}
          >
            <span>Kengroq</span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${showMoreMenu ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showMoreMenu && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                className="absolute left-1/2 -translate-x-1/2 mt-3 w-56 bg-card/95 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl shadow-2xl space-y-1 z-50"
              >
                {moreLinks.map((link) => {
                  const isActive = pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setShowMoreMenu(false)}
                      className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-display font-black uppercase tracking-wider transition-colors ${
                        isActive 
                          ? "bg-primary/10 text-primary" 
                          : "text-secondary hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {link.icon}
                      <span>{link.name}</span>
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Right actions */}
      <div className="flex items-center space-x-4 z-10">
        
        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center space-x-1 text-xs font-display font-black text-secondary hover:text-white bg-white/5 px-3 py-2 rounded-full transition-colors border border-white/5"
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
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                {user.username?.[0]?.toUpperCase() || <User size={12} />}
              </div>
              <span className="text-xs font-bold text-white truncate max-w-[80px]">{user.username}</span>
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
  );
}
