"use client";

import React from "react";
import Navbar from "../../components/Navbar";
import {
  MessageSquare,
  Heart,
  Share2,
  Repeat2,
  Image as ImageIcon,
  Send,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

const posts = [
  {
    id: 1,
    user: {
      name: "AnaKiller",
      avatar: "AK",
      role: "Pro Player",
    },
    content: "Bugungi turnirda g'alaba qozondik! Jamoadoshlarimga rahmat. #CS2 #Maroqli.uz",
    image: null,
    likes: 124,
    comments: 18,
    reposts: 5,
    time: "2 soat avval",
  },
  {
    id: 2,
    user: {
      name: "ZafarGamer",
      avatar: "ZG",
      role: "Streamer",
    },
    content: "Kechki stream 20:00 da boshlanadi. Yangi skinlarni ko'rib chiqamiz!",
    image: "/api/placeholder/600/400",
    likes: 89,
    comments: 12,
    reposts: 2,
    time: "5 soat avval",
  },
];

const FeedPage = () => {
  return (
    <main className="min-h-screen bg-background text-white relative overflow-hidden">
      <Navbar />

      {/* Aurora glows */}
      <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,51,85,0.16),transparent_60%)]" />
      <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_85%_0%,rgba(139,92,246,0.12),transparent_55%)]" />

      <div className="container-app pt-32 pb-24 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Premium header */}
          <div className="mb-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="chip mb-5 border-primary/25 bg-primary/10 text-primary"
            >
              <Users size={14} />
              <span className="font-display uppercase tracking-[0.2em] text-[11px]">
                Hamjamiyat
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.05] uppercase"
            >
              Jonli <span className="text-gradient">Lenta</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-secondary text-base md:text-lg mt-4 leading-relaxed"
            >
              O'yinchilar jamoasidan so'nggi yangiliklar, g'alabalar va e'lonlar
            </motion.p>
          </div>

          {/* Create Post */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-6 mb-8"
          >
            <div className="flex gap-4">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-brand-gradient flex items-center justify-center font-display font-black text-white shadow-glow">
                ME
              </div>
              <div className="flex-1">
                <textarea
                  placeholder="Nimalar yangilik?"
                  className="w-full bg-transparent border-none outline-none resize-none text-lg placeholder:text-secondary h-24"
                />
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-secondary">
                    <button
                      aria-label="Rasm qo'shish"
                      className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/5 hover:text-primary transition-colors"
                    >
                      <ImageIcon size={20} />
                    </button>
                    <button
                      aria-label="GIF qo'shish"
                      className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/5 hover:text-primary transition-colors"
                    >
                      <span className="font-display font-black text-xs">GIF</span>
                    </button>
                  </div>
                  <button className="btn-primary py-2.5 px-6 text-sm gap-2">
                    <Send size={16} />
                    Post yozish
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feed */}
          <div className="space-y-6">
            {posts.map((post, i) => (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
                key={post.id}
                className="card-interactive p-6 hover:border-primary/30"
              >
                <div className="flex gap-4 mb-4">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-display font-black text-primary">
                    {post.user.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-white">{post.user.name}</h3>
                      <span className="chip !py-0.5 !px-2 border-violet/25 bg-violet/10 text-violet font-display uppercase tracking-[0.15em] text-[9px]">
                        {post.user.role}
                      </span>
                    </div>
                    <p className="text-xs text-secondary mt-0.5">{post.time}</p>
                  </div>
                </div>

                <p className="mb-4 leading-relaxed text-white/90">{post.content}</p>

                {post.image && (
                  <div className="rounded-2xl overflow-hidden mb-4 border border-white/10">
                    <div className="aspect-video bg-gradient-to-br from-white/[0.07] to-white/[0.02] flex items-center justify-center">
                      <ImageIcon size={32} className="text-secondary/40" />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-white/5 text-secondary">
                  <button className="flex items-center gap-2 hover:text-primary transition-colors group/btn">
                    <Heart size={18} className="group-hover/btn:fill-current" />
                    <span className="text-xs font-bold">{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-cyan transition-colors">
                    <MessageSquare size={18} />
                    <span className="text-xs font-bold">{post.comments}</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-success transition-colors">
                    <Repeat2 size={18} />
                    <span className="text-xs font-bold">{post.reposts}</span>
                  </button>
                  <button
                    aria-label="Ulashish"
                    className="flex items-center gap-2 hover:text-violet transition-colors"
                  >
                    <Share2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty state (agar lenta bo'sh bo'lsa) */}
          {posts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card py-20 px-6 text-center flex flex-col items-center"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="relative w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center animate-float">
                  <MessageSquare size={40} className="text-primary" />
                </div>
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-black text-white mb-3 uppercase tracking-tight">
                Hozircha postlar yo'q
              </h3>
              <p className="text-secondary max-w-md">
                Birinchi bo'lib jamoa bilan fikringizni ulashing.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
};

export default FeedPage;
