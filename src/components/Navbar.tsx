"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Bell, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { name: "Bosh sahifa", href: "/" },
  { name: "Turnirlar", href: "/tournaments" },
  { name: "O'yinlar", href: "/games" },
  { name: "Streamerlar", href: "/streamers" },
  { name: "Reyting", href: "/leaderboard" },
  { name: "GameDev", href: "/gamedev" },
  { name: "Do'kon", href: "/shop" },
  { name: "Yangiliklar", href: "/news" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur-lg border-b border-white/5 py-4" : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold tracking-tighter flex items-center">
              PLAY<span className="text-primary">NATION</span>
              <span className="text-xs ml-1 font-normal opacity-50">UZ</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-secondary hover:text-white transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <button 
              onClick={() => alert("Hozircha yangi xabarlar yo'q.")}
              className="p-2 text-secondary hover:text-white transition-colors"
            >
              <Bell size={20} />
            </button>
            <div className="h-4 w-px bg-white/10 mx-2" />
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
              Kirish
            </Link>
            <Link href="/register" className="btn-primary py-2 px-6 text-sm">
              Ro'yxatdan o'tish
            </Link>
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
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-lg font-medium text-secondary hover:text-white"
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-6 border-t border-white/5 flex flex-col space-y-4">
                <Link href="/login" className="text-center py-3 font-medium">
                  Kirish
                </Link>
                <Link href="/register" className="btn-primary text-center">
                  Ro'yxatdan o'tish
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
