"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Calendar, User, ArrowLeft, Send, Link2, Check } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  image: string;
  category_display: string;
  created_at: string;
  author_details?: {
    full_name: string;
    username: string;
  };
}

const NewsDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const fetchNewsDetail = async () => {
      try {
        const { data, error } = await supabase
          .from("news")
          .select("*, profiles:author_id(username, full_name)")
          .eq("id", id)
          .single();

        if (error) throw error;

        if (data) {
          setNews({
            id: data.id,
            title: data.title,
            content: data.content,
            image: data.image_url || "",
            category_display: "Yangiliklar",
            created_at: data.created_at,
            author_details: {
              full_name: data.profiles?.full_name || "Tizim Admini",
              username: data.profiles?.username || "admin"
            }
          });
        }
      } catch (err) {
        console.error("News detail fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNewsDetail();
  }, [id]);

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlaceholderImage = (category: string) => {
    switch (category) {
      case "ESPORT":
        return "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200";
      case "GAMES":
        return "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200";
      case "PLATFORM":
        return "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?q=80&w=1200";
      default:
        return "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=1200";
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background relative flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!news) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-white mb-4">Yangilik topilmadi</h1>
        <button onClick={() => router.push("/news")} className="btn-primary flex items-center space-x-2">
          <ArrowLeft size={16} />
          <span>Yangiliklarga qaytish</span>
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />
      
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none z-0" />

      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20 relative z-10 max-w-4xl">
        <button 
          onClick={() => router.push("/news")}
          className="group text-secondary hover:text-white flex items-center space-x-2 text-sm font-bold mb-8 transition-colors"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Yangiliklarga qaytish</span>
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header Info */}
          <div className="space-y-4">
            <span className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider inline-block">
              {news.category_display}
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
              {news.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-xs text-secondary border-b border-white/5 pb-6">
              <div className="flex items-center">
                <Calendar size={14} className="mr-2 text-primary" />
                {new Date(news.created_at).toLocaleDateString("uz-UZ", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </div>
              <div className="flex items-center">
                <User size={14} className="mr-2 text-primary" />
                {news.author_details?.full_name || "Tizim Admini"} (@{news.author_details?.username || "admin"})
              </div>
            </div>
          </div>

          {/* Featured Image */}
          <div className="aspect-[21/9] bg-white/5 rounded-2xl border border-white/5 overflow-hidden shadow-2xl relative">
            <img 
              src={news.image || getPlaceholderImage(news.category_display)} 
              alt={news.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Article Content */}
          <div className="text-secondary leading-relaxed text-base md:text-lg whitespace-pre-line space-y-6 opacity-90 font-medium">
            {news.content}
          </div>

          {/* Footer Share Options */}
          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-secondary font-bold uppercase tracking-wider">Do'stlaringizga ulashing:</p>
            <div className="flex space-x-3">
              {/* Share to Telegram */}
              <a 
                href={`https://t.me/share/url?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(news.title)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-2 bg-[#229ED9]/10 border border-[#229ED9]/20 hover:bg-[#229ED9]/25 text-[#229ED9] px-5 py-3 rounded-xl text-xs font-bold transition-all"
              >
                <Send size={14} />
                <span>Telegram</span>
              </a>

              {/* Copy Link */}
              <button 
                onClick={handleCopyLink}
                className="flex items-center space-x-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-5 py-3 rounded-xl text-xs font-bold transition-all"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-green-400" />
                    <span className="text-green-400">Nusxalandi!</span>
                  </>
                ) : (
                  <>
                    <Link2 size={14} />
                    <span>Havolani nusxalash</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
};

export default NewsDetailPage;
