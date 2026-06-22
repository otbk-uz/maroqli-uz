"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { BackButton } from "@/components/ui/BackButton";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { censorText } from "@/lib/badwords";
import { User, Calendar, MessageCircle, Send } from "lucide-react";
import { motion } from "framer-motion";

interface Reply {
  id: number;
  content: string;
  created_at: string;
  author_details: {
    username: string;
    full_name: string;
    role: string;
    avatar?: string;
  };
}

interface TopicDetails {
  id: number;
  title: string;
  content: string;
  created_at: string;
  replies_count: number;
  section_name: string;
  author_details: {
    username: string;
    full_name: string;
    role: string;
    avatar?: string;
  };
}

const TopicPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  
  const [topic, setTopic] = useState<TopicDetails | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchTopicData();
  }, [id]);

  const fetchTopicData = async () => {
    setLoading(true);
    try {
      // Fetch topic details
      const { data: topicData, error: topicError } = await supabase
        .from('forum_topics')
        .select(`
          *,
          forum_sections(name),
          profiles:author_id(username, full_name, role, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (topicError) throw topicError;

      if (topicData) {
        setTopic({
          id: topicData.id,
          title: topicData.title,
          content: topicData.content,
          created_at: topicData.created_at,
          replies_count: topicData.replies_count,
          section_name: topicData.forum_sections?.name || 'Unknown',
          author_details: {
            username: topicData.profiles?.username || 'Foydalanuvchi',
            full_name: topicData.profiles?.full_name || '',
            role: topicData.profiles?.role || 'GAMER',
            avatar: topicData.profiles?.avatar_url
          }
        });
      }

      // Fetch replies
      const { data: repliesData, error: repliesError } = await supabase
        .from('forum_replies')
        .select(`
          id, content, created_at,
          profiles:author_id(username, full_name, role, avatar_url)
        `)
        .eq('topic_id', id)
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;

      if (repliesData) {
        setReplies(repliesData.map((r: any) => ({
          id: r.id,
          content: r.content,
          created_at: r.created_at,
          author_details: {
            username: r.profiles?.username || 'Foydalanuvchi',
            full_name: r.profiles?.full_name || '',
            role: r.profiles?.role || 'GAMER',
            avatar: r.profiles?.avatar_url
          }
        })));
      }
    } catch (err) {
      console.error("Xatolik:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReplySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }
    if (!replyText.trim()) return;

    setSubmitting(true);
    try {
      // SENZURA: Yomon so'zlarni filtrlaymiz
      const safeContent = censorText(replyText);

      // Insert reply
      const { error: insertError } = await supabase
        .from('forum_replies')
        .insert({
          topic_id: id,
          author_id: user.id,
          content: safeContent
        });

      if (insertError) throw insertError;

      // Update topic replies count
      const newCount = (topic?.replies_count || 0) + 1;
      await supabase
        .from('forum_topics')
        .update({ replies_count: newCount })
        .eq('id', id);

      setReplyText("");
      // Refresh
      fetchTopicData();
    } catch (err: any) {
      alert("Izoh qoldirishda xatolik yuz berdi: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-white">
        <Navbar />
        <div className="container mx-auto px-4 pt-32 text-center text-secondary">Yuklanmoqda...</div>
      </main>
    );
  }

  if (!topic) {
    return (
      <main className="min-h-screen bg-background text-white">
        <Navbar />
        <div className="container mx-auto px-4 pt-32 text-center">
          <BackButton />
          <h1 className="text-2xl mt-8">Mavzu topilmadi</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-white pb-20">
      <Navbar />
      
      <div className="container mx-auto px-4 md:px-6 pt-32 max-w-4xl">
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Topic Info */}
        <div className="glass-card p-6 md:p-8 mb-8 border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] -z-10 rounded-full" />
          
          <div className="flex items-center space-x-2 text-xs mb-4">
            <span className="bg-primary/20 text-primary px-3 py-1 rounded-full font-bold">
              {topic.section_name}
            </span>
            <span className="text-secondary flex items-center">
              <Calendar size={12} className="mr-1" />
              {new Date(topic.created_at).toLocaleString("uz-UZ")}
            </span>
          </div>

          <h1 className="text-2xl md:text-4xl font-black mb-6 leading-tight">{topic.title}</h1>
          
          <div className="flex items-center space-x-3 mb-6 p-4 bg-white/5 rounded-xl border border-white/5 w-max">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden border border-primary/30">
              {topic.author_details.avatar ? (
                <img src={topic.author_details.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                topic.author_details.username[0].toUpperCase()
              )}
            </div>
            <div>
              <p className="font-bold text-sm">@{topic.author_details.username}</p>
              <p className="text-[10px] text-secondary">{topic.author_details.role}</p>
            </div>
          </div>

          <div className="text-sm md:text-base text-gray-200 leading-relaxed whitespace-pre-wrap bg-black/20 p-6 rounded-2xl border border-white/5">
            {topic.content}
          </div>
        </div>

        {/* Replies Section */}
        <div className="space-y-6 mb-8">
          <h3 className="text-xl font-bold flex items-center gap-2 border-b border-white/10 pb-4">
            <MessageCircle className="text-primary" /> Izohlar va Muhokamalar ({topic.replies_count})
          </h3>

          {replies.length === 0 ? (
            <div className="text-center py-10 text-secondary bg-white/5 rounded-2xl border border-white/5">
              Hali hech kim izoh qoldirmagan. Birinchi bo'lib fikr bildiring!
            </div>
          ) : (
            <div className="space-y-4">
              {replies.map((reply, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={reply.id}
                  className="glass-card p-5 border border-white/5 flex gap-4"
                >
                  <div className="w-10 h-10 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white font-bold overflow-hidden">
                    {reply.author_details.avatar ? (
                      <img src={reply.author_details.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      reply.author_details.username[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold text-sm text-primary">@{reply.author_details.username}</span>
                        {reply.author_details.role === 'ADMIN' && (
                          <span className="ml-2 bg-red-500/20 text-red-500 text-[10px] px-2 py-0.5 rounded uppercase">Admin</span>
                        )}
                      </div>
                      <span className="text-[10px] text-secondary">
                        {new Date(reply.created_at).toLocaleString("uz-UZ")}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {reply.content}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Reply Form */}
        <div className="glass-card p-6 border border-primary/20">
          <h4 className="font-bold mb-4">Fikr bildirish</h4>
          {isAuthenticated ? (
            <form onSubmit={handleReplySubmit}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Bu yerga o'z fikringizni yozing..."
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-primary/50 resize-none mb-4 min-h-[100px]"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !replyText.trim()}
                  className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? "Yuborilmoqda..." : <><Send size={16} /> Yuborish</>}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-black/40 border border-white/10 rounded-xl p-6 text-center">
              <p className="text-secondary text-sm mb-4">Izoh qoldirish uchun tizimga kirishingiz kerak.</p>
              <button onClick={() => router.push("/login")} className="btn-primary py-2 px-6 text-sm">
                Kirish / Ro'yxatdan o'tish
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default TopicPage;
