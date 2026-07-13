"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { BackButton } from "@/components/ui/BackButton";
import { useAuthStore, useTranslation } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { WhiteLabelPlayer } from "@/components/WhiteLabelPlayer";
import { BookOpen, RefreshCw, Crown, Award, Play, Send, Trash2, User, MessageSquare } from "lucide-react";
import Link from "next/link";
import { getCachedData, setCachedData } from "@/lib/cache";

interface Lesson {
  id: string;
  title: string;
  author: string;
  level: string;
  img: string;
  video_url: string;
}

interface Comment {
  id: string;
  lesson_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url: string;
  }
}

export default function LessonDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [playlistLessons, setPlaylistLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  // Comments states
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);

  const lessonId = params.id as string;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch comments
  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const { data, error } = await supabase
        .from("gamedev_lesson_comments")
        .select(`
          *,
          profiles:user_id(username, full_name, avatar_url)
        `)
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error("Comments fetch error:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;

    const loadCachedLesson = () => {
      const cachedLesson = getCachedData<Lesson>(`lesson_${lessonId}`);
      const cachedPlaylist = getCachedData<Lesson[]>(`lesson_playlist_${lessonId}`);

      if (cachedLesson) setLesson(cachedLesson);
      if (cachedPlaylist) setPlaylistLessons(cachedPlaylist);

      if (cachedLesson && cachedPlaylist) {
        setLoading(false);
      }
    };

    loadCachedLesson();

    const fetchLessonData = async () => {
      try {
        // Fetch lesson detail from DB
        const { data: lessonData, error } = await supabase
          .from("gamedev_lessons")
          .select("*")
          .eq("id", lessonId)
          .single();

        if (error || !lessonData) {
          const cached = getCachedData<Lesson>(`lesson_${lessonId}`);
          if (cached) {
            setLesson(cached);
          } else {
            router.push("/gamedev");
            return;
          }
        } else {
          setLesson(lessonData);
          setCachedData(`lesson_${lessonId}`, lessonData);
        }

        // Fetch all lessons of the same course level
        const currentLevel = lessonData?.level || "Boshlang'ich";
        const { data: listData } = await supabase
          .from("gamedev_lessons")
          .select("*")
          .eq("level", currentLevel)
          .order("created_at", { ascending: true });

        const dbLessons = listData || [];
        setPlaylistLessons(dbLessons as Lesson[]);
        setCachedData(`lesson_playlist_${lessonId}`, dbLessons as Lesson[]);
      } catch (err) {
        console.error("Dars ma'lumotlarini yuklashda xatolik:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLessonData();
    fetchComments();
  }, [lessonId, isAuthenticated, user, mounted]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from("gamedev_lesson_comments")
        .insert({
          lesson_id: lessonId,
          user_id: user.id,
          content: newComment.trim()
        })
        .select(`
          *,
          profiles:user_id(username, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      setComments(prev => [data, ...prev]);
      setNewComment("");
    } catch (err: any) {
      console.error("Post comment error:", err);
      alert(err.message || "Izoh qoldirishda xatolik yuz berdi");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Haqiqatan ham ushbu izohni o'chirmoqchimisiz?")) return;
    try {
      const { error } = await supabase
        .from("gamedev_lesson_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err: any) {
      console.error("Delete comment error:", err);
      alert(err.message || "Izohni o'chirishda xatolik yuz berdi");
    }
  };

  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-white">
        <RefreshCw className="animate-spin text-primary mb-4" size={40} />
        <p className="text-secondary text-sm">Darslik yuklanmoqda...</p>
      </div>
    );
  }

  if (!lesson) return null;

  const currentLessonIndex = playlistLessons.findIndex(l => l.id === lesson.id);

  return (
    <main className="min-h-screen bg-background text-white">
      <Navbar />

      <div className="container mx-auto px-4 md:px-6 pt-24 md:pt-32 pb-12 md:pb-20 max-w-6xl">
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Player and Title Info (Takes 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Custom styled white label player with user watermark */}
            <WhiteLabelPlayer 
              url={lesson.video_url} 
              userIdentifier={user?.email || user?.username} 
            />

            {/* Lesson Details Card */}
            <div className="glass-card p-4 sm:p-6 md:p-8 border border-white/5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <span className="bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md">
                    {lesson.level}
                  </span>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black mt-2 text-white">{lesson.title}</h1>
                </div>
                <div className="flex items-center space-x-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm self-start sm:self-auto">
                  <Crown size={14} />
                  <span>PREMIUM DARS</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-secondary text-xs uppercase font-bold tracking-wider">Darslik Muallifi</p>
                  <p className="font-bold text-white mt-1">{lesson.author}</p>
                </div>
                <div className="text-right">
                  <p className="text-secondary text-xs uppercase font-bold tracking-wider">Platforma</p>
                  <p className="font-bold text-primary mt-1">MAROQLI.uz</p>
                </div>
              </div>

              <div className="pt-2 text-secondary text-sm leading-relaxed space-y-2">
                <p>Ushbu video darslik orqali o'yin yaratish sohasidagi ko'nikmalarni bosqichma-bosqich o'rganishingiz mumkin.</p>
                <p>O'yinlar yaratish va ularni platformamiz do'koniga joylashtirib daromad olishni bugundanoq boshlang!</p>
              </div>
            </div>

            {/* Comments Section */}
            <div className="glass-card p-4 sm:p-6 md:p-8 border border-white/5 space-y-6">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b border-white/5 pb-3">
                <MessageSquare size={18} className="text-primary" />
                <span>Izohlar ({comments.length})</span>
              </h3>

              {/* Add Comment Form */}
              {isAuthenticated && user ? (
                <form onSubmit={handlePostComment} className="flex gap-4">
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center font-bold text-xs shrink-0 select-none text-white">
                    {user.username?.[0]?.toUpperCase() || <User size={12} />}
                  </div>
                  <div className="flex-1 space-y-3">
                    <textarea
                      placeholder="Izoh qoldiring..."
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-sm text-white resize-none"
                    />
                    <button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="btn-primary !py-2 !px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ml-auto disabled:opacity-50"
                    >
                      {submittingComment ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={12} />
                          <span>Yuborish</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-4 bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-secondary text-sm">
                    Izoh qoldirish uchun{" "}
                    <Link href="/login" className="text-primary font-bold hover:underline">
                      tizimga kiring
                    </Link>
                    .
                  </p>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-4">
                {loadingComments ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="animate-spin text-primary" size={24} />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-center text-secondary text-xs py-8">Birinchi bo'lib izoh qoldiring!</p>
                ) : (
                  <div className="divide-y divide-white/5 space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-4 pt-4 first:pt-0 group">
                        <div className="w-9 h-9 rounded-full bg-white/10 border border-white/5 overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs select-none">
                          {comment.profiles?.avatar_url ? (
                            <img src={comment.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                          ) : (
                            comment.profiles?.username?.[0]?.toUpperCase() || <User size={12} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-sm text-white mr-2">
                                {comment.profiles?.full_name || comment.profiles?.username || "Foydalanuvchi"}
                              </span>
                              <span className="text-[10px] text-secondary">
                                @{comment.profiles?.username}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-secondary">
                                {new Date(comment.created_at).toLocaleDateString()}
                              </span>
                              {user && user.id === comment.user_id && (
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                  title="O'chirish"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-secondary mt-1.5 leading-relaxed break-words">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* YouTube-style playlist sidebar (Takes 1 col) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-0 border border-white/5 overflow-hidden shadow-2xl">
              {/* Playlist Header */}
              <div className="p-5 bg-white/[0.02] border-b border-white/5">
                <span className="text-[10px] text-primary font-bold uppercase tracking-widest block mb-1">KURS PLEYLISTI</span>
                <h3 className="font-display font-black text-base text-white tracking-tight uppercase line-clamp-1">
                  {lesson.level} daraja
                </h3>
                <span className="text-[11px] text-secondary font-medium block mt-1.5">
                  {currentLessonIndex !== -1 ? currentLessonIndex + 1 : 1} / {playlistLessons.length} darslik
                </span>
              </div>

              {/* Playlist items container */}
              <div className="flex flex-col max-h-[420px] overflow-y-auto custom-scrollbar divide-y divide-white/5">
                {playlistLessons.map((item, index) => {
                  const isActive = item.id === lesson.id;
                  return (
                    <Link 
                      key={item.id} 
                      href={`/gamedev/lessons/${item.id}`}
                      className={`flex items-center gap-3 p-4 transition-all duration-300 group ${
                        isActive 
                          ? "bg-primary/10 border-l-4 border-l-primary text-white" 
                          : "hover:bg-white/5 text-secondary hover:text-white"
                      }`}
                    >
                      {/* Tartuib raqami yoki play icon */}
                      <span className="w-5 shrink-0 text-center font-display text-xs font-black tabular-nums">
                        {isActive ? (
                          <span className="text-primary flex justify-center animate-pulse">▶</span>
                        ) : (
                          index + 1
                        )}
                      </span>

                      {/* Thumbnail */}
                      <div className="w-20 aspect-video rounded-lg overflow-hidden bg-black/40 border border-white/10 relative flex-shrink-0">
                        <img 
                          src={item.img} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play size={10} className="text-white fill-current" />
                        </div>
                      </div>

                      {/* Title & Author */}
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-bold text-[11px] leading-snug line-clamp-2 transition-colors ${
                          isActive ? "text-primary" : "text-white group-hover:text-primary"
                        }`}>
                          {item.title}
                        </h4>
                        <span className="text-[9px] text-secondary mt-1 block">Muallif: {item.author}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Barcha uchun bepul banner */}
            <div className="glass-card p-6 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent text-center space-y-4">
              <Award className="text-emerald-400 mx-auto" size={32} />
              <h4 className="font-bold text-sm text-white">Barcha uchun bepul!</h4>
              <p className="text-[11px] text-secondary leading-relaxed">
                Ushbu darslik Maroqli.uz jamoasi tomonidan barcha foydalanuvchilarga bepul taqdim etilmoqda.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

