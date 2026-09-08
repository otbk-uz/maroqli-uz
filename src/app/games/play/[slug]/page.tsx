"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Maximize2, RotateCcw, Volume2, VolumeX, Gamepad2, Star, Sparkles, Monitor, Share2, PlayCircle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useTranslation, useAuthStore } from "@/lib/store";
import { Lock, LogIn, UserPlus, Trophy, Medal, Gift, Coins, CheckCircle, Send, Crown } from "lucide-react";

interface GameDetail {
  id: string | number;
  title: string;
  slug: string;
  description: string;
  platform: string;
  rating: number;
  cover: string | null;
  demo_url?: string | null;
}

interface ScoreRecord {
  id: string;
  user_id: string;
  score: number;
  created_at: string;
  profiles?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export default function GamePlayPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { t } = useTranslation();
  const { isAuthenticated, user, updateUser } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  const [game, setGame] = useState<GameDetail | null>(null);
  const [otherGames, setOtherGames] = useState<GameDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Daily reward state
  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
  const [claimingReward, setClaimingReward] = useState(false);
  const [rewardModal, setRewardModal] = useState<any | null>(null);

  // Scores & Leaderboard state
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [newScoreInput, setNewScoreInput] = useState("");
  const [submittingScore, setSubmittingScore] = useState(false);
  const [activeTab, setActiveTab] = useState<"about" | "leaderboard">("leaderboard");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!slug) return;

    const fetchGame = async () => {
      try {
        setLoading(true);
        // Fetch current game by slug
        const { data, error } = await supabase
          .from('developed_games')
          .select('*')
          .eq('slug', slug)
          .single();

        if (data) {
          setGame({
            id: data.id,
            title: data.title,
            slug: data.slug,
            description: data.description,
            platform: data.platform || 'WEB',
            rating: data.rating || 5.0,
            cover: data.cover || null,
            demo_url: data.demo_url || `/games-online/${data.slug}/index.html`
          });
        } else {
          // Fallback if DB doesn't have it yet, construct default from slug
          const formattedTitle = slug
            .split('-')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          
          setGame({
            id: slug,
            title: formattedTitle,
            slug: slug,
            description: `${formattedTitle} — onlayn brauzer o'yini. Platformamizda bepul o'ynang!`,
            platform: 'WEB',
            rating: 5.0,
            cover: `/games-online/${slug}/covers/${slug}.png`,
            demo_url: `/games-online/${slug}/index.html`
          });
        }

        // Fetch other web games for recommendation
        const { data: listData } = await supabase
          .from('developed_games')
          .select('*')
          .eq('platform', 'WEB')
          .neq('slug', slug)
          .limit(6);

        if (listData && listData.length > 0) {
          setOtherGames(listData.map((g: any) => ({
            id: g.id,
            title: g.title,
            slug: g.slug,
            description: g.description,
            platform: g.platform,
            rating: g.rating || 5.0,
            cover: g.cover,
            demo_url: g.demo_url || `/games-online/${g.slug}/index.html`
          })));
        }
        // Fetch scores for leaderboard
        try {
          const { data: scoreData } = await supabase
            .from('game_scores')
            .select('*, profiles:user_id(username, full_name, avatar_url)')
            .eq('game_slug', slug)
            .order('score', { ascending: false })
            .limit(10);

          if (scoreData) {
            setScores(scoreData as any);
            if (user?.id) {
              const myBest = scoreData.find((s: any) => s.user_id === user.id);
              if (myBest) setPersonalBest(myBest.score);
            }
          }
        } catch (scoreErr) {
          console.warn("Scores table read exception:", scoreErr);
        }
      } catch (err) {
        console.error("Game play page fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [slug, user?.id]);

  // Check Daily Reward Status
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const checkReward = async () => {
      const today = new Date().toISOString().split('T')[0];
      try {
        const { data } = await supabase
          .from('user_daily_rewards')
          .select('id')
          .eq('user_id', user.id)
          .eq('reward_date', today)
          .maybeSingle();

        if (data) {
          setDailyRewardClaimed(true);
        } else {
          // Check local storage fallback
          const claimedLocal = localStorage.getItem(`daily_reward_${user.id}_${today}`);
          if (claimedLocal) setDailyRewardClaimed(true);
        }
      } catch (err) {
        console.warn("Daily reward check warning:", err);
      }
    };

    checkReward();
  }, [isAuthenticated, user?.id]);

  // PostMessage listener for HTML5 games sending score events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'object') {
        if (event.data.type === 'GAME_SCORE_SUBMIT' || event.data.type === 'SUBMIT_SCORE') {
          const scoreVal = Number(event.data.score);
          if (!isNaN(scoreVal) && scoreVal > 0) {
            saveScoreToDB(scoreVal);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [slug, user?.id]);

  const saveScoreToDB = async (scoreNum: number) => {
    if (!user?.id || !slug || scoreNum <= 0) return;
    try {
      setSubmittingScore(true);
      const { data, error } = await supabase
        .from('game_scores')
        .insert({
          user_id: user.id,
          game_slug: slug,
          score: scoreNum
        })
        .select('*, profiles:user_id(username, full_name, avatar_url)')
        .single();

      if (!error && data) {
        setScores((prev) => {
          const updated = [...prev, data as any].sort((a, b) => b.score - a.score).slice(0, 10);
          return updated;
        });
        if (!personalBest || scoreNum > personalBest) {
          setPersonalBest(scoreNum);
        }
      }
    } catch (err) {
      console.warn("Save score warning:", err);
    } finally {
      setSubmittingScore(false);
    }
  };

  const handleClaimDailyReward = async () => {
    if (!user?.id || dailyRewardClaimed) return;

    setClaimingReward(true);
    const today = new Date().toISOString().split('T')[0];
    const rewardCoins = 50;

    try {
      // 1. Try DB Insert
      try {
        await supabase.from('user_daily_rewards').insert({
          user_id: user.id,
          reward_date: today,
          coins_earned: rewardCoins,
          streak_count: 1
        });
      } catch (dbErr) {
        console.warn("Daily reward DB insert fallback:", dbErr);
      }

      // 2. Update user coins in DB profile
      const newCoinsTotal = (user.coins || 0) + rewardCoins;
      try {
        await supabase
          .from('profiles')
          .update({ coins: newCoinsTotal })
          .eq('id', user.id);
      } catch (profErr) {
        console.warn("Profile coins update warning:", profErr);
      }

      // 3. Update local state & Zustand store
      localStorage.setItem(`daily_reward_${user.id}_${today}`, 'true');
      updateUser({ coins: newCoinsTotal });
      setDailyRewardClaimed(true);

      setRewardModal({
        coins: rewardCoins,
        total: newCoinsTotal
      });
    } catch (err) {
      console.error("Daily reward claim error:", err);
    } finally {
      setClaimingReward(false);
    }
  };

  const handleManualScoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scoreVal = parseInt(newScoreInput.trim(), 10);
    if (isNaN(scoreVal) || scoreVal <= 0) {
      alert("Iltimos, to'g'ri musbat ball kiriting!");
      return;
    }
    saveScoreToDB(scoreVal);
    setNewScoreInput("");
  };

  const handleFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      } else if ((iframeRef.current as any).webkitRequestFullscreen) {
        (iframeRef.current as any).webkitRequestFullscreen();
      } else if ((iframeRef.current as any).msRequestFullscreen) {
        (iframeRef.current as any).msRequestFullscreen();
      }
    }
  };

  const handleReload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const gameUrl = game?.demo_url || `/games-online/${slug}/index.html`;

  if (mounted && !isAuthenticated) {
    return (
      <main className="min-h-screen bg-background relative flex flex-col justify-center items-center p-4">
        <Navbar />
        <div className="max-w-md w-full glass-card p-8 text-center space-y-6 border-rose-500/30 bg-gradient-to-b from-rose-500/10 via-background to-background relative overflow-hidden shadow-2xl mt-16">
          <div className="w-20 h-20 bg-rose-500/20 border border-rose-500/40 rounded-3xl flex items-center justify-center mx-auto text-rose-500 shadow-glow-rose">
            <Lock size={38} />
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-2xl font-black text-white uppercase tracking-tight">
              Ro'yxatdan O'tish Majburiy!
            </h2>
            <p className="text-secondary text-xs leading-relaxed">
              Ushbu onlayn brauzer o'yinini o'ynash uchun Maroqli.uz platformasiga kirishingiz yoki ro'yxatdan o'tishingiz shart.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              href={`/login?redirect=/games/play/${slug}`}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-glow"
            >
              <LogIn size={16} />
              <span>Tizimga Kirish</span>
            </Link>
            <Link
              href={`/register?redirect=/games/play/${slug}`}
              className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all border border-white/10 flex items-center justify-center gap-2"
            >
              <UserPlus size={16} />
              <span>Ro'yxatdan O'tish</span>
            </Link>
          </div>

          <button
            onClick={() => router.push("/games")}
            className="text-xs text-secondary hover:text-white transition-colors underline pt-2 block mx-auto"
          >
            O'yinlar do'koniga qaytish
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <Navbar />

      <div className="container-app pt-24 pb-16 relative z-10 flex-1 flex flex-col max-w-6xl mx-auto">
        {/* Header navigation bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="group text-secondary hover:text-white flex items-center space-x-2 text-xs font-bold transition-colors bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-full border border-white/10"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>{t("back", "Orqaga")}</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Sparkles size={14} />
              <span>ONLAYN BROWSER GAME</span>
            </span>
            {game && (
              <div className="bg-black/60 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs text-white">
                <Star size={13} className="text-warning fill-warning" />
                <span className="font-bold">{Number(game.rating).toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Daily Play Coin Reward Banner */}
        <div className="mb-6">
          {!dailyRewardClaimed ? (
            <div className="glass-card p-4 md:p-5 border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_25px_rgba(245,158,11,0.15)] animate-pulse">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 text-xl shadow-glow-amber">
                  🎁
                </div>
                <div>
                  <h4 className="font-display font-black text-sm md:text-base text-amber-300 uppercase tracking-tight flex items-center gap-2">
                    <span>Kunlik O'yin Mukofoti!</span>
                    <span className="bg-amber-500/30 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/40">
                      +50 🪙
                    </span>
                  </h4>
                  <p className="text-xs text-amber-200/80 mt-0.5">
                    Kuniga bir marta o'yin o'ynaganingiz uchun +50 Maroqli Tangalari beriladi!
                  </p>
                </div>
              </div>

              <button
                onClick={handleClaimDailyReward}
                disabled={claimingReward}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-display font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 shrink-0"
              >
                {claimingReward ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Coins size={16} />
                    <span>TANGALARNI OLISH (+50 🪙)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="glass-card px-4 py-3 border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between text-xs text-emerald-400">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle size={16} />
                <span>Bugungi kunlik mukofot olindi! (+50 Maroqli Tangasi 🪙)</span>
              </div>
              <span className="text-[10px] text-emerald-400/70 font-mono uppercase tracking-widest hidden sm:inline">
                Ertaga yana kiring!
              </span>
            </div>
          )}
        </div>

        {/* Game Title Bar */}
        <div className="glass-card p-4 md:p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-violet/30 bg-gradient-to-r from-violet/10 via-white/[0.02] to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet/20 border border-violet/30 flex items-center justify-center text-violet shrink-0 shadow-glow-violet">
              <Gamepad2 size={26} />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                {game?.title || slug}
              </h1>
              <p className="text-xs text-secondary mt-0.5 flex items-center gap-2">
                <span>Maroqli.uz Platformasining Rasmiy O'yini</span>
                <span>•</span>
                <span className="text-success font-semibold flex items-center gap-1">
                  <ShieldCheck size={12} /> Bepul o'ynash
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReload}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 transition-all flex items-center gap-1.5"
              title="Qayta yuklash"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Qayta yuklash</span>
            </button>
            <button
              onClick={handleFullscreen}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-glow"
              title="To'liq ekran"
            >
              <Maximize2 size={14} />
              <span>To'liq Ekran</span>
            </button>
          </div>
        </div>

        {/* Game Iframe Canvas Container */}
        <div className="relative w-full aspect-[16/10] min-h-[500px] md:min-h-[620px] rounded-3xl overflow-hidden bg-black/90 border border-white/15 shadow-2xl flex flex-col justify-center items-center group">
          {loading && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-20 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 border-3 border-violet border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-white/80 font-bold uppercase tracking-widest animate-pulse">
                O'yin yuklanmoqda...
              </p>
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={gameUrl}
            title={game?.title || "Online Game"}
            className="w-full h-full border-0 rounded-3xl"
            allow="autoplay; fullscreen; keyboard; gamepad; microphone"
            allowFullScreen
          />
        </div>

        {/* Description, Leaderboards & Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Navigation Tabs */}
            <div className="flex items-center gap-3 glass-card p-2 border-white/10">
              <button
                onClick={() => setActiveTab("leaderboard")}
                className={`flex-1 py-3 rounded-xl font-display text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeTab === "leaderboard"
                    ? "bg-primary text-white shadow-glow"
                    : "text-secondary hover:text-white hover:bg-white/5"
                }`}
              >
                <Trophy size={16} />
                <span>🏆 Rekordlar va Natijalar</span>
              </button>
              <button
                onClick={() => setActiveTab("about")}
                className={`flex-1 py-3 rounded-xl font-display text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeTab === "about"
                    ? "bg-primary text-white shadow-glow"
                    : "text-secondary hover:text-white hover:bg-white/5"
                }`}
              >
                <PlayCircle size={16} />
                <span>🎮 O'yin Haqida</span>
              </button>
            </div>

            {activeTab === "leaderboard" ? (
              <div className="space-y-6">
                {/* Leaderboard Table Card */}
                <div className="glass-card p-6 md:p-8 space-y-6 border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-white/[0.01] to-transparent">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <h3 className="font-display text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <Trophy size={20} className="text-amber-400" />
                        <span>Eng Yuqori Natijalar (Top 10)</span>
                      </h3>
                      <p className="text-xs text-secondary mt-0.5">Ushbu o'yindagi eng kuchli o'yinchilar reytingi</p>
                    </div>

                    {personalBest !== null && (
                      <div className="bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 rounded-xl flex items-center gap-2 text-amber-300 text-xs font-bold shrink-0">
                        <Crown size={15} className="text-amber-400" />
                        <span>Shaxsiy Rekord: <strong className="text-white text-sm">{personalBest.toLocaleString()}</strong> ball</span>
                      </div>
                    )}
                  </div>

                  {scores.length === 0 ? (
                    <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                      <Trophy size={36} className="text-white/20 mx-auto mb-2" />
                      <p className="text-white font-bold text-sm">Hali hech kim rekord o'rnatmadi</p>
                      <p className="text-secondary text-xs">Birinchi bo'lib natijangizni saqlang va peshqadamga aylaning!</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {scores.map((sc, idx) => {
                        const isTop1 = idx === 0;
                        const isTop2 = idx === 1;
                        const isTop3 = idx === 2;
                        const rankBadge = isTop1
                          ? "bg-amber-400 text-black font-black"
                          : isTop2
                          ? "bg-slate-300 text-black font-black"
                          : isTop3
                          ? "bg-orange-500 text-black font-black"
                          : "bg-white/10 text-white font-bold";

                        return (
                          <div
                            key={sc.id || idx}
                            className={`flex items-center justify-between p-3 md:p-4 rounded-2xl border transition-all ${
                              isTop1
                                ? "bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                                : "bg-white/5 border-white/5 hover:border-white/15"
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs tabular-nums shrink-0 ${rankBadge}`}>
                                {idx + 1}
                              </span>
                              <div className="w-9 h-9 rounded-xl bg-violet/20 overflow-hidden flex items-center justify-center font-bold text-xs text-white shrink-0">
                                {sc.profiles?.avatar_url ? (
                                  <img src={sc.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  (sc.profiles?.username || "U")[0].toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-bold text-xs md:text-sm text-white truncate">
                                  {sc.profiles?.username || sc.profiles?.full_name || "O'yinchi"}
                                </h5>
                                <p className="text-[10px] text-secondary">
                                  {new Date(sc.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <div className="font-display font-black text-sm md:text-base text-amber-300 tabular-nums bg-black/40 px-3.5 py-1.5 rounded-xl border border-white/5">
                              {Number(sc.score).toLocaleString()} <span className="text-[10px] text-secondary font-normal">ball</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Manual Score Submission Card */}
                  <form onSubmit={handleManualScoreSubmit} className="pt-4 border-t border-white/10 space-y-3">
                    <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                      <Send size={14} className="text-primary" />
                      <span>Natijangizni Saqlash</span>
                    </h4>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="O'yinda to'plagan ballingiz (masalan: 1500)"
                        value={newScoreInput}
                        onChange={(e) => setNewScoreInput(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 text-xs text-white"
                      />
                      <button
                        type="submit"
                        disabled={submittingScore || !newScoreInput.trim()}
                        className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {submittingScore ? "Saqlanmoqda..." : "Saqlash"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="glass-card p-6 md:p-8 space-y-4">
                <h3 className="font-display text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <PlayCircle size={18} className="text-violet" />
                  <span>O'yin haqida va Boshqaruv</span>
                </h3>
                <p className="text-secondary text-sm leading-relaxed whitespace-pre-line">
                  {game?.description || "Ushbu HTML5 o'yini kompyuter va smartfon brauzerida osongina o'ynaladi. Sichqoncha yoki sensorli ekran orqali boshqarishingiz mumkin."}
                </p>

                <div className="border-t border-white/10 pt-4 mt-4 flex flex-wrap gap-4 text-xs text-secondary">
                  <div className="bg-white/5 px-3 py-2 rounded-xl border border-white/5 flex items-center gap-2">
                    <Monitor size={14} className="text-primary" />
                    <span>Qurilma: Brauzer (PC & Mobile)</span>
                  </div>
                  <div className="bg-white/5 px-3 py-2 rounded-xl border border-white/5 flex items-center gap-2">
                    <Gamepad2 size={14} className="text-violet" />
                    <span>Boshqaruv: Sichqoncha / Klaviatura / Sensor</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Related Games Sidebar */}
          <div className="glass-card p-6 space-y-4 h-fit">
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <span>Boshqa Onlayn O'yinlar</span>
            </h3>

            <div className="space-y-3">
              {otherGames.slice(0, 4).map((og) => (
                <Link
                  key={og.slug}
                  href={`/games/play/${og.slug}`}
                  className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-violet/40 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-violet/20 overflow-hidden shrink-0 relative flex items-center justify-center">
                    {og.cover ? (
                      <img src={og.cover} alt={og.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    ) : (
                      <Gamepad2 size={20} className="text-violet" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white group-hover:text-violet transition-colors truncate">
                      {og.title}
                    </h4>
                    <p className="text-[10px] text-secondary flex items-center gap-1 mt-0.5">
                      <Star size={10} className="text-warning fill-warning" />
                      <span>{Number(og.rating).toFixed(1)}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">Bepul</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Celebratory Daily Reward Claim Modal */}
      {rewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setRewardModal(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-card relative z-10 w-full max-w-sm p-8 text-center space-y-5 border-amber-500/40 bg-gradient-to-b from-amber-500/20 via-background to-background shadow-[0_0_50px_rgba(245,158,11,0.25)]"
          >
            <div className="w-20 h-20 bg-amber-500/20 border border-amber-500/40 rounded-3xl flex items-center justify-center mx-auto text-4xl shadow-glow-amber animate-bounce">
              🪙
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-2xl font-black text-white uppercase tracking-tight">
                Muborak Bo'lsin! 🎉
              </h3>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                Bugungi o'yin bonusi tariqasida <strong className="text-amber-300 text-sm">+{rewardModal.coins} Maroqli Tangalari</strong> hisobingizga qo'shildi!
              </p>
            </div>

            <div className="bg-black/50 border border-amber-500/30 p-3.5 rounded-2xl flex items-center justify-between text-xs text-amber-300">
              <span>Umumiy balansingiz:</span>
              <strong className="font-display font-black text-sm text-white">{rewardModal.total.toLocaleString()} 🪙</strong>
            </div>

            <button
              onClick={() => setRewardModal(null)}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black rounded-xl text-xs uppercase tracking-wider shadow-glow-amber transition-all active:scale-95"
            >
              Rahmat!
            </button>
          </motion.div>
        </div>
      )}
    </main>
  );
}
