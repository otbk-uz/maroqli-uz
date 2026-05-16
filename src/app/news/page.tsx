"use client";

import React from "react";
import Navbar from "../../components/Navbar";
import { Calendar, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const newsItems = [
  {
    title: "O'zbekistonda yangi esport federatsiyasi tashkil etildi",
    date: "Bugun, 09:30",
    category: "Esport",
  },
  {
    title: "CS2 uchun katta yangilanish: yangi xarita va skinlar",
    date: "Kecha, 18:45",
    category: "O'yinlar",
  },
  {
    title: "PlayNationUz turnirlarida rekord darajadagi ishtirok",
    date: "14-May, 12:00",
    category: "Platforma",
  },
];

import { BackButton } from "../../components/ui/BackButton";

const NewsPage = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20">
        <BackButton />
        <h1 className="text-4xl font-black mb-12">Yangiliklar</h1>
        
        <div className="space-y-6">
          {newsItems.map((item, idx) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={idx}
              onClick={() => alert("Ushbu yangilik matni tez kunda yuklanadi!")}
              className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between hover:border-primary/30 cursor-pointer transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-full md:w-32 aspect-video bg-white/5 rounded-xl flex items-center justify-center font-bold text-xs text-secondary uppercase tracking-widest">
                  {item.category}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{item.title}</h3>
                  <div className="flex items-center text-xs text-secondary">
                    <Calendar size={14} className="mr-2" />
                    {item.date}
                  </div>
                </div>
              </div>
              <ChevronRight className="hidden md:block text-secondary" size={24} />
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default NewsPage;
