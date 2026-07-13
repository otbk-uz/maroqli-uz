"use client";

import React, { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import { Search, Trophy, Users, Gamepad2, ArrowRight, Calendar, Crown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuthStore, useTranslation } from "@/lib/store";
import TournamentLiveBanner from "@/components/TournamentLiveBanner";

interface Tournament {
  id: string;
  title: string;
  description: string;
  game: string;
  status: string;
  prize_pool: string;
  max_teams: number;
  participant_count?: number;
  start_date: string;
  is_premium?: boolean;
}

const TournamentsPage = () => {
  const { t, locale } = useTranslation();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { user } = useAuthStore();
  const isOrganizer = user?.role === "ADMIN" || user?.role === "ORGANIZER";

  // Yangi turnir formasi
  const emptyForm = { title: "", game: "CS2", prize1: "", prize2: "", prize3: "", maxTeams: "16", startDate: "", description: "" };
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const uzs = (n: string) => (Number(n) || 0).toLocaleString("ru-RU");

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErr("");
    if (!form.title.trim()) { setCreateErr("Turnir nomini kiriting."); return; }
    const p1 = Number(form.prize1) || 0, p2 = Number(form.prize2) || 0, p3 = Number(form.prize3) || 0;
    const total = p1 + p2 + p3;
    setCreating(true);
    try {
      const prizeLine =
        `\n\n🏆 Mukofot jamg'armasi (${total.toLocaleString("ru-RU")} so'm):` +
        `\n🥇 1-o'rin: ${p1.toLocaleString("ru-RU")} so'm` +
        `\n🥈 2-o'rin: ${p2.toLocaleString("ru-RU")} so'm` +
        `\n🥉 3-o'rin: ${p3.toLocaleString("ru-RU")} so'm`;
      const { error } = await supabase.from("tournaments").insert({
        title: form.title.trim(),
        game: form.game,
        prize_pool: total,
        max_teams: Number(form.maxTeams) || 16,
        start_date: form.startDate || new Date().toISOString(),
        description: (form.description || "") + prizeLine,
        status: "UPCOMING",
      });
      if (error) { setCreateErr("Xatolik: " + error.message); return; }
      setShowCreateModal(false);
      setForm(emptyForm);
      window.location.reload();
    } catch {
      setCreateErr("Server bilan bog'lanishда xatolik.");
    } finally {
      setCreating(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true);
      try {
        let query = supabase.from("tournaments").select("*, tournament_participants(count)");

        if (filter !== "ALL") {
          query = query.eq("status", filter);
        }
        if (debouncedSearch) {
          query = query.ilike("title", `%${debouncedSearch}%`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        if (data) {
          const formatted = data.map((tItem: any) => ({
            ...tItem,
            participant_count: tItem.tournament_participants?.[0]?.count || 0
          }));
          setTournaments(formatted);
        }
      } catch (err) {
        console.error("Tournaments fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [filter, debouncedSearch]);

  const getGameImage = (gameName: string) => {
    const name = gameName.toLowerCase();
    if (name.includes("counter-strike") || name.includes("cs")) {
      return "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070";
    }
    if (name.includes("dota")) {
      return "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071";
    }
    if (name.includes("valorant")) {
      return "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?q=80&w=2070";
    }
    if (name.includes("pubg")) {
      return "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1947";
    }
    return "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=2070";
  };

  // Statusni Uzbekcha yorliq + ranglarga o'girish (faqat vizual)
  const getStatusMeta = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "LIVE" || s === "ONGOING") {
      return { label: t("status_live", "Faol"), pill: "bg-success/15 text-success border-success/30" };
    }
    if (s === "UPCOMING") {
      return { label: t("status_upcoming", "Kutilmoqda"), pill: "bg-violet/15 text-violet border-violet/30" };
    }
    return { label: t("status_finished", "Tugagan"), pill: "bg-white/10 text-secondary border-white/15" };
  };

  const filterTabs = [
    { value: "ALL", label: t("all", "Barchasi") },
    { value: "LIVE", label: t("status_live", "Faol") },
    { value: "UPCOMING", label: t("status_upcoming", "Kutilmoqda") },
    { value: "FINISHED", label: t("status_finished", "Tugagan") },
  ];

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* Premium Header */}
      <section className="relative pt-36 pb-14 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,51,85,0.16),transparent_60%)]" />
        <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_85%_0%,rgba(139,92,246,0.12),transparent_55%)]" />

        <div className="container-app">
          <div className="max-w-3xl mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="chip mb-5 border-primary/25 bg-primary/10 text-primary"
            >
              <Trophy size={14} />
              <span className="font-display uppercase tracking-[0.2em] text-[11px]">
                {t("tournaments_subtitle", "Raqobat boshlanmoqda")}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-4xl sm:text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-[1.05] uppercase"
            >
              {locale === "ru" ? (
                <>
                  Профессиональные <br />
                  <span className="text-gradient">Турниры</span>
                </>
              ) : locale === "en" ? (
                <>
                  Professional <br />
                  <span className="text-gradient">Tournaments</span>
                </>
              ) : (
                <>
                  Professional <br />
                  <span className="text-gradient">Turnirlar</span>
                </>
              )}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-secondary text-lg md:text-xl leading-relaxed"
            >
              {t("tournaments_desc", "O'z mahoratingizni ko'rsating, kuchli jamoalar bilan bellashing va O'zbekistonning eng yirik mukofot jamg'armalariga ega bo'ling.")}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 glass-card p-3 md:p-4"
          >
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar p-1">
              {filterTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`px-5 py-2.5 rounded-full font-display text-[11px] font-bold uppercase tracking-[0.15em] transition-all whitespace-nowrap ${
                    filter === tab.value
                      ? "bg-primary text-white shadow-glow"
                      : "text-secondary hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 lg:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={18} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("search_tournament", "Turnir qidirish...")}
                  className="bg-white/5 border border-white/10 rounded-full pl-12 pr-4 py-3 outline-none focus:border-primary/50 transition-all w-full text-sm font-medium text-white placeholder:text-secondary"
                />
              </div>
              {isOrganizer && (
                <>
                  <Link
                    href="/tournaments/live"
                    className="btn-gradient !py-3 !px-6 font-display uppercase tracking-widest text-xs whitespace-nowrap inline-flex items-center gap-2"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                    </span>
                    {t("live_broadcast", "Jonli efir")}
                  </Link>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary !py-3 !px-6 font-display uppercase tracking-widest text-xs whitespace-nowrap"
                  >
                    + {t("create_tournament", "Turnir tashkil qilish")}
                  </button>
                </>
              )}
            </div>
          </motion.div>

          {/* Count badge */}
          {!loading && tournaments.length > 0 && (
            <div className="mt-6 flex items-center gap-2 text-secondary">
              <Sparkles size={15} className="text-violet" />
              <span className="font-display text-xs font-bold uppercase tracking-[0.18em]">
                {tournaments.length} {t("tournaments_count_label", "ta turnir topildi")}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Jonli efir — KATTA, hamma ko'radi (faqat efir bo'lsa) */}
      <TournamentLiveBanner />

      {/* Tournament Grid */}
      <section className="pb-32">
        <div className="container-app">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="glass-card overflow-hidden flex flex-col h-full">
                  <div className="skeleton aspect-[16/9] rounded-none" />
                  <div className="p-8 space-y-6">
                    <div className="skeleton h-7 w-3/4" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="skeleton h-20" />
                      <div className="skeleton h-20" />
                    </div>
                    <div className="skeleton h-12 w-full" />
                    <div className="skeleton h-14 w-full rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : tournaments.length === 0 ? (
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
                {t("no_active_tournaments", "Hozircha faol turnirlar yo'q")}
              </h3>
              <p className="text-secondary max-w-md">
                {t("try_changing_filters", "Qidiruv so'rovini yoki filtrlarni o'zgartirib ko'ring")}
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                {tournaments.map((tItem, i) => {
                  const statusMeta = getStatusMeta(tItem.status);
                  const isLive = (tItem.status || "").toUpperCase() === "LIVE" || (tItem.status || "").toUpperCase() === "ONGOING";
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                      key={tItem.id}
                      className="card-interactive overflow-hidden group flex flex-col h-full hover:border-primary/40"
                    >
                      {/* Card Header with Image */}
                      <div className="aspect-[16/9] relative overflow-hidden bg-white/5">
                        <img
                          src={getGameImage(tItem.game)}
                          alt={tItem.title}
                          className="w-full h-full object-cover opacity-50 group-hover:scale-110 group-hover:opacity-70 transition-all duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

                        <div className="absolute top-4 left-4 flex flex-wrap gap-2 max-w-[85%]">
                          {tItem.is_premium && (
                            <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-black px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-1">
                              <Crown size={10} className="fill-current" />
                              Premium
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest backdrop-blur-md ${statusMeta.pill}`}>
                            {statusMeta.label}
                          </span>
                          <span className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white">
                            {tItem.game}
                          </span>
                        </div>

                        {isLive && (
                          <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-primary/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-primary/30">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                            </span>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Live now</span>
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-7 flex-1 flex flex-col">
                        <h3 className="font-display text-xl md:text-2xl font-black text-white mb-6 group-hover:text-primary transition-colors line-clamp-2 min-h-[3.5rem] tracking-tight">
                          {tItem.title}
                        </h3>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:border-primary/20 transition-colors">
                            <div className="flex items-center gap-2 text-secondary mb-1.5">
                              <Trophy size={14} className="text-primary" />
                              <span className="text-[10px] font-black uppercase tracking-widest">{t("prize_label", "Sovrin")}</span>
                            </div>
                            <p className="font-display text-xl font-black text-gradient">
                              {Number(tItem.prize_pool) > 0 ? `${Number(tItem.prize_pool).toLocaleString("ru-RU")} so'm` : t("free", "Bepul")}
                            </p>
                          </div>
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-2 text-secondary mb-1.5">
                              <Users size={14} className="text-violet" />
                              <span className="text-[10px] font-black uppercase tracking-widest">{t("teams_label", "Jamoalar")}</span>
                            </div>
                            <p className="font-display text-xl font-black text-white">{tItem.participant_count || 0}/{tItem.max_teams}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-secondary text-xs font-bold mb-6 bg-white/5 p-3 rounded-xl border border-white/5">
                          <Calendar size={14} className="text-primary" />
                          <span className="uppercase tracking-widest">
                            {new Date(tItem.start_date).toLocaleDateString(
                              locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ",
                              {
                                day: "numeric",
                                month: "long",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>

                        <div className="mt-auto">
                          <Link
                            href={`/tournaments/${tItem.id}`}
                            className="w-full py-3.5 bg-white/5 hover:bg-primary text-white font-display font-bold uppercase tracking-widest text-xs rounded-2xl transition-all duration-300 border border-white/10 hover:border-primary hover:shadow-glow active:scale-95 flex items-center justify-center gap-2"
                          >
                            {tItem.status === 'FINISHED' ? (
                              <>
                                <span>{t("view_results", "Natijalarni ko'rish")}</span>
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                              </>
                            ) : (
                              <>
                                <Gamepad2 size={16} />
                                <span>{t("more_details", "Batafsil ma'lumot")}</span>
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                              </>
                            )}
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      {/* Create Tournament Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card max-w-2xl w-full p-8 rounded-3xl border border-white/10 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="font-display text-2xl font-black mb-6 text-white uppercase tracking-tight">Yangi Turnir Tashkil Qilish</h2>

              <form className="space-y-6" onSubmit={handleCreateTournament}>
                {createErr && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{createErr}</div>
                )}
                <div>
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">Turnir Nomi</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors" placeholder="Masalan: Maroqli Summer Cup" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">O'yin turi</label>
                    <select value={form.game} onChange={(e) => setForm({ ...form, game: e.target.value })} className="w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors">
                      <option value="CS2">Counter-Strike 2</option>
                      <option value="DOTA2">Dota 2</option>
                      <option value="PUBG">PUBG Mobile</option>
                      <option value="VALORANT">Valorant</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">Jamoalar soni (Max)</label>
                    <input type="number" value={form.maxTeams} onChange={(e) => setForm({ ...form, maxTeams: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors" placeholder="16" />
                  </div>
                </div>

                {/* Mukofot jamg'armasi — so'mда, 1/2/3-o'rin */}
                <div>
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">Mukofot jamg'armasi (so'm)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {([
                      { key: "prize1", medal: "🥇", label: "1-o'rin" },
                      { key: "prize2", medal: "🥈", label: "2-o'rin" },
                      { key: "prize3", medal: "🥉", label: "3-o'rin" },
                    ] as const).map((pl) => (
                      <div key={pl.key}>
                        <div className="mb-1 text-[11px] font-semibold text-secondary">{pl.medal} {pl.label}</div>
                        <div className="relative">
                          <input
                            type="number"
                            value={form[pl.key]}
                            onChange={(e) => setForm({ ...form, [pl.key]: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-14 text-white tabular-nums focus:outline-none focus:border-primary transition-colors"
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary">so'm</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-secondary">
                    Jami: <span className="text-white font-semibold tabular-nums">{uzs(String((Number(form.prize1) || 0) + (Number(form.prize2) || 0) + (Number(form.prize3) || 0)))}</span> so'm
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">Boshlanish sanasi</label>
                  <input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors" />
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">Qo'shimcha Ma'lumot / Qoidalar</label>
                  <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors" placeholder="Turnir qoidalari va batafsil ma'lumotlar..."></textarea>
                </div>

                <div className="flex gap-4 pt-4 border-t border-white/10">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 px-6 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 transition-colors">
                    Bekor Qilish
                  </button>
                  <button type="submit" disabled={creating} className="flex-1 py-3 px-6 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50">
                    {creating ? "Saqlanmoqda..." : "E'lon Qilish"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default TournamentsPage;
