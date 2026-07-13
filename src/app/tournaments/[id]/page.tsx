"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import { Calendar, Trophy, Users, Shield, Play, Info, ArrowLeft, User, Crown, GitBranch } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore, useTranslation } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { BackButton } from "../../../components/ui/BackButton";
import TournamentBracket from "@/components/TournamentBracket";
import TournamentLive from "@/components/TournamentLive";

interface Tournament {
  id: string;
  title: string;
  description: string;
  game: string;
  status: string;
  format: string;
  prize_pool: string;
  max_teams: number;
  start_date: string;
  is_premium?: boolean;
}

const TournamentDetail = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [userTeam, setUserTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("ISHTIROKCHILAR");
  const [teamForm, setTeamForm] = useState({ name: "", in_game_id: "" });

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        const { data: tData, error: tErr } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", id)
          .single();
          
        if (tErr) throw tErr;
        setTournament(tData);

        const { data: pData, error: pErr } = await supabase
          .from("tournament_participants")
          .select("*, teams(id, name, logo_url, captain_id)")
          .eq("tournament_id", id);
          
        if (pData) setParticipants(pData);

        // check if current user has a team
        if (user) {
          const { data: memberData } = await supabase
            .from("team_members")
            .select("team_id, role")
            .eq("user_id", user.id)
            .single();
            
          if (memberData) {
            const { data: teamData } = await supabase
              .from("teams")
              .select("*")
              .eq("id", memberData.team_id)
              .single();
            if (teamData) {
              setUserTeam({ ...teamData, currentUserRole: memberData.role });
            }
          }
        }
      } catch (err) {
        console.error("Tournament detail fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, user]);

  const handleJoinLeave = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!tournament) return;

    if (tournament.is_premium && !user?.is_premium && user?.role !== "ADMIN") {
      alert("Ushbu turnir faqat PREMIUM a'zolar uchun! Iltimos, oldin obunani faollashtiring.");
      router.push("/premium");
      return;
    }

    if (!userTeam) {
      alert("Sizda jamoa yo'q!");
      return;
    }

    if (userTeam.currentUserRole !== 'CAPTAIN') {
      alert("Faqat jamoa sardori ro'yxatdan o'tkaza oladi.");
      return;
    }

    const isJoined = participants.some(p => p.team_id === userTeam.id);

    setActionLoading(true);
    try {
      if (isJoined) {
        // Leave
        await supabase
          .from("tournament_participants")
          .delete()
          .eq("tournament_id", tournament.id)
          .eq("team_id", userTeam.id);
        alert("Turnirdan muvaffaqiyatli chiqdingiz.");
      } else {
        // Join
        if (participants.length >= tournament.max_teams) {
          alert("Turnir to'lgan!");
          setActionLoading(false);
          return;
        }
        await supabase
          .from("tournament_participants")
          .insert({
            tournament_id: tournament.id,
            team_id: userTeam.id
          });
        alert("Turnirga muvaffaqiyatli ro'yxatdan o'tdingiz!");
      }
      
      // refetch participants
      const { data: pData } = await supabase
        .from("tournament_participants")
        .select("*, teams(id, name, logo_url, captain_id)")
        .eq("tournament_id", tournament.id);
      if (pData) setParticipants(pData);
      
    } catch (err: any) {
      console.error(err);
      alert("Xatolik yuz berdi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTeamAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }
    if (!teamForm.name.trim() || !teamForm.in_game_id.trim()) {
      alert("Iltimos, jamoa nomi va o'yin ID'sini kiriting!");
      return;
    }
    setActionLoading(true);
    try {
      // 1. Create team
      const { data: newTeam, error: teamError } = await supabase
        .from("teams")
        .insert({ 
          name: teamForm.name.trim(), 
          captain_id: user.id 
        })
        .select()
        .single();

      if (teamError) {
        if (teamError.code === "23505") {
          throw new Error("Ushbu jamoa nomi band. Boshqa nom tanlang.");
        }
        throw teamError;
      }

      // 2. Add captain
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: newTeam.id,
          user_id: user.id,
          in_game_id: teamForm.in_game_id.trim(),
          role: 'CAPTAIN'
        });

      if (memberError) throw memberError;

      // 3. Join tournament
      const { error: joinError } = await supabase
        .from("tournament_participants")
        .insert({
          tournament_id: id,
          team_id: newTeam.id
        });

      if (joinError) throw joinError;

      // 4. Update local state
      setUserTeam({ ...newTeam, currentUserRole: 'CAPTAIN', currentUserInGameId: teamForm.in_game_id.trim() });
      
      const { data: pData } = await supabase
        .from("tournament_participants")
        .select("*, teams(id, name, logo_url, captain_id)")
        .eq("tournament_id", id);
      if (pData) setParticipants(pData);

      alert("Jamoangiz muvaffaqiyatli tuzildi va turnirga a'zo bo'ldingiz!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Xatolik yuz berdi");
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

  const isUserJoined = userTeam && participants.some((p) => p.team_id === userTeam.id);

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
                {tournament.is_premium && (
                  <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-black px-4 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1 shadow-lg shadow-amber-500/10">
                    <Crown size={12} className="fill-current" />
                    PREMIUM ONLY
                  </span>
                )}
                <span className="bg-primary px-4 py-1 rounded-full text-xs font-bold uppercase">{tournament.status}</span>
                <span className="bg-white/10 px-4 py-1 rounded-full text-xs font-bold uppercase text-secondary">{tournament.game}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-snug">{tournament.title}</h1>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 border-y border-white/5">
                <div className="text-center md:text-left">
                  <p className="text-xs text-secondary uppercase tracking-widest mb-1">Sovrin</p>
                  <p className="text-2xl font-bold text-primary">
                    {tournament.prize_pool}
                  </p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-xs text-secondary uppercase tracking-widest mb-1">Jamoalar</p>
                  <p className="text-2xl font-bold text-white">{participants.length} / {tournament.max_teams}</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-xs text-secondary uppercase tracking-widest mb-1">Turi</p>
                  <p className="text-2xl font-bold text-white">{tournament.format}</p>
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
              {["ISHTIROKCHILAR", "JONLI EFIR", "BRACKET", "QOIDALAR"].map((tab) => (
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
              {activeTab === "JONLI EFIR" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <TournamentLive />
                </motion.div>
              )}
              {activeTab === "BRACKET" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <TournamentBracket />
                </motion.div>
              )}
              {activeTab === "ISHTIROKCHILAR" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {participants.length === 0 ? (
                    <p className="text-secondary text-xs text-center col-span-full py-10">Hali hech kim ro'yxatdan o'tmadi.</p>
                  ) : (
                    participants.map((p) => (
                      <div key={p.id} className="glass-card p-4 flex items-center space-x-3 hover:border-white/10 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-bold text-xs text-white uppercase">
                          {p.teams?.name?.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{p.teams?.name}</p>
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
                    <li>Barcha ishtirokchilar o'yin boshlanishidan 30 daqiqa oldin tayyor bo'lishi shart.</li>
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

              {!isAuthenticated ? (
                <div className="space-y-4">
                  <p className="text-sm text-secondary leading-relaxed">
                    Turnirda qatnashish va jamoa tuzish uchun profilingizga kiring.
                  </p>
                  <button
                    onClick={() => router.push("/login")}
                    className="w-full py-3.5 font-bold rounded-2xl btn-primary active:scale-95 transition-all text-xs uppercase tracking-wider"
                  >
                    Tizimga kirish
                  </button>
                </div>
              ) : !userTeam ? (
                <form onSubmit={handleCreateTeamAndJoin} className="space-y-4">
                  <p className="text-xs text-secondary leading-relaxed">
                    Sizda hali jamoa yo'q. Ushbu turnirda qatnashish uchun jamoangizni shu yerning o'zida yarating:
                  </p>
                  
                  <div>
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Jamoa Nomi</label>
                    <input
                      type="text"
                      required
                      value={teamForm.name}
                      onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                      placeholder="Masalan: Falcons"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block">Sizning o'yindagi ID (In-game ID)</label>
                    <input
                      type="text"
                      required
                      value={teamForm.in_game_id}
                      onChange={(e) => setTeamForm({ ...teamForm, in_game_id: e.target.value })}
                      placeholder="Masalan: Player#1234"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-3.5 font-bold rounded-xl btn-primary active:scale-95 transition-all text-xs uppercase tracking-wider disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    ) : (
                      "Jamoa tuzish va ro'yxatdan o'tish"
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  <p className="text-xs text-secondary leading-relaxed">
                    Siz ushbu turnirga jamoangizni ro'yxatdan o'tkazishingiz yoki undan chiqishingiz mumkin.
                  </p>

                  <div className="space-y-3.5 border-y border-white/5 py-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-secondary">Kirish to'lovi:</span>
                      <span className="font-bold text-green-500">BEPUL</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-secondary">Jamoangiz:</span>
                      <span className="font-bold text-primary truncate max-w-[150px]">{userTeam.name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-secondary">Rolingiz:</span>
                      <span className="font-bold text-white uppercase tracking-wider">
                        {userTeam.currentUserRole === 'CAPTAIN' ? "SARDOR" : "O'YINCHI"}
                      </span>
                    </div>
                  </div>

                  {tournament.status === "FINISHED" ? (
                    <button disabled className="w-full py-4 bg-white/5 border border-white/5 text-secondary font-bold rounded-2xl cursor-not-allowed text-xs uppercase tracking-wider">
                      Turnir yakunlangan
                    </button>
                  ) : (
                    <div className="space-y-3">
                      {userTeam.currentUserRole !== 'CAPTAIN' && !isUserJoined && (
                        <p className="text-[10px] text-red-400 text-center font-medium">
                          Ro'yxatdan o'tish uchun faqat jamoa sardori ruxsatga ega.
                        </p>
                      )}
                      <button
                        onClick={handleJoinLeave}
                        disabled={actionLoading || (userTeam.currentUserRole !== 'CAPTAIN' && !isUserJoined)}
                        className={`w-full py-4 font-bold rounded-2xl active:scale-95 transition-all text-xs uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed ${
                          isUserJoined
                            ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/10"
                            : "btn-primary"
                        }`}
                      >
                        {actionLoading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                        ) : isUserJoined ? (
                          "Turnirdan chiqish"
                        ) : (
                          "Jamoani ro'yxatdan o'tkazish"
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default TournamentDetail;
