"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ArrowLeft, MessageSquare, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

interface Section {
  id: number;
  name: string;
}

const NewTopicPage = () => {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();

  const [sections, setSections] = useState<Section[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    section: "",
    content: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect anonymous users
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const { data, error } = await supabase.from('forum_sections').select('*');
        if (error) throw error;
        if (data) setSections(data);
      } catch (err) {
        console.error("New topic section fetch error:", err);
      }
    };
    fetchSections();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: typeof formData) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev: Record<string, string>) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = "Mavzu sarlavhasi kiritilishi shart";
    } else if (formData.title.length < 5) {
      newErrors.title = "Mavzu sarlavhasi kamida 5 ta belgidan iborat bo'lsin";
    }

    if (!formData.section) {
      newErrors.section = "Mavzu bo'limini tanlang";
    }

    if (!formData.content.trim()) {
      newErrors.content = "Mavzu mazmuni kiritilishi shart";
    } else if (formData.content.length < 15) {
      newErrors.content = "Mavzu mazmuni kamida 15 ta belgidan iborat bo'lsin";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!validate()) return;

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Siz avtorizatsiyadan o'tmagansiz");

      const { data, error } = await supabase.from('forum_topics').insert({
        title: formData.title,
        section_id: Number(formData.section),
        content: formData.content,
        author_id: userData.user.id
      }).select().single();

      if (error) throw error;

      router.push(`/forum`);
    } catch (err: any) {
      console.error("Error creating topic:", err);
      setErrorMsg(err.message || "Mavzuni yaratib bo'lmadi. Ma'lumotlarni tekshirib qaytadan urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none z-0" />

      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20 relative z-10 max-w-2xl">
        <button
          onClick={() => router.push("/forum")}
          className="group text-secondary hover:text-white flex items-center space-x-2 text-sm font-bold mb-8 transition-colors"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Forumga qaytish</span>
        </button>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 md:p-10"
        >
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Yangi mavzu ochish</h1>
              <p className="text-secondary text-xs mt-1">Muhokama yaratish uchun tafsilotlarni kiriting</p>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-4 mb-6 flex items-start space-x-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-xs font-medium text-secondary ml-1">Mavzu sarlavhasi</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Mavzu sarlavhasini kiriting..."
                className={`w-full bg-white/5 border ${errors.title ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-sm text-white transition-colors`}
              />
              {errors.title && <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.title}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-secondary ml-1">Mavzu bo'limi</label>
              <select
                name="section"
                value={formData.section}
                onChange={handleChange}
                className={`w-full bg-[#121214] border ${errors.section ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-sm text-white transition-colors`}
              >
                <option value="">Tanlang...</option>
                {sections.map((sec: Section) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
              {errors.section && <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.section}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-secondary ml-1">Mavzu mazmuni (Rich Text)</label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={8}
                placeholder="Savol yoki fikrlaringizni batafsil yozib qoldiring..."
                className={`w-full bg-white/5 border ${errors.content ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-sm text-white transition-colors resize-none`}
              />
              {errors.content && <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.content}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-sm font-bold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Mavzuni chop etish</span>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </main>
  );
};

export default NewTopicPage;
