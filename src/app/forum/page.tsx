"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { MessageSquare, Pin, Lock, User, Calendar, MessageCircle, PlusCircle, Search, ThumbsUp, X, Send, LifeBuoy, Flame, Trophy, Users, Gamepad2, Hash, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore, useTranslation } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { BackButton } from "@/components/ui/BackButton";
import { GlobalChat } from "@/components/forum/GlobalChat";

interface Section {
  id: number;
  name: string;
  description: string;
  topics_count: number;
}

interface Topic {
  id: number;
  section: number;
  section_name: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  author_details: {
    username: string;
    full_name: string;
    role: string;
    avatar?: string;
  };
  replies_count: number;
  likes_count: number;
  dislikes_count: number;
  user_reaction?: "like" | "dislike" | null;
  created_at: string;
}

const SECTION_ICONS = [MessageSquare, Flame, Trophy, Users, Gamepad2, Hash];

const ForumPage = () => {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const [sections, setSections] = useState<Section[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"topics" | "chat">("topics");

  // Support Request form states
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportForm, setSupportForm] = useState({
    name: "",
    contactInfo: "",
    message: ""
  });
  const [submittingSupport, setSubmittingSupport] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setSupportForm({
        name: user.full_name || user.username || "",
        contactInfo: user.email || `@${user.username}` || "",
        message: ""
      });
    }
  }, [user, showSupportModal]);

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportForm.name.trim() || !supportForm.contactInfo.trim() || !supportForm.message.trim()) {
      alert(t("fill_name_username", "Iltimos, barcha maydonlarni to'ldiring!"));
      return;
    }

    setSubmittingSupport(true);
    try {
      const { error } = await supabase
        .from("support_requests")
        .insert({
          user_id: user?.id || null,
          name: supportForm.name,
          contact_info: supportForm.contactInfo,
          message: supportForm.message
        });

      if (error) throw error;

      setSupportSuccess(true);
      setSupportForm((prev) => ({ ...prev, message: "" }));
    } catch (err: any) {
      console.error("Support request insert error:", err);
      alert(err.message || t("stream_settings_error", "Xatolik yuz berdi. Iltimos qayta urinib ko'ring."));
    } finally {
      setSubmittingSupport(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const { data, error } = await supabase.from('forum_sections').select('*');
        if (error) throw error;
        if (data) setSections(data);
      } catch (err) {
        console.error("Forum sections fetch error:", err);
      }
    };
    fetchSections();
  }, []);

  useEffect(() => {
    const fetchTopics = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('forum_topics')
          .select(`
            *,
            forum_sections(name),
            profiles:author_id(username, full_name, role, avatar_url)
          `)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false });

        if (selectedSection !== null) {
          query = query.eq('section_id', selectedSection);
        }
        if (debouncedSearch) {
          query = query.ilike('title', `%${debouncedSearch}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data) {
          const formattedTopics = data.map((t: any) => ({
            id: t.id,
            section: t.section_id,
            section_name: t.forum_sections?.name || 'Unknown',
            title: t.title,
            content: t.content,
            is_pinned: t.is_pinned,
            is_locked: t.is_locked,
            author_details: {
              username: t.profiles?.username || 'Foydalanuvchi',
              full_name: t.profiles?.full_name || '',
              role: t.profiles?.role || 'GAMER',
              avatar: t.profiles?.avatar_url
            },
            replies_count: t.replies_count,
            likes_count: t.likes_count,
            dislikes_count: t.dislikes_count,
            created_at: t.created_at
          }));
          setTopics(formattedTopics);
        }
      } catch (err) {
        console.error("Forum topics fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, [selectedSection, debouncedSearch]);

  const handleReact = async (topicId: number, isLike: boolean) => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    // Hozircha like bosish faqat UI da o'zgaradi (baza uchun keyin reaction jadvali qoshamiz)
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id === topicId) {
          return {
            ...t,
            likes_count: isLike ? t.likes_count + 1 : t.likes_count,
            user_reaction: isLike ? "like" : "dislike",
          };
        }
        return t;
      })
    );
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />

      {/* Premium Header */}
      <section className="relative pt-36 pb-10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,51,85,0.16),transparent_60%)]" />
        <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_85%_0%,rgba(139,92,246,0.12),transparent_55%)]" />

        <div className="container-app">
          <BackButton />

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mt-2">
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="chip mb-5 border-primary/25 bg-primary/10 text-primary"
              >
                <MessageSquare size={14} />
                <span className="font-display uppercase tracking-[0.2em] text-[11px]">
                  {t("forum_short", "Hamjamiyat")}
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4 tracking-tight leading-[1.05] uppercase"
              >
                {locale === "ru" ? (
                  <>Игровой <span className="text-gradient">Форум</span></>
                ) : locale === "en" ? (
                  <>Gaming <span className="text-gradient">Forum</span></>
                ) : (
                  <>Gaming <span className="text-gradient">Forum</span></>
                )}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-secondary text-base md:text-lg leading-relaxed"
              >
                {t("forum_desc", "Gaming hamjamiyati bilan suhbatlashish, savol-javob va jonli chat bo'limi")}
              </motion.p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden md:flex bg-white/5 p-1 rounded-2xl border border-white/10">
                <button
                  onClick={() => setActiveTab("topics")}
                  className={`py-2.5 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === "topics" ? "bg-primary text-white shadow-glow" : "text-secondary hover:text-white"
                  }`}
                >
                  {t("topics_tab", "Mavzular")}
                </button>
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`py-2.5 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                    activeTab === "chat" ? "bg-primary text-white shadow-glow" : "text-secondary hover:text-white"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  {t("open_chat_tab", "Ochiq Chat")}
                </button>
              </div>

              <button
                onClick={() => {
                  setShowSupportModal(true);
                  setSupportSuccess(false);
                }}
                className="btn-outline !py-3 !px-5 text-xs uppercase tracking-wider gap-2 hidden md:inline-flex"
              >
                <LifeBuoy size={16} />
                {t("contact_admin_btn", "Adminga Murojaat")}
              </button>

              {isAuthenticated && activeTab === "topics" && (
                <Link href="/forum/new-topic" className="btn-primary !py-3 !px-6 text-xs uppercase tracking-wider gap-2">
                  <PlusCircle size={16} />
                  <span>{t("new_topic_btn", "Yangi mavzu")}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container-app pb-24 relative z-10">
        {/* Search + Mobile tabs */}
        <div className="flex flex-col gap-4 mb-8">
          {activeTab === "topics" && (
            <div className="relative w-full md:max-w-md">
              <input
                type="text"
                placeholder={t("search_topics_placeholder", "Mavzularni qidirish...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 outline-none focus:border-primary/50 text-sm text-white transition-colors"
              />
              <Search className="absolute left-4 top-4 text-secondary" size={16} />
            </div>
          )}

          {/* Mobile Tabs */}
          <div className="flex md:hidden bg-white/5 p-1 rounded-2xl border border-white/10 w-full">
            <button
              onClick={() => setActiveTab("topics")}
              className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === "topics" ? "bg-primary text-white" : "text-secondary"
              }`}
            >
              {t("topics_tab", "Mavzular")}
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeTab === "chat" ? "bg-primary text-white" : "text-secondary"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              {t("open_chat_tab", "Ochiq Chat")}
            </button>
          </div>

          <button
            onClick={() => {
              setShowSupportModal(true);
              setSupportSuccess(false);
            }}
            className="btn-outline !py-3 text-xs uppercase tracking-wider gap-2 md:hidden w-full"
          >
            <LifeBuoy size={16} />
            {t("contact_admin_btn", "Adminga Murojaat")}
          </button>
        </div>

        {activeTab === "topics" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sections Sidebar */}
            <div className="lg:col-span-3 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-secondary uppercase tracking-widest ml-1 mb-3">
                <Layers size={14} />
                {t("sections_header", "Bo'limlar")}
              </div>
              <button
                onClick={() => setSelectedSection(null)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3 ${
                  selectedSection === null
                    ? "bg-primary/10 border-primary/50 text-white shadow-glow"
                    : "glass-card border-white/5 text-secondary hover:border-white/15 hover:text-white"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${selectedSection === null ? "bg-primary text-white" : "bg-white/5 text-secondary"}`}>
                  <MessageSquare size={16} />
                </div>
                <span className="font-bold text-sm">{t("all_sections_btn", "Barcha bo'limlar")}</span>
              </button>

              {sections.map((section, idx) => {
                const Icon = SECTION_ICONS[idx % SECTION_ICONS.length];
                const active = selectedSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                      active
                        ? "bg-primary/10 border-primary/50 text-white shadow-glow"
                        : "glass-card border-white/5 text-secondary hover:border-white/15 hover:text-white"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-primary text-white" : "bg-white/5 text-secondary"}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center w-full gap-2">
                        <span className="font-bold text-sm truncate">{section.name}</span>
                        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full border border-white/10 shrink-0">
                          {section.topics_count ?? 0}
                        </span>
                      </div>
                      {section.description && (
                        <p className="text-[10px] opacity-75 line-clamp-1 text-left mt-1">{section.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Topics Feed */}
            <div className="lg:col-span-9 space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="skeleton h-28 rounded-3xl" />
                  ))}
                </div>
              ) : topics.length === 0 ? (
                <div className="glass-card py-20 px-6 text-center flex flex-col items-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                    <div className="relative w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center animate-float">
                      <MessageSquare size={34} className="text-primary" />
                    </div>
                  </div>
                  <h3 className="font-display text-xl md:text-2xl font-black text-white mb-2 uppercase tracking-tight">
                    Hech qanday mavzu topilmadi
                  </h3>
                  <p className="text-secondary text-sm max-w-sm">
                    Bu bo'limda hali mavzular yo'q. Birinchi bo'lib yangi mavzu oching!
                  </p>
                  {isAuthenticated && (
                    <Link href="/forum/new-topic" className="btn-primary mt-6 !py-2.5 !px-6 text-xs uppercase tracking-wider gap-2">
                      <PlusCircle size={14} /> Yangi mavzu
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {topics.map((t) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        key={t.id}
                        className="card-interactive p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5"
                      >
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          {/* Author avatar */}
                          <div className="w-11 h-11 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            {t.author_details.avatar ? (
                              <img src={t.author_details.avatar} alt={t.author_details.username} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-display font-bold text-sm text-secondary uppercase">
                                {t.author_details.username?.substring(0, 2) || "US"}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-[10px]">
                              <span className="bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-full font-bold">
                                {t.section_name}
                              </span>
                              {t.is_pinned && (
                                <span className="bg-warning/10 border border-warning/20 text-warning p-1 rounded-md flex items-center" title="Mahkamlangan">
                                  <Pin size={10} className="stroke-[3]" />
                                </span>
                              )}
                              {t.is_locked && (
                                <span className="bg-primary/10 border border-primary/20 text-primary p-1 rounded-md flex items-center" title="Yopilgan">
                                  <Lock size={10} className="stroke-[3]" />
                                </span>
                              )}
                            </div>

                            <Link href={`/forum/topic/${t.id}`} className="block">
                              <h3 className="text-base md:text-lg font-bold text-white hover:text-primary transition-colors cursor-pointer leading-snug">
                                {t.title}
                              </h3>
                            </Link>

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-secondary">
                              <span className="flex items-center gap-1">
                                <User size={11} />
                                @{t.author_details.username}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar size={11} />
                                {new Date(t.created_at).toLocaleDateString("uz-UZ")}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Stats & Actions */}
                        <div className="flex items-center gap-5 shrink-0 md:pl-6 md:border-l border-white/5">
                          <div className="flex flex-col items-center text-secondary">
                            <MessageCircle size={16} />
                            <span className="text-xs font-bold mt-1">{t.replies_count ?? 0}</span>
                            <span className="text-[9px] uppercase tracking-wider opacity-60">Javob</span>
                          </div>

                          <button
                            onClick={() => handleReact(t.id, true)}
                            className={`flex flex-col items-center transition-colors ${
                              t.user_reaction === "like" ? "text-primary" : "text-secondary hover:text-white"
                            }`}
                          >
                            <ThumbsUp size={16} className={t.user_reaction === "like" ? "fill-primary/20" : ""} />
                            <span className="text-xs font-bold mt-1">{t.likes_count ?? 0}</span>
                            <span className="text-[9px] uppercase tracking-wider opacity-60">Like</span>
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Ochiq Chat Tab */
          <div className="w-full max-w-5xl mx-auto">
            <GlobalChat />
          </div>
        )}
      </div>

      {/* Adminga Murojaat Modal */}
      <AnimatePresence>
        {showSupportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setShowSupportModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card relative z-10 w-full max-w-md p-6 md:p-8 overflow-hidden shadow-2xl text-white"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowSupportModal(false)}
                className="absolute top-4 right-4 text-secondary hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all"
              >
                <X size={18} />
              </button>

              <div className="mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4">
                  <LifeBuoy size={22} />
                </div>
                <h3 className="font-display text-2xl font-black tracking-tight mb-2">Adminga Murojaat</h3>
                <p className="text-secondary text-xs">Muammo yoki takliflaringizni to'g'ridan-to'g'ri adminstratsiyaga yuboring.</p>
              </div>

              {supportSuccess ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-primary/20 border border-primary/40 rounded-full flex items-center justify-center mx-auto text-primary text-xl font-bold">
                    ✓
                  </div>
                  <h4 className="text-lg font-bold">Xabaringiz yuborildi!</h4>
                  <p className="text-secondary text-xs leading-relaxed">
                    Murojaatingiz adminlarimiz tomonidan tez orada ko'rib chiqiladi va siz kiritgan aloqa ma'lumotlari orqali javob qaytariladi.
                  </p>
                  <button
                    onClick={() => setShowSupportModal(false)}
                    className="btn-primary w-full mt-6 !py-3 text-sm"
                  >
                    Tushunarli
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Telegram Direct Option */}
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-xs text-white">Telegram orqali tezkor aloqa</h4>
                      <p className="text-[10px] text-secondary">24/7 rejimida admin bilan bog'lanish</p>
                    </div>
                    <a
                      href="https://t.me/maroqliku"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#229ED9] hover:bg-[#229ED9]/90 text-white font-bold text-xs rounded-xl transition-all whitespace-nowrap"
                    >
                      Telegram
                    </a>
                  </div>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-white/5"></div>
                    <span className="flex-shrink mx-4 text-[10px] text-secondary font-bold uppercase tracking-wider">yoki shaklni to'ldiring</span>
                    <div className="flex-grow border-t border-white/5"></div>
                  </div>

                  {/* Online Request Form */}
                  <form onSubmit={handleSupportSubmit} className="space-y-4">
                    <div>
                      <label className="text-[10px] text-secondary font-bold uppercase tracking-wider block mb-1.5 ml-1">Sizning ismingiz</label>
                      <input
                        type="text"
                        required
                        placeholder="Ismingizni kiriting"
                        value={supportForm.name}
                        onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 text-sm text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-secondary font-bold uppercase tracking-wider block mb-1.5 ml-1">Aloqa ma'lumoti (Email / Telegram)</label>
                      <input
                        type="text"
                        required
                        placeholder="@username yoki email"
                        value={supportForm.contactInfo}
                        onChange={(e) => setSupportForm({ ...supportForm, contactInfo: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 text-sm text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-secondary font-bold uppercase tracking-wider block mb-1.5 ml-1">Xabar matni</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Muammo yoki taklifingizni batafsil yozing..."
                        value={supportForm.message}
                        onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 text-sm text-white resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingSupport}
                      className="btn-primary w-full mt-2 !py-3 text-sm gap-2 disabled:opacity-50"
                    >
                      {submittingSupport ? "Yuborilmoqda..." : <><Send size={16} /> Yuborish</>}
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default ForumPage;
