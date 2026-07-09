"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { BackButton } from "@/components/ui/BackButton";
import { useAuthStore, useTranslation } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { WhiteLabelPlayer } from "@/components/WhiteLabelPlayer";
import { BookOpen, RefreshCw, Crown, Award, Play } from "lucide-react";
import Link from "next/link";

interface Lesson {
  id: string;
  title: string;
  author: string;
  level: string;
  img: string;
  video_url: string;
}

export default function LessonDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  const [lesson, setLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [otherLessons, setOtherLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const defaultLessons: Lesson[] = [
    { id: "1", title: "O'yin dizaynining asosiy tamoyillari (Bunny Stream)", author: "Maroqli.uz", level: "O'yin dizayni (boshlang'ich)", img: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070", video_url: "bunny://f8d26b4f-bdab-4ecd-a249-0dc27dcc0716" }
  ];

  const lessonId = params.id as string;

  useEffect(() => {
    if (!mounted) return;

    // Barcha uchun bepul (Premium check olib tashlandi)

    const fetchLessonData = async () => {
      setLoading(true);
      try {
        // Fetch lesson detail from DB
        const { data, error } = await supabase
          .from("gamedev_lessons")
          .select("*")
          .eq("id", lessonId)
          .single();

        if (error || !data) {
          // If not found in DB, check fallback mock data
          const found = defaultLessons.find(l => l.id === lessonId);
          if (found) {
            setLesson(found);
          } else {
            router.push("/gamedev");
          }
        } else {
          setLesson(data);
        }

        // Fetch other lessons for listing
        const { data: listData } = await supabase
          .from("gamedev_lessons")
          .select("*")
          .neq("id", lessonId)
          .limit(5);

        // Filter other mock lessons
        const dbLessons = listData || [];
        const filteredDefaults = defaultLessons.filter(l => l.id !== lessonId);
        setOtherLessons([...dbLessons, ...filteredDefaults] as Lesson[]);
      } catch (err) {
        console.error("Dars ma'lumotlarini yuklashda xatolik:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLessonData();
  }, [lessonId, isAuthenticated, user, mounted]);

  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-white">
        <RefreshCw className="animate-spin text-primary mb-4" size={40} />
        <p className="text-secondary text-sm">Darslik yuklanmoqda...</p>
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <main className="min-h-screen bg-background text-white">
      <Navbar />

      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20 max-w-6xl">
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Player and Title Info (Takes 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Custom styled white label player with user watermark */}
            <WhiteLabelPlayer 
              url={lesson.video_url} 
              userIdentifier={user?.email || user?.username} 
            />

            <div className="glass-card p-6 md:p-8 border border-white/5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <span className="bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md">
                    {lesson.level}
                  </span>
                  <h1 className="text-2xl md:text-3xl font-black mt-2 text-white">{lesson.title}</h1>
                </div>
                <div className="flex items-center space-x-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm">
                  <Crown size={14} />
                  <span>PREMIUM DARS</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-secondary text-xs uppercase font-bold tracking-wider">Darslik Muallifi</p>
                  <p className="font-bold text-white mt-1">{lesson.author}</p>
                </div>
                <div className="text-right">
                  <p className="text-secondary text-xs uppercase font-bold tracking-wider">Platforma</p>
                  <p className="font-bold text-primary mt-1">MAROQLI.uz</p>
                </div>
              </div>

              <div className="pt-4 text-secondary text-sm leading-relaxed space-y-2">
                <p>Ushbu video darslik orqali o'yin yaratish sohasidagi ko'nikmalarni bosqichma-bosqich o'rganishingiz mumkin.</p>
                <p>O'yinlar yaratish va ularni platformamiz do'koniga joylashtirib daromad olishni bugundanoq boshlang!</p>
              </div>
            </div>
          </div>

          {/* Other lessons playlist sidebar (Takes 1 col) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 border border-white/5">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-white/5 pb-3">
                <BookOpen className="text-primary" size={20} />
                <span>Boshqa Darslar</span>
              </h3>

              <div className="flex flex-col gap-4">
                {otherLessons.map((item) => (
                  <Link 
                    key={item.id} 
                    href={`/gamedev/lessons/${item.id}`}
                    className="flex gap-3 p-2.5 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-300 group"
                  >
                    <div className="w-24 aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10 relative flex-shrink-0">
                      <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                        <Play size={12} className="text-white opacity-80 group-hover:opacity-100 fill-current" />
                      </div>
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <h4 className="font-bold text-xs text-white group-hover:text-primary transition-colors line-clamp-2 leading-relaxed">
                        {item.title}
                      </h4>
                      <span className="text-[9px] text-secondary mt-1">Muallif: {item.author}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="glass-card p-6 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent text-center space-y-4">
              <Award className="text-emerald-400 mx-auto" size={32} />
              <h4 className="font-bold text-sm text-white">Barcha uchun bepul!</h4>
              <p className="text-[11px] text-secondary leading-relaxed">Ushbu darslik Maroqli.uz jamoasi tomonidan barcha foydalanuvchilarga bepul taqdim etilmoqda.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
