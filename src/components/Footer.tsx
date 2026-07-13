"use client";

import React from "react";
import Link from "next/link";
import { Shield, BookOpen, Send, Phone, Mail, Youtube, Instagram } from "lucide-react";
import { useTranslation } from "@/lib/store";

const Footer = () => {
  const { t } = useTranslation();

  const sections = [
    {
      title: t("footer_platform", "Platforma"),
      links: [
        { label: t("tournaments", "Turnirlar"), href: "/tournaments" },
        { label: t("games", "O'yinlar"), href: "/games" },
        { label: t("streamers", "Streamerlar"), href: "/streamers" },
        { label: t("premium", "Premium"), href: "/premium" },
        { label: t("leaderboard", "Reyting"), href: "/leaderboard" },
      ],
    },
    {
      title: t("footer_community", "Hamjamiyat"),
      links: [
        { label: t("forum", "Forum"), href: "/forum" },
        { label: t("darslar", "Videodarslar"), href: "/darslar" },
        { label: t("gamedev", "GameDev"), href: "/gamedev" },
        { label: t("news", "Yangiliklar"), href: "/news" },
      ],
    },
    {
      title: t("footer_company", "Kompaniya"),
      links: [
        { label: t("terms_of_use", "Foydalanish shartlari"), href: "/terms", icon: BookOpen },
        { label: t("privacy_policy", "Maxfiylik siyosati"), href: "/privacy", icon: Shield },
      ],
    },
  ];

  const socials = [
    { label: "Telegram", href: "https://t.me/maroqliuz", icon: Send },
    { label: "YouTube", href: "https://youtube.com/@maroqliuz", icon: Youtube },
    { label: "Instagram", href: "https://instagram.com/maroqliuz", icon: Instagram },
  ];

  return (
    <footer className="relative z-10 mt-auto w-full overflow-hidden border-t border-white/5 bg-background pb-28 pt-16 lg:pb-16">
      {/* Ambient brand glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[180px] w-[80%] -translate-x-1/2 rounded-full bg-primary/5 blur-[110px]" />

      <div className="container-app relative">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-12">
          {/* Brand column */}
          <div className="col-span-2 space-y-5 md:col-span-3">
            <Link href="/" className="group flex items-center gap-3">
              <div className="relative">
                <span className="absolute inset-0 rounded-xl bg-brand-gradient opacity-40 blur-md transition-opacity duration-300 group-hover:opacity-70" />
                <img
                  src="/logo.jpg.png"
                  alt="Maroqli.uz"
                  className="relative h-11 w-11 rounded-xl object-cover ring-1 ring-white/10"
                />
              </div>
              <span className="font-display text-xl font-black uppercase tracking-[0.15em]">
                <span className="text-white">MAR</span>
                <span className="text-gradient">OQLI</span>
              </span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-secondary">
              {t(
                "footer_desc",
                "O'zbekiston va Markaziy Osiyoda gaming hamjamiyatini birlashtiruvchi, game developerlar va streamerlarni qo'llab-quvvatlovchi zamonaviy ekotizim platformasi."
              )}
            </p>

            {/* Socials */}
            <div className="flex items-center gap-3 pt-1">
              {socials.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  >
                    <Icon size={17} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link sections */}
          {sections.map((section) => (
            <div key={section.title} className="col-span-1 md:col-span-2 lg:col-span-2">
              <h4 className="mb-4 font-display text-xs font-black uppercase tracking-widest text-white">
                {section.title}
              </h4>
              <ul className="space-y-3 text-sm">
                {section.links.map((link) => {
                  const Icon = (link as { icon?: React.ElementType }).icon;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="group inline-flex items-center gap-2 text-secondary transition-colors hover:text-primary"
                      >
                        {Icon && <Icon size={14} className="opacity-70" />}
                        <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                          {link.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Contact column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-3">
            <h4 className="mb-4 font-display text-xs font-black uppercase tracking-widest text-white">
              {t("contact_support", "Aloqa")}
            </h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: "tel:+998938237773", icon: Phone, label: "+998 93 823 77 73" },
                { href: "mailto:info@maroqli.uz", icon: Mail, label: "info@maroqli.uz" },
                { href: "https://t.me/maroqliuz", icon: Send, label: "@maroqliuz", ext: true },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <li key={c.href}>
                    <a
                      href={c.href}
                      {...(c.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-secondary transition-all hover:border-primary/30 hover:text-white"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon size={14} />
                      </span>
                      <span className="truncate tracking-wide">{c.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-secondary md:flex-row">
          <p>
            &copy; {new Date().getFullYear()} Maroqli.uz.{" "}
            {t("rights_reserved", "Barcha huquqlar himoyalangan.")}
          </p>

          <div className="flex gap-6">
            <Link href="/terms" className="transition-colors hover:text-primary">
              {t("terms_short", "Oferta")}
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-primary">
              {t("privacy_short", "Maxfiylik")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
