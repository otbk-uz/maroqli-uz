"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Plus, RefreshCw, Lock, Crown, BookOpen, Play } from "lucide-react";
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
  const [loadingLessons, setLoadingLessons] = useState(false);

  const defaultLessons = [
    { id: "1", title: "O'yin dizaynining asosiy tamoyillari", author: "Maroqli.uz", level: "O'yin dizayni (boshlang'ich)", img: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070" }
  ];

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

  const allLessons = lessons.length > 0 ? lessons : defaultLessons;
  const playlists = ["Barchasi", ...Array.from(new Set(allLessons.map(l => l.level)))];
  const filteredLessons = activePlaylist === "Barchasi" ? allLessons : allLessons.filter(l => l.level === activePlaylist);

  return (
    <main className="min-h-screen bg-background text-white">
      <Navbar />

      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20 max-w-6xl">
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-12"
        >
          <div className="absolute top-0 left-0 w-[200px] h-[200px] bg-primary/10 blur-[80px] rounded-full -z-10" />
          <div className="absolute top-10 right-0 w-[150px] h-[150px] bg-blue-500/10 blur-[80px] rounded-full -z-10" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                  <BookOpen className="text-primary" size={24} />
                </div>
                <h1 className="text-4xl md:text-5xl font-black">Videodarslar</h1>
              </div>
              <p className="text-secondary text-base md:text-lg">
                O'yin yaratish bo'yicha maxsus video darsliklar va o'quv qo'llanmalari (Barcha uchun bepul).
              </p>
            </div>
            {user?.role === "ADMIN" && (
              <button 
                onClick={() => router.push("/admin")}
                className="py-2.5 px-5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-sm flex items-center gap-2 transition-all shadow-md shadow-primary/10"
              >
                <Plus size={16} /> Yangi dars qo'shish
              </button>
            )}
          </div>
        </motion.div>

        {/* Playlist Filter Buttons */}
        {!loadingLessons && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap items-center gap-3 mb-8"
          >
            {playlists.map(playlist => (
              <button
                key={playlist}
                onClick={() => setActivePlaylist(playlist)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activePlaylist === playlist ? "bg-primary text-white border-primary" : "bg-white/5 text-secondary hover:text-white border-white/10 hover:border-white/20"} border`}
              >
                {playlist}
              </button>
            ))}
          </motion.div>
        )}

        {/* Lessons Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {loadingLessons ? (
            <div className="col-span-full flex items-center justify-center py-20 text-secondary text-sm">
              <RefreshCw className="animate-spin text-primary mr-2" size={20} />
              <span>Darsliklar yuklanmoqda...</span>
            </div>
          ) : filteredLessons.map(lesson => {
            const hasAccess = true; // Barcha uchun bepul
            return (
              <motion.div 
                key={lesson.id} 
                whileHover={{ y: -4 }}
                className="glass-card overflow-hidden group border border-white/5 hover:border-primary/50 transition-all cursor-pointer relative"
              >
                <div className="aspect-video relative overflow-hidden">
                  <img src={lesson.img} alt={lesson.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Play size={20} className="text-white fill-current ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute top-3 left-3 bg-primary/90 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase">
                    {lesson.level}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{lesson.title}</h3>
                  <p className="text-xs text-secondary mb-4">Muallif: <span className="text-white">{lesson.author}</span></p>
                  {hasAccess ? (
                    <button 
                      onClick={() => router.push(`/gamedev/lessons/${lesson.id}`)}
                      className="w-full py-2.5 bg-white/5 hover:bg-primary rounded-xl text-sm font-bold transition-all text-white border border-white/10 hover:border-primary flex items-center justify-center gap-2"
                    >
                      <Play size={14} className="fill-current" />
                      Darsni ko'rish
                    </button>
                  ) : (
                    <button 
                      onClick={() => router.push("/premium")}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10"
                    >
                      <Crown size={12} />
                      <span>Premium bilan ochish</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Empty State */}
        {!loadingLessons && filteredLessons.length === 0 && (
          <div className="glass-card p-16 text-center border border-dashed border-white/10">
            <BookOpen className="mx-auto text-secondary mb-4" size={40} />
            <p className="text-secondary text-sm">Bu kategoriyada hozircha darsliklar mavjud emas.</p>
          </div>
        )}
      </div>
    </main>
  );
}
