"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import { Play, Users, ExternalLink, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { BackButton } from "../../components/ui/BackButton";
import { supabase } from "@/lib/supabase";
import { useAuthStore, useTranslation } from "@/lib/store";

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

const StreamersPage = () => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { t } = useTranslation();
  
  const [streamers, setStreamers] = useState<Streamer[]>([]);
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

  const liveCount = streamers.filter(s => s.is_live).length;
  const featuredStreamer = streamers.length > 0 ? streamers[0] : null;

  if (loading) {
    return (
      <main className="min-h-screen bg-background relative flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20">
        <BackButton />
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black mb-2">{t("streamers_title", "Streamerlar")}</h1>
            <p className="text-secondary">{t("streamers_desc", "Jonli efirlarni tomosha qiling va sevimli streamerlaringizni qo'llab-quvvatlang")}</p>
          </div>
          <div className="flex items-center space-x-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-bold text-primary">{liveCount} {t("live_count_label", "ta jonli efir")}</span>
          </div>
        </div>

        {streamers.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
             <Play size={48} className="text-secondary mx-auto mb-4 opacity-50" />
             <p className="text-secondary text-lg">{t("no_streamers", "Hozircha streamerlar yo'q.")}</p>
          </div>
        ) : (
          <>
            {/* Featured Stream */}
            {featuredStreamer && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card overflow-hidden mb-12"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3">
                  <div className="lg:col-span-2 aspect-video bg-black relative group cursor-pointer" onClick={() => router.push(`/streamers/${featuredStreamer.id}`)}>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-2xl shadow-primary/40">
                        <Play size={32} fill="white" />
                      </div>
                    </div>
                    {featuredStreamer.is_live && (
                      <div className="absolute top-6 left-6 z-10">
                        <span className="bg-primary px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20">{t("live_badge", "EFIRDA")}</span>
                      </div>
                    )}
                    <div className="absolute bottom-6 left-6 z-10 flex items-center space-x-4">
                      <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold flex items-center">
                        <Users size={14} className="mr-2" />
                        {featuredStreamer.viewers_count} {t("viewers_count_label", "tomoshabin")}
                      </div>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xl border-2 border-primary/50 overflow-hidden">
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
                      <h2 className="text-2xl font-black mb-4 leading-tight">{featuredStreamer.title}</h2>
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
                        className={`w-14 h-14 flex items-center justify-center transition-all rounded-xl border ${
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

            {/* Streamers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {streamers.slice(1).map((s) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={s.id}
                  className="glass-card overflow-hidden group hover:border-primary/50 transition-all duration-300"
                >
                  <div className="aspect-video bg-white/5 relative cursor-pointer" onClick={() => router.push(`/streamers/${s.id}`)}>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/40">
                      <Play size={32} fill="white" className="text-white drop-shadow-2xl scale-75 group-hover:scale-100 transition-transform" />
                    </div>
                    {s.is_live && (
                      <div className="absolute top-4 left-4 z-20">
                        <span className="bg-primary px-3 py-0.5 rounded-full text-[10px] font-bold uppercase shadow-lg shadow-primary/20">{t("live_badge", "EFIRDA")}</span>
                      </div>
                    )}
                    <div className="absolute bottom-4 right-4 z-20">
                      <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center">
                        <Users size={12} className="mr-1" />
                        {s.viewers_count}
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                          {s.profile?.avatar_url ? (
                            <img src={s.profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            s.profile?.username?.substring(0, 2).toUpperCase() || 'S'
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm leading-none mb-0.5">{s.profile?.username || 'Streamer'}</span>
                          <span className="text-[9px] text-secondary font-bold">{s.followers_count} {t("followers_count_label", "kuzatuvchi")}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">{s.game}</span>
                    </div>
                    <h4 className="font-bold mb-6 line-clamp-1 group-hover:text-primary transition-colors text-sm">{s.title}</h4>
                    <div className="flex space-x-3">
                      <button 
                        onClick={() => handleFollow(s.id, !!s.is_following)}
                        disabled={followLoading === s.id}
                        className={`flex-1 py-2 text-xs font-bold transition-all rounded-lg flex items-center justify-center space-x-1 border ${
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
                        className="px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition-all rounded-lg"
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
