"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Rocket, Users, MapPin, Calendar, Gift, RefreshCw, ShieldAlert, Award } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { BackButton } from "@/components/ui/BackButton";

interface DevelopedGame {
  id: string;
  title: string;
  slug: string;
  price: number;
  platform: string;
  rating: string;
  description: string;
}

interface StudioProfile {
  id: string;
  user_id: string;
  studio_name: string;
  team_members: string;
  location: string;
  demo_url: string;
  demo_type: "image" | "video";
  release_date: string;
  donation_url: string;
}

interface PastProject {
  id: string;
  title: string;
  description: string;
  genre: string;
  platform: string;
  release_date: string;
}

export default function StudioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [studio, setStudio] = useState<StudioProfile | null>(null);
  const [games, setGames] = useState<DevelopedGame[]>([]);
  const [pastProjects, setPastProjects] = useState<PastProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchStudioDetails();
    }
  }, [id]);

  const fetchStudioDetails = async () => {
    try {
      setLoading(true);
      // 1. Fetch Studio Profile
      const { data: studioData, error: studioError } = await supabase
        .from("gamedev_profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (studioError) throw studioError;

      if (studioData) {
        setStudio(studioData);

        // 2. Fetch Developed Games by this studio (developer_id = studioData.user_id)
        const { data: gamesData, error: gamesError } = await supabase
          .from("developed_games")
          .select("*")
          .eq("developer_id", studioData.user_id)
          .order("created_at", { ascending: false });

        if (gamesError) throw gamesError;
        setGames(gamesData || []);

        // 3. Fetch Past Projects by this studio (developer_id = studioData.user_id)
        const { data: pastData, error: pastError } = await supabase
          .from("gamedev_past_projects")
          .select("*")
          .eq("developer_id", studioData.user_id)
          .order("created_at", { ascending: false });

        if (pastError) throw pastError;
        setPastProjects(pastData || []);
      }
    } catch (err) {
      console.error("Studio ma'lumotlarini yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    return url;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background relative flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-primary" size={32} />
          <span className="text-secondary font-medium">Studiya ma'lumotlari yuklanmoqda...</span>
        </div>
      </main>
    );
  }

  if (!studio) {
    return (
      <main className="min-h-screen bg-background relative flex items-center justify-center text-white">
        <Navbar />
        <div className="text-center space-y-4 max-w-md px-6">
          <ShieldAlert size={48} className="text-primary mx-auto" />
          <h2 className="text-2xl font-bold">Studiya topilmadi</h2>
          <p className="text-secondary text-sm">
            Qidirilayotgan o'yin yaratuvchisi yoki studiya profili mavjud emas yoki o'chirilgan.
          </p>
          <button
            onClick={() => router.push("/gamedev")}
            className="py-3 px-6 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl text-sm transition-all"
          >
            Gamedev sahifasiga qaytish
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-white">
      <Navbar />

      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20 max-w-5xl">
        <div className="mb-6 flex justify-between items-center">
          <BackButton />
        </div>

        {/* Studio Title Header */}
        <div className="glass-card p-8 md:p-10 border border-white/5 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/10 blur-[100px] rounded-full -z-10" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <span className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block">
                GameDev & Studio
              </span>
              <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">{studio.studio_name}</h1>
              
              <div className="flex flex-wrap gap-4 text-xs text-secondary font-medium">
                {studio.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-primary" />
                    {studio.location}
                  </span>
                )}
                {studio.release_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-400" />
                    Loyihalar relizi: {studio.release_date}
                  </span>
                )}
              </div>
            </div>

            {studio.donation_url && (
              <a
                href={studio.donation_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full md:w-auto py-4 px-8 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black font-black rounded-2xl transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 flex items-center justify-center gap-2 hover:scale-[1.02] duration-300"
              >
                <Gift size={18} />
                <span>Donat Orqali Qo'llash</span>
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Info Area (Left 2 Columns) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Demo Media Section */}
            {studio.demo_url && (
              <div className="glass-card p-6 border border-white/5 space-y-4">
                <h3 className="text-xl font-bold">O'yin Loyihasi Demontratsiyasi</h3>
                
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/60 border border-white/5 relative">
                  {studio.demo_type === "video" ? (
                    <iframe
                      src={getEmbedUrl(studio.demo_url)}
                      title={`${studio.studio_name} Game Demo`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <img
                      src={studio.demo_url}
                      alt={`${studio.studio_name} Game Screenshot`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Studio Games List */}
            <div className="glass-card p-6 border border-white/5">
              <h3 className="text-xl font-bold mb-6">Chiqargan / Ishlayotgan O'yinlari</h3>

              {games.length === 0 ? (
                <div className="text-center py-10 bg-white/[0.01] rounded-2xl border border-dashed border-white/10 text-secondary text-sm">
                  Ushbu studiya hozircha o'yin yuklamagan.
                </div>
              ) : (
                <div className="space-y-6">
                  {games.map((game) => (
                    <div
                      key={game.id}
                      className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-white/10 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-lg text-white">{game.title}</h4>
                          <span className="bg-primary/20 text-primary text-[9px] font-extrabold px-2 py-0.5 rounded uppercase">
                            {game.platform}
                          </span>
                        </div>
                        <p className="text-xs text-secondary leading-relaxed max-w-xl">{game.description}</p>
                      </div>

                      <div className="text-right whitespace-nowrap min-w-[120px]">
                        <span className="text-[10px] text-secondary uppercase font-semibold block">Narxi</span>
                        <span className="text-sm font-extrabold text-white block">
                          {game.price === 0 ? "Bepul" : `${game.price.toLocaleString()} UZS`}
                        </span>
                        <span className="text-xs font-bold text-amber-400 block mt-1">⭐ {game.rating || "5.0"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past Projects / GameDev Experience Section */}
            <div className="glass-card p-6 border border-white/5">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Award className="text-primary" size={22} />
                <span>Avvalgi Loyihalar (GameDev Tajribasi)</span>
              </h3>

              {pastProjects.length === 0 ? (
                <div className="text-center py-10 bg-white/[0.01] rounded-2xl border border-dashed border-white/10 text-secondary text-sm">
                  Studiya tomonidan avvalgi loyihalar haqida ma'lumot kiritilmagan.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pastProjects.map((project) => (
                    <div
                      key={project.id}
                      className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col justify-between hover:border-primary/20 transition-all duration-300"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-base text-white">{project.title}</h4>
                          <span className="bg-white/5 border border-white/10 text-[9px] text-secondary font-bold px-2 py-0.5 rounded">
                            {project.platform}
                          </span>
                        </div>
                        <p className="text-[10px] text-primary font-bold mb-2 uppercase tracking-wider">{project.genre || "Janr ko'rsatilmagan"}</p>
                        <p className="text-xs text-secondary/80 line-clamp-3 leading-relaxed mb-4">{project.description}</p>
                      </div>

                      <div className="pt-3 border-t border-white/5 text-[10px] text-secondary/70">
                        Chiqarilgan sana: {project.release_date || "Noma'lum"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Area (Right 1 Column) */}
          <div className="space-y-6">
            {/* Team details card */}
            <div className="glass-card p-6 border border-white/5 space-y-4">
              <h3 className="text-base font-bold uppercase tracking-wider text-secondary">Jamoa A'zolari</h3>
              <div className="h-px bg-white/5" />
              
              {studio.team_members ? (
                <div className="space-y-3">
                  {studio.team_members.split(",").map((member, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary">
                        {member.trim().substring(0, 1).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-white/90">{member.trim()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-secondary italic">A'zolar ro'yxati kiritilmagan.</p>
              )}
            </div>

            {/* Studio info details */}
            <div className="glass-card p-6 border border-white/5 space-y-4">
              <h3 className="text-base font-bold uppercase tracking-wider text-secondary">Tafsilotlar</h3>
              <div className="h-px bg-white/5" />
              
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-secondary font-medium">Joylashuv:</span>
                  <span className="text-white font-bold">{studio.location || "Noma'lum"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary font-medium">Loyiha reliz sanasi:</span>
                  <span className="text-white font-bold">{studio.release_date || "Noma'lum"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary font-medium">Loyihalar soni:</span>
                  <span className="text-white font-bold">{games.length} ta o'yin</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary font-medium">Avvalgi loyihalar (tajriba):</span>
                  <span className="text-white font-bold">{pastProjects.length} ta o'yin</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
