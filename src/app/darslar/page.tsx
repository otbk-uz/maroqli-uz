"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Plus, Crown, BookOpen, Play, GraduationCap, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore, useTranslation } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { BackButton } from "@/components/ui/BackButton";

export default function DarslarPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  const [activePlaylist, setActivePlaylist] = useState<string>("Barchasi");
  const [lessons, setLessons] = useState<any[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      setLoadingLessons(true);
      const { data, error } = await supabase
        .from("gamedev_lessons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLessons(data || []);
    } catch (err) {
      console.error("Darslarni yuklashda xatolik:", err);
    } finally {
      setLoadingLessons(false);
    }
  };

  const allLessons = lessons;
  const playlists = ["Barchasi", ...Array.from(new Set(allLessons.map(l => l.level).filter(Boolean)))];
  const filteredLessons = activePlaylist === "Barchasi" ? allLessons : allLessons.filter(l => l.level === activePlaylist);

  return (
    <main className="min-h-screen bg-background text-white relative overflow-hidden">
      <Navbar />

      {/* Aurora glows */}
      <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,51,85,0.16),transparent_60%)]" />
      <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_85%_0%,rgba(139,92,246,0.12),transparent_55%)]" />

      <div className="container-app pt-28 pb-24 relative z-10">
        <div className="mb-8">
          <BackButton />
        </div>

        {/* Premium header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="chip mb-5 border-violet/25 bg-violet/10 text-violet"
            >
              <GraduationCap size={14} />
              <span className="font-display uppercase tracking-[0.2em] text-[11px]">
                Bilim markazi
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.05] uppercase"
            >
              Video<span className="text-gradient">darslar</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-secondary text-base md:text-lg mt-4 leading-relaxed"
            >
              O'yin yaratish bo'yicha maxsus video darsliklar va o'quv qo'llanmalari (Barcha uchun bepul).
            </motion.p>
          </div>

          {user?.role === "ADMIN" && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              onClick={() => router.push("/admin")}
              className="btn-primary py-3 px-6 text-sm gap-2 shrink-0"
            >
              <Plus size={16} /> Yangi dars qo'shish
            </motion.button>
          )}
        </div>

        {/* Playlist Filter Buttons */}
        {!loadingLessons && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center gap-2 glass-card p-3 md:p-4 mb-8"
          >
            {playlists.map(playlist => (
              <button
                key={playlist}
                onClick={() => setActivePlaylist(playlist)}
                className={`px-5 py-2.5 rounded-full font-display text-[11px] font-bold uppercase tracking-[0.15em] transition-all whitespace-nowrap ${
                  activePlaylist === playlist
                    ? "bg-primary text-white shadow-glow"
                    : "text-secondary hover:text-white hover:bg-white/5"
                }`}
              >
                {playlist}
              </button>
            ))}
          </motion.div>
        )}

        {/* Lessons Grid */}
        {loadingLessons ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="glass-card overflow-hidden flex flex-col h-full">
                <div className="skeleton aspect-video rounded-none" />
                <div className="p-5 space-y-4">
                  <div className="skeleton h-5 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                  <div className="skeleton h-10 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredLessons.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card py-24 px-6 text-center flex flex-col items-center"
          >
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-violet/20 blur-2xl rounded-full" />
              <div className="relative w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center animate-float">
                <BookOpen size={40} className="text-violet" />
              </div>
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-black text-white mb-3 uppercase tracking-tight">
              Darsliklar mavjud emas
            </h3>
            <p className="text-secondary max-w-md">
              Bu kategoriyada hozircha darsliklar mavjud emas.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredLessons.map((lesson, i) => {
              const hasAccess = true; // Barcha uchun bepul
              return (
                <motion.div
                  key={lesson.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="card-interactive overflow-hidden group hover:border-primary/40 cursor-pointer flex flex-col h-full"
                  onClick={() => hasAccess && router.push(`/gamedev/lessons/${lesson.id}`)}
                >
                  <div className="aspect-video relative overflow-hidden bg-white/5">
                    <img
                      src={lesson.img}
                      alt={lesson.title}
                      className="w-full h-full object-cover opacity-70 group-hover:scale-110 group-hover:opacity-90 transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-primary/90 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-glow scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
                        <Play size={22} className="text-white fill-current ml-0.5" />
                      </div>
                    </div>

                    <span className="absolute top-4 left-4 chip !bg-black/50 !border-white/10 backdrop-blur-md text-white font-display uppercase tracking-widest text-[9px]">
                      {lesson.level}
                    </span>

                    {lesson.duration && (
                      <span className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full flex items-center gap-1 text-white text-[11px] font-bold">
                        <Clock size={11} className="text-cyan" />
                        {lesson.duration}
                      </span>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-display font-bold text-lg text-white mb-2 leading-snug tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                      {lesson.title}
                    </h3>
                    <p className="text-xs text-secondary mb-5">
                      Muallif: <span className="text-white font-semibold">{lesson.author || "Maroqli.uz"}</span>
                    </p>

                    {hasAccess ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/gamedev/lessons/${lesson.id}`);
                        }}
                        className="mt-auto w-full py-3 bg-white/5 hover:bg-primary text-white border border-white/10 hover:border-primary hover:shadow-glow rounded-xl font-display font-bold uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Play size={14} className="fill-current" />
                        Darsni ko'rish
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push("/premium");
                        }}
                        className="mt-auto w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-display font-black uppercase tracking-widest text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 active:scale-95"
                      >
                        <Crown size={13} />
                        <span>Premium bilan ochish</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
