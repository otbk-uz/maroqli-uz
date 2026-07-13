"use client";

import React, { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import { Search, Trophy, Users, Gamepad2, ArrowRight, Calendar, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuthStore, useTranslation } from "@/lib/store";

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
  const [formData, setFormData] = useState({
    title: "",
    game: "CS2",
    format: "5v5",
    prize_pool: "1000",
    max_teams: "16",
    start_date: "",
    description: "",
    is_premium: false
  });
  const [creating, setCreating] = useState(false);

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.start_date) {
      alert("Iltimos, sarlavha va boshlanish sanasini kiriting!");
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from("tournaments").insert({
        title: formData.title,
        game: formData.game,
        format: formData.format,
        prize_pool: formData.prize_pool + " $",
        max_teams: parseInt(formData.max_teams) || 16,
        start_date: new Date(formData.start_date).toISOString(),
        description: formData.description,
        is_premium: formData.is_premium,
        status: "UPCOMING"
      });

      if (error) throw error;
      
      alert("Turnir muvaffaqiyatli yaratildi!");
      setShowCreateModal(false);
      
      // Reset form
      setFormData({
        title: "",
        game: "CS2",
        format: "5v5",
        prize_pool: "1000",
        max_teams: "16",
        start_date: "",
        description: "",
        is_premium: false
      });

      window.location.reload();
    } catch (err: any) {
      console.error("Turnir yaratishda xatolik:", err);
      alert(err.message || "Xatolik yuz berdi.");
    } finally {
      setCreating(false);
    }
  };
  const { user } = useAuthStore();
  const isOrganizer = user?.role === "ADMIN" || user?.role === "ORGANIZER";

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

  return (
    <main className="min-h-screen bg-[#050506]">
      <Navbar />
      
      {/* Premium Header */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 to-transparent -z-10" />
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mb-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-2 text-primary font-bold text-xs uppercase tracking-widest mb-4"
            >
              <Trophy size={14} />
              <span>{t("tournaments_subtitle", "Raqobat boshlanmoqda")}</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter"
            >
              {locale === "ru" ? (
                <>
                  Профессиональные <br />
                  <span className="text-primary">Турниры</span>
                </>
              ) : locale === "en" ? (
                <>
                  Professional <br />
                  <span className="text-primary">Tournaments</span>
                </>
              ) : (
                <>
                  Professional <br />
                  <span className="text-primary">Turnirlar</span>
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

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-3xl">
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar p-1">
              {["ALL", "LIVE", "UPCOMING", "FINISHED"].map((statusOption) => (
                <button
                  key={statusOption}
                  onClick={() => setFilter(statusOption)}
                  className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    filter === statusOption 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-secondary hover:text-white hover:bg-white/5"
                  }`}
                >
                  {statusOption === "ALL" ? t("all", "Barchasi") : statusOption}
                </button>
              ))}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 lg:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={18} />
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("search_tournament", "Turnir qidirish...")}
                  className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 outline-none focus:border-primary/50 transition-all w-full text-sm font-medium text-white"
                />
              </div>
              {isOrganizer && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 transition-all whitespace-nowrap"
                >
                  + Turnir tashkil qilish
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
 
      {/* Tournament Grid */}
      <section className="pb-32">
        <div className="container mx-auto px-4 md:px-6">
          {loading ? (
            <div className="flex justify-center items-center py-40">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                  {tournaments.map((tItem, i) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                      key={tItem.id}
                      className="glass-card overflow-hidden group hover:border-primary/40 transition-all duration-500 flex flex-col h-full"
                    >
                      {/* Card Header with Image */}
                      <div className="aspect-[16/9] relative overflow-hidden bg-white/5">
                        <img 
                          src={getGameImage(tItem.game)} 
                          alt={tItem.title}
                          className="w-full h-full object-cover opacity-50 group-hover:scale-110 group-hover:opacity-70 transition-all duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050506] via-[#050506]/20 to-transparent" />
                        
                        <div className="absolute top-4 left-4 flex flex-wrap gap-2 max-w-[85%]">
                          {tItem.is_premium && (
                            <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-black px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-0.5">
                              <Crown size={10} className="fill-current" />
                              PREMIUM
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl ${
                            tItem.status === 'LIVE' || tItem.status === 'ONGOING' ? 'bg-primary' : tItem.status === 'UPCOMING' ? 'bg-blue-500' : 'bg-white/20'
                          }`}>
                            {tItem.status}
                          </span>
                          <span className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                            {tItem.game}
                          </span>
                        </div>

                        {tItem.status === 'LIVE' && (
                          <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-primary/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-primary/30">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">LIVE NOW</span>
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-8 flex-1 flex flex-col">
                        <h3 className="text-2xl font-black text-white mb-6 group-hover:text-primary transition-colors line-clamp-2 min-h-[4rem]">
                          {tItem.title}
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex items-center space-x-2 text-secondary mb-1">
                              <Trophy size={14} className="text-primary" />
                              <span className="text-[10px] font-black uppercase tracking-widest">{t("prize_label", "Sovrin")}</span>
                            </div>
                            <p className="text-xl font-black text-white">
                              {Number(tItem.prize_pool) > 0 ? `$${Number(tItem.prize_pool).toLocaleString()}` : t("free", "Bepul")}
                            </p>
                          </div>
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex items-center space-x-2 text-secondary mb-1">
                              <Users size={14} className="text-primary" />
                              <span className="text-[10px] font-black uppercase tracking-widest">{t("teams_label", "Jamoalar")}</span>
                            </div>
                            <p className="text-xl font-black text-white">{tItem.participant_count || 0}/{tItem.max_teams}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 text-secondary text-xs font-bold mb-8 bg-white/5 p-3 rounded-xl border border-white/5">
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
                            className="w-full py-4 bg-white/5 hover:bg-primary text-white font-black rounded-2xl transition-all duration-300 border border-white/10 hover:border-primary active:scale-95 flex items-center justify-center space-x-2"
                          >
                            {tItem.status === 'FINISHED' ? (
                              <>
                                <span>{t("view_results", "Natijalarni ko'rish")}</span>
                                <ArrowRight size={18} />
                              </>
                            ) : (
                              <>
                                <Gamepad2 size={18} />
                                <span>{t("more_details", "Batafsil ma'lumot")}</span>
                              </>
                            )}
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {tournaments.length === 0 && (
                <div className="py-40 text-center">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                    <Search size={32} className="text-secondary" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{t("no_tournaments_found", "Turnirlar topilmadi")}</h3>
                  <p className="text-secondary">{t("try_changing_filters", "Qidiruv so'rovini yoki filtrlarni o'zgartirib ko'ring")}</p>
                </div>
              )}
            </>
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
              <h2 className="text-2xl font-black mb-6 text-white">Yangi Turnir Tashkil Qilish</h2>
              
              <form onSubmit={handleCreateTournament} className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">Turnir Nomi</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    placeholder="Masalan: Maroqli Summer Cup"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">O'yin turi</label>
                    <select
                      value={formData.game}
                      onChange={(e) => setFormData({ ...formData, game: e.target.value })}
                      className="w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    >
                      <option value="CS2">Counter-Strike 2</option>
                      <option value="DOTA2">Dota 2</option>
                      <option value="PUBG">PUBG Mobile</option>
                      <option value="VALORANT">Valorant</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">Format</label>
                    <select
                      value={formData.format}
                      onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                      className="w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    >
                      <option value="5v5">5v5 (Jamoaviy)</option>
                      <option value="1v1">1v1 (Yakkalik)</option>
                      <option value="2v2">2v2</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">Mukofot jamg'armasi ($)</label>
                    <input
                      type="number"
                      required
                      value={formData.prize_pool}
                      onChange={(e) => setFormData({ ...formData, prize_pool: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      placeholder="1000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">Jamoalar soni (Max)</label>
                    <input
                      type="number"
                      required
                      value={formData.max_teams}
                      onChange={(e) => setFormData({ ...formData, max_teams: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      placeholder="16"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">Boshlanish sanasi</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">Qo'shimcha Ma'lumot / Qoidalar</label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    placeholder="Turnir qoidalari va batafsil ma'lumotlar..."
                  />
                </div>

                <div className="flex items-center space-x-2 bg-white/5 p-4 rounded-xl border border-white/5">
                  <input
                    type="checkbox"
                    id="is_premium_t"
                    checked={formData.is_premium}
                    onChange={(e) => setFormData({ ...formData, is_premium: e.target.checked })}
                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-[#FF4655] focus:ring-0 focus:ring-offset-0"
                  />
                  <label htmlFor="is_premium_t" className="text-xs font-bold text-secondary uppercase tracking-wider cursor-pointer select-none">
                    Faqat Premium (PRO) A'zolar uchun
                  </label>
                </div>

                <div className="flex gap-4 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 px-6 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    Bekor Qilish
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-3 px-6 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 flex items-center justify-center"
                  >
                    {creating ? "Yaratilmoqda..." : "E'lon Qilish"}
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
