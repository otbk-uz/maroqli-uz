"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ArrowLeft, User, Calendar, MessageSquare, ThumbsUp, ThumbsDown, Lock, Send, Quote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import { BackButton } from "@/components/ui/BackButton";

interface UserInfo {
  id: number;
  username: string;
  full_name: string;
  avatar?: string;
  role: string;
}

interface Topic {
  id: number;
  section: number;
  section_name: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  author_details: UserInfo;
  replies_count: number;
  likes_count: number;
  dislikes_count: number;
  user_reaction?: "like" | "dislike" | null;
  created_at: string;
}

interface Reply {
  id: number;
  author: number;
  author_details: UserInfo;
  content: string;
  parent_reply: number | null;
  likes_count: number;
  dislikes_count: number;
  user_reaction?: "like" | "dislike" | null;
  created_at: string;
}

const TopicDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [topic, setTopic] = useState<Topic | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New reply form state
  const [replyContent, setReplyContent] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [parentReplyId, setParentReplyId] = useState<number | null>(null);
  const [parentReplyAuthor, setParentReplyAuthor] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchTopicData = async () => {
      try {
        const [topicRes, repliesRes] = await Promise.all([
          api.get(`/community/topics/${id}/`),
          api.get(`/community/replies/?topic=${id}`),
        ]);
        setTopic(topicRes.data);
        setReplies(repliesRes.data);
      } catch (err) {
        console.error("Topic fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopicData();
  }, [id]);

  const handleReactTopic = async (isLike: boolean) => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!topic) return;

    try {
      await api.post(`/community/topics/${topic.id}/react/`, { is_like: isLike });
      setTopic((prev) => {
        if (!prev) return null;
        const currentReaction = prev.user_reaction;
        let likesDiff = 0;
        let dislikesDiff = 0;
        let newReaction: "like" | "dislike" | null = null;

        if (isLike) {
          if (currentReaction === "like") {
            likesDiff = -1;
            newReaction = null;
          } else {
            likesDiff = 1;
            dislikesDiff = currentReaction === "dislike" ? -1 : 0;
            newReaction = "like";
          }
        } else {
          if (currentReaction === "dislike") {
            dislikesDiff = -1;
            newReaction = null;
          } else {
            dislikesDiff = 1;
            likesDiff = currentReaction === "like" ? -1 : 0;
            newReaction = "dislike";
          }
        }

        return {
          ...prev,
          likes_count: prev.likes_count + likesDiff,
          dislikes_count: prev.dislikes_count + dislikesDiff,
          user_reaction: newReaction,
        };
      });
    } catch (err) {
      console.error("Topic react error:", err);
    }
  };

  const handleReactReply = async (replyId: number, isLike: boolean) => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    try {
      await api.post(`/community/replies/${replyId}/react/`, { is_like: isLike });
      setReplies((prev) =>
        prev.map((r) => {
          if (r.id === replyId) {
            const currentReaction = r.user_reaction;
            let likesDiff = 0;
            let dislikesDiff = 0;
            let newReaction: "like" | "dislike" | null = null;

            if (isLike) {
              if (currentReaction === "like") {
                likesDiff = -1;
                newReaction = null;
              } else {
                likesDiff = 1;
                dislikesDiff = currentReaction === "dislike" ? -1 : 0;
                newReaction = "like";
              }
            } else {
              if (currentReaction === "dislike") {
                dislikesDiff = -1;
                newReaction = null;
              } else {
                dislikesDiff = 1;
                likesDiff = currentReaction === "like" ? -1 : 0;
                newReaction = "dislike";
              }
            }

            return {
              ...r,
              likes_count: r.likes_count + likesDiff,
              dislikes_count: r.dislikes_count + dislikesDiff,
              user_reaction: newReaction,
            };
          }
          return r;
        })
      );
    } catch (err) {
      console.error("Reply react error:", err);
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || replyLoading || !topic) return;

    setReplyLoading(true);
    try {
      const response = await api.post("/community/replies/", {
        topic: topic.id,
        content: replyContent,
        parent_reply: parentReplyId,
      });

      // Append new reply
      setReplies((prev) => [...prev, response.data]);
      setReplyContent("");
      setParentReplyId(null);
      setParentReplyAuthor(null);
    } catch (err) {
      console.error("Post reply error:", err);
    } finally {
      setReplyLoading(false);
    }
  };

  const handleQuoteAction = (replyId: number, authorName: string) => {
    setParentReplyId(replyId);
    setParentReplyAuthor(authorName);
    const textarea = document.getElementById("reply-textarea");
    if (textarea) {
      textarea.focus();
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-500/10 border-red-500/20 text-red-400";
      case "MODERATOR":
        return "bg-yellow-500/10 border-yellow-500/20 text-yellow-500";
      case "GAMEDEV":
        return "bg-blue-500/10 border-blue-500/20 text-blue-400";
      case "INVESTOR":
        return "bg-green-500/10 border-green-500/20 text-green-400";
      default:
        return "bg-white/5 border-white/5 text-secondary";
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background relative flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!topic) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-white mb-4">Mavzu topilmadi</h1>
        <button onClick={() => router.push("/forum")} className="btn-primary flex items-center space-x-2">
          <ArrowLeft size={16} />
          <span>Forumga qaytish</span>
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none z-0" />

      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20 relative z-10 max-w-4xl">
        <button
          onClick={() => router.push("/forum")}
          className="group text-secondary hover:text-white flex items-center space-x-2 text-sm font-bold mb-8 transition-colors"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Forumga qaytish</span>
        </button>

        {/* Main Topic Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 md:p-8 border-white/5 mb-8"
        >
          <div className="flex items-center space-x-2 text-[10px] mb-4">
            <span className="bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-full font-bold">
              {topic.section_name}
            </span>
            <span className="text-secondary flex items-center">
              <Calendar size={10} className="mr-1" />
              {new Date(topic.created_at).toLocaleDateString("uz-UZ", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-white mb-6 tracking-tight leading-snug">
            {topic.title}
          </h1>

          {/* Author info & content */}
          <div className="flex flex-col sm:flex-row gap-6 border-t border-white/5 pt-6 items-start">
            {/* Author details */}
            <div className="w-full sm:w-40 shrink-0 flex sm:flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                {topic.author_details.avatar ? (
                  <img src={topic.author_details.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={24} className="text-secondary" />
                )}
              </div>
              <div className="sm:text-center">
                <p className="text-sm font-bold text-white">@{topic.author_details.username}</p>
                <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border mt-1 ${getRoleColor(topic.author_details.role)}`}>
                  {topic.author_details.role}
                </span>
              </div>
            </div>

            {/* Content text */}
            <div className="flex-1 text-secondary leading-relaxed text-sm md:text-base whitespace-pre-line font-medium opacity-90">
              {topic.content}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-white/5 mt-8 pt-6 flex items-center justify-between">
            <div className="flex space-x-4">
              <button
                onClick={() => handleReactTopic(true)}
                className={`flex items-center space-x-2 text-xs font-bold transition-colors ${
                  topic.user_reaction === "like" ? "text-primary" : "text-secondary hover:text-white"
                }`}
              >
                <ThumbsUp size={14} className={topic.user_reaction === "like" ? "fill-primary/20" : ""} />
                <span>{topic.likes_count} Like</span>
              </button>
              <button
                onClick={() => handleReactTopic(false)}
                className={`flex items-center space-x-2 text-xs font-bold transition-colors ${
                  topic.user_reaction === "dislike" ? "text-primary" : "text-secondary hover:text-white"
                }`}
              >
                <ThumbsDown size={14} className={topic.user_reaction === "dislike" ? "fill-primary/20" : ""} />
                <span>{topic.dislikes_count} Dislike</span>
              </button>
            </div>

            <div className="flex items-center text-xs text-secondary font-bold uppercase tracking-wider">
              <MessageSquare size={14} className="mr-1.5" />
              <span>{replies.length} javob</span>
            </div>
          </div>
        </motion.div>

        {/* Replies Section */}
        <div className="space-y-6 mb-8">
          <h2 className="text-lg font-black text-white px-2">Javoblar ({replies.length})</h2>
          
          <AnimatePresence mode="popLayout">
            {replies.map((reply) => {
              const quotedReply = replies.find((r) => r.id === reply.parent_reply);
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={reply.id}
                  className="glass-card p-6 border-white/5 relative"
                >
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    {/* User profile */}
                    <div className="w-full sm:w-32 shrink-0 flex sm:flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                        {reply.author_details.avatar ? (
                          <img src={reply.author_details.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} className="text-secondary" />
                        )}
                      </div>
                      <div className="sm:text-center">
                        <p className="text-xs font-bold text-white">@{reply.author_details.username}</p>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider border mt-1 ${getRoleColor(reply.author_details.role)}`}>
                          {reply.author_details.role}
                        </span>
                      </div>
                    </div>

                    {/* Reply content */}
                    <div className="flex-1 space-y-3 w-full">
                      <p className="text-[10px] text-secondary">
                        {new Date(reply.created_at).toLocaleString("uz-UZ")}
                      </p>

                      {/* Render quote if present */}
                      {quotedReply && (
                        <div className="bg-white/5 border-l-2 border-primary/50 p-3 rounded-r-xl text-xs text-secondary italic flex items-start space-x-2">
                          <Quote size={12} className="shrink-0 mt-0.5 opacity-50" />
                          <div className="flex-1">
                            <span className="font-bold text-white not-italic block mb-1">@{quotedReply.author_details.username} yozdi:</span>
                            <span className="line-clamp-2">{quotedReply.content}</span>
                          </div>
                        </div>
                      )}

                      <p className="text-secondary text-sm leading-relaxed whitespace-pre-line font-medium opacity-90">
                        {reply.content}
                      </p>
                    </div>
                  </div>

                  {/* Actions (Like, Dislike, Quote) */}
                  <div className="flex items-center justify-between border-t border-white/5 mt-4 pt-4">
                    <div className="flex space-x-4">
                      <button
                        onClick={() => handleReactReply(reply.id, true)}
                        className={`flex items-center space-x-1.5 text-[10px] font-bold transition-colors ${
                          reply.user_reaction === "like" ? "text-primary" : "text-secondary hover:text-white"
                        }`}
                      >
                        <ThumbsUp size={12} className={reply.user_reaction === "like" ? "fill-primary/20" : ""} />
                        <span>{reply.likes_count}</span>
                      </button>
                      <button
                        onClick={() => handleReactReply(reply.id, false)}
                        className={`flex items-center space-x-1.5 text-[10px] font-bold transition-colors ${
                          reply.user_reaction === "dislike" ? "text-primary" : "text-secondary hover:text-white"
                        }`}
                      >
                        <ThumbsDown size={12} className={reply.user_reaction === "dislike" ? "fill-primary/20" : ""} />
                        <span>{reply.dislikes_count}</span>
                      </button>
                    </div>

                    {isAuthenticated && !topic.is_locked && (
                      <button
                        onClick={() => handleQuoteAction(reply.id, reply.author_details.username)}
                        className="text-[10px] text-secondary hover:text-primary font-bold flex items-center space-x-1"
                      >
                        <Quote size={10} />
                        <span>Javob berish</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Reply Form */}
        {topic.is_locked ? (
          <div className="bg-red-500/5 border border-red-500/10 text-red-400 text-xs rounded-2xl p-4 flex items-center justify-center space-x-2">
            <Lock size={14} />
            <span className="font-bold uppercase tracking-wider">Ushbu mavzu yopilgan. Javob yozib bo'lmaydi.</span>
          </div>
        ) : isAuthenticated ? (
          <form onSubmit={handlePostReply} className="glass-card p-6 border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Mavzuga javob yozish</span>
              
              {parentReplyId !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setParentReplyId(null);
                    setParentReplyAuthor(null);
                  }}
                  className="text-[10px] text-red-400 hover:underline font-bold"
                >
                  Iqtibosni bekor qilish
                </button>
              )}
            </div>

            {/* Parent reply indicator */}
            {parentReplyId !== null && (
              <div className="bg-primary/5 border border-primary/20 px-4 py-2 rounded-xl text-xs text-secondary">
                Foydalanuvchi <span className="text-white font-bold">@{parentReplyAuthor}</span> ning javobiga iqtibos olinyapti.
              </div>
            )}

            <div className="relative">
              <textarea
                id="reply-textarea"
                rows={4}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Fikringizni shu yerga yozing..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-sm text-white transition-colors resize-none pr-12"
              />
              <button
                type="submit"
                disabled={replyLoading || !replyContent.trim()}
                className="absolute right-3 bottom-4 p-2 bg-primary hover:bg-primary/95 text-white rounded-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send size={14} />
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white/5 border border-white/5 text-secondary text-xs rounded-2xl p-6 text-center">
            Javob yozish uchun iltimos{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">
              tizimga kiring
            </Link>
            .
          </div>
        )}
      </div>
    </main>
  );
};

export default TopicDetailPage;
