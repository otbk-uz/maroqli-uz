"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, Gamepad2, User, MonitorPlay } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "@/lib/store";

const MobileNav = () => {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    { name: t("home_short", "Bosh"), icon: Home, href: "/" },
    { name: t("tournaments", "Turnirlar"), icon: Trophy, href: "/tournaments" },
    { name: t("darslar", "Darslar"), icon: MonitorPlay, href: "/darslar" },
    { name: t("games", "O'yinlar"), icon: Gamepad2, href: "/games" },
    { name: t("profile", "Profil"), icon: User, href: "/profile" },
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 pb-[env(safe-area-inset-bottom,0px)] lg:hidden">
      <nav className="relative mx-auto flex max-w-md items-center justify-around rounded-full border border-white/10 bg-card/80 px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        {/* Ambient glow behind the dock */}
        <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-primary/5 blur-xl" />

        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.name}
              aria-current={isActive ? "page" : undefined}
              className="relative flex h-12 flex-1 flex-col items-center justify-center gap-0.5 transition-transform active:scale-90"
            >
              {isActive && (
                <motion.span
                  layoutId="mobilenav-active"
                  className="absolute inset-x-1.5 inset-y-0 rounded-full border border-primary/25 bg-primary/12 shadow-[0_0_18px_rgba(255,51,85,0.25)]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}

              <Icon
                size={21}
                className={`relative z-10 transition-colors duration-200 ${
                  isActive ? "text-primary" : "text-secondary"
                }`}
                strokeWidth={isActive ? 2.6 : 2}
              />
              <span
                className={`relative z-10 font-display text-[9px] font-bold uppercase tracking-wide transition-colors duration-200 ${
                  isActive ? "text-primary" : "text-secondary/70"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileNav;
