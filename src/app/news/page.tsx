"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { Calendar, User, Newspaper } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  image_url: string;
  created_at: string;
  profiles: {
    username: string;
    full_name: string;
  };
}

export default function NewsPage() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data, error } = await supabase
          .from('news')
          .select('*, profiles(username, full_name)')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setNewsList(data);
      } catch (err) {
        console.error("News fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <main className="min-h-screen bg-[#050506] text-white">
      <Navbar />
      
      {/* Premium Header */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 to-transparent -z-10" />
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-2 text-primary font-bold text-xs uppercase tracking-widest mb-4"
            >
              <Newspaper size={14} />
              <span>PlayNationUz OAV</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter"
            >
              So'nggi <span className="text-primary">Yangiliklar</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-secondary text-lg md:text-xl leading-relaxed"
            >
              Platformamizdagi barcha o'zgarishlar, yangi turnirlar, o'yinlar va e-sport olamidagi muhim voqealar.
            </motion.p>
          </div>
        </div>
      </section>

      {/* News Grid */}
      <section className="pb-32">
        <div className="container mx-auto px-4 md:px-6">
          {loading ? (
            <div className="flex justify-center items-center py-40">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : newsList.length === 0 ? (
            <div className="py-40 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                <Newspaper size={32} className="text-secondary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Hozircha yangiliklar yo'q</h3>
              <p className="text-secondary">Tez orada yangi xabarlar chop etiladi.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence>
                {newsList.map((news, i) => (
                  <motion.div
                    key={news.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card overflow-hidden group hover:border-primary/40 transition-all duration-500 flex flex-col h-full"
                  >
                    {/* Image */}
                    <div className="aspect-[16/9] relative overflow-hidden bg-white/5">
                      <img 
                        src={news.image_url || "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=1200"} 
                        alt={news.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>

                    {/* Content */}
                    <div className="p-6 md:p-8 flex-1 flex flex-col">
                      <div className="flex items-center space-x-4 mb-4 text-xs font-bold text-secondary uppercase tracking-widest">
                        <div className="flex items-center space-x-1">
                          <Calendar size={14} className="text-primary" />
                          <span>{new Date(news.created_at).toLocaleDateString('uz-UZ')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User size={14} className="text-primary" />
                          <span>{news.profiles?.username || "Admin"}</span>
                        </div>
                      </div>

                      <h3 className="text-2xl font-black text-white mb-4 leading-tight group-hover:text-primary transition-colors">
                        {news.title}
                      </h3>
                      
                      <p className="text-secondary text-sm leading-relaxed mb-6 whitespace-pre-line flex-1 line-clamp-4">
                        {news.content}
                      </p>

                      <div className="mt-auto pt-6 border-t border-white/5">
                        <Link 
                          href={`/news/${news.id}`}
                          className="text-primary font-bold text-sm hover:underline flex items-center space-x-1"
                        >
                          <span>Batafsil o'qish</span>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
