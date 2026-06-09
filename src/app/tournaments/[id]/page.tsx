"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import TournamentBracket from "../../../components/TournamentBracket";
import { Calendar, Trophy, Users, Shield, Play, Info } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import { BackButton } from "../../../components/ui/BackButton";

interface JoinedUser {
  id: number;
  username: string;
  full_name: string;
  avatar?: string;
  role: string;
}

interface Tournament {
  id: number;
  title: string;
  description: string;
  game_name: string;
  status: string;
  bracket_type: string;
  prize_pool: string;
  entry_fee: string;
  max_participants: number;
  participant_count: number;
  joined_users: JoinedUser[];
  start_date: string;
  end_date?: string;
}

const TournamentDetail = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const { user, isAuthenticated } = useAuthStore();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("BRACKET");

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        const response = await api.get(`/tournaments/${id}/`);
        setTournament(response.data);
      } catch (err) {
        console.error("Tournament detail fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleJoinLeave = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!tournament) return;

    setActionLoading(true);
    try {
      const response = await api.post(`/tournaments/${tournament.id}/join/`);
      const { status } = response.data;
      
      // Re-fetch detail to get updated participants list
      const updateResponse = await api.get(`/tournaments/${tournament.id}/`);
      setTournament(updateResponse.data);
      alert(response.data.message);
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.detail) {
        alert(err.response.data.detail);
      } else {
        alert("Amalni bajarib bo'lmadi. Qayta urinib ko'ring.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background relative flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-white mb-4">Turnir topilmadi</h1>
        <button onClick={() => router.push("/tournaments")} className="btn-primary flex items-center space-x-2">
          <ArrowLeft size={16} />
          <span>Barcha turnirlarga qaytish</span>
        </button>
      </main>
    );
  }

  const isUserJoined = user && tournament.joined_users.some((ju) => ju.id === user.id);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      {/* Banner */}
      <div className="h-64 md:h-80 w-full bg-gradient-to-b from-primary/20 to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-32 relative z-10 pb-20">
        <BackButton />
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Info */}
          <div className="flex-1">
            <div className="glass-card p-8 mb-8">
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <span className="bg-primary px-4 py-1 rounded-full text-xs font-bold uppercase">{tournament.status}</span>
                <span className="bg-white/10 px-4 py-1 rounded-full text-xs font-bold uppercase text-secondary">{tournament.game_name}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-snug">{tournament.title}</h1>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 border-y border-white/5">
                <div className="text-center md:text-left">
                  <p className="text-xs text-secondary uppercase tracking-widest mb-1">Sovrin</p>
                  <p className="text-2xl font-bold text-primary">
                    {Number(tournament.prize_pool) > 0 ? `$${Number(tournament.prize_pool).toLocaleString()}` : "Bepul"}
                  </p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-xs text-secondary uppercase tracking-widest mb-1">Qatnashuvchilar</p>
                  <p className="text-2xl font-bold text-white">{tournament.participant_count} / {tournament.max_participants}</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-xs text-secondary uppercase tracking-widest mb-1">Turi</p>
                  <p className="text-2xl font-bold text-white">{tournament.bracket_type === 'SINGLE' ? 'Single Elim' : 'Round Robin'}</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-xs text-secondary uppercase tracking-widest mb-1">Boshlanish</p>
                  <p className="text-2xl font-bold text-white">
                    {new Date(tournament.start_date).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              {/* Tournament Description */}
              <div className="mt-8">
                <h3 className="font-bold text-white mb-3">Turnir haqida</h3>
                <p className="text-secondary text-sm leading-relaxed whitespace-pre-line">{tournament.description}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-8 border-b border-white/5 mb-8 overflow-x-auto no-scrollbar">
              {["BRACKET", "ISHTIROKCHILAR", "QOIDALAR"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${
                    activeTab === tab ? "text-primary" : "text-secondary hover:text-white"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {activeTab === "BRACKET" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <TournamentBracket />
                </motion.div>
              )}
              {activeTab === "ISHTIROKCHILAR" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {tournament.joined_users.length === 0 ? (
                    <p className="text-secondary text-xs text-center col-span-full py-10">Hali hech kim ro'yxatdan o'tmadi.</p>
                  ) : (
                    tournament.joined_users.map((ju) => (
                      <div key={ju.id} className="glass-card p-4 flex items-center space-x-3 hover:border-white/10 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center font-bold text-xs text-white">
                          {ju.avatar ? (
                            <img src={ju.avatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User size={16} className="text-secondary" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">@{ju.username}</p>
                          <p className="text-[10px] text-secondary">{ju.full_name}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {activeTab === "QOIDALAR" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-secondary text-sm leading-relaxed max-w-2xl">
                  <p className="font-bold text-white mb-2">Asosiy qoidalar:</p>
                  <ol className="list-decimal list-inside space-y-3">
                    <li>Barcha ishtirokchilar o'yin boshlanishidan 30 daqiqa oldin Check-in dan o'tishi shart.</li>
                    <li>O'yinda haqoratli so'zlar ishlatish taqiqlanadi (autodiskvalifikatsiya).</li>
                    <li>Har qanday turdagi cheat dasturlardan foydalanish doimiy bloklanishga olib keladi.</li>
                    <li>Nizoli vaziyatlarda admin qarori yakuniy hisoblanadi.</li>
                  </ol>
                </motion.div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-80">
            <div className="glass-card p-6 sticky top-32">
              <h3 className="font-bold mb-6 flex items-center text-white">
                <Shield size={18} className="mr-2 text-primary" />
                Ro'yxatdan o'tish
              </h3>
              <p className="text-sm text-secondary mb-6 leading-relaxed">
                Ushbu turnirda qatnashish uchun ro'yxatdan o'tish tugmasini bosing. Ro'yxatdan o'tgandan keyin siz ishtirokchilar ro'yxatida ko'rinasiz.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Kirish to'lovi:</span>
                  <span className="font-bold text-green-500">
                    {Number(tournament.entry_fee) > 0 ? `${Number(tournament.entry_fee).toLocaleString()} UZS` : "BEPUL"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Platforma:</span>
                  <span className="font-bold text-white">PC</span>
                </div>
              </div>

              {tournament.status === "FINISHED" ? (
                <button disabled className="w-full py-4 bg-white/5 border border-white/5 text-secondary font-bold rounded-2xl cursor-not-allowed">
                  Turnir yakunlangan
                </button>
              ) : (
                <button 
                  onClick={handleJoinLeave}
                  disabled={actionLoading}
                  className={`w-full py-4 font-bold rounded-2xl active:scale-95 transition-all ${
                    isUserJoined 
                      ? "bg-red-500 hover:bg-red-600 text-white" 
                      : "btn-primary"
                  }`}
                >
                  {actionLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : isUserJoined ? (
                    "Turnirni tark etish"
                  ) : (
                    "Hozir qo'shilish"
                  )}
                </button>
              )}
              
              <button 
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Havola nusxalandi! Do'stlaringizga ulashing.");
                  }
                }}
                className="w-full py-3 mt-4 text-sm text-secondary hover:text-white transition-colors"
              >
                Do'stlarni taklif qilish
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default TournamentDetail;
