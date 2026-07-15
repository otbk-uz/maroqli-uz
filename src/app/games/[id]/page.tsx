"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Monitor, Smartphone, Star, Shield, Cpu, ChevronRight, Check, ShoppingCart, Key, Crown, Clock, X, Upload, FileText, Download, Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { BackButton } from "@/components/ui/BackButton";

interface Review {
  id: number;
  user_details: {
    username: string;
    full_name: string;
  };
  rating: number;
  content: string;
  created_at: string;
}

interface GameDetail {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: string;
  premium_price?: string | null;
  platform: string;
  language: string;
  rating: number;
  sys_requirements: string;
  trailer_url: string | null;
  developer_details: {
    username: string;
    full_name: string;
  };
  cover: string | null;
  screenshots: { id: number; image: string }[];
  reviews: Review[];
  download_url?: string | null;
  executable_path?: string | null;
}

const GameDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const { isAuthenticated, user } = useAuthStore();

  const [game, setGame] = useState<GameDetail | null>(null);
  const [libraryGames, setLibraryGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [boughtCdKey, setBoughtCdKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Payment states
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<any | null>(null);

  // Reviews states
  const [newReview, setNewReview] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Electron launch states
  const [isElectron, setIsElectron] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installProgress, setInstallProgress] = useState<number | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && 'electron' in window);
  }, []);

  useEffect(() => {
    if (isElectron && game && game.executable_path) {
      // Check installation status
      const checkStatus = async () => {
        const installed = await (window as any).electron.checkInstalled(game.slug, game.executable_path);
        setIsInstalled(installed);
      };
      checkStatus();

      // Listen to download progress
      const unsubscribe = (window as any).electron.onDownloadProgress((data: any) => {
        if (data.slug === game.slug) {
          setInstallProgress(data.progress);
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [isElectron, game]);

  const handleInstallGame = async () => {
    if (!game || !game.download_url || !game.executable_path) return;
    try {
      setInstalling(true);
      setInstallProgress(0);
      const res = await (window as any).electron.downloadGame(game.slug, game.download_url, game.executable_path);
      if (!res.success) {
        alert(res.error || "O'yinni yuklab olishda xatolik yuz berdi.");
        setInstalling(false);
        setInstallProgress(null);
      } else {
        setInstalling(false);
        setIsInstalled(true);
        setInstallProgress(null);
        
        // Avtomatik ravishda o'yinni ishga tushiramiz
        const launchRes = await (window as any).electron.launchGame(game.slug, game.executable_path);
        if (!launchRes.success) {
          alert(launchRes.error || "O'yinni ishga tushirishda xatolik yuz berdi.");
        }
      }
    } catch (err) {
      console.error(err);
      setInstalling(false);
      setInstallProgress(null);
    }
  };

  const handleLaunchGame = async () => {
    if (!game || !game.executable_path) return;
    try {
      const res = await (window as any).electron.launchGame(game.slug, game.executable_path);
      if (!res.success) {
        alert(res.error || "O'yinni ishga tushirishda xatolik yuz berdi.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleWebDownloadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // 1. Launcherni ochishga harakat qilamiz (agar o'rnatilgan bo'lsa)
    window.location.href = `maroqli://games/${id}`;
    
    // 2. 1.5 soniyadan keyin, agar Launcher ochilmagan bo'lsa, o'rnatish exe faylini yuklashni boshlaydi
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = 'https://github.com/otbk-uz/maroqli-uz/releases/download/v1.0.0/maroqli-setup.exe';
      link.download = 'maroqli-setup.exe';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 1500);
  };

  useEffect(() => {
    if (!id) return;

    const fetchGameData = async () => {
      try {
        // Fetch from Supabase instead of Django
        const { data: gameData, error: gameError } = await supabase
          .from('developed_games')
          .select('*, profiles:developer_id(username, full_name)')
          .eq('id', id)
          .single();

        if (gameError) throw gameError;

        // Fetch reviews (fail-safe in case game_reviews table is not migrated in Supabase)
        let reviewsData = [];
        try {
          const { data, error: reviewsError } = await supabase
            .from('game_reviews')
            .select('*, profiles:user_id(username, full_name)')
            .eq('game_id', id)
            .order('created_at', { ascending: false });

          if (!reviewsError && data) {
            reviewsData = data;
          } else if (reviewsError) {
            console.warn("Reviews table fetch warning:", reviewsError.message);
          }
        } catch (reviewErr) {
          console.warn("Reviews fetch exception:", reviewErr);
        }

        if (gameData) {
          setGame({
            id: gameData.id,
            title: gameData.title,
            slug: gameData.slug,
            description: gameData.description,
            price: gameData.price?.toString() || '0',
            premium_price: gameData.premium_price?.toString() || null,
            platform: gameData.platform,
            language: gameData.language || 'O\'zbek',
            rating: gameData.rating || 5.0,
            sys_requirements: gameData.sys_requirements,
            trailer_url: null,
            developer_details: {
              username: gameData.profiles?.username || 'developer',
              full_name: gameData.profiles?.full_name || 'Developer'
            },
            cover: gameData.cover || null,
            screenshots: [],
            download_url: gameData.download_url,
            executable_path: gameData.executable_path || null,
            reviews: reviewsData ? reviewsData.map((r: any) => ({
              id: r.id,
              user_details: {
                username: r.profiles?.username || 'user',
                full_name: r.profiles?.full_name || 'User'
              },
              rating: r.rating,
              content: r.content,
              created_at: r.created_at
            })) : []
          } as any);
        }
        
        if (isAuthenticated && user) {
          const { data: libraryData, error: libraryError } = await supabase
            .from('bought_games')
            .select('*')
            .eq('user_id', user.id);

          if (!libraryError && libraryData) {
            setLibraryGames(libraryData);
          }

          const { data: payRequests } = await supabase
            .from('payment_requests')
            .select('*')
            .eq('user_id', user.id)
            .eq('item_id', id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (payRequests && payRequests.length > 0) {
            setPaymentRequest(payRequests[0]);
          }
        }
      } catch (err) {
        console.error("Game detail fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();
  }, [id, isAuthenticated]);

  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }
    if (!newReview.trim()) return;

    setReviewLoading(true);
    try {
      const { data, error } = await supabase.from('game_reviews').insert({
        game_id: id,
        user_id: user.id,
        rating: rating,
        content: newReview
      }).select('*, profiles:user_id(username, full_name)').single();

      if (error) throw error;

      if (data) {
        const newReviewObj = {
          id: data.id,
          user_details: {
            username: data.profiles?.username || user.username || 'user',
            full_name: data.profiles?.full_name || user.full_name || 'User'
          },
          rating: data.rating,
          content: data.content,
          created_at: data.created_at
        };
        setGame((prev: any) => prev ? { ...prev, reviews: [newReviewObj, ...prev.reviews] } : null);
        setNewReview("");
        setRating(5);
      }
    } catch (err) {
      console.error("Post review error:", err);
      alert("Izoh yuborishda xatolik yuz berdi.");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleBuyGame = () => {
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }
    setShowCheckoutModal(true);
  };

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile || !user || !game) return;

    setSubmittingPayment(true);
    try {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_receipt.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      const finalPrice = user.is_premium
        ? (game.premium_price ? Number(game.premium_price) : Math.round(Number(game.price) * 0.8))
        : Number(game.price);

      // 1. Client side insert first to pass user RLS policies securely
      const { data: requestData, error: insertError } = await supabase
        .from('payment_requests')
        .insert({
          user_id: user.id,
          item_type: 'GAME',
          item_id: game.id,
          amount: finalPrice,
          receipt_url: publicUrl,
          status: 'PENDING'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Call backend to send Telegram notifications
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/payments/submit-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || useAuthStore.getState().token || ''}`,
        },
        body: JSON.stringify({
          requestId: requestData.id,
          itemType: 'GAME',
          itemId: game.id,
          amount: finalPrice,
          receiptUrl: publicUrl,
          itemName: game.title,
          username: user.username || user.email?.split('@')[0] || 'username'
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "To'lov arizasini yuborishda xatolik yuz berdi.");
      }

      alert("To'lov cheki yuborildi! Admin tasdiqlashi bilan o'yin kaliti faollashadi.");
      setShowCheckoutModal(false);
      setReceiptFile(null);

      setPaymentRequest({
        id: resData.requestId,
        status: 'PENDING',
        receipt_url: publicUrl,
        amount: finalPrice
      });
    } catch (err: any) {
      console.error("Receipt submission error:", err);
      alert(err.message || "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background relative flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-secondary text-xs font-bold uppercase tracking-widest">Yuklanmoqda...</p>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-white mb-4">O'yin topilmadi</h1>
        <button onClick={() => router.push("/games")} className="btn-primary flex items-center space-x-2">
          <ArrowLeft size={16} />
          <span>Do'konga qaytish</span>
        </button>
      </main>
    );
  }

  const isPurchased = libraryGames.some((lg: any) => lg.game_id === game.id);
  const existingCdKey = libraryGames.find((lg: any) => lg.game_id === game.id)?.cd_key;

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />

      {/* Banner */}
      <div className="h-64 md:h-96 w-full relative overflow-hidden border-b border-white/5">
        {game.cover ? (
          <img
            src={game.cover}
            alt={game.title}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(90rem_44rem_at_50%_-45%,rgba(255,51,85,0.20),transparent_60%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-32 relative z-10 pb-20 max-w-5xl">
        <button 
          onClick={() => router.push("/games")}
          className="group text-secondary hover:text-white flex items-center space-x-2 text-sm font-bold mb-8 transition-colors"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Do'konga qaytish</span>
        </button>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Main Content */}
          <div className="flex-1 space-y-8">
            <div className="glass-card p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="bg-white/10 px-3.5 py-1 rounded-full text-xs font-bold uppercase text-secondary flex items-center gap-1">
                  {game.platform === "PC" ? <Monitor size={12} /> : <Smartphone size={12} />}
                  {game.platform}
                </span>
                <span className="bg-white/10 px-3.5 py-1 rounded-full text-xs font-bold uppercase text-secondary">
                  {game.language}
                </span>
                <div className="bg-black/60 border border-white/5 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Star size={12} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-xs font-bold text-white tabular-nums">{Number(game.rating).toFixed(1)}</span>
                </div>
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
                {game.title}
              </h1>

              <p className="text-xs text-secondary font-bold uppercase tracking-widest mb-3">Tavsif</p>
              <p className="text-secondary text-sm md:text-base leading-relaxed whitespace-pre-line opacity-95">
                {game.description}
              </p>
            </div>

            {/* Screenshots */}
            {game.screenshots && game.screenshots.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-black text-white">Screenshotlar</h3>
                <div className="grid grid-cols-2 gap-4">
                  {game.screenshots.map((s: any) => (
                    <div key={s.id} className="aspect-video bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                      <img src={s.image} alt="Screenshot" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Requirements */}
            <div className="glass-card p-6 md:p-8 space-y-4">
              <h3 className="font-black text-white flex items-center gap-2">
                <Cpu size={20} className="text-primary" />
                <span>Tizim talablari</span>
              </h3>
              <div className="text-secondary text-sm leading-relaxed whitespace-pre-line opacity-80 border-t border-white/5 pt-4">
                {game.sys_requirements || "Tizim talablari ko'rsatilmagan."}
              </div>
            </div>

            {/* Reviews */}
            <div className="space-y-6">
              <h3 className="text-lg font-black text-white px-2">Foydalanuvchilar sharhlari ({game.reviews.length})</h3>

              {/* Add Review Form */}
              {isAuthenticated ? (
                <form onSubmit={handlePostReview} className="glass-card p-6 border-white/5 space-y-4 mb-8">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">O'yin haqida fikringiz</h4>
                  <div className="flex items-center space-x-2 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className="focus:outline-none"
                      >
                        <Star 
                          size={20} 
                          className={star <= rating ? "text-yellow-500 fill-yellow-500 transition-all" : "text-white/20 hover:text-yellow-500/50 transition-all"} 
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    value={newReview}
                    onChange={(e) => setNewReview(e.target.value)}
                    placeholder="Izoh yozing..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-sm text-white transition-colors resize-none"
                  />
                  <button
                    type="submit"
                    disabled={reviewLoading || !newReview.trim()}
                    className="btn-primary py-3 px-6 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reviewLoading ? "Yuborilmoqda..." : "Izoh qoldirish"}
                  </button>
                </form>
              ) : (
                <div className="bg-white/5 border border-white/5 text-secondary text-xs rounded-2xl p-6 text-center mb-8">
                  Izoh qoldirish uchun iltimos <Link href="/login" className="text-primary font-bold hover:underline">tizimga kiring</Link>.
                </div>
              )}
              
              {game.reviews.length === 0 ? (
                <div className="bg-white/5 border border-white/5 p-6 rounded-2xl text-center text-xs text-secondary">
                  O'yinga hali sharhlar yozilmagan.
                </div>
              ) : (
                <div className="space-y-4">
                  {game.reviews.map((rev: Review) => (
                    <div key={rev.id} className="glass-card p-5 border-white/5 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white">@{rev.user_details.username}</span>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              size={12} 
                              className={i < rev.rating ? "text-yellow-500 fill-yellow-500" : "text-white/20"} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-secondary text-xs leading-relaxed opacity-90">{rev.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Purchase */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="glass-card p-6 sticky top-32 space-y-6">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Shield size={18} className="text-primary" />
                <span>Sotib olish</span>
              </h3>

              <div className="space-y-2 border-b border-white/5 pb-6">
                <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">O'yin narxi</p>
                {Number(game.price) > 0 ? (
                  user?.is_premium ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-3xl font-black text-amber-400 font-display tabular-nums">
                          {game.premium_price ? Number(game.premium_price).toLocaleString() : Math.round(Number(game.price) * 0.8).toLocaleString()} <span className="text-lg">UZS</span>
                        </p>
                        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                          <Crown size={10} className="fill-current" />
                          {game.premium_price 
                            ? `-${Math.round((1 - Number(game.premium_price) / Number(game.price)) * 100)}% PRO`
                            : "-20% PRO"
                          }
                        </span>
                      </div>
                      <p className="text-xs text-secondary line-through font-semibold tabular-nums">
                        {Number(game.price).toLocaleString()} UZS (Asl narxi)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-3xl font-black text-white font-display tabular-nums">
                        {Number(game.price).toLocaleString()} <span className="text-lg text-secondary">UZS</span>
                      </p>
                      <div className="bg-gradient-to-r from-amber-500/5 to-transparent border border-amber-500/15 p-2.5 rounded-xl flex items-center gap-2">
                        <Crown size={12} className="text-amber-400 fill-current shrink-0" />
                        <p className="text-[10px] text-amber-400 font-bold leading-normal">
                          Premium bilan: <span className="underline tabular-nums">
                            {game.premium_price ? Number(game.premium_price).toLocaleString() : Math.round(Number(game.price) * 0.8).toLocaleString()} UZS
                          </span>
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="text-3xl font-black text-emerald-400 font-display">BEPUL</p>
                )}
              </div>

              {isPurchased || Number(game.price) === 0 ? (
                <div className="space-y-4">
                  {isPurchased && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl p-4 flex items-start space-x-2">
                      <Check size={16} className="shrink-0 mt-0.5" />
                      <span className="font-bold uppercase tracking-wide">Kutubxonangizda mavjud</span>
                    </div>
                  )}

                  {isPurchased && existingCdKey && (
                    <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-2">
                      <p className="text-[9px] text-secondary uppercase font-bold tracking-widest">Sizning CD-keyingiz</p>
                      <div className="flex items-center justify-between gap-2 bg-black/40 px-3 py-2.5 rounded-lg border border-white/5">
                        <code className="text-xs text-white font-mono select-all truncate">{existingCdKey}</code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(existingCdKey);
                            alert("CD-key nusxalandi!");
                          }}
                          className="text-secondary hover:text-primary transition-colors shrink-0"
                          title="Nusxalash"
                        >
                          <Key size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {isElectron && game.executable_path ? (
                    isInstalled ? (
                      <button
                        onClick={handleLaunchGame}
                        className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                      >
                        <Gamepad2 size={14} />
                        <span>O'yinni ishga tushirish (O'ynash)</span>
                      </button>
                    ) : installing ? (
                      <div className="w-full py-3.5 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span>Yuklanmoqda: {installProgress}%</span>
                        </div>
                        <div className="w-11/12 bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-primary h-full transition-all duration-300" style={{ width: `${installProgress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleInstallGame}
                        className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                      >
                        <Download size={14} />
                        <span>Yuklab olish va O'rnatish</span>
                      </button>
                    )
                  ) : (
                    game.download_url && (
                      <button
                        onClick={handleWebDownloadClick}
                        className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                      >
                        <Download size={14} />
                        <span>Launcher orqali yuklab olish</span>
                      </button>
                    )
                  )}
                </div>
              ) : paymentRequest?.status === 'PENDING' ? (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-xl p-4 flex flex-col space-y-2">
                  <div className="flex items-start space-x-2">
                    <Clock size={16} className="shrink-0 mt-0.5" />
                    <span className="font-bold uppercase tracking-wide text-[10px]">To'lov tekshirilmoqda</span>
                  </div>
                  <p className="text-[11px] text-secondary leading-relaxed">
                    Siz yuborgan to'lov cheki admin tomonidan tasdiqlanish jarayonida. Tasdiqlangach, o'yin kaliti shu yerda faollashadi.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentRequest?.status === 'REJECTED' && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-4 flex flex-col space-y-2">
                      <div className="flex items-start space-x-2">
                        <X size={16} className="shrink-0 mt-0.5" />
                        <span className="font-bold uppercase tracking-wide text-[10px]">To'lov rad etildi</span>
                      </div>
                      <p className="text-[11px] text-secondary leading-relaxed">
                        Yuborilgan to'lov tasdiqlanmadi (rad etildi). Iltimos, qayta to'lov qilib chekni yuklang.
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleBuyGame}
                    disabled={purchaseLoading}
                    className="btn-primary w-full py-4 text-sm font-bold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {purchaseLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShoppingCart size={16} />
                        <span>{paymentRequest?.status === 'REJECTED' ? "Qayta urinish" : "Sotib olish"}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="text-[10px] text-secondary leading-normal text-center opacity-75">
                Tasdiqlangandan so'ng o'yin CD-keyi taqdim etiladi va kutubxonangizga (/profile/library) qo'shiladi.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success CD Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-[#121214] border border-primary/30 p-8 rounded-3xl text-center relative overflow-hidden"
          >
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            
            <div className="w-16 h-16 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <Key size={28} />
            </div>

            <h3 className="text-2xl font-black text-white mb-2">Haridingiz uchun rahmat!</h3>
            <p className="text-secondary text-xs mb-6">Ushbu o'yin CD-keyini nusxalab oling. U kutubxonangizda saqlanib qoladi.</p>

            <div className="bg-black/60 border border-white/10 rounded-2xl p-4 mb-6 flex items-center justify-between">
              <code className="text-sm text-white font-mono select-all tracking-wider">{boughtCdKey}</code>
              <button 
                onClick={() => {
                  if (boughtCdKey) {
                    navigator.clipboard.writeText(boughtCdKey);
                    alert("CD-Key nusxalandi!");
                  }
                }}
                className="text-xs text-primary font-bold hover:underline"
              >
                Nusxalash
              </button>
            </div>

            <button
              onClick={() => setShowKeyModal(false)}
              className="btn-primary w-full py-4 text-xs uppercase tracking-wider font-bold"
            >
              Yopish
            </button>
          </motion.div>
        </div>
      )}

      {/* Checkout Modal (Humo/Uzcard check upload) */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-[#121214] border border-white/5 p-6 md:p-8 rounded-3xl relative">
            <button
              onClick={() => {
                setShowCheckoutModal(false);
                setReceiptFile(null);
              }}
              className="absolute top-4 right-4 text-secondary hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
              <ShoppingCart size={20} className="text-primary" />
              <span>To'lov Tafsilotlari</span>
            </h3>

            <form onSubmit={handleSubmitReceipt} className="space-y-6">
              <div className="bg-white/5 rounded-2xl p-5 border border-white/5 space-y-4">
                <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">Karta raqami (P2P)</p>
                <div className="flex items-center justify-between bg-black/40 px-4 py-3 rounded-xl border border-white/5">
                  <div>
                    <code className="text-base text-white font-mono select-all tracking-wider">9860 0101 3799 2664</code>
                    <p className="text-[9px] text-secondary mt-1 uppercase font-bold">Humo</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("9860010137992664");
                      alert("Karta raqami nusxalandi!");
                    }}
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    Nusxalash
                  </button>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-secondary">Karta Egasi (F.I.SH):</span>
                  <span className="font-bold text-white uppercase">Zokirjonov Isfandiyor</span>
                </div>

                <div className="flex justify-between items-center text-xs border-t border-white/5 pt-3">
                  <span className="text-secondary">To'lov summasi:</span>
                  <span className="font-black text-amber-400 text-sm tabular-nums">
                    {user?.is_premium
                      ? `${game.premium_price ? Number(game.premium_price).toLocaleString() : Math.round(Number(game.price) * 0.8).toLocaleString()} UZS (Premium ${game.premium_price ? `-${Math.round((1 - Number(game.premium_price) / Number(game.price)) * 100)}%` : '-20%'})`
                      : `${Number(game.price).toLocaleString()} UZS`
                    }
                  </span>
                </div>
              </div>

              <div className="text-xs text-secondary leading-relaxed bg-primary/5 border border-primary/10 p-4 rounded-xl">
                <span className="font-bold text-white">Yo'riqnoma.</span> Istalgan to'lov ilovasi (Click, Payme, Uzum va hokazo) orqali yuqoridagi kartaga ko'rsatilgan summani o'tkazing va to'lov muvaffaqiyatli bo'lgani haqidagi <span className="font-bold text-white">chek skrinshotini</span> pastda yuklang.
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary block">To'lov Cheki (Skrinshot)</label>
                <div className="relative border border-dashed border-white/10 hover:border-primary/50 transition-colors rounded-2xl p-6 text-center cursor-pointer bg-black/20">
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setReceiptFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {receiptFile ? (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileText size={24} className="text-primary" />
                      <p className="text-xs font-bold text-white truncate max-w-xs">{receiptFile.name}</p>
                      <p className="text-[10px] text-secondary">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 text-secondary">
                      <Upload size={24} className="mx-auto" />
                      <p className="text-xs font-bold">Chek rasmini yuklash uchun bosing</p>
                      <p className="text-[10px] text-secondary/60">PNG, JPG formatlar (maksimal 5MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCheckoutModal(false);
                    setReceiptFile(null);
                  }}
                  className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/5"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="flex-1 btn-primary py-3.5 text-xs font-bold flex items-center justify-center space-x-2"
                >
                  {submittingPayment ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>To'lovni tasdiqlashga yuborish</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default GameDetailPage;
