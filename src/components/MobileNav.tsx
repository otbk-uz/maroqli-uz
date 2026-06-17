"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, Users, Star, User } from "lucide-react";
import { useTranslation } from "@/lib/store";

const MobileNav = () => {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    { name: t("home_short", "Bosh"), icon: Home, href: "/" },
    { name: t("tournaments", "Turnirlar"), icon: Trophy, href: "/tournaments" },
    { name: t("feed", "Feed"), icon: Users, href: "/feed" },
    { name: t("leaderboard", "Reyting"), icon: Star, href: "/leaderboard" },
    { name: t("profile", "Profil"), icon: User, href: "/profile" },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-white/5 pb-safe-area">
      <div className="flex items-center justify-around py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center space-y-1 transition-colors ${
                isActive ? "text-primary" : "text-secondary"
              }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 3 : 2} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNav;
