"use client";

import React from "react";
import Navbar from "../../components/Navbar";
import { Play, Users, ExternalLink, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { BackButton } from "../../components/ui/BackButton";

const streamers = [
  {
    id: 1,
    name: "ZafarGamer",
    game: "CS2",
    viewers: "1.2K",
    title: "Pro match vs NaVi Academy | Sub goal 50/100",
    platform: "Twitch",
    isLive: true,
  },
  {
    id: 2,
    name: "NodirPro",
    game: "Dota 2",
    viewers: "840",
    title: "Ranked grind to Immortal | !giveaway",
    platform: "YouTube",
    isLive: true,
  },
  {
    id: 3,
    name: "AnaKiller",
    game: "Valorant",
    viewers: "420",
    title: "Chilling and playing with subs",
    platform: "Twitch",
    isLive: true,
  },
];

const StreamersPage = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20">
        <BackButton />
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black mb-2">Streamerlar</h1>
            <p className="text-secondary">Jonli efirlarni tomosha qiling va sevimli streamerlaringizni qo'llab-quvvatlang</p>
          </div>
          <div className="flex items-center space-x-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-bold text-primary">12 ta jonli efir</span>
          </div>
        </div>

        {/* Featured Stream */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card overflow-hidden mb-12"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2 aspect-video bg-black relative group cursor-pointer">
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-2xl shadow-primary/40">
                  <Play size={32} fill="white" />
                </div>
              </div>
              <div className="absolute top-6 left-6 z-10">
                <span className="bg-primary px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20">LIVE</span>
              </div>
              <div className="absolute bottom-6 left-6 z-10 flex items-center space-x-4">
                <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold flex items-center">
                  <Users size={14} className="mr-2" />
                  1,245 tomoshabin
                </div>
                <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold">
                  01:24:45
                </div>
              </div>
            </div>
            <div className="p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center font-bold text-xl border-2 border-white/10">ZG</div>
                  <div>
                    <h3 className="text-xl font-bold">ZafarGamer</h3>
                    <p className="text-primary text-sm font-medium">Counter-Strike 2</p>
                  </div>
                </div>
                <h2 className="text-2xl font-black mb-4 leading-tight">Pro match vs NaVi Academy | Sub goal 50/100</h2>
                <p className="text-secondary text-sm mb-8 leading-relaxed">
                  Bugun juda qiziqarli o'yin bo'ladi. Biz NaVi Academy jamoasiga qarshi turnirda qatnashyapmiz. 
                  Yordam berishni xohlasangiz streamni do'stlaringizga ulashing!
                </p>
              </div>
              <div className="flex space-x-4">
                <button className="btn-primary flex-1 py-4 flex items-center justify-center space-x-2">
                  <Play size={18} fill="white" />
                  <span>Tomosha qilish</span>
                </button>
                <button className="w-14 h-14 glass-card flex items-center justify-center hover:bg-white/5 transition-colors">
                  <Heart size={20} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Streamers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {streamers.map((s) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={s.id}
              className="glass-card overflow-hidden group hover:border-primary/50 transition-all duration-300"
            >
              <div className="aspect-video bg-white/5 relative">
                <div className="absolute top-4 left-4">
                  <span className="bg-primary px-3 py-0.5 rounded-full text-[10px] font-bold uppercase">LIVE</span>
                </div>
                <div className="absolute bottom-4 right-4">
                  <div className="bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold flex items-center">
                    <Users size={12} className="mr-1" />
                    {s.viewers}
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-[10px] font-bold">{s.name.substring(0, 2)}</div>
                    <span className="font-bold text-sm">{s.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">{s.game}</span>
                </div>
                <h4 className="font-bold mb-6 line-clamp-1 group-hover:text-primary transition-colors">{s.title}</h4>
                <div className="flex space-x-3">
                  <button className="flex-1 py-2 text-xs font-bold bg-white/5 hover:bg-primary transition-all rounded-lg">
                    Kirish
                  </button>
                  <button className="px-3 py-2 bg-white/5 hover:bg-white/10 transition-all rounded-lg">
                    <ExternalLink size={14} className="text-secondary" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default StreamersPage;
