"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Gamepad2, Users, Star, Search, Filter, Monitor, Smartphone, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { BackButton } from "@/components/ui/BackButton";

interface StoreGame {
  id: number;
  title: string;
  slug: string;
  developer_details: {
    username: string;
    full_name: string;
  };
  cover: string | null;
  price: string;
  platform: string;
  rating: number;
  language: string;
  description: string;
}

const GamesPage = () => {
  const [games, setGames] = useState<StoreGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (filter !== "ALL") {
          params.platform = filter;
        }
        if (debouncedSearch) {
          params.search = debouncedSearch;
        }
        const response = await api.get("/tournaments/store/", { params });
        setGames(response.data);
      } catch (err) {
        console.error("Games store fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, [filter, debouncedSearch]);

  const getPlaceholderImage = (slug: string) => {
    if (slug.includes("tashkent")) {
      return "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600";
    }
    if (slug.includes("bukhara")) {
      return "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=600";
    }
    return "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600";
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 to-transparent -z-10" />

      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20 relative z-10">
        <div className="mb-8 flex items-center justify-between">
          <BackButton />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">O'yinlar do'koni</h1>
            <p className="text-secondary text-sm mt-2">Mahalliy va xalqaro o'yinlarni sotib oling</p>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="O'yin nomini yozing..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-primary/50 text-sm text-white transition-colors"
            />
            <Search className="absolute left-3 top-3.5 text-secondary" size={16} />
          </div>
        </div>

        <div className="flex flex-wrap lg:items-center justify-between gap-6 bg-white/5 border border-white/5 p-4 rounded-3xl mb-12">
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
            {[
              { value: "ALL", label: "Barcha platformalar" },
              { value: "PC", label: "PC o'yinlar" },
              { value: "MOBILE", label: "Mobil o'yinlar" },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setFilter(p.value)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  filter === p.value
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-secondary hover:text-white hover:bg-white/5"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-card p-6 h-96 animate-pulse" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5">
            <Gamepad2 size={48} className="text-secondary mx-auto mb-4 opacity-50" />
            <p className="text-secondary text-sm">Do'konda hech qanday o'yin topilmadi.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {games.map((g) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={g.id}
                  className="glass-card overflow-hidden group hover:border-primary/40 transition-all duration-500 flex flex-col h-full"
                >
                  {/* Cover */}
                  <div className="aspect-[16/10] relative overflow-hidden bg-white/5">
                    <img
                      src={g.cover || getPlaceholderImage(g.slug)}
                      alt={g.title}
                      className="w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-85 transition-all duration-750"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90" />
                    
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-1">
                        {g.platform === "PC" ? <Monitor size={10} /> : <Smartphone size={10} />}
                        {g.platform}
                      </span>
                    </div>

                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md border border-white/5 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Star size={12} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-bold text-white">{g.rating}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-black text-secondary uppercase tracking-widest mb-2">
                        Dev: @{g.developer_details.username}
                      </p>
                      <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors mb-3 line-clamp-1">
                        {g.title}
                      </h3>
                      <p className="text-secondary text-xs line-clamp-2 leading-relaxed opacity-85 mb-6">
                        {g.description}
                      </p>
                    </div>

                    <div className="border-t border-white/5 pt-6 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] text-secondary font-bold uppercase tracking-widest mb-1">Narxi</p>
                        <p className="text-lg font-black text-white">
                          {Number(g.price) > 0 ? `${Number(g.price).toLocaleString()} UZS` : "BEPUL"}
                        </p>
                      </div>

                      <Link
                        href={`/games/${g.id}`}
                        className="px-5 py-3 bg-white/5 hover:bg-primary text-white border border-white/10 hover:border-primary rounded-xl font-bold text-xs transition-colors flex items-center gap-2 active:scale-95"
                      >
                        <ShoppingCart size={14} />
                        <span>Sotib olish</span>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
};

export default GamesPage;
