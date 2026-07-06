"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { Play, Users, Gamepad2, Search } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/lib/store";

interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  game_name: string;
  is_live: boolean;
  viewers_count: number;
  thumbnail_url: string;
  user: {
    username: string;
    avatar_url: string;
  };
}

export default function StreamsPage() {
  const { t } = useTranslation();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStreams();

    // Supabase Realtime updates
    const channel = supabase
      .channel("live_streams_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_streams" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            // Update the state locally without hitting the database again!
            setStreams((prev) =>
              prev.map((s) => (s.id === payload.new.id ? { ...s, ...payload.new } : s))
            );
          } else {
            // Only fetch from DB if a stream is added or deleted
            fetchStreams();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("live_streams")
        .select(`
          *,
          user:user_id(username, avatar_url)
        `)
        .eq("is_live", true)
        .order("viewers_count", { ascending: false });

      if (error) throw error;
      setStreams(data || []);
    } catch (err) {
      console.error("Error fetching streams:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStreams = streams.filter(
    (stream) =>
      stream.title.toLowerCase().includes(search.toLowerCase()) ||
      stream.user?.username?.toLowerCase().includes(search.toLowerCase()) ||
      stream.game_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-background text-white">
      <Navbar />

      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-black flex items-center gap-4 mb-2">
              <span className="text-red-500 animate-pulse flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-red-500" />
                JONLI
              </span>
              Efir va Translyatsiyalar
            </h1>
            <p className="text-secondary">Maroqli.uz o'yinchilarining haqiqiy vaqt rejimida o'yinlarini tomosha qiling.</p>
          </div>

          <Link href="/dashboard/stream" className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
            <Play size={18} fill="currentColor" /> Efirni Boshlash
          </Link>
        </div>

        {/* Search */}
        <div className="mb-8 relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={18} />
          <input
            type="text"
            placeholder="Kanal, o'yin yoki sarlavha orqali qidiring..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 outline-none focus:border-primary transition-all text-sm font-medium text-white"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="animate-pulse">
                <div className="aspect-video bg-white/5 rounded-2xl mb-3" />
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 shrink-0" />
                  <div className="space-y-2 w-full">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredStreams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStreams.map((stream) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={stream.id}
                className="group cursor-pointer"
              >
                <Link href={`/streams/${stream.user?.username || stream.id}`}>
                  <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 bg-black/40 border border-white/5 group-hover:border-primary/50 transition-colors">
                    {stream.thumbnail_url ? (
                      <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20 group-hover:scale-105 transition-transform duration-500">
                        <Play size={48} className="text-white/50" />
                      </div>
                    )}
                    
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1 shadow-lg shadow-red-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> LIVE
                    </div>

                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1.5">
                      <Users size={12} /> {stream.viewers_count}
                    </div>
                  </div>

                  <div className="flex gap-3 px-1">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/5">
                      {stream.user?.avatar_url ? (
                        <img src={stream.user.avatar_url} alt={stream.user.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold uppercase">
                          {stream.user?.username?.charAt(0) || "U"}
                        </div>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-sm text-white truncate group-hover:text-primary transition-colors" title={stream.title}>
                        {stream.title}
                      </h3>
                      <p className="text-xs text-secondary truncate mt-0.5">{stream.user?.username || "Gamer"}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-primary/80 uppercase">
                        <Gamepad2 size={12} /> {stream.game_name || "Just Chatting"}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 glass-card border border-white/5 rounded-3xl">
            <Play size={48} className="mx-auto text-white/20 mb-4" />
            <h2 className="text-xl font-bold mb-2">Hozircha faol efirlar yo'q</h2>
            <p className="text-secondary max-w-md mx-auto mb-6">
              Ayni vaqtda hech kim jonli efir qilmayapti. Birinchi bo'lib efirni boshlash imkoniyatini qo'ldan boy bermang!
            </p>
            <Link href="/dashboard/stream" className="bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-xl font-bold text-sm transition-colors inline-block">
              Efirni boshlash
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
