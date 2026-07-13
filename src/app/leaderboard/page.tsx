"use client";

import React, { useState, useEffect, useMemo } from "react";
import Navbar from "../../components/Navbar";
import { Trophy, Crown, Medal, Search, Users } from "lucide-react";
import { motion } from "framer-motion";
import { BackButton } from "../../components/ui/BackButton";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/lib/store";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  elo: number | null;
  region: string | null;
  role: string | null;
}

type RankedProfile = Profile & { rank: number };

// Butun ilova bo'ylab qabul qilingan bazaviy ELO qiymati
const DEFAULT_ELO = 1000;
const eloOf = (p: Profile) => (typeof p.elo === "number" ? p.elo : DEFAULT_ELO);
const displayName = (p: Profile) => p.username || p.full_name || "O'yinchi";
const initials = (p: Profile) => displayName(p).substring(0, 2).toUpperCase();

// Podium (top-3) uchun oltin/kumush/bronza uslublari — o'lchangan, ortiqcha neon yo'q
const placeMeta: Record<
  number,
  { Icon: typeof Crown; badge: string; ring: string; text: string; glow: string; aura: string }
> = {
  1: {
    Icon: Crown,
    badge: "bg-amber-400 text-black shadow-[0_0_25px_-4px_rgba(251,191,36,0.7)]",
    ring: "border-amber-400/70",
    text: "text-amber-300",
    glow: "shadow-[0_0_60px_-20px_rgba(251,191,36,0.45)]",
    aura: "bg-amber-400/15",
  },
  2: {
    Icon: Medal,
    badge: "bg-slate-300 text-black",
    ring: "border-slate-300/60",
    text: "text-slate-200",
    glow: "shadow-card",
    aura: "bg-slate-300/10",
  },
  3: {
    Icon: Medal,
    badge: "bg-orange-500 text-black",
    ring: "border-orange-500/60",
    text: "text-orange-300",
    glow: "shadow-card",
    aura: "bg-orange-500/10",
  },
};

