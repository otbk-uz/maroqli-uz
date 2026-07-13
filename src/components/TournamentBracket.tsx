"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Swords, Edit2, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";

interface TournamentBracketProps {
  tournamentId: string;
}

interface DBQueryMatch {
  id: string;
  round_number: number;
  match_order: number;
  team1_score: number;
  team2_score: number;
  status: string;
  winner_id: string | null;
  team1_id: string | null;
  team2_id: string | null;
  team1: { name: string; logo_url?: string } | null;
  team2: { name: string; logo_url?: string } | null;
}

export default function TournamentBracket({ tournamentId }: TournamentBracketProps) {
  const { user } = useAuthStore();
  const isRefereeOrAdmin = user?.role === "ADMIN" || user?.role === "ORGANIZER" || user?.role === "MODERATOR";

  const [matches, setMatches] = useState<DBQueryMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  
  // Edit Form State
  const [editForm, setEditForm] = useState({
    team1_score: 0,
    team2_score: 0,
    status: "PENDING",
    winner_id: ""
  });
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);

  useEffect(() => {
    if (tournamentId) {
      fetchMatches();
    }
  }, [tournamentId]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tournament_matches")
        .select(`
          id,
          round_number,
          match_order,
          team1_score,
          team2_score,
          status,
          winner_id,
          team1_id,
          team2_id,
          team1:team1_id(name, logo_url),
          team2:team2_id(name, logo_url)
        `)
        .eq("tournament_id", tournamentId)
        .order("round_number", { ascending: false })
        .order("match_order", { ascending: true });

      if (error) throw error;
      setMatches((data as any) || []);
    } catch (err) {
      console.error("Matchlarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (match: DBQueryMatch) => {
    setEditingMatchId(match.id);
    setEditForm({
      team1_score: match.team1_score || 0,
      team2_score: match.team2_score || 0,
      status: match.status || "PENDING",
      winner_id: match.winner_id || ""
    });
  };

  const handleSaveEdit = async (matchId: string) => {
    setSavingMatchId(matchId);
    try {
      const { error } = await supabase
        .from("tournament_matches")
        .update({
          team1_score: editForm.team1_score,
          team2_score: editForm.team2_score,
          status: editForm.status,
          winner_id: editForm.winner_id || null
        })
        .eq("id", matchId);

      if (error) throw error;
      setEditingMatchId(null);
      await fetchMatches();
      alert("Match natijalari yangilandi!");
    } catch (err: any) {
      console.error("Matchni yangilashda xatolik:", err);
      alert(err.message || "Yangilashda xato yuz berdi.");
    } finally {
      setSavingMatchId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[300px] gap-2">
        <Loader2 className="animate-spin text-primary" size={24} />
        <span className="text-secondary text-xs uppercase tracking-widest">O'yin setkasi yuklanmoqda...</span>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
        <Swords className="mx-auto text-secondary/40 mb-4" size={32} />
        <h4 className="text-sm font-bold text-white mb-1">Setka hali yaratilmagan</h4>
        <p className="text-secondary text-xs max-w-sm mx-auto">
          Jamoalar ro'yxatdan o'tgach, admin turnirni boshlab o'yin setkasini (matches) yaratishi kerak.
        </p>
      </div>
    );
  }

  // Group matches by round_number
  const roundMap: { [key: number]: DBQueryMatch[] } = {};
  matches.forEach(m => {
    if (!roundMap[m.round_number]) {
      roundMap[m.round_number] = [];
    }
    roundMap[m.round_number].push(m);
  });

  // Sort rounds descending (e.g. Round 3 -> Round 2 -> Round 1)
  const roundNumbers = Object.keys(roundMap)
    .map(Number)
    .sort((a, b) => b - a);

  const getRoundName = (roundNum: number, totalRounds: number) => {
    if (roundNum === 1) return "Final";
    if (roundNum === 2) return "Yarim final";
    if (roundNum === 3) return "Chorak final";
    if (roundNum === 4) return "Nimchorak final (1/8)";
    return `Round ${roundNum}`;
  };

  return (
    <div className="flex space-x-16 p-6 overflow-x-auto no-scrollbar min-h-[500px] items-center">
      {roundNumbers.map((rNum, roundIdx) => {
        const roundMatches = roundMap[rNum];
        const roundName = getRoundName(rNum, roundNumbers.length);
        
        return (
          <div key={rNum} className="flex flex-col justify-around h-full min-w-[280px]">
            <div className="mb-8 text-center">
              <h4 className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                {roundName}
              </h4>
            </div>
            
            <div className="flex flex-col space-y-16">
              {roundMatches.map((match, matchIdx) => {
                const isEditing = editingMatchId === match.id;
                const isSaving = savingMatchId === match.id;

                return (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: roundIdx * 0.1 }}
                    key={match.id}
                    className="relative group"
                  >
                    {/* Match Card */}
                    <div className="glass-card overflow-hidden border-white/10 hover:border-primary/40 transition-all duration-200 shadow-2xl relative">
                      
                      {/* Top bar (Status / Live) */}
                      <div className="bg-white/5 border-b border-white/5 px-3 py-1 flex items-center justify-between">
                        <span className="flex items-center space-x-1.5">
                          {match.status === "LIVE" && (
                            <>
                              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                              <span className="text-[9px] font-black text-primary uppercase tracking-widest">LIVE</span>
                            </>
                          )}
                          {match.status === "COMPLETED" && (
                            <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">YAKUNLANDI</span>
                          )}
                          {match.status === "PENDING" && (
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">KUTILMOQDA</span>
                          )}
                        </span>
                        
                        {isRefereeOrAdmin && !isEditing && (
                          <button
                            onClick={() => handleStartEdit(match)}
                            className="text-secondary hover:text-primary p-0.5"
                            title="Natijani tahrirlash"
                          >
                            <Edit2 size={10} />
                          </button>
                        )}
                      </div>

                      {/* EDIT PANEL */}
                      {isEditing ? (
                        <div className="p-4 space-y-3 bg-black/60">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-secondary font-bold truncate max-w-[80px]">
                              {match.team1?.name || "TBD"}
                            </span>
                            <input
                              type="number"
                              value={editForm.team1_score}
                              onChange={e => setEditForm({ ...editForm, team1_score: parseInt(e.target.value) || 0 })}
                              className="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-center text-xs"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-secondary font-bold truncate max-w-[80px]">
                              {match.team2?.name || "TBD"}
                            </span>
                            <input
                              type="number"
                              value={editForm.team2_score}
                              onChange={e => setEditForm({ ...editForm, team2_score: parseInt(e.target.value) || 0 })}
                              className="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-center text-xs"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] text-secondary uppercase font-bold">Holat</span>
                            <select
                              value={editForm.status}
                              onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                              className="bg-[#18181c] border border-white/10 rounded text-[10px] px-1 py-0.5 text-white focus:outline-none"
                            >
                              <option value="PENDING">Kutilmoqda</option>
                              <option value="LIVE">Jonli (Live)</option>
                              <option value="COMPLETED">Yakunlandi</option>
                            </select>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] text-secondary uppercase font-bold">G'olib</span>
                            <select
                              value={editForm.winner_id}
                              onChange={e => setEditForm({ ...editForm, winner_id: e.target.value })}
                              className="bg-[#18181c] border border-white/10 rounded text-[10px] px-1 py-0.5 text-white focus:outline-none w-24"
                            >
                              <option value="">Tanlanmagan</option>
                              {match.team1_id && <option value={match.team1_id}>{match.team1?.name}</option>}
                              {match.team2_id && <option value={match.team2_id}>{match.team2?.name}</option>}
                            </select>
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-white/5">
                            <button
                              onClick={() => setEditingMatchId(null)}
                              className="flex-1 py-1 rounded bg-white/5 text-[10px] font-bold hover:bg-white/10"
                            >
                              <X size={10} className="mx-auto" />
                            </button>
                            <button
                              onClick={() => handleSaveEdit(match.id)}
                              disabled={isSaving}
                              className="flex-1 py-1 rounded bg-primary text-[10px] font-bold hover:bg-primary-hover flex items-center justify-center"
                            >
                              {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* READ-ONLY MATCH CARD */
                        <>
                          {/* Team 1 */}
                          <div className={`flex items-center justify-between p-4 border-b border-white/5 ${
                            match.winner_id && match.winner_id === match.team1_id ? "bg-primary/5" : ""
                          }`}>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border bg-white/5 border-white/10 text-secondary">
                                {match.team1?.name?.substring(0, 2).toUpperCase() || "TB"}
                              </div>
                              <span className={`text-sm font-bold tracking-tight ${
                                match.winner_id && match.winner_id !== match.team1_id ? "text-secondary" : "text-white"
                              }`}>
                                {match.team1?.name || "TBD"}
                              </span>
                            </div>
                            <span className={`text-sm font-black ${
                              match.winner_id && match.winner_id === match.team1_id ? "text-primary" : "text-white"
                            }`}>
                              {match.status === "PENDING" ? "-" : match.team1_score}
                            </span>
                          </div>

                          {/* Team 2 */}
                          <div className={`flex items-center justify-between p-4 ${
                            match.winner_id && match.winner_id === match.team2_id ? "bg-primary/5" : ""
                          }`}>
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border bg-white/5 border-white/10 text-secondary">
                                {match.team2?.name?.substring(0, 2).toUpperCase() || "TB"}
                              </div>
                              <span className={`text-sm font-bold tracking-tight ${
                                match.winner_id && match.winner_id !== match.team2_id ? "text-secondary" : "text-white"
                              }`}>
                                {match.team2?.name || "TBD"}
                              </span>
                            </div>
                            <span className={`text-sm font-black ${
                              match.winner_id && match.winner_id === match.team2_id ? "text-primary" : "text-white"
                            }`}>
                              {match.status === "PENDING" ? "-" : match.team2_score}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Connector Lines */}
                    {roundIdx < roundNumbers.length - 1 && (
                      <>
                        <div className="absolute top-1/2 -right-16 w-16 h-px bg-gradient-to-r from-white/20 to-white/5" />
                        {matchIdx % 2 === 0 ? (
                          <div className="absolute top-1/2 -right-16 w-px h-12 bg-white/5 translate-y-0" />
                        ) : (
                          <div className="absolute top-1/2 -right-16 w-px h-12 bg-white/5 -translate-y-full" />
                        )}
                      </>
                    )}

                    {/* Champion Badge */}
                    {roundIdx === roundNumbers.length - 1 && match.winner_id && match.status === "COMPLETED" && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
                        <Trophy className="text-yellow-500 mb-1" size={24} />
                        <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">G'olib</span>
                      </div>
                    )}

                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
