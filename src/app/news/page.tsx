"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Calendar, ChevronRight, Search, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { BackButton } from "@/components/ui/BackButton";

interface NewsItem {
  id: number;
  title: string;
  content: string;
  image: string;
  category: string;
  category_display: string;
  created_at: string;
}

const CATEGORIES = [
  { value: "ALL", label: "Barchasi" },
  { value: "ESPORT", label: "Esport" },
  { value: "GAMES", label: "O'yinlar" },
  { value: "COMMUNITY", label: "Komuniti" },
  { value: "PLATFORM", label: "Platforma" },
];

const NewsPage = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        let url = "/community/news/";
        const params: Record<string, string> = {};

        if (selectedCat !== "ALL") {
          params.category = selectedCat;
        }
        if (debouncedSearch) {
          params.search = debouncedSearch;
        }

        const response = await api.get(url, { params });
        setNews(response.data);
      } catch (err) {
        console.error("News fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [selectedCat, debouncedSearch]);

  const getPlaceholderImage = (category: string) => {
    switch (category) {
      case "ESPORT":
        return "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600";
      case "GAMES":
        return "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600";
      case "PLATFORM":
        return "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?q=80&w=600";
      default:
        return "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=600";
    }
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />
      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20 relative z-10">
        <div className="mb-8 flex items-center justify-between">
          <BackButton />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Yangiliklar</h1>
            <p className="text-secondary text-sm mt-2">Gaming olamining eng qaynoq yangiliklari</p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Qidiruv..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-primary/50 text-sm text-white transition-colors"
            />
            <Search className="absolute left-3 top-3.5 text-secondary" size={16} />
          </div>
        </div>

        {/* Category Selector Tabs */}
        <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCat(cat.value)}
              className={`px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 ${
                selectedCat === cat.value
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "bg-white/5 text-secondary hover:bg-white/10 hover:text-white border border-white/5"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* News Grid */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-card p-6 flex flex-col md:flex-row gap-6 animate-pulse">
                <div className="w-full md:w-48 aspect-video bg-white/5 rounded-xl" />
                <div className="flex-1 space-y-3 py-2">
                  <div className="h-4 bg-white/10 w-1/4 rounded" />
                  <div className="h-6 bg-white/10 w-3/4 rounded" />
                  <div className="h-4 bg-white/10 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5">
            <FileText size={48} className="text-secondary mx-auto mb-4 opacity-50" />
            <p className="text-secondary text-sm">Hech qanday yangilik topilmadi.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {news.map((item, idx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  key={item.id}
                >
                  <Link
                    href={`/news/${item.id}`}
                    className="glass-card p-6 flex flex-col md:flex-row gap-6 hover:border-primary/40 group transition-all duration-300"
                  >
                    <div className="w-full md:w-48 aspect-[16/10] overflow-hidden rounded-xl bg-white/5 relative shrink-0">
                      <img
                        src={item.image || getPlaceholderImage(item.category)}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="bg-primary/10 border border-primary/20 text-primary text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            {item.category_display}
                          </span>
                          <span className="text-[10px] text-secondary flex items-center">
                            <Calendar size={12} className="mr-1" />
                            {new Date(item.created_at).toLocaleDateString("uz-UZ", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors duration-300 mb-3 line-clamp-2 leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-secondary text-sm line-clamp-2 leading-relaxed opacity-80">
                          {item.content}
                        </p>
                      </div>

                      <div className="flex items-center text-xs text-primary font-bold mt-4 md:mt-0 group-hover:translate-x-1 transition-transform">
                        <span>Batafsil o'qish</span>
                        <ChevronRight size={14} className="ml-1" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
};

export default NewsPage;
