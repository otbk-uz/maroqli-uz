"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  User,
  Trophy,
  Gamepad2,
  Radio,
  Crown,
  TrendingUp,
  Code2,
  MessageSquare,
  Newspaper,
  ShieldAlert,
  Menu,
  X,
  Home,
  GraduationCap,
 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore, useTranslation } from "@/lib/store";
import api from "@/lib/api";

const LOCALES = [
  { code: "uz", label: "O'Z" },
  { code: "ru", label: "РУ" },
  { code: "en", label: "EN" },
] as const;

export default function FloatingConsoleHUD() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const { t, locale, setLocale } = useTranslation();

  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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
    { name: t("home", "Bosh sahifa"), href: "/", icon: Home },
    { name: t("tournaments", "Turnirlar"), href: "/tournaments", icon: Trophy },
    { name: t("games", "O'yinlar"), href: "/games", icon: Gamepad2 },
    { name: t("streamers", "Streamerlar"), href: "/streamers", icon: Radio },
    { name: t("premium", "Premium"), href: "/premium", icon: Crown },
    { name: t("leaderboard", "Reyting"), href: "/leaderboard", icon: TrendingUp },
    { name: t("gamedev", "GameDev"), href: "/gamedev", icon: Code2 },
    { name: t("darslar", "Videodarslar"), href: "/darslar", icon: GraduationCap },
    { name: t("forum", "Forum"), href: "/forum", icon: MessageSquare },
    { name: t("news", "Yangiliklar"), href: "/news", icon: Newspaper },
  ];

  if (user && user.role === "ADMIN") {
    navLinks.push({ name: "Admin", href: "/admin", icon: ShieldAlert });
  }

  const isRouteActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  if (!mounted) return null;

  // Brand lockup — MAR (white) + OQLI (brand gradient)
  const BrandMark = ({ className = "" }: { className?: string }) => (
    <Link href="/" className={`group flex items-center gap-2.5 ${className}`}>
      <div className="relative">
        <span className="absolute inset-0 rounded-xl bg-brand-gradient opacity-40 blur-md transition-opacity duration-300 group-hover:opacity-70" />
        <img
          src="/logo.jpg.png"
          alt="Maroqli.uz"
          className="relative h-8 w-8 rounded-xl object-cover ring-1 ring-white/10"
        />
      </div>
      <span className="font-display text-base font-black uppercase leading-none tracking-[0.18em]">
        <span className="text-white">MAR</span>
        <span className="text-gradient">OQLI</span>
      </span>
    </Link>
  );

  return (
    <>
      {/* ===================== DESKTOP HEADER ===================== */}
      <header
        className={`fixed inset-x-0 top-0 z-50 hidden items-center gap-4 border-b px-4 py-2.5 transition-all duration-300 ease-out lg:flex xl:px-8 ${
          scrolled
            ? "border-white/10 bg-background/80 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
            : "border-white/5 bg-background/30 backdrop-blur-md"
        }`}
      >
        {/* Brand */}
        <div className="z-10 flex flex-shrink-0 items-center">
          <BrandMark />
        </div>

        {/* Nav Links */}
        <nav className="z-10 flex flex-1 items-center justify-center gap-0.5">
          {navLinks.map((link) => {
            const isActive = isRouteActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-full px-2.5 py-1.5 text-[10px] font-display font-bold uppercase tracking-wider transition-colors duration-200 whitespace-nowrap xl:text-[11px] ${
                  isActive ? "text-white" : "text-secondary hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="desktop-nav-active"
                    className="absolute inset-0 rounded-full border border-white/10 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10">{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="z-10 flex flex-shrink-0 items-center gap-2.5">
          {/* Language — segmented control */}
          <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-white/5 p-0.5">
            {LOCALES.map((lng) => {
              const active = locale === lng.code;
              return (
                <button
                  key={lng.code}
                  onClick={() => setLocale(lng.code)}
                  aria-label={`Til: ${lng.label}`}
                  aria-pressed={active}
                  className={`relative rounded-full px-2 py-1 text-[10px] font-display font-black transition-colors ${
                    active ? "text-white" : "text-secondary hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="desktop-lang-active"
                      className="absolute inset-0 rounded-full bg-brand-gradient shadow-glow"
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{lng.label}</span>
                </button>
              );
            })}
          </div>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  aria-label="Bildirishnomalar"
                  className="relative rounded-full border border-white/10 bg-white/5 p-2 text-secondary transition-colors hover:text-white"
                >
                  <Bell size={14} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-3 w-3 items-center justify-center rounded-full border border-background bg-primary text-[7px] font-bold text-white">
                        {unreadCount}
                      </span>
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                      className="glass-card absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] p-3">
                        <h3 className="text-[11px] font-bold text-white">Bildirishnomalar</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[9px] font-semibold text-primary transition-colors hover:text-white"
                          >
                            Hammasini o'qish
                          </button>
                        )}
                      </div>
                      <div className="custom-scrollbar max-h-[250px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-[11px] text-secondary">
                            Yangi xabarlar yo'q
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`cursor-pointer border-b border-white/5 p-3 transition-colors hover:bg-white/[0.03] ${
                                notif.is_read ? "opacity-60" : "bg-primary/5"
                              }`}
                              onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                            >
                              <p className="mb-0.5 text-[11px] text-white">{notif.message}</p>
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
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 transition-colors hover:border-white/20 hover:bg-white/10"
              >
                <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-brand-gradient text-[11px] font-bold text-white">
                  {user.username?.[0]?.toUpperCase() || <User size={12} />}
                  {user.is_premium && (
                    <div className="absolute -right-0.5 -top-0.5 rounded-full bg-amber-500 p-0.5 text-black shadow-[0_0_6px_rgba(245,158,11,0.6)]">
                      <Crown size={6} className="fill-current" />
                    </div>
                  )}
                </div>
                <span className="flex max-w-[80px] items-center gap-1 truncate text-[11px] font-bold text-white">
                  <span className="truncate">{user.username}</span>
                  {user.is_premium && (
                    <span className="rounded bg-amber-500/15 px-1 text-[7px] font-extrabold text-amber-400">
                      PRO
                    </span>
                  )}
                </span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full border border-white/15 px-4 py-1.5 text-[11px] font-display font-bold text-white transition-all hover:border-white/30 hover:bg-white/5"
              >
                Kirish
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-brand-gradient bg-[length:200%_200%] px-4 py-2 text-[11px] font-display font-black text-white shadow-glow-violet transition-all hover:animate-gradient-move active:scale-95"
              >
                Ro'yxatdan o'tish
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* ===================== MOBILE HEADER ===================== */}
      <header
        className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b px-4 pb-3 pt-[max(env(safe-area-inset-top),16px)] transition-all duration-300 lg:hidden ${
          scrolled
            ? "border-white/10 bg-background/85 shadow-lg backdrop-blur-2xl"
            : "border-white/5 bg-background/50 backdrop-blur-md"
        }`}
      >
        <BrandMark />

        <div className="flex items-center gap-2.5">
          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              aria-label="Tilni tanlash"
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-display font-black text-secondary transition-colors hover:text-white"
            >
              <span>{locale === "uz" ? "O'Z" : locale === "ru" ? "РУ" : "EN"}</span>
            </button>

            <AnimatePresence>
              {showLangMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.16 }}
                  className="glass-card absolute right-0 z-50 mt-2 w-28 overflow-hidden rounded-2xl"
                >
                  {LOCALES.map((lng) => (
                    <button
                      key={lng.code}
                      onClick={() => {
                        setLocale(lng.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-white/5 ${
                        locale === lng.code ? "font-bold text-primary" : "text-secondary"
                      }`}
                    >
                      {lng.code === "uz" ? "O'zbek" : lng.code === "ru" ? "Русский" : "English"}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  aria-label="Bildirishnomalar"
                  className="relative rounded-full border border-white/10 bg-white/5 p-2 text-secondary transition-colors hover:text-white"
                >
                  <Bell size={14} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex h-3 w-3 items-center justify-center rounded-full border border-background bg-primary text-[7px] font-bold text-white">
                        {unreadCount}
                      </span>
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                      className="glass-card absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-2xl"
                    >
                      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] p-3">
                        <h3 className="text-[11px] font-bold text-white">Bildirishnomalar</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[9px] font-semibold text-primary transition-colors hover:text-white"
                          >
                            Barchasi
                          </button>
                        )}
                      </div>
                      <div className="custom-scrollbar max-h-[200px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-[11px] text-secondary">
                            Xabarlar yo'q
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`cursor-pointer border-b border-white/5 p-2.5 transition-colors hover:bg-white/[0.03] ${
                                notif.is_read ? "opacity-60" : "bg-primary/5"
                              }`}
                              onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                            >
                              <p className="mb-0.5 text-[11px] text-white">{notif.message}</p>
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
              <Link
                href="/profile"
                className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white"
              >
                {user.username?.[0]?.toUpperCase() || <User size={12} />}
                {user.is_premium && (
                  <div className="absolute -right-1 -top-1 rounded-full bg-amber-500 p-0.5 text-black shadow-[0_0_6px_rgba(245,158,11,0.6)]">
                    <Crown size={6} className="fill-current" />
                  </div>
                )}
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-brand-gradient px-3.5 py-1.5 text-[10px] font-display font-black text-white shadow-glow-violet transition-all active:scale-95"
            >
              Kirish
            </Link>
          )}

          {/* Hamburger Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="relative z-50 rounded-full border border-white/10 bg-white/5 p-2 text-secondary transition-colors hover:text-white"
            aria-label="Menyuni ochish"
          >
            {showMobileMenu ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* ===================== MOBILE SLIDE-OVER MENU ===================== */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.5 }}
            className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background/95 px-6 pb-8 pt-24 backdrop-blur-2xl lg:hidden"
          >
            {/* Ambient glows */}
            <div className="absolute right-0 top-0 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
            <div className="absolute bottom-0 left-0 -z-10 h-72 w-72 rounded-full bg-violet/10 blur-[100px]" />

            <div className="relative z-10 flex h-full flex-col justify-between">
              <nav className="flex flex-col gap-2">
                {navLinks.map((link, idx) => {
                  const isActive = isRouteActive(link.href);
                  const Icon = link.icon;
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setShowMobileMenu(false)}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 font-display text-sm font-black uppercase tracking-wider transition-all duration-200 ${
                          isActive
                            ? "border-primary/25 bg-primary/10 text-primary shadow-[0_0_20px_rgba(255,51,85,0.12)]"
                            : "border-transparent text-secondary hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="flex-1">{link.name}</span>
                        {isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_#FF3355]" />
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              {/* Menu footer */}
              <div className="flex flex-col gap-4 border-t border-white/5 pt-6">
                <div className="flex items-center justify-between px-2 text-[10px] font-display font-bold uppercase tracking-widest text-secondary">
                  <span>MAROQLI ESPORTS</span>
                  <span>v0.1.0</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
