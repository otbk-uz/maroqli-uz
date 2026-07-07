"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Trophy, Gamepad2, Radio, Crown, TrendingUp, Code, 
  MessageSquare, Newspaper, ShieldAlert, ChevronLeft, ChevronRight 
} from "lucide-react";
import { useTranslation, useAuthStore, useUIStore } from "@/lib/store";

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const navLinks = [
    { name: t("home", "Bosh sahifa"), href: "/", icon: <TrendingUp size={20} /> },
    { name: t("tournaments", "Turnirlar"), href: "/tournaments", icon: <Trophy size={20} /> },
    { name: t("games", "O'yinlar"), href: "/games", icon: <Gamepad2 size={20} /> },
    { name: t("streamers", "Streamerlar"), href: "/streamers", icon: <Radio size={20} /> },
    { name: t("premium", "Premium"), href: "/premium", icon: <Crown size={20} className="text-amber-400" /> },
    { name: t("leaderboard", "Reyting"), href: "/leaderboard", icon: <TrendingUp size={20} /> },
    { name: t("gamedev", "GameDev"), href: "/gamedev", icon: <Code size={20} /> },
    { name: t("forum", "Forum"), href: "/forum", icon: <MessageSquare size={20} /> },
    { name: t("news", "Yangiliklar"), href: "/news", icon: <Newspaper size={20} /> },
  ];

  // Only show Admin Panel link to ADMIN users
  if (user && user.role === "ADMIN") {
    navLinks.push({ name: "Admin Panel", href: "/admin", icon: <ShieldAlert size={20} className="text-red-500" /> });
  }

  return (
    <aside 
      className={`fixed top-0 left-0 h-screen bg-card border-r border-white/5 z-40 hidden lg:flex flex-col transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className={`h-20 flex items-center border-b border-white/5 transition-all duration-300 ${
        sidebarCollapsed ? "justify-center px-0" : "px-6"
      }`}>
        <Link href="/" className="flex items-center space-x-2">
          <img src="/logo.jpg.png" alt="Maroqli.uz Logo" className="h-10 w-auto rounded-lg" />
          {!sidebarCollapsed && (
            <span className="font-display font-black text-xl tracking-wider text-white transition-opacity duration-300">
              MAROQLI
            </span>
          )}
        </Link>
      </div>
      
      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
        <div className="space-y-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                title={sidebarCollapsed ? link.name : undefined}
                className={`flex items-center rounded-xl transition-all duration-300 font-medium ${
                  sidebarCollapsed ? "justify-center p-3" : "space-x-3 px-4 py-3"
                } ${
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(255,70,85,0.15)]" 
                    : "text-secondary hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className={`${isActive ? "text-primary" : "text-secondary"} flex-shrink-0`}>
                  {link.icon}
                </div>
                {!sidebarCollapsed && (
                  <span className="truncate transition-opacity duration-300">{link.name}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Collapse Toggle & Footer */}
      <div className="border-t border-white/5 p-4 flex flex-col items-center gap-4">
        {!sidebarCollapsed && (
          <p className="text-[9px] text-secondary/40 font-bold tracking-widest uppercase text-center">
            © 2026 Maroqli.uz
          </p>
        )}
        
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-white/5 text-secondary hover:text-white rounded-xl border border-white/5 transition-colors w-10 h-10 flex items-center justify-center"
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
