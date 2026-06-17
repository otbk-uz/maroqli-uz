"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Bell, User, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore, useTranslation } from "@/lib/store";
import api from "@/lib/api";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const { t, locale, setLocale } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const navLinks = [
    { name: t("home", "Bosh sahifa"), href: "/" },
    { name: t("tournaments", "Turnirlar"), href: "/tournaments" },
    { name: t("games", "O'yinlar"), href: "/games" },
    { name: t("streamers", "Streamerlar"), href: "/streamers" },
    { name: t("premium", "👑 Premium"), href: "/premium" },
    { name: t("leaderboard", "Reyting"), href: "/leaderboard" },
    { name: t("gamedev", "GameDev"), href: "/gamedev" },
    { name: t("news", "Yangiliklar"), href: "/news" },
  ];

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    
    if (isAuthenticated) {
      fetchNotifications();
    }

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

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/85 backdrop-blur-lg border-b border-white/5 py-4" : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <img src="/logo.jpg.png" alt="PlayNationUz Logo" className="h-12 w-auto" />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-secondary hover:text-white transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center space-x-4 relative">
            {/* Language Switcher Dropdown */}
            <div className="relative z-50">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
              >
                <span>🌐</span>
                <span className="uppercase">{locale}</span>
                <span className="text-[8px] opacity-60">▼</span>
              </button>

              <AnimatePresence>
                {showLangMenu && (
                  <>
                    <div className="fixed inset-0" onClick={() => setShowLangMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-full mt-2 w-28 bg-[#18181c] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 text-[10px]"
                    >
                      <div className="divide-y divide-white/5">
                        {(["uz", "ru", "en"] as const).map((lang) => (
                          <button
                            key={lang}
                            onClick={() => {
                              setLocale(lang);
                              setShowLangMenu(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left font-bold uppercase hover:bg-white/5 transition-colors ${
                              locale === lang ? 'text-primary' : 'text-secondary hover:text-white'
                            }`}
                          >
                            {lang === "uz" ? "O'zbek" : lang === "ru" ? "Русский" : "English"}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-secondary hover:text-white transition-colors relative"
            >
              <Bell size={20} />
              {mounted && unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-black font-extrabold text-[9px] rounded-full flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 text-xs"
                >
                  <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex items-center justify-between font-bold text-secondary">
                    <span>{t("notifications", "Bildirishnomalar")}</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-[10px] text-primary hover:underline">
                        {t("mark_all_read", "Hammasini o'qildi qilish")}
                      </button>
                    )}
                  </div>
                  
                  <div className="divide-y divide-white/5 max-h-60 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 hover:bg-white/[0.02] flex justify-between gap-3 ${!n.is_read ? 'bg-primary/5' : ''}`}>
                          <div className="flex-1">
                            <p className="font-semibold text-white mb-0.5">{n.title}</p>
                            <p className="text-secondary leading-normal text-[11px]">{n.message}</p>
                            <span className="text-[9px] text-secondary/50 block mt-1">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {!n.is_read && (
                            <button 
                              onClick={() => handleMarkAsRead(n.id)}
                              className="text-[10px] text-primary self-start hover:underline font-bold"
                            >
                              {t("mark_read", "O'qildi")}
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-secondary">{t("no_notifications", "Hozircha xabarlar yo'q.")}</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="h-4 w-px bg-white/10 mx-2" />

            {mounted && isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link href="/profile" className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.nickname} className="w-full h-full object-cover" />
                    ) : (
                      <User size={16} className="text-primary" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold flex items-center gap-1">
                      {user?.nickname || user?.username || 'Gamer'}
                      {user?.is_premium && (
                        <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-[9px] text-black px-1 rounded-sm font-extrabold uppercase animate-pulse">
                          PRO
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-secondary font-medium uppercase tracking-wider">{user?.role}</span>
                  </div>
                </Link>
                <button
                  onClick={() => logout()}
                  className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  title={t("logout", "Chiqish")}
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
                  {t("login", "Kirish")}
                </Link>
                <Link href="/register" className="btn-primary py-2 px-6 text-sm">
                  {t("register", "Ro'yxatdan o'tish")}
                </Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="lg:hidden p-2 text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-card border-b border-white/5 overflow-hidden"
          >
            <div className="container mx-auto px-4 py-8 flex flex-col space-y-6">
              {/* Mobile Language Switcher */}
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <span className="text-xs text-secondary font-medium">Til / Язык / Language:</span>
                <div className="flex bg-white/5 border border-white/10 rounded-xl p-0.5 text-[10px] font-bold">
                  {(["uz", "ru", "en"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLocale(lang)}
                      className={`px-2.5 py-1 rounded-lg uppercase transition-all duration-200 ${
                        locale === lang
                          ? "bg-primary text-black"
                          : "text-secondary hover:text-white"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-lg font-medium text-secondary hover:text-white"
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-6 border-t border-white/5 flex flex-col space-y-4">
                {mounted && isAuthenticated ? (
                  <div className="flex flex-col space-y-4">
                    <Link href="/profile" onClick={() => setIsOpen(false)} className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center overflow-hidden">
                        {user?.avatar ? (
                          <img src={user.avatar} alt={user.nickname} className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} className="text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-1">
                          {user?.nickname || user?.username || 'Gamer'}
                          {user?.is_premium && (
                            <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-[10px] text-black px-1.5 py-0.5 rounded-sm font-extrabold uppercase">
                              PRO
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-secondary">{user?.role}</div>
                      </div>
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-500 font-medium rounded-lg text-center transition-all flex items-center justify-center gap-2"
                    >
                      <LogOut size={18} /> {t("logout", "Chiqish")}
                    </button>
                  </div>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setIsOpen(false)} className="text-center py-3 font-medium">
                      {t("login", "Kirish")}
                    </Link>
                    <Link href="/register" onClick={() => setIsOpen(false)} className="btn-primary text-center">
                      {t("register", "Ro'yxatdan o'tish")}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
