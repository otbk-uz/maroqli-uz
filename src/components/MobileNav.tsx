"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, Gamepad2, Star, User, MessageSquare } from "lucide-react";
import { useTranslation } from "@/lib/store";

const MobileNav = () => {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    { name: t("home_short", "Bosh"), icon: Home, href: "/" },
    { name: t("tournaments", "Turnirlar"), icon: Trophy, href: "/tournaments" },
    { name: t("games", "O'yinlar"), icon: Gamepad2, href: "/games" },
    { name: t("leaderboard", "Reyting"), icon: Star, href: "/leaderboard" },
    { name: t("profile", "Profil"), icon: User, href: "/profile" },
  ];

  return (
    <div className="lg:hidden fixed left-4 right-4 z-50 bottom-4 pb-[env(safe-area-inset-bottom,0px)]">
      <nav className="mx-auto max-w-md bg-card/75 backdrop-blur-2xl border border-white/10 px-4 py-3 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center justify-around relative">
        
        {/* Glow behind the bar */}
        <div className="absolute inset-0 -z-10 bg-primary/5 blur-xl rounded-2xl" />

        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center w-12 h-12 transition-transform active:scale-90"
            >
              {isActive && (
                <span className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20 shadow-[0_0_15px_rgba(255,70,85,0.2)] animate-pulse" />
              )}
              
              <item.icon 
                size={22} 
                className={`transition-all duration-300 ${
                  isActive 
                    ? "text-primary scale-110" 
                    : "text-secondary hover:text-white"
                }`} 
                strokeWidth={isActive ? 2.5 : 2} 
              />
              
              {isActive && (
                <span className="absolute -bottom-1.5 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_#FF4655]" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileNav;
