"use client";

import React, { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Users, Gift, Share2, AlertCircle, Heart, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";

interface StreamData {
  id: string;
  title: string;
  game_name: string;
  is_live: boolean;
  viewers_count: number;
  donation_url: string;
  stream_url: string;
  cf_live_input_id?: string;
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

interface ChatMessage {
  id: string;
  message: string;
  created_at: string;
  user: {
    username: string;
    avatar_url: string;
    role: string;
  };
}

export default function StreamViewPage() {
  const { username } = useParams();
  const { user, isAuthenticated } = useAuthStore();
  const [stream, setStream] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Cache for user profiles to save Supabase API limits
  const userProfileCache = useRef<Record<string, { username: string; avatar_url: string; role: string }>>({});

  useEffect(() => {
    fetchStreamData();
  }, [username]);

  const fetchStreamData = async () => {
    try {
      setLoading(true);
      // First get the user ID for this username
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("username", username)
        .single();

      if (userError || !userData) {
        setLoading(false);
        return;
      }

      const { data: streamData, error: streamError } = await supabase
        .from("live_streams")
        .select(`
          *,
          user:user_id(id, username, avatar_url)
        `)
        .eq("user_id", userData.id)
        .single();

      if (streamError && streamError.code !== 'PGRST116') throw streamError;
      
      if (streamData) {
        setStream(streamData);
        fetchChatMessages(streamData.id);
        setupRealtime(streamData.id);
        
        // Increment viewer count
        incrementViewers(streamData.id);
      }
    } catch (err) {
      console.error("Error fetching stream:", err);
    } finally {
      setLoading(false);
    }
  };

  const incrementViewers = async (streamId: string) => {
    await supabase.rpc('increment_viewers', { row_id: streamId });
  };

  const fetchChatMessages = async (streamId: string) => {
    const { data } = await supabase
      .from("stream_chat")
      .select(`
        id, message, created_at,
        user:user_id(username, avatar_url, role)
      `)
      .eq("stream_id", streamId)
      .order("created_at", { ascending: true })
      .limit(100);
      
    if (data) setMessages(data as any);
    scrollToBottom();
  };

  const setupRealtime = (streamId: string) => {
    const channel = supabase
      .channel(`stream_chat_${streamId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stream_chat", filter: `stream_id=eq.${streamId}` },
        async (payload) => {
          let userData = userProfileCache.current[payload.new.user_id];
          
          if (!userData) {
            // Fetch user details for the new message only if not in cache
            const { data } = await supabase
              .from("profiles")
              .select("username, avatar_url, role")
              .eq("id", payload.new.user_id)
              .single();
              
            if (data) {
              userData = data;
              userProfileCache.current[payload.new.user_id] = data; // save to cache
            }
          }
            
          const completeMessage = {
            ...payload.new,
            user: userData || { username: "User", avatar_url: "", role: "USER" }
          } as ChatMessage;
          
          setMessages(prev => [...prev, completeMessage]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isAuthenticated || !stream || !user) return;

    const msg = newMessage;
    setNewMessage("");

    try {
      await supabase.from("stream_chat").insert({
        stream_id: stream.id,
        user_id: user.id,
        message: msg
      });
    } catch (err) {
      console.error("Chat error:", err);
      setNewMessage(msg); // Restore if failed
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-white">
        <Navbar />
        <div className="container mx-auto px-4 pt-32 text-center text-secondary">
          Efir yuklanmoqda...
        </div>
      </main>
    );
  }

  if (!stream) {
    return (
      <main className="min-h-screen bg-background text-white">
        <Navbar />
        <div className="container mx-auto px-4 pt-32 text-center">
          <div className="max-w-md mx-auto glass-card p-10 rounded-3xl border border-white/5">
            <AlertCircle size={48} className="mx-auto text-secondary mb-4" />
            <h1 className="text-2xl font-bold mb-2">Efir topilmadi</h1>
            <p className="text-secondary">Bu foydalanuvchi hozirda efir qilmayapti yoki bunday kanal mavjud emas.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-white overflow-hidden">
      <Navbar />

      <div className="h-screen pt-20 pb-4 md:pb-6 flex flex-col lg:flex-row gap-4 px-4 md:px-6">
        
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Video Player */}
          <div className="w-full aspect-video bg-black rounded-2xl border border-white/10 overflow-hidden relative group shadow-2xl">
            {stream.is_live ? (
              stream.cf_live_input_id ? (
                <iframe
                  src={`https://iframe.videodelivery.net/${stream.cf_live_input_id}?autoplay=true&muted=true`}
                  className="w-full h-full"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                />
              ) : stream.stream_url ? (
                <iframe
                  src={stream.stream_url}
                  className="w-full h-full"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#111]">
                  <div className="w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4" />
                  <p className="text-secondary font-bold">Signal kutilmoqda...</p>
                </div>
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  {stream.user.avatar_url ? (
                    <img src={stream.user.avatar_url} alt={stream.user.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold">{stream.user.username.charAt(0)}</span>
                  )}
                </div>
                <h2 className="text-2xl font-bold">Efir Offline</h2>
                <p className="text-secondary">Streamer hozirda efirni to'xtatgan.</p>
              </div>
            )}

            {/* Live Badge Overlay */}
            {stream.is_live && (
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="bg-red-500 text-white text-xs font-black px-2 py-1 rounded uppercase flex items-center gap-1.5 shadow-lg">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" /> LIVE
                </span>
                <span className="bg-black/60 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1.5">
                  <Users size={14} /> {stream.viewers_count}
                </span>
              </div>
            )}
          </div>

          {/* Stream Info */}
          <div className="mt-4 p-4 md:p-6 glass-card rounded-2xl border border-white/5 shrink-0 flex flex-col md:flex-row gap-4 justify-between items-start">
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/50 shrink-0">
                {stream.user.avatar_url ? (
                  <img src={stream.user.avatar_url} alt={stream.user.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary text-xl font-bold uppercase">
                    {stream.user.username.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white mb-1">{stream.title}</h1>
                <p className="font-semibold text-primary">{stream.user.username}</p>
                <p className="text-sm text-secondary font-medium mt-1 uppercase tracking-wider">{stream.game_name || "Just Chatting"}</p>
              </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <button className="flex-1 md:flex-none py-2.5 px-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                <Heart size={16} /> Kuzatish
              </button>
              
              {stream.donation_url && (
                <a 
                  href={stream.donation_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 md:flex-none py-2.5 px-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                >
                  <Gift size={16} /> Donat qilish
                </a>
              )}
              
              <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all" title="Ulashish">
                <Share2 size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="w-full lg:w-80 xl:w-96 glass-card rounded-2xl border border-white/5 flex flex-col overflow-hidden shrink-0 h-[400px] lg:h-auto">
          {/* Chat Header */}
          <div className="p-4 border-b border-white/5 bg-white/[0.02]">
            <h3 className="font-bold text-sm uppercase tracking-wider flex items-center justify-between">
              <span>Efir Chati</span>
              <Users size={14} className="text-secondary" />
            </h3>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-secondary text-sm italic">
                Chatga xush kelibsiz!
              </div>
            ) : (
              messages.map((msg, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={msg.id || i} 
                  className="text-sm break-words"
                >
                  <span className={`font-bold mr-2 ${msg.user.role === 'ADMIN' ? 'text-red-400' : 'text-primary'}`}>
                    {msg.user.username}:
                  </span>
                  <span className="text-white/90">{msg.message}</span>
                </motion.div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-white/5 bg-white/[0.02]">
            {isAuthenticated ? (
              <form onSubmit={handleSendMessage} className="relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Xabar yozish..."
                  maxLength={200}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:text-primary-hover disabled:opacity-50 disabled:hover:text-primary transition-colors"
                >
                  <Send size={18} />
                </button>
              </form>
            ) : (
              <div className="text-center p-3 bg-black/40 rounded-xl border border-white/5">
                <p className="text-xs text-secondary mb-2">Chatga yozish uchun tizimga kiring.</p>
                <a href="/login" className="text-xs font-bold text-primary hover:underline">Kirish</a>
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
