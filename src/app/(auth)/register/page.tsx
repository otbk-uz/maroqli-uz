"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Chrome, Send } from "lucide-react";

import { BackButton } from "../../../components/ui/BackButton";

const RegisterPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background relative">
      <div className="absolute top-8 left-8">
        <BackButton />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-card p-8 md:p-10"
      >
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black tracking-tighter inline-block mb-6">
            PLAY<span className="text-primary">NATION</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Hisob ochish</h1>
          <p className="text-secondary text-sm">Gaming hamjamiyatiga qo'shiling</p>
        </div>

        <form className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary ml-1">Nickname</label>
            <input
              type="text"
              placeholder="Gamer777"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary ml-1">Email yoki Telefon</label>
            <input
              type="text"
              placeholder="example@mail.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary ml-1">Parol</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors text-sm"
            />
          </div>

          <div className="flex items-start space-x-2 py-2">
            <input type="checkbox" className="mt-1 accent-primary" id="terms" />
            <label htmlFor="terms" className="text-xs text-secondary leading-tight">
              Men <Link href="/terms" className="text-primary hover:underline">Foydalanish shartlari</Link> va <Link href="/privacy" className="text-primary hover:underline">Maxfiylik siyosati</Link> bilan tanishdim va roziman.
            </label>
          </div>

          <button type="submit" className="btn-primary w-full py-4 text-sm">
            Ro'yxatdan o'tish
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
            <span className="bg-[#121214] px-4 text-secondary">Tezkor ro'yxatdan o'tish</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="flex items-center justify-center space-x-2 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl transition-colors">
            <Chrome size={18} />
            <span className="text-xs font-medium">Google</span>
          </button>
          <button className="flex items-center justify-center space-x-2 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl transition-colors">
            <Send size={18} className="text-[#229ED9]" />
            <span className="text-xs font-medium">Telegram</span>
          </button>
        </div>

        <p className="text-center mt-8 text-sm text-secondary">
          Hisobingiz bormi?{" "}
          <Link href="/login" className="text-primary font-bold hover:underline">
            Kirish
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
