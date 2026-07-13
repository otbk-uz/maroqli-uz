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
                {t("knowledge_center_badge", "Bilim markazi")}
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
              {t("darslar_subtitle", "O'yin yaratish bo'yicha maxsus video darsliklar va o'quv qo'llanmalari (Barcha uchun bepul).")}
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
              <Plus size={16} /> {t("add_new_lesson_btn", "Yangi dars qo'shish")}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex flex-col space-y-3">
                <div className="skeleton aspect-video w-full rounded-2xl" />
                <div className="flex space-x-3 px-1">
                  <div className="skeleton w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-5/6" />
                    <div className="skeleton h-3 w-2/3" />
                  </div>
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
              {t("no_lessons_found_title", "Darsliklar mavjud emas")}
            </h3>
            <p className="text-secondary max-w-md">
              {t("no_lessons_found_desc", "Bu kategoriyada hozircha darsliklar mavjud emas.")}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
          >
            {filteredLessons.map((lesson) => (
              <div
                key={lesson.id}
                onClick={() => router.push(`/gamedev/lessons/${lesson.id}`)}
                className="group cursor-pointer flex flex-col space-y-3 transition-all duration-200 active:scale-[0.98]"
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-white/5 border border-white/5">
                  {lesson.img ? (
                    <img
                      src={lesson.img}
                      alt={lesson.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-brand-gradient-soft">
                      <Play size={24} className="text-white/70" />
                    </div>
                  )}
                  
                  {/* Play Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-glow transform scale-90 group-hover:scale-100 transition-transform duration-300">
                      <Play size={20} className="ml-1 fill-current text-white" />
                    </div>
                  </div>

                  {/* Duration Badge */}
                  {lesson.duration && (
                    <span className="absolute bottom-2.5 right-2.5 rounded bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white tracking-wider">
                      {lesson.duration}
                    </span>
                  )}
                </div>

                {/* Info Section */}
                <div className="flex space-x-3 px-1">
                  {/* Author/Channel Avatar */}
                  <div className="w-9 h-9 rounded-full bg-brand-gradient text-xs font-bold text-white flex items-center justify-center shrink-0 shadow-sm border border-white/10 uppercase select-none">
                    {lesson.author?.[0]?.toUpperCase() || "M"}
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-sm font-bold text-white leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {lesson.title}
                    </h3>
                    <p className="text-xs text-secondary mt-1 font-semibold truncate hover:text-white transition-colors">
                      {lesson.author || "Maroqli.uz"}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-secondary/80 mt-0.5">
                      {lesson.level && (
                        <>
                          <span className="text-violet font-semibold">{lesson.level}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{new Date(lesson.created_at || Date.now()).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

      </div>
    </main>
  );
}
