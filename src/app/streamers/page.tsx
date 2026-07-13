"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import { Play, Users, ExternalLink, Heart, Radio, Tv } from "lucide-react";
import { motion } from "framer-motion";
import { BackButton } from "../../components/ui/BackButton";
import { supabase } from "@/lib/supabase";
import { useAuthStore, useTranslation } from "@/lib/store";
import Link from "next/link";

interface Streamer {
  id: string;
  user_id: string;
  stream_url: string;
  platform: string;
  game: string;
  title: string;
  is_live: boolean;
  viewers_count: number;
  followers_count: number;
  profile: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
  is_following?: boolean;
}

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

const StreamersPage = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { t } = useTranslation();

  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchStreamers();
  }, [isAuthenticated]);

  const fetchStreamers = async () => {
    try {
      setLoading(true);
      // Fetch streamers
      const { data: streamersData, error: streamersError } = await supabase
        .from('streamers')
        .select(`
          *,
          profile:user_id(username, full_name, avatar_url)
        `)
        .order('is_live', { ascending: false })
        .order('viewers_count', { ascending: false });

      if (streamersError) throw streamersError;

      // Fetch live streams from MUX
      const { data: liveData } = await supabase
        .from("live_streams")
        .select(`
          *,
          user:user_id(username, avatar_url)
        `)
        .eq("is_live", true)
        .order("viewers_count", { ascending: false });

      if (liveData) {
        setLiveStreams(liveData);
      }

      let followersMap = new Set<string>();

      // If authenticated, fetch which streamers the user follows
      if (isAuthenticated && user) {
        const { data: followsData } = await supabase
          .from('streamer_followers')
          .select('streamer_id')
          .eq('follower_id', user.id);

        if (followsData) {
          followsData.forEach(f => followersMap.add(f.streamer_id));
        }
      }

      if (streamersData) {
        const mappedStreamers = streamersData.map(s => ({
          ...s,
          is_following: followersMap.has(s.id)
        }));
        setStreamers(mappedStreamers);
      }
    } catch (err) {
      console.error("Error fetching streamers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (streamerId: string, currentlyFollowing: boolean) => {
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }

    setFollowLoading(streamerId);
    try {
      if (currentlyFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('streamer_followers')
          .delete()
          .match({ streamer_id: streamerId, follower_id: user.id });

        if (error) throw error;

        setStreamers(prev => prev.map(s =>
          s.id === streamerId
            ? { ...s, is_following: false, followers_count: s.followers_count - 1 }
            : s
        ));
      } else {
        // Follow
        const { error } = await supabase
          .from('streamer_followers')
          .insert({ streamer_id: streamerId, follower_id: user.id });

        if (error) throw error;

        setStreamers(prev => prev.map(s =>
          s.id === streamerId
            ? { ...s, is_following: true, followers_count: s.followers_count + 1 }
            : s
        ));
      }
    } catch (err) {
      console.error("Error following streamer:", err);
      alert("Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
    } finally {
      setFollowLoading(null);
    }
  };

  const featuredStreamer = streamers.find(s => s.is_live) || null;
  const liveCount = liveStreams.length + streamers.filter(s => s.is_live).length;

  // Qayta ishlatiladigan pulslanuvchi LIVE nishoni
  const LiveBadge = ({ small = false }: { small?: boolean }) => (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-primary text-white font-black uppercase tracking-widest shadow-glow animate-pulse-glow ${
        small ? "px-2.5 py-0.5 text-[9px]" : "px-3 py-1 text-[10px]"
      }`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      {t("live_badge", "EFIRDA")}
    </span>
  );

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* Premium Header */}
      <section className="relative pt-36 pb-14 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,51,85,0.16),transparent_60%)]" />
        <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_85%_0%,rgba(139,92,246,0.12),transparent_55%)]" />

        <div className="container-app">
          <BackButton />

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-3xl">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="chip mb-5 border-primary/25 bg-primary/10 text-primary"
              >
                <Radio size={14} />
                <span className="font-display uppercase tracking-[0.2em] text-[11px]">
                  {t("live_now", "Jonli efirda")}
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-4xl sm:text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-[1.05] uppercase"
              >
                {(() => {
                  const parts = t("streamers_title", "Streamerlar").trim().split(" ");
                  if (parts.length === 1) return <span className="text-gradient">{parts[0]}</span>;
                  return (
                    <>
                      {parts[0]}{" "}
                      <span className="text-gradient">{parts.slice(1).join(" ")}</span>
                    </>
                  );
                })()}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-secondary text-lg md:text-xl leading-relaxed"
              >
                {t("streamers_desc", "Jonli efirlarni tomosha qiling va sevimli streamerlaringizni qo'llab-quvvatlang")}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-2.5 glass-card px-5 py-3 shrink-0"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              <span className="font-display text-sm font-black text-white">
                {liveCount} <span className="text-secondary font-bold">{t("live_count_label", "ta jonli efir")}</span>
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="container-app pb-32">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div key={n} className="glass-card overflow-hidden">
                <div className="skeleton aspect-video rounded-none" />
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="skeleton w-9 h-9 rounded-full" />
                    <div className="skeleton h-4 w-24" />
                  </div>
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-9 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : streamers.length === 0 && liveStreams.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card py-24 px-6 text-center flex flex-col items-center"
          >
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <div className="relative w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center animate-float">
                <Tv size={40} className="text-primary" />
              </div>
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-black text-white mb-3 uppercase tracking-tight">
              {t("no_streamers", "Hozircha streamerlar yo'q.")}
            </h3>
            <p className="text-secondary max-w-md">
              {t("no_streamers_desc", "Tez orada jonli efirlar shu yerda paydo bo'ladi")}
            </p>
          </motion.div>
        ) : (
          <>
            {/* Real Live Streams from MUX */}
            {liveStreams.length > 0 && (
              <div className="mb-16">
                <h2 className="font-display text-2xl font-black mb-6 flex items-center gap-3 uppercase tracking-tight">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                  </span>
                  {t("live_streams_title", "Hozirgi Jonli Efirlar")}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {liveStreams.map((stream, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={stream.id}
                      className="group cursor-pointer"
                    >
                      <Link href={`/streams/${stream.user?.username || stream.id}`}>
                        <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 bg-black/40 border border-white/10 group-hover:border-primary/50 transition-colors">
                          {stream.thumbnail_url ? (
                            <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-brand-gradient-soft group-hover:scale-105 transition-transform duration-500">
                              <Play size={48} className="text-white/50" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                          <div className="absolute top-2.5 left-2.5">
                            <LiveBadge small />
                          </div>

                          <div className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1.5">
                            <Users size={12} /> {stream.viewers_count}
                          </div>
                        </div>

                        <div className="flex gap-3 px-1">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/10">
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
                            <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-primary/80 uppercase tracking-widest">
                              {stream.game_name || "Just Chatting"}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <h2 className="font-display text-2xl font-black mb-6 uppercase tracking-tight">
              {t("all_streamers_title", "Barcha Streamerlar")}
            </h2>

            {/* Featured Stream */}
            {featuredStreamer && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card overflow-hidden mb-12"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3">
                  <div className="lg:col-span-2 aspect-video bg-gradient-to-br from-black to-primary/10 relative group cursor-pointer" onClick={() => router.push(`/streamers/${featuredStreamer.id}`)}>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-glow">
                        <Play size={32} fill="white" />
                      </div>
                    </div>
                    {featuredStreamer.is_live && (
                      <div className="absolute top-6 left-6 z-10">
                        <LiveBadge />
                      </div>
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 group-hover:bg-black/60 transition-colors">
                      <Play size={64} className="text-white/20 mb-4" />
                      <p className="text-white/40 text-sm font-bold uppercase tracking-widest">{t("watch_stream", "Efirni tomosha qilish")}</p>
                    </div>
                    <div className="absolute bottom-6 left-6 z-10 flex items-center space-x-4">
                      <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold flex items-center">
                        <Users size={14} className="mr-2" />
                        {featuredStreamer.viewers_count} {t("viewers_count_label", "tomoshabin")}
                      </div>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col justify-center space-y-8">
                    <div>
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center font-display font-bold text-xl border-2 border-primary/50 overflow-hidden">
                          {featuredStreamer.profile?.avatar_url ? (
                            <img src={featuredStreamer.profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            featuredStreamer.profile?.username?.substring(0, 2).toUpperCase() || 'SG'
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{featuredStreamer.profile?.username || 'Streamer'}</h3>
                          <p className="text-primary text-sm font-medium">{featuredStreamer.game}</p>
                        </div>
                      </div>
                      <h2 className="font-display text-2xl font-black mb-4 leading-tight tracking-tight">{featuredStreamer.title}</h2>
                      <div className="flex items-center space-x-4 text-sm text-secondary mb-8 font-bold">
                        <span>{featuredStreamer.followers_count} {t("followers_count_label", "kuzatuvchi")}</span>
                        <span>•</span>
                        <span className="uppercase">{featuredStreamer.platform}</span>
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => router.push(`/streamers/${featuredStreamer.id}`)}
                        className="btn-primary flex-1 py-4 flex items-center justify-center space-x-2"
                      >
                        <Play size={18} fill="white" />
                        <span>{t("watch", "Tomosha qilish")}</span>
                      </button>
                      <button
                        onClick={() => handleFollow(featuredStreamer.id, !!featuredStreamer.is_following)}
                        disabled={followLoading === featuredStreamer.id}
                        className={`w-14 h-14 flex items-center justify-center transition-all rounded-2xl border disabled:opacity-60 ${
                          featuredStreamer.is_following
                            ? 'bg-primary border-primary text-white'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                        }`}
                      >
                        <Heart size={20} className={featuredStreamer.is_following ? "fill-white" : ""} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {streamers.filter(s => s.id !== featuredStreamer?.id).map((s, i) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  key={s.id}
                  className="card-interactive overflow-hidden group hover:border-primary/50"
                >
                  <div className="aspect-video bg-white/5 relative cursor-pointer overflow-hidden" onClick={() => router.push(`/streamers/${s.id}`)}>
                    {s.profile?.avatar_url ? (
                      <img src={s.profile.avatar_url} alt="" className="w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-105 transition-all duration-500" />
                    ) : (
                      <div className="w-full h-full bg-brand-gradient-soft" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/40">
                      <Play size={32} fill="white" className="text-white drop-shadow-2xl scale-75 group-hover:scale-100 transition-transform" />
                    </div>
                    {s.is_live && (
                      <div className="absolute top-3.5 left-3.5 z-20">
                        <LiveBadge small />
                      </div>
                    )}
                    <div className="absolute bottom-3.5 right-3.5 z-20">
                      <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center">
                        <Users size={12} className="mr-1" />
                        {s.viewers_count}
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center text-[10px] font-bold overflow-hidden border border-white/10 shrink-0">
                          {s.profile?.avatar_url ? (
                            <img src={s.profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            s.profile?.username?.substring(0, 2).toUpperCase() || 'S'
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-sm leading-none mb-0.5 truncate">{s.profile?.username || 'Streamer'}</span>
                          <span className="text-[10px] text-secondary font-bold">{s.followers_count} {t("followers_count_label", "kuzatuvchi")}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-secondary uppercase tracking-widest shrink-0">{s.game}</span>
                    </div>
                    <h4 className="font-bold mb-6 line-clamp-1 group-hover:text-primary transition-colors text-sm">{s.title}</h4>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleFollow(s.id, !!s.is_following)}
                        disabled={followLoading === s.id}
                        className={`flex-1 py-2.5 text-xs font-bold transition-all rounded-xl flex items-center justify-center space-x-1.5 border disabled:opacity-60 ${
                          s.is_following
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <Heart size={14} className={s.is_following ? "fill-primary" : ""} />
                        <span>{s.is_following ? t("following", "Kuzatilmoqda") : t("follow", "Kuzatish")}</span>
                      </button>
                      <button
                        onClick={() => window.open(s.stream_url, '_blank')}
                        className="px-3 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 transition-all rounded-xl"
                        aria-label={t("watch", "Tomosha qilish")}
                      >
                        <ExternalLink size={14} className="text-secondary" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default StreamersPage;
