"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { censorText } from "@/lib/badwords";
import { Send, Users, AlertCircle } from "lucide-react";

interface ChatMessage {
  id: number;
  content: string;
  created_at: string;
  author_id: string;
  author_details: {
    username: string;
    role: string;
    avatar?: string;
  };
}

export const GlobalChat = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    // Realtime subscription setup
    const channel = supabase
      .channel('global_chat_channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'global_chat' 
      }, async (payload) => {
        // Fetch author details for the new message
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, role, avatar_url')
          .eq('id', payload.new.author_id)
          .single();

        const newMsg: ChatMessage = {
          id: payload.new.id,
          content: payload.new.message,
          created_at: payload.new.created_at,
          author_id: payload.new.author_id,
          author_details: {
            username: profileData?.username || 'Foydalanuvchi',
            role: profileData?.role || 'GAMER',
            avatar: profileData?.avatar_url
          }
        };

        setMessages(prev => [...prev, newMsg]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('global_chat')
        .select(`
          id, message, created_at, author_id,
          profiles:author_id(username, role, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        // Reverse so oldest is at top, newest at bottom
        const formatted = data.map((m: any) => ({
          id: m.id,
          content: m.message,
          created_at: m.created_at,
          author_id: m.author_id,
          author_details: {
            username: m.profiles?.username || 'Foydalanuvchi',
            role: m.profiles?.role || 'GAMER',
            avatar: m.profiles?.avatar_url
          }
        })).reverse();
        setMessages(formatted);
      }
    } catch (err) {
      console.error("Chat loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) return alert("Avval tizimga kiring!");
    if (!newMessage.trim()) return;

    const safeMessage = censorText(newMessage.trim());
    setNewMessage(""); // Optimistik tozalash

    try {
      const { error } = await supabase
        .from('global_chat')
        .insert({
          author_id: user.id,
          message: safeMessage
        });

      if (error) throw error;
    } catch (err) {
      console.error("Send message error:", err);
      alert("Xabar yuborishda xatolik.");
    }
  };

  return (
    <div className="glass-card flex flex-col h-[600px] border border-primary/20 relative overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-black/40 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 text-primary rounded-xl">
            <Users size={20} />
          </div>
          <div>
            <h3 className="font-bold text-white leading-tight">Ochiq Chat</h3>
            <p className="text-[10px] text-green-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Jonli
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-secondary bg-white/5 px-3 py-1.5 rounded-full">
          <AlertCircle size={12} /> Senzura yoniq
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 z-10 scrollbar-thin scrollbar-thumb-white/10">
        {loading ? (
          <div className="h-full flex items-center justify-center text-secondary text-sm">
            Xabarlar yuklanmoqda...
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-secondary text-sm opacity-50">
            <Users size={40} className="mb-2" />
            <p>Hali xabarlar yo'q. Birinchi bo'lib yozing!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = user?.id === msg.author_id;
            // Shunchaki o'tgan xabar bitta odamniki bo'lsa profil rasmini qayta chizmaslik logikasi:
            const isConsecutive = i > 0 && messages[i - 1].author_id === msg.author_id;

            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                {!isMe && (
                  <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold bg-primary/20 border border-primary/30 overflow-hidden ${isConsecutive ? 'opacity-0' : ''}`}>
                    {msg.author_details.avatar ? (
                      <img src={msg.author_details.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      msg.author_details.username[0].toUpperCase()
                    )}
                  </div>
                )}

                {/* Message Box */}
                <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  {!isConsecutive && !isMe && (
                    <div className="flex items-center gap-2 mb-1 ml-1">
                      <span className="text-[10px] font-bold text-primary">
                        {msg.author_details.username}
                      </span>
                      {msg.author_details.role === 'ADMIN' && (
                        <span className="text-[8px] bg-red-500/20 text-red-500 px-1.5 rounded">ADMIN</span>
                      )}
                    </div>
                  )}
                  
                  <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                    isMe 
                      ? "bg-primary text-white rounded-tr-sm" 
                      : "bg-white/10 text-gray-200 rounded-tl-sm border border-white/5"
                  }`}>
                    {msg.content}
                  </div>
                  
                  <span className="text-[9px] text-secondary mt-1 px-1">
                    {new Date(msg.created_at).toLocaleTimeString("uz-UZ", { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10 bg-black/40 z-10">
        {isAuthenticated ? (
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Xabar yozing..."
              className="w-full bg-white/5 border border-white/10 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-primary/50 text-white"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="absolute right-2 p-2 bg-primary hover:bg-primary-hover text-white rounded-full transition-all disabled:opacity-50 disabled:hover:bg-primary"
            >
              <Send size={16} />
            </button>
          </form>
        ) : (
          <div className="text-center py-2 text-xs text-secondary">
            Chatda yozish uchun <a href="/login" className="text-primary hover:underline font-bold">tizimga kiring</a>.
          </div>
        )}
      </div>

      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 blur-[100px] -z-0 pointer-events-none rounded-full" />
    </div>
  );
};
