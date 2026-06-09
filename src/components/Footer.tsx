"use client";

import React from "react";
import Link from "next/link";
import { Shield, BookOpen, Send, Phone, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full bg-background border-t border-white/5 py-12 pb-24 lg:pb-12 mt-auto relative z-10 overflow-hidden">
      <div className="absolute bottom-0 left-[50%] translate-x-[-50%] w-[80%] h-[150px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tighter flex items-center">
                PLAY<span className="text-primary">NATION</span>
                <span className="text-xs ml-1 font-normal opacity-50">UZ</span>
              </span>
            </Link>
            <p className="text-secondary text-sm leading-relaxed max-w-sm">
              O'zbekiston va Markaziy Osiyoda gaming hamjamiyatini birlashtiruvchi, game developerlar va streamerlarni qo'llab-quvvatlovchi zamonaviy ekotizim platformasi.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider">Hujjatlar va Qoidalar</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/terms" className="text-secondary hover:text-primary transition-colors flex items-center gap-2">
                  <BookOpen size={14} />
                  <span>Foydalanish shartlari (Oferta)</span>
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-secondary hover:text-primary transition-colors flex items-center gap-2">
                  <Shield size={14} />
                  <span>Maxfiylik siyosati</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact / Socials */}
          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider">Aloqa va Qo'llab-quvvatlash</h4>
            <ul className="space-y-3 text-sm text-secondary">
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-primary" />
                <span>+998 93-823-7773</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-primary" />
                <span>info@playnation.uz</span>
              </li>
              <li className="flex items-center gap-2">
                <Send size={14} className="text-primary" />
                <a href="https://t.me/playnationuz" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  Telegram: @playnationuz
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-secondary">
          <p>&copy; {new Date().getFullYear()} PlayNationUz. Barcha huquqlar himoyalangan.</p>
          <div className="flex space-x-6">
            <Link href="/terms" className="hover:text-primary transition-colors">Oferta</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Maxfiylik</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
