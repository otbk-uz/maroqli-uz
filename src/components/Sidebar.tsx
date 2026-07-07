"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, Gamepad2, Radio, Crown, TrendingUp, Code, MessageSquare, Newspaper, ShieldAlert } from "lucide-react";
import { useTranslation } from "@/lib/store";

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();

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
    { name: "Admin Panel", href: "/admin", icon: <ShieldAlert size={20} className="text-red-500" /> },
  ];

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-card border-r border-white/5 z-40 hidden lg:flex flex-col">
      <div className="h-20 flex items-center px-6 border-b border-white/5">
        <Link href="/" className="flex items-center space-x-2">
          <img src="/logo.jpg.png" alt="Maroqli.uz Logo" className="h-10 w-auto" />
          <span className="font-display font-black text-xl tracking-wider text-white">MAROQLI</span>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
        <div className="space-y-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(255,70,85,0.15)]" 
                    : "text-secondary hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className={`${isActive ? "text-primary" : "text-secondary"}`}>
                  {link.icon}
                </div>
                <span>{link.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
      
      <div className="p-4 border-t border-white/5 text-center">
        <p className="text-[10px] text-secondary/50 font-bold tracking-widest uppercase">© 2026 Maroqli.uz</p>
      </div>
    </aside>
  );
}
