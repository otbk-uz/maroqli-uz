"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, User, LogOut, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore, useTranslation } from "@/lib/store";
import api from "@/lib/api";

export default function Topbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { locale, setLocale } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

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

  if (!mounted) return <div className="h-20 bg-background border-b border-white/5 w-full fixed top-0 z-30" />;

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-20 bg-background/80 backdrop-blur-xl border-b border-white/5 z-30 flex items-center px-6 transition-all duration-300">
      <div className="flex-1 flex items-center justify-between">
        
        <div className="flex items-center lg:hidden">
          <Link href="/" className="flex items-center space-x-2">
            <img src="/logo.jpg.png" alt="Logo" className="h-8 w-auto" />
            <span className="font-display font-black text-lg text-white">MAROQLI</span>
          </Link>
        </div>

        <div className="hidden lg:block">
          {/* Search bar or breadcrumbs could go here */}
        </div>

        <div className="flex items-center space-x-4 ml-auto">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center space-x-1 text-sm font-bold text-secondary hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors border border-white/5"
            >
              <span>{locale === 'uz' ? 'O\'Z' : locale === 'ru' ? 'РУ' : 'EN'}</span>
            </button>

            <AnimatePresence>
              {showLangMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-32 bg-card border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                >
                  <button onClick={() => { setLocale('uz'); setShowLangMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 ${locale === 'uz' ? 'text-primary font-bold' : 'text-secondary'}`}>O'zbek</button>
                  <button onClick={() => { setLocale('ru'); setShowLangMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 ${locale === 'ru' ? 'text-primary font-bold' : 'text-secondary'}`}>Русский</button>
                  <button onClick={() => { setLocale('en'); setShowLangMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 ${locale === 'en' ? 'text-primary font-bold' : 'text-secondary'}`}>English</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isAuthenticated && user ? (
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-secondary hover:text-white transition-colors relative bg-white/5 hover:bg-white/10 rounded-xl border border-white/5"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-primary text-[9px] items-center justify-center text-white font-bold border border-background">
                        {unreadCount}
                      </span>
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
                      className="absolute right-0 mt-4 w-80 md:w-96 bg-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                        <h3 className="font-bold text-white font-display">Bildirishnomalar</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-xs text-primary hover:text-white transition-colors font-semibold"
                          >
                            Barchasini o'qilgan qilish
                          </button>
                        )}
                      </div>
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-secondary text-sm">
                            Yangi xabarlar yo'q
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`p-4 border-b border-white/5 transition-colors ${
                                notif.is_read ? "opacity-60 bg-transparent" : "bg-primary/5 hover:bg-primary/10"
                              }`}
                              onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                            >
                              <p className="text-sm text-white mb-1">{notif.message}</p>
                              <span className="text-xs text-secondary">
                                {new Date(notif.created_at).toLocaleString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User Profile */}
              <Link href="/profile" className="flex items-center space-x-3 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">
                  {user.username?.[0]?.toUpperCase() || <User size={16} />}
                </div>
                <div className="hidden md:block text-sm">
                  <p className="font-bold text-white leading-tight">{user.username}</p>
                  <p className="text-[10px] text-secondary font-medium">{user.role}</p>
                </div>
              </Link>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                href="/login"
                className="text-sm font-bold text-white hover:text-primary transition-colors px-3 py-2"
              >
                Kirish
              </Link>
              <Link
                href="/register"
                className="text-sm font-bold bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(255,70,85,0.3)] hover:shadow-[0_0_25px_rgba(255,70,85,0.5)]"
              >
                Ro'yxatdan o'tish
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