const LeaderboardPage = () => {
  const { t, locale } = useTranslation();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        setLoading(true);
        // Real profiles — ustunlar mavjud bo'lmasa xato bermasligi uchun select('*')
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .limit(500);

        if (error) throw error;

        const sorted = ((data as Profile[]) || [])
          .slice()
          .sort((a, b) => eloOf(b) - eloOf(a));
        setProfiles(sorted);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaders();
  }, []);

  const ranked: RankedProfile[] = useMemo(
    () => profiles.map((p, i) => ({ ...p, rank: i + 1 })),
    [profiles]
  );

  const topElo = ranked.length ? eloOf(ranked[0]) : DEFAULT_ELO;
  const searching = query.trim().length > 0;

  // Qidiruv faol bo'lsa — butun ro'yxatdan izlaymiz, aks holda podiumdan keyingilar
  const listRows: RankedProfile[] = useMemo(() => {
    if (!searching) return ranked.slice(3);
    const q = query.trim().toLowerCase();
    return ranked.filter(
      (p) =>
        (p.username || "").toLowerCase().includes(q) ||
        (p.full_name || "").toLowerCase().includes(q)
    );
  }, [ranked, query, searching]);

  const podium = [
    ranked[1] ? { player: ranked[1], place: 2, order: "order-2 md:order-1" } : null,
    ranked[0] ? { player: ranked[0], place: 1, order: "order-1 md:order-2" } : null,
    ranked[2] ? { player: ranked[2], place: 3, order: "order-3 md:order-3" } : null,
  ].filter(Boolean) as { player: RankedProfile; place: number; order: string }[];

  const heading =
    locale === "ru" ? (
      <>
        Рейтинг <span className="text-gradient">Сообщества</span>
      </>
    ) : locale === "en" ? (
      <>
        Community <span className="text-gradient">Ranking</span>
      </>
    ) : (
      <>
        Hamjamiyat <span className="text-gradient">Reytingi</span>
      </>
    );

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* Premium Header */}
      <section className="relative pt-36 pb-14 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,51,85,0.16),transparent_60%)]" />
        <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_85%_0%,rgba(139,92,246,0.12),transparent_55%)]" />

        <div className="container-app">
          <BackButton />

          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="chip mb-5 border-primary/25 bg-primary/10 text-primary"
            >
              <Trophy size={14} />
              <span className="font-display uppercase tracking-[0.2em] text-[11px]">
                {t("leaderboard_short", "Reyting")}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-4xl sm:text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-[1.05] uppercase"
            >
              {heading}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-secondary text-lg md:text-xl leading-relaxed"
            >
              {t("leaderboard_desc", "Eng yaxshi o'yinchilar ELO ballari bo'yicha")}
            </motion.p>
          </div>
        </div>
      </section>

      <div className="container-app pb-32">
        {loading ? (
          <>
            {/* Podium skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16 items-end max-w-5xl mx-auto">
              {[0, 1, 2].map((n) => (
                <div key={n} className="glass-card p-8 flex flex-col items-center">
                  <div className="skeleton w-11 h-11 rounded-full mb-4" />
                  <div className="skeleton w-20 h-20 rounded-full mb-4" />
                  <div className="skeleton h-5 w-28 mb-2" />
                  <div className="skeleton h-4 w-20" />
                </div>
              ))}
            </div>
            {/* Rows skeleton */}
            <div className="glass-card p-4 md:p-6 space-y-4">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex items-center gap-4">
                  <div className="skeleton w-8 h-8 rounded-lg" />
                  <div className="skeleton w-10 h-10 rounded-full" />
                  <div className="skeleton h-4 flex-1" />
                  <div className="skeleton h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
          </>
        ) : ranked.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card py-24 px-6 text-center flex flex-col items-center"
          >
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <div className="relative w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center animate-float">
                <Trophy size={40} className="text-primary" />
              </div>
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-black text-white mb-3 uppercase tracking-tight">
              {t("no_leaders", "Reyting hozircha bo'sh")}
            </h3>
            <p className="text-secondary max-w-md">
              {t("no_leaders_desc", "Birinchi o'yinchilar ro'yxatdan o'tgach reyting shakllanadi")}
            </p>
          </motion.div>
        ) : (
          <>
            {/* Top 3 Podium — faqat qidiruv faol bo'lmaganda */}
            {!searching && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16 items-end max-w-5xl mx-auto">
                {podium.map(({ player, place, order }, i) => {
                  const meta = placeMeta[place];
                  const isFirst = place === 1;
                  const Icon = meta.Icon;
                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className={`${order} glass-card relative text-center overflow-hidden ${meta.glow} ${
                        isFirst
                          ? "p-8 md:p-10 md:-translate-y-4 border-amber-400/30"
                          : "p-6 md:p-8 border-white/10"
                      }`}
                    >
                      <div
                        className={`absolute -top-16 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-3xl ${meta.aura}`}
                      />

                      {/* O'rin nishoni */}
                      <div
                        className={`relative mx-auto -mt-2 mb-4 flex items-center justify-center rounded-full font-display font-black ${meta.badge} ${
                          isFirst ? "w-14 h-14 text-2xl" : "w-11 h-11 text-lg"
                        }`}
                      >
                        {place}
                      </div>

                      {isFirst && (
                        <Crown className="absolute top-5 right-5 text-amber-300 animate-float" size={26} />
                      )}

                      {/* Avatar */}
                      <div
                        className={`relative mx-auto mb-4 rounded-full bg-white/5 overflow-hidden flex items-center justify-center font-display font-black border-2 ${meta.ring} ${
                          isFirst ? "w-24 h-24 text-3xl" : "w-20 h-20 text-2xl"
                        }`}
                      >
                        {player.avatar_url ? (
                          <img
                            src={player.avatar_url}
                            alt={displayName(player)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className={meta.text}>{initials(player)}</span>
                        )}
                      </div>

                      <h3
                        className={`font-display font-black tracking-tight truncate ${
                          isFirst ? "text-2xl" : "text-xl"
                        } mb-1`}
                        title={displayName(player)}
                      >
                        {displayName(player)}
                      </h3>

                      <div
                        className={`inline-flex items-center gap-1.5 font-display font-black mb-4 tabular-nums ${meta.text} ${
                          isFirst ? "text-lg" : "text-base"
                        }`}
                      >
                        <Icon size={isFirst ? 18 : 15} />
                        {eloOf(player).toLocaleString()} ELO
                      </div>

                      {player.region && (
                        <div className="flex justify-center">
                          <span className="chip !text-[11px]">{player.region}</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Full Ranked List */}
            <div className="glass-card overflow-hidden">
              {/* Toolbar — real qidiruv + real o'yinchilar soni */}
              <div className="p-5 md:p-6 border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
                <div className="relative w-full sm:w-72">
                  <Search
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none"
                  />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("search_player", "O'yinchini qidirish...")}
                    className="w-full bg-white/5 border border-white/10 rounded-full pl-11 pr-4 py-2.5 text-sm text-white placeholder:text-secondary focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-secondary uppercase tracking-widest font-bold">
                  <Users size={13} className="text-violet" />
                  <span className="tabular-nums">{ranked.length}</span>{" "}
                  {t("players_count_label", "o'yinchi")}
                </p>
              </div>

              {/* Ustun sarlavhalari (desktop) */}
              <div className="hidden md:grid grid-cols-[64px_1fr_1fr_120px] gap-4 px-6 py-4 border-b border-white/5 text-[10px] font-black text-secondary uppercase tracking-widest">
                <span>{t("rank", "O'rin")}</span>
                <span>{t("player", "O'yinchi")}</span>
                <span>{t("elo_strength", "ELO kuchi")}</span>
                <span className="text-right">ELO</span>
              </div>

              {listRows.length === 0 ? (
                <div className="py-16 px-6 text-center">
                  <p className="text-secondary">
                    {t("no_search_results", "Hech narsa topilmadi")}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {listRows.map((player, i) => {
                    const strength = Math.max(
                      6,
                      Math.round((eloOf(player) / (topElo || DEFAULT_ELO)) * 100)
                    );
                    return (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.4) }}
                        className="group grid grid-cols-[44px_1fr_auto] md:grid-cols-[64px_1fr_1fr_120px] items-center gap-4 px-4 md:px-6 py-4 transition-colors hover:bg-white/5"
                      >
                        {/* Rank */}
                        <span className="font-display font-black text-lg text-secondary group-hover:text-white transition-colors tabular-nums">
                          {player.rank}
                        </span>

                        {/* Player */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-white/5 overflow-hidden flex items-center justify-center font-display font-bold text-xs text-primary border border-white/10 shrink-0">
                            {player.avatar_url ? (
                              <img
                                src={player.avatar_url}
                                alt={displayName(player)}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              initials(player)
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="block font-bold truncate">{displayName(player)}</span>
                            {player.full_name && player.username && (
                              <span className="block text-[11px] text-secondary font-medium truncate">
                                {player.full_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* ELO kuch chizig'i (desktop) — real ma'lumotdan hisoblangan */}
                        <div className="hidden md:block">
                          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-brand-gradient h-full rounded-full transition-all"
                              style={{ width: `${strength}%` }}
                            />
                          </div>
                        </div>

                        {/* ELO */}
                        <span className="font-display font-black text-base md:text-lg text-right whitespace-nowrap tabular-nums">
                          {eloOf(player).toLocaleString()}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default LeaderboardPage;
