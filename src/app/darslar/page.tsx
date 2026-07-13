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
        .order("created_at", { ascending: true });

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

        {/* Lessons Playlist */}
        {loadingLessons ? (
          <div className="glass-card divide-y divide-white/5 overflow-hidden">
            {[0, 1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-center gap-4 p-3 md:p-4">
                <div className="skeleton h-5 w-6 shrink-0" />
                <div className="skeleton aspect-video w-28 md:w-40 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-2/3" />
                  <div className="skeleton h-3 w-1/3" />
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
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card divide-y divide-white/5 overflow-hidden"
          >
            {filteredLessons.map((lesson, i) => (
              <button
                key={lesson.id}
                onClick={() => router.push(`/gamedev/lessons/${lesson.id}`)}
                className="group flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-white/5 md:gap-4 md:p-4"
              >
                {/* Tartib raqami */}
                <span className="w-7 shrink-0 text-center font-display text-sm font-black tabular-nums text-secondary group-hover:text-primary md:w-9 md:text-base">
                  {i + 1}
                </span>

                {/* Miniatyura */}
                <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-white/5 md:w-40">
                  {lesson.img ? (
                    <img
                      src={lesson.img}
                      alt={lesson.title}
                      className="h-full w-full object-cover opacity-80 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-brand-gradient-soft">
                      <Play size={18} className="text-white/70" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary shadow-glow">
                      <Play size={15} className="ml-0.5 fill-current text-white" />
                    </div>
                  </div>
                  {lesson.duration && (
                    <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {lesson.duration}
                    </span>
                  )}
                </div>

                {/* Ma'lumot */}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-sm font-bold tracking-tight text-white transition-colors group-hover:text-primary md:text-base">
                    {lesson.title}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-secondary">
                    {lesson.level && (
                      <span className="inline-flex items-center gap-1 font-display uppercase tracking-wider text-violet">
                        <GraduationCap size={12} />
                        {lesson.level}
                      </span>
                    )}
                    <span className="truncate">
                      Muallif: <span className="text-white/90">{lesson.author || "Maroqli.uz"}</span>
                    </span>
                  </div>
                </div>

                {/* O'ng ko'rsatkich */}
                <div className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-bold text-secondary transition-all group-hover:border-primary group-hover:text-primary sm:flex">
                  <Play size={12} className="fill-current" />
                  Ko'rish
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </main>
  );
}
