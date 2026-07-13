"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import TournamentBracket from "../../../components/TournamentBracket";
import { Calendar, Trophy, Users, Shield, Play, Info, ArrowLeft, User, Crown, Copy, Check, Eye, EyeOff, Radio } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { BackButton } from "../../../components/ui/BackButton";

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

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [userTeam, setUserTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("ISHTIROKCHILAR");
  
  const [liveStreamUrl, setLiveStreamUrl] = useState<string | null>(null);
  const [liveCfInputId, setLiveCfInputId] = useState<string | null>(null);
  const [hasMatches, setHasMatches] = useState(false);
  const isRefereeOrAdmin = user?.role === "ADMIN" || user?.role === "ORGANIZER" || user?.role === "MODERATOR";

  useEffect(() => {
    if (tournament) {
      fetchLiveStream();
      checkHasMatches();
    }
  }, [tournament]);

  const checkHasMatches = async () => {
    try {
      const { count, error } = await supabase
        .from("tournament_matches")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", tournament!.id);
      if (!error && count && count > 0) {
        setHasMatches(true);
      } else {
        setHasMatches(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLiveStream = async () => {
    try {
      const { data, error } = await supabase
        .from("live_streams")
        .select("stream_url, cf_live_input_id")
        .eq("is_live", true)
        .limit(1)
        .maybeSingle();

      if (data) {
        if (data.cf_live_input_id) {
          setLiveCfInputId(data.cf_live_input_id);
        } else if (data.stream_url) {
          setLiveStreamUrl(data.stream_url);
        }
      }
    } catch (err) {
      console.error("Live stream yuklashda xatolik:", err);
    }
  };
  const handleGenerateMatches = async () => {
    if (!confirm("Haqiqatan ham turnir o'yinlarini yaratmoqchimisiz? Bu ro'yxatdan o'tgan jamoalarni o'yin setkasiga ajratadi.")) return;
    setActionLoading(true);
    try {
      const teamCount = participants.length;
      if (teamCount < 2) {
        alert("O'yinlarni yaratish uchun kamida 2 ta jamoa ro'yxatdan o'tgan bo'lishi kerak!");
        setActionLoading(false);
        return;
      }

      let startRound = 1;
      if (teamCount > 8) startRound = 4;
      else if (teamCount > 4) startRound = 3;
      else if (teamCount > 2) startRound = 2;

      const matchInserts = [];
      for (let i = 0; i < teamCount; i += 2) {
        const team1 = participants[i];
        const team2 = participants[i + 1] || null;
        
        matchInserts.push({
          tournament_id: tournament!.id,
          round_number: startRound,
          match_order: Math.floor(i / 2) + 1,
          team1_id: team1.team_id,
          team2_id: team2 ? team2.team_id : null,
          status: "PENDING",
          team1_score: 0,
          team2_score: 0
        });
      }

      const { error: matchesErr } = await supabase
        .from("tournament_matches")
        .insert(matchInserts);

      if (matchesErr) throw matchesErr;

      const { error: statusErr } = await supabase
        .from("tournaments")
        .update({ status: "LIVE" })
        .eq("id", tournament!.id);

      if (statusErr) throw statusErr;

      alert("Matchlar muvaffaqiyatli yaratildi va turnir holati LIVE ga o'tkazildi!");
      window.location.reload();
    } catch (err: any) {
      console.error("Matchlarni yaratishda xatolik:", err);
      alert(err.message || "Xatolik yuz berdi.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetMatches = async () => {
    if (!confirm("Haqiqatan ham turnir o'yinlarini va natijalarini butunlay o'chirib tashlamoqchimisiz?")) return;
    setActionLoading(true);
    try {
      const { error: deleteErr } = await supabase
        .from("tournament_matches")
        .delete()
        .eq("tournament_id", tournament!.id);
      if (deleteErr) throw deleteErr;

      const { error: statusErr } = await supabase
        .from("tournaments")
        .update({ status: "UPCOMING" })
        .eq("id", tournament!.id);
      if (statusErr) throw statusErr;

      alert("Turnir muvaffaqiyatli tozalandi!");
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert("Tozalashda xatolik yuz berdi.");
    } finally {
      setActionLoading(false);
    }
  };

  const [adminStream, setAdminStream] = useState<any | null>(null);
  const [adminLive, setAdminLive] = useState(false);
  const [adminLiveLoading, setAdminLiveLoading] = useState(false);
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [adminKeyCopied, setAdminKeyCopied] = useState(false);

  useEffect(() => {
    if (isRefereeOrAdmin && user) {
      fetchAdminStream();
    }
  }, [isRefereeOrAdmin, user]);

  const fetchAdminStream = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/streams/setup", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${useAuthStore.getState().token || ""}`
        },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (res.ok && data.stream) {
        setAdminStream(data.stream);
        setAdminLive(data.stream.is_live || false);
      }
    } catch (err) {
      console.error("Admin stream setup error:", err);
    }
  };

  const toggleAdminLive = async () => {
    if (!adminStream) return;
    setAdminLiveLoading(true);
    const newStatus = !adminLive;
    try {
      setAdminLive(newStatus);
      const { error } = await supabase
        .from("live_streams")
        .update({ is_live: newStatus })
        .eq("id", adminStream.id);
      if (error) throw error;
      
      if (newStatus && tournament) {
        await supabase
          .from("tournaments")
          .update({ status: "LIVE" })
          .eq("id", tournament.id);
      }
      
      alert(newStatus ? "Jonli efir holati yoqildi!" : "Jonli efir holati o'chirildi!");
      window.location.reload();
    } catch (err) {
      console.error(err);
      setAdminLive(!newStatus);
    } finally {
      setAdminLiveLoading(false);
    }
  };
  const handleRegenerateStreamKey = async () => {
    if (!confirm("Efir kalitini yangilamoqchimisiz? Eskisi bekor qilinadi va OBS-ga yangi kalitni kiritishingiz kerak bo'ladi.")) return;
    setAdminLiveLoading(true);
    try {
      const res = await fetch("/api/streams/setup", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${useAuthStore.getState().token || ""}`
        },
        body: JSON.stringify({ userId: user!.id, forceRegenerate: true }),
      });
      const data = await res.json();
      if (res.ok && data.stream) {
        setAdminStream(data.stream);
        setAdminLive(data.stream.is_live || false);
        alert("Yangi efir kaliti yaratildi! Iltimos OBS sozlamalarini yangilang.");
      } else {
        throw new Error(data.error || "Yangilashda xato yuz berdi");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Xatolik yuz berdi.");
    } finally {
      setAdminLiveLoading(false);
    }
  };

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
      alert("Sizda jamoa yo'q! Oldin profil sahifasidan jamoa yarating.");
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
                    {new Date(tournament.start_date).toLocaleString("uz-UZ", {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {/* Tournament Description */}
              <div className="mt-8">
                <h3 className="font-bold text-white mb-3">Turnir haqida</h3>
                <p className="text-secondary text-sm leading-relaxed whitespace-pre-line">{tournament.description}</p>
              </div>
            </div>

            {/* Live Stream Player */}
            {(liveCfInputId || liveStreamUrl) && (
              <div className="glass-card p-6 mb-8">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  Turnirning Jonli Efiri (Maroqli.uz Oqimi)
                </h3>
                <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/5 bg-black">
                  {liveCfInputId ? (
                    <iframe
                      src={`https://iframe.videodelivery.net/${liveCfInputId}?autoplay=true&muted=true`}
                      className="w-full h-full"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                      allowFullScreen
                    />
                  ) : (
                    <iframe
                      src={liveStreamUrl!}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  )}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex space-x-8 border-b border-white/5 mb-8 overflow-x-auto no-scrollbar">
              {["ISHTIROKCHILAR", "BRACKET", "QOIDALAR"].map((tab) => (
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
                  <TournamentBracket tournamentId={id} />
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
          <div className="lg:w-80 space-y-6 lg:sticky lg:top-32 h-fit">
            {isRefereeOrAdmin && (
              <div className="glass-card p-6">
                <h3 className="font-bold mb-4 flex items-center text-white">
                  <Shield className="mr-2 text-primary" size={18} />
                  Admin Boshqaruvi
                </h3>
                <p className="text-xs text-secondary mb-4 leading-relaxed">
                  Turnir o'yinlarini va statusini boshqarish paneli.
                </p>
                <div className="space-y-3">
                  {!hasMatches ? (
                    <button
                      onClick={handleGenerateMatches}
                      disabled={actionLoading}
                      className="w-full py-3 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      {actionLoading ? "Yaratilmoqda..." : "Matchlarni Yaratish"}
                    </button>
                  ) : (
                    <button
                      onClick={handleResetMatches}
                      disabled={actionLoading}
                      className="w-full py-3 bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600/25 font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      {actionLoading ? "O'chirilmoqda..." : "O'yinlarni Tozalash"}
                    </button>
                  )}

                  {/* Streaming tools */}
                  {adminStream && (
                    <div className="pt-4 mt-4 border-t border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                          <Radio size={12} className={adminLive ? "text-green-500 animate-pulse" : "text-secondary"} />
                          Jonli Efir (OBS)
                        </span>
                        <button
                          type="button"
                          onClick={toggleAdminLive}
                          disabled={adminLiveLoading}
                          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                            adminLive ? "bg-green-500" : "bg-white/10"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              adminLive ? "translate-x-5" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Server URL */}
                      <div>
                        <label className="text-[9px] font-bold text-secondary uppercase tracking-wider mb-1 block">Server URL</label>
                        <div className="relative">
                          <input
                            type="text"
                            readOnly
                            value="rtmps://global-live.mux.com:5222/app"
                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-2.5 pr-8 py-1.5 text-[10px] font-mono text-white/90"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText("rtmps://global-live.mux.com:5222/app");
                              alert("URL nusxalandi!");
                            }}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-secondary hover:text-white"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Stream Key */}
                      <div>
                        <label className="text-[9px] font-bold text-secondary uppercase tracking-wider mb-1 block">Efir Kaliti (Stream Key)</label>
                        <div className="relative">
                          <input
                            type={showAdminKey ? "text" : "password"}
                            readOnly
                            value={adminStream.stream_key || ""}
                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-2.5 pr-14 py-1.5 text-[10px] font-mono text-white/90"
                          />
                          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => setShowAdminKey(!showAdminKey)}
                              className="p-1 text-secondary hover:text-white"
                            >
                              {showAdminKey ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(adminStream.stream_key);
                                setAdminKeyCopied(true);
                                setTimeout(() => setAdminKeyCopied(false), 2000);
                              }}
                              className="p-1 text-secondary hover:text-white"
                            >
                              {adminKeyCopied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Regenerate Key Button */}
                      <button
                        type="button"
                        onClick={handleRegenerateStreamKey}
                        disabled={adminLiveLoading}
                        className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold border border-white/5 transition-colors mt-2"
                      >
                        {adminLiveLoading ? "Yangilanmoqda..." : "Efir kalitini yangilash (Regenerate)"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="glass-card p-6">
              <h3 className="font-bold mb-6 flex items-center text-white">
                <Shield size={18} className="mr-2 text-primary" />
                Ro'yxatdan o'tish
              </h3>
              <p className="text-sm text-secondary mb-6 leading-relaxed">
                Ushbu turnirda qatnashish uchun ro'yxatdan o'tish tugmasini bosing. Ro'yxatdan faqat jamoa sardori o'tkaza oladi.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Kirish to'lovi:</span>
                  <span className="font-bold text-green-500">
                    BEPUL
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Sizning Jamoangiz:</span>
                  <span className="font-bold text-primary">
                    {userTeam ? userTeam.name : "Mavjud emas"}
                  </span>
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
                    "Turnirdan chiqish"
                  ) : (
                    "Jamoani ro'yxatdan o'tkazish"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default TournamentDetail;
