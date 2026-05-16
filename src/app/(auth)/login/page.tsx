"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Chrome, Send, Github } from "lucide-react";

import { BackButton } from "../../../components/ui/BackButton";

const LoginPage = () => {
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
        <div className="text-center mb-10">
          <Link href="/" className="text-3xl font-black tracking-tighter inline-block mb-6">
            PLAY<span className="text-primary">NATION</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Xush kelibsiz!</h1>
          <p className="text-secondary text-sm">Davom etish uchun hisobingizga kiring</p>
        </div>

        <form className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary ml-1">Email yoki Telefon</label>
            <input
              type="text"
              placeholder="example@mail.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-medium text-secondary">Parol</label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Parolni unutdingizmi?
              </Link>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <button type="submit" className="btn-primary w-full py-4">
            Kirish
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#121214] px-4 text-secondary">Yoki boshqa yo'l bilan</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button className="flex items-center justify-center space-x-2 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl transition-colors">
            <Chrome size={18} />
            <span className="text-sm font-medium">Google</span>
          </button>
          <button className="flex items-center justify-center space-x-2 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl transition-colors">
            <Send size={18} className="text-[#229ED9]" />
            <span className="text-sm font-medium">Telegram</span>
          </button>
        </div>

        <p className="text-center mt-10 text-sm text-secondary">
          Hisobingiz yo'qmi?{" "}
          <Link href="/register" className="text-primary font-bold hover:underline">
            Ro'yxatdan o'ting
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
