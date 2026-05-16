"use client";

import React, { useState } from "react";
import Navbar from "../../components/Navbar";
import { Search, Filter, Calendar, Trophy, Users, Gamepad2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const tournaments = [
  {
    id: 1,
    title: "Counter-Strike 2: Uz Cup #12",
    game: "CS2",
    status: "LIVE",
    prize: "$500",
    participants: "32/64",
    date: "Bugun, 18:00",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070",
    color: "from-orange-500",
  },
  {
    id: 2,
    title: "Dota 2: Central Asia League",
    game: "Dota 2",
    status: "UPCOMING",
    prize: "$1,200",
    participants: "12/16",
    date: "20-May, 15:00",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071",
    color: "from-red-600",
  },
  {
    id: 3,
    title: "Valorant: Night Warriors",
    game: "Valorant",
    status: "UPCOMING",
    prize: "$300",
    participants: "8/32",
    date: "22-May, 20:00",
    image: "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?q=80&w=2070",
    color: "from-pink-500",
  },
  {
    id: 4,
    title: "PUBG Mobile: Toshkent Open",
    game: "PUBG Mobile",
    status: "FINISHED",
    prize: "$1,000",
    participants: "100/100",
    date: "Tugagan",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1947",
    color: "from-yellow-600",
  },
  {
    id: 5,
    title: "FC 24: Uzbekistan Championship",
    game: "FIFA",
    status: "UPCOMING",
    prize: "$2,000",
    participants: "64/128",
    date: "1-Iyun, 10:00",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=2070",
    color: "from-green-500",
  },
];

const TournamentsPage = () => {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filteredTournaments = tournaments.filter(t => {
    const matchesStatus = filter === "ALL" || t.status === filter;
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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
              <span>Raqobat boshlanmoqda</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter"
            >
              Professional <br />
              <span className="text-primary">Turnirlar</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-secondary text-lg md:text-xl leading-relaxed"
            >
              O'z mahoratingizni ko'rsating, kuchli jamoalar bilan bellashing va 
              O'zbekistonning eng yirik mukofot jamg'armalariga ega bo'ling.
            </motion.p>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-3xl">
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar p-1">
              {["ALL", "LIVE", "UPCOMING", "FINISHED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    filter === status 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-secondary hover:text-white hover:bg-white/5"
                  }`}
                >
                  {status === "ALL" ? "Barchasi" : status}
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
                  placeholder="Turnir qidirish..." 
                  className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 outline-none focus:border-primary/50 transition-all w-full text-sm font-medium"
                />
              </div>
              <button className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:border-primary/50 transition-all group">
                <Filter size={20} className="text-secondary group-hover:text-primary" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Tournament Grid */}
      <section className="pb-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredTournaments.map((t, i) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  key={t.id}
                  className="glass-card overflow-hidden group hover:border-primary/40 transition-all duration-500 flex flex-col h-full"
                >
                  {/* Card Header with Image */}
                  <div className="aspect-[16/9] relative overflow-hidden bg-white/5">
                    <img 
                      src={t.image} 
                      alt={t.title}
                      className="w-full h-full object-cover opacity-50 group-hover:scale-110 group-hover:opacity-70 transition-all duration-700"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t from-[#050506] via-[#050506]/20 to-transparent`} />
                    
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl ${
                        t.status === 'LIVE' ? 'bg-primary' : t.status === 'UPCOMING' ? 'bg-blue-500' : 'bg-white/20'
                      }`}>
                        {t.status}
                      </span>
                      <span className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        {t.game}
                      </span>
                    </div>

                    {t.status === 'LIVE' && (
                      <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-primary/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-primary/30">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Tomoshabin: 1.2K</span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-8 flex-1 flex flex-col">
                    <h3 className="text-2xl font-black text-white mb-6 group-hover:text-primary transition-colors line-clamp-2 min-h-[4rem]">
                      {t.title}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center space-x-2 text-secondary mb-1">
                          <Trophy size={14} className="text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Sovrin</span>
                        </div>
                        <p className="text-xl font-black text-white">{t.prize}</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center space-x-2 text-secondary mb-1">
                          <Users size={14} className="text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Slots</span>
                        </div>
                        <p className="text-xl font-black text-white">{t.participants}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 text-secondary text-xs font-bold mb-8 bg-white/5 p-3 rounded-xl border border-white/5">
                      <Calendar size={14} className="text-primary" />
                      <span className="uppercase tracking-widest">{t.date}</span>
                    </div>

                    <div className="mt-auto">
                      <Link 
                        href={`/tournaments/${t.id}`}
                        className="w-full py-4 bg-white/5 hover:bg-primary text-white font-black rounded-2xl transition-all duration-300 border border-white/10 hover:border-primary active:scale-95 flex items-center justify-center space-x-2"
                      >
                        {t.status === 'FINISHED' ? (
                          <>
                            <span>Natijalarni ko'rish</span>
                            <ArrowRight size={18} />
                          </>
                        ) : (
                          <>
                            <Gamepad2 size={18} />
                            <span>Batafsil ma'lumot</span>
                          </>
                        )}
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredTournaments.length === 0 && (
            <div className="py-40 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                <Search size={32} className="text-secondary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Turnirlar topilmadi</h3>
              <p className="text-secondary">Qidiruv so'rovini yoki filtrlarni o'zgartirib ko'ring</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default TournamentsPage;
