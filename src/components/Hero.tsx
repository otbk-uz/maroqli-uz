"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronRight, Play, Trophy, Users, Shield } from "lucide-react";

import Link from "next/link";

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-[#050506]">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,_#ff2d5533,_transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,_#3b82f61a,_transparent_50%)]" />
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay" />
        
        {/* Animated Orbs */}
        <motion.div 
          animate={{ 
            x: [0, 100, 0], 
            y: [0, -50, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, -80, 0], 
            y: [0, 60, 0],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px]" 
        />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9] mb-10 text-white"
            >
              O'zbekistonda <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-orange-500">gaming</span> <br />
              kelajagi
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-lg md:text-xl text-secondary max-w-xl mb-12 leading-relaxed"
            >
              Turnirlar, jonli efirlar va hamjamiyat — barchasi bir joyda. 
              O'zbekistonning eng yirik gaming platformasiga qo'shiling.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-wrap gap-5"
            >
              <Link href="/tournaments" className="btn-primary group relative overflow-hidden flex items-center space-x-3 !py-4 !px-10">
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
                <Trophy size={20} />
                <span className="relative z-10">Turnirga qo'shil</span>
              </Link>
              <Link href="/tournaments" className="btn-outline flex items-center space-x-3 !py-4 !px-10 group bg-white/5 border-white/10 hover:border-white/20">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                  <Play size={14} fill="currentColor" />
                </div>
                <span>Ko'proq bilish</span>
              </Link>
            </motion.div>
          </div>

          {/* Stats Cards */}
          <div className="lg:col-span-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-8 border-primary/20 hover:border-primary/50 transition-colors group"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <p className="text-4xl font-black text-white mb-2 tracking-tight">5,000+</p>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest">Faol o'yinchilar</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="glass-card p-8 border-blue-500/20 hover:border-blue-500/50 transition-colors group"
            >
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 text-blue-500 group-hover:scale-110 transition-transform">
                <Shield size={24} />
              </div>
              <p className="text-4xl font-black text-white mb-2 tracking-tight">42</p>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest">Tasdiqlangan turnirlar</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="glass-card p-8 border-yellow-500/20 hover:border-yellow-500/50 transition-colors group md:col-span-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-6 text-yellow-500 group-hover:scale-110 transition-transform">
                    <Trophy size={24} />
                  </div>
                  <p className="text-4xl font-black text-white mb-2 tracking-tight">$8,500+</p>
                  <p className="text-xs font-bold text-secondary uppercase tracking-widest">Jami sovrin jamg'armasi</p>
                </div>
                <div className="hidden sm:block w-32 h-32 opacity-10">
                   <Trophy size={128} />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
