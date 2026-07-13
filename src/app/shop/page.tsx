"use client";

import React from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import {
  ShoppingBag,
  Gamepad2,
  ArrowRight,
  BellRing,
} from "lucide-react";
import { motion } from "framer-motion";
import { BackButton } from "../../components/ui/BackButton";

const ShopPage = () => {
  return (
    <main className="min-h-screen bg-background text-white relative overflow-hidden">
      <Navbar />

      {/* Aurora glows */}
      <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,51,85,0.16),transparent_60%)]" />
      <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_15%_0%,rgba(139,92,246,0.12),transparent_55%)]" />

      <div className="container-app pt-28 pb-24 relative z-10">
        <div className="mb-8">
          <BackButton />
        </div>

        {/* Premium header */}
        <div className="max-w-2xl mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="chip mb-5 border-primary/25 bg-primary/10 text-primary"
          >
            <ShoppingBag size={14} />
            <span className="font-display uppercase tracking-[0.2em] text-[11px]">
              Gaming do&apos;koni
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.05] uppercase"
          >
            Do&apos;kon
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-secondary text-base md:text-lg mt-4 leading-relaxed"
          >
            Professional gaming aksessuarlari va jihozlari savdosi tez orada
            shu yerda ishga tushadi.
          </motion.p>
        </div>

        {/* Honest empty / coming-soon state — no fabricated products */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card py-20 px-6 md:py-28 text-center flex flex-col items-center"
        >
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            <div className="relative w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center animate-float">
              <ShoppingBag size={40} className="text-primary" />
            </div>
          </div>

          <span className="chip mb-5 border-violet/25 bg-violet/10 text-violet">
            <BellRing size={12} />
            <span className="font-display uppercase tracking-[0.2em] text-[10px]">
              Tez orada
            </span>
          </span>

          <h3 className="font-display text-2xl md:text-3xl font-black text-white mb-3 uppercase tracking-tight">
            Do&apos;kon hozircha bo&apos;sh
          </h3>
          <p className="text-secondary max-w-md mb-8 leading-relaxed">
            Aksessuarlar va jihozlar katalogi ustida ishlamoqdamiz. Shu vaqt
            ichida raqamli o&apos;yinlar do&apos;konimizni ko&apos;rib chiqing.
          </p>

          <Link
            href="/games"
            className="btn-primary py-3 px-7 text-sm gap-2 font-display uppercase tracking-widest"
          >
            <Gamepad2 size={18} />
            <span>O&apos;yinlar do&apos;koni</span>
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>
    </main>
  );
};

export default ShopPage;
