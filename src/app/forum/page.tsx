"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { MessageSquare, Pin, Lock, User, Calendar, MessageCircle, PlusCircle, Search, ThumbsUp, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore, useTranslation } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { BackButton } from "@/components/ui/BackButton";

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
      alert("Iltimos, barcha maydonlarni to'ldiring!");
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
      alert(err.message || "Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
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
      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20 relative z-10">
        <div className="mb-8 flex flex-wrap gap-4 items-center justify-between">
          <BackButton />
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowSupportModal(true);
                setSupportSuccess(false);
              }}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              Adminga Murojaat
            </button>

            {isAuthenticated && (
              <Link href="/forum/new-topic" className="btn-primary !py-3 !px-6 text-xs uppercase tracking-wider flex items-center space-x-2">
                <PlusCircle size={16} />
                <span>Yangi mavzu</span>
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Forum</h1>
            <p className="text-secondary text-sm mt-2">Gaming hamjamiyati bilan suhbatlashish bo'limi</p>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Mavzularni qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-primary/50 text-sm text-white transition-colors"
            />
            <Search className="absolute left-3 top-3.5 text-secondary" size={16} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sections Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            <div className="text-xs font-bold text-secondary uppercase tracking-widest ml-1 mb-2">Bo'limlar</div>
            <button
              onClick={() => setSelectedSection(null)}
              className={`w-full text-left p-4 rounded-2xl border transition-all flex justify-between items-center ${
                selectedSection === null
                  ? "bg-primary/10 border-primary text-white"
                  : "bg-white/5 border-white/5 text-secondary hover:border-white/10 hover:text-white"
              }`}
            >
              <span className="font-bold text-sm">Barcha bo'limlar</span>
            </button>

            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-1 ${
                  selectedSection === section.id
                    ? "bg-primary/10 border-primary text-white"
                    : "bg-white/5 border-white/5 text-secondary hover:border-white/10 hover:text-white"
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="font-bold text-sm">{section.name}</span>
                  <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                    {section.topics_count}
                  </span>
                </div>
                <p className="text-[10px] opacity-75 line-clamp-1 text-left">{section.description}</p>
              </button>
            ))}
          </div>

          {/* Topics Feed */}
          <div className="lg:col-span-9 space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="glass-card p-6 h-28 animate-pulse" />
                ))}
              </div>
            ) : topics.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5">
                <MessageSquare size={48} className="text-secondary mx-auto mb-4 opacity-50" />
                <p className="text-secondary text-sm">Hech qanday mavzu topilmadi.</p>
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
                      className="glass-card p-6 hover:border-white/15 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center space-x-2 text-[10px]">
                          <span className="bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-full font-bold">
                            {t.section_name}
                          </span>
                          {t.is_pinned && (
                            <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-1 rounded-md flex items-center">
                              <Pin size={10} className="stroke-[3]" />
                            </span>
                          )}
                          {t.is_locked && (
                            <span className="bg-red-500/10 border border-red-500/20 text-red-500 p-1 rounded-md flex items-center">
                              <Lock size={10} className="stroke-[3]" />
                            </span>
                          )}
                          <span className="text-secondary flex items-center">
                            <User size={10} className="mr-1" />
                            @{t.author_details.username}
                          </span>
                          <span className="text-secondary flex items-center">
                            <Calendar size={10} className="mr-1" />
                            {new Date(t.created_at).toLocaleDateString("uz-UZ")}
                          </span>
                        </div>

                        <Link href={`/forum/topic/${t.id}`} className="block">
                          <h3 className="text-lg font-bold text-white hover:text-primary transition-colors cursor-pointer">
                            {t.title}
                          </h3>
                        </Link>
                      </div>

                      {/* Stats & Actions */}
                      <div className="flex items-center space-x-6 shrink-0 bg-white/5 md:bg-transparent p-3 md:p-0 rounded-xl">
                        <div className="flex items-center space-x-1 text-secondary">
                          <MessageCircle size={16} />
                          <span className="text-xs font-bold">{t.replies_count}</span>
                        </div>

                        {/* Likes */}
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleReact(t.id, true)}
                            className={`flex items-center space-x-1.5 transition-colors ${
                              t.user_reaction === "like" ? "text-primary" : "text-secondary hover:text-white"
                            }`}
                          >
                            <ThumbsUp size={14} className={t.user_reaction === "like" ? "fill-primary/20" : ""} />
                            <span className="text-xs font-bold">{t.likes_count}</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
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
              className="glass-card relative z-10 w-full max-w-md p-6 md:p-8 overflow-hidden border border-white/10 shadow-2xl bg-[#121214]/95 text-white rounded-3xl"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowSupportModal(false)}
                className="absolute top-4 right-4 text-secondary hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all"
              >
                <X size={18} />
              </button>

              <div className="mb-6">
                <h3 className="text-2xl font-black tracking-tight mb-2">Adminga Murojaat</h3>
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
                    className="w-full mt-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm transition-all"
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
                      href="https://t.me/playnationuz"
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
                      className="w-full mt-4 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
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
