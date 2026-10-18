"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { User, Settings, Shield, Award, LogOut, ChevronRight, Star, Camera, Check, X, Edit3, Crown, Gamepad2, Download, Zap, TrendingUp, Heart, Trash2, ShoppingCart, Trophy, CalendarPlus, Bookmark, Eye, Radio, Bell, Play, Flame, Sparkles, MessageSquare, Newspaper, ArrowRight, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore, useTranslation } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { BackButton } from "../../components/ui/BackButton";

const ProfilePage = () => {
  const router = useRouter();
  const { user, isAuthenticated, logout, setAuth, token } = useAuthStore();
  const { t, locale } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localeStr = locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US';

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    username: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeSetting, setActiveSetting] = useState<string | null>(null);

  // Streamer state
  const [streamerData, setStreamerData] = useState<any>(null);
  const [streamForm, setStreamForm] = useState({
    stream_url: "",
    platform: "Twitch",
    game: "",
    title: "",
    is_live: false
  });
  const [savingStream, setSavingStream] = useState(false);



  const [libraryGames, setLibraryGames] = useState<any[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [wishlistGames, setWishlistGames] = useState<any[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [purchasePlanGames, setPurchasePlanGames] = useState<any[]>([]);
  const [loadingPurchasePlan, setLoadingPurchasePlan] = useState(false);
  const [activeWishlistTab, setActiveWishlistTab] = useState<"wishlist" | "plan">("wishlist");
  const [userScores, setUserScores] = useState<any[]>([]);
  const [loadingScores, setLoadingScores] = useState(false);

  // Kuzatuvchi (Viewer) & Role states
  const [mounted, setMounted] = useState(false);
  const [followedStreamers, setFollowedStreamers] = useState<any[]>([]);
  const [loadingFollowed, setLoadingFollowed] = useState(false);
  const [upgradingRole, setUpgradingRole] = useState(false);
  const [selectedUpgradeRole, setSelectedUpgradeRole] = useState("GAMER");
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [liveStreamers, setLiveStreamers] = useState<any[]>([]);
  const [featuredFreeGames, setFeaturedFreeGames] = useState<any[]>([]);
  const [loadingViewerContent, setLoadingViewerContent] = useState(false);

  // Electron launch states for Library
  const [isElectron, setIsElectron] = useState(false);
  const [installedGames, setInstalledGames] = useState<Record<string, boolean>>({});
  const [installProgress, setInstallProgress] = useState<Record<string, number>>({});
  const [installingGames, setInstallingGames] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
    setIsElectron(typeof window !== 'undefined' && 'electron' in window);
  }, []);

  useEffect(() => {
    if (isElectron && libraryGames.length > 0 && window.electron) {
      const checkStatuses = async () => {
        const newInstalled: Record<string, boolean> = {};
        for (const item of libraryGames) {
          const gameDetails = item.game_details || {};
          if (gameDetails.slug && gameDetails.executable_path && window.electron) {
            const installed = await window.electron.checkInstalled(gameDetails.slug, gameDetails.executable_path);
            newInstalled[gameDetails.slug] = Boolean(installed);
          }
        }
        setInstalledGames(newInstalled);
      };
      checkStatuses();

      // Listen to download progress
      const unsubscribe = window.electron.onDownloadProgress((data) => {
        setInstallProgress(prev => ({ ...prev, [data.slug]: data.percent }));
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [isElectron, libraryGames]);

  const handleInstallLibraryGame = async (gameDetails: any) => {
    if (!gameDetails.slug || !gameDetails.download_url || !gameDetails.executable_path || !window.electron) return;
    const slug = gameDetails.slug;
    try {
      setInstallingGames(prev => ({ ...prev, [slug]: true }));
      setInstallProgress(prev => ({ ...prev, [slug]: 0 }));
      const res = await window.electron.downloadGame(slug, gameDetails.download_url, gameDetails.executable_path);
      if (!res.success) {
        alert(res.error || "O'yinni yuklab olishda xatolik yuz berdi.");
        setInstallingGames(prev => ({ ...prev, [slug]: false }));
        setInstallProgress(prev => {
          const copy = { ...prev };
          delete copy[slug];
          return copy;
        });
      } else {
        setInstallingGames(prev => ({ ...prev, [slug]: false }));
        setInstalledGames(prev => ({ ...prev, [slug]: true }));
        setInstallProgress(prev => {
          const copy = { ...prev };
          delete copy[slug];
          return copy;
        });

        // Avtomatik ravishda o'yinni ishga tushiramiz
        const launchRes = await window.electron.launchGame(slug, gameDetails.executable_path);
        if (!launchRes.success) {
          alert(launchRes.error || "O'yinni ishga tushirishda xatolik yuz berdi.");
        }
      }
    } catch (err) {
      console.error(err);
      setInstallingGames(prev => ({ ...prev, [slug]: false }));
    }
  };

  const handleLaunchLibraryGame = async (gameDetails: any) => {
    if (!gameDetails.slug || !gameDetails.executable_path || !window.electron) return;
    try {
      const res = await window.electron.launchGame(gameDetails.slug, gameDetails.executable_path);
      if (!res.success) {
        alert(res.error || "O'yinni ishga tushirishda xatolik yuz berdi.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleWebDownloadClick = (e: React.MouseEvent, gameId: string | number) => {
    e.preventDefault();
    const link = document.createElement('a');
    link.href = 'https://github.com/otbk-uz/maroqli-uz/releases/download/v1.0.0/maroqli-setup.exe';
    link.download = 'maroqli-setup.exe';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (activeSetting === "my_library" && libraryGames.length === 0) {
      const effectiveRole = profileData?.role || user?.role;
      if (effectiveRole !== "GAMER" && effectiveRole !== "ADMIN") {
        setActiveSetting(null);
        return;
      }
      const fetchLibrary = async () => {
        setLoadingLibrary(true);
        try {
          const { data, error } = await supabase
            .from('bought_games')
            .select('*, developed_games(*)')
            .eq('user_id', user?.id);

          if (error) throw error;

          if (data) {
            const mappedData = data.map((item: any) => ({
              id: item.id,
              cd_key: item.cd_key,
              game_details: item.developed_games
            }));
            setLibraryGames(mappedData);
          }
        } catch (err) {
          console.error("Kutubxonani yuklashda xatolik:", err);
        } finally {
          setLoadingLibrary(false);
        }
      };
      fetchLibrary();
    }
  }, [activeSetting, libraryGames.length, profileData?.role]);

  useEffect(() => {
    if (activeSetting === "my_wishlist") {
      const fetchWishlistData = async () => {
        setLoadingWishlist(true);
        setLoadingPurchasePlan(true);
        try {
          // Fetch wishlist
          const { data: wishData, error: wishErr } = await supabase
            .from('game_wishlist')
            .select('id, game_id, created_at, developed_games(*)')
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false });

          if (!wishErr && wishData) {
            setWishlistGames(wishData.map((item: any) => ({
              id: item.id,
              game_id: item.game_id,
              game_details: item.developed_games
            })));
          }

          // Fetch purchase plan
          const { data: planData, error: planErr } = await supabase
            .from('game_purchase_plan')
            .select('id, game_id, created_at, developed_games(*)')
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false });

          if (!planErr && planData) {
            setPurchasePlanGames(planData.map((item: any) => ({
              id: item.id,
              game_id: item.game_id,
              game_details: item.developed_games
            })));
          }
        } catch (err) {
          console.error("Wishlist data fetch error:", err);
        } finally {
          setLoadingWishlist(false);
          setLoadingPurchasePlan(false);
        }
      };
      fetchWishlistData();
    }
  }, [activeSetting, user?.id]);

  useEffect(() => {
    if (activeSetting === "game_high_scores") {
      const fetchScores = async () => {
        setLoadingScores(true);
        try {
          const { data, error } = await supabase
            .from('game_scores')
            .select('*')
            .eq('user_id', user?.id)
            .order('score', { ascending: false });

          if (!error && data) {
            setUserScores(data);
          }
        } catch (err) {
          console.error("Game scores fetch error:", err);
        } finally {
          setLoadingScores(false);
        }
      };
      fetchScores();
    }
  }, [activeSetting, user?.id]);

  const handleRemoveFromWishlist = async (wishlistId: string) => {
    try {
      await supabase.from('game_wishlist').delete().eq('id', wishlistId);
      setWishlistGames(prev => prev.filter(item => item.id !== wishlistId));
    } catch (err) {
      console.error("Remove wishlist error:", err);
    }
  };

  const handleRemoveFromPurchasePlan = async (planId: string) => {
    try {
      await supabase.from('game_purchase_plan').delete().eq('id', planId);
      setPurchasePlanGames(prev => prev.filter(item => item.id !== planId));
    } catch (err) {
      console.error("Remove purchase plan error:", err);
    }
  };

  // Followed streamers fetch for Kuzatuvchi / Streamer
  useEffect(() => {
    if (user?.id) {
      const fetchFollowed = async () => {
        setLoadingFollowed(true);
        try {
          const { data: followRows, error: followErr } = await supabase
            .from("streamer_followers")
            .select("streamer_id, created_at, streamers(*)")
            .eq("follower_id", user.id);

          if (!followErr && followRows) {
            setFollowedStreamers(
              followRows.map((r: any) => ({
                ...(r.streamers || {}),
                followed_at: r.created_at,
              }))
            );
          }
        } catch (err) {
          console.error("Followed streamers fetch error:", err);
        } finally {
          setLoadingFollowed(false);
        }
      };
      fetchFollowed();
    }
  }, [user?.id, activeSetting]);

  // Fetch live streamers and free games for Kuzatuvchi (Viewer) hub
  useEffect(() => {
    if (!mounted) return;

    const fetchViewerContent = async () => {
      setLoadingViewerContent(true);
      try {
        const { data: streamers } = await supabase
          .from("streamers")
          .select("*")
          .order("is_live", { ascending: false })
          .limit(4);

        if (streamers) {
          setLiveStreamers(streamers);
        }

        const { data: games } = await supabase
          .from("developed_games")
          .select("id, title, slug, cover, platform, price, rating")
          .order("rating", { ascending: false })
          .limit(4);

        if (games) {
          setFeaturedFreeGames(games);
        }
      } catch (err) {
        console.warn("Viewer content fetch notice:", err);
      } finally {
        setLoadingViewerContent(false);
      }
    };

    fetchViewerContent();
  }, [mounted]);

  const handleUnfollowStreamer = async (streamerId: string) => {
    if (!user?.id) return;
    try {
      await supabase
        .from("streamer_followers")
        .delete()
        .eq("streamer_id", streamerId)
        .eq("follower_id", user.id);
      setFollowedStreamers(prev => prev.filter(s => s.id !== streamerId));
    } catch (err) {
      console.error("Unfollow error:", err);
    }
  };

  const handleUpgradeRole = async () => {
    if (!user) return;
    setUpgradingRole(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          id: user.id,
          username: user.username,
          role: selectedUpgradeRole,
        }),
      });

      if (!res.ok) throw new Error("Rolni yangilashda xatolik yuz berdi.");

      setProfileData((prev: any) => ({
        ...prev,
        role: selectedUpgradeRole,
      }));
      setAuth({ ...user, role: selectedUpgradeRole }, token || "");
      setUpgradeSuccess(true);
      setTimeout(() => {
        setUpgradeSuccess(false);
        setActiveSetting(null);
      }, 1500);
    } catch (err: any) {
      alert(err.message || "Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
    } finally {
      setUpgradingRole(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;

    // Check authentication with localStorage fallback
    if (!isAuthenticated && !user) {
      try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('auth-storage') : null;
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.state?.user && parsed?.state?.token) {
            setAuth(parsed.state.user, parsed.state.token);
            return;
          }
        }
      } catch {
        // ignore
      }

      router.push("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        let pData: any = null;

        // 1. Try fetching from Supabase profiles table
        if (user?.id) {
          try {
            const { data, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", user.id)
              .maybeSingle();

            if (data && !error) {
              pData = data;
            }
          } catch (supaErr) {
            console.warn("Supabase fetch notice:", supaErr);
          }
        }

        // 2. If not found in Supabase, fetch from internal API
        if (!pData && (user?.id || user?.username)) {
          try {
            const targetParam = user.id ? `id=${encodeURIComponent(String(user.id))}` : `username=${encodeURIComponent(user.username || "")}`;
            const res = await fetch(`/api/users/profile?${targetParam}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res.ok) {
              const resJson = await res.json();
              if (resJson.profile) {
                pData = resJson.profile;
              }
            }
          } catch (apiErr) {
            console.warn("API profile fetch notice:", apiErr);
          }
        }

        // 3. Fallback to auth store user data (guarantees profileData is NEVER null!)
        if (!pData && user) {
          pData = {
            id: user.id,
            full_name: user.full_name || user.nickname || user.username || "Kuzatuvchi",
            username: user.username || user.nickname || "kuzatuvchi",
            email: user.email || "",
            phone_number: user.phone_number || "",
            role: user.role || "VIEWER",
            avatar_url: user.avatar || null,
            coins: user.coins ?? 50,
            elo: user.elo ?? 1000,
            level: 1,
            is_premium: user.is_premium || false,
            created_at: new Date().toISOString(),
          };
        }

        if (pData) {
          setProfileData(pData);
          setEditForm({
            full_name: pData.full_name || "",
            username: pData.username || "",
          });
        }

        // Fetch streamer data if exists
        if (user?.id) {
          try {
            const { data: sData } = await supabase
              .from("streamers")
              .select("*")
              .eq("user_id", user.id)
              .maybeSingle();

            if (sData) {
              setStreamerData(sData);
              setStreamForm({
                stream_url: sData.stream_url || "",
                platform: sData.platform || "Twitch",
                game: sData.game || "",
                title: sData.title || "",
                is_live: sData.is_live || false
              });
            }
          } catch (sErr) {
            // streamer data optional
          }
        }

      } catch (err) {
        console.error("Profile yuklashda xatolik:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [mounted, isAuthenticated, user, router, token, setAuth]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleSaveProfile = async () => {
    if (!editForm.full_name.trim() || !editForm.username.trim()) {
      alert(t("fill_name_username", "Ism va taxallusni to'ldiring!"));
      return;
    }

    setSaving(true);
    try {
      // 1. Update API
      try {
        await fetch("/api/users/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            id: user?.id,
            username: editForm.username,
            full_name: editForm.full_name,
          }),
        });
      } catch (apiErr) {
        console.warn("API profile update notice:", apiErr);
      }

      // 2. Also attempt Supabase update
      try {
        await supabase
          .from("profiles")
          .update({
            full_name: editForm.full_name,
            username: editForm.username,
          })
          .eq("id", user?.id);
      } catch (supaErr) {
        // ignore
      }

      setProfileData((prev: any) => ({
        ...prev,
        full_name: editForm.full_name,
        username: editForm.username,
      }));

      // Update store
      if (user) {
        setAuth({ ...user, full_name: editForm.full_name, username: editForm.username }, token || "");
      }

      setIsEditing(false);
      alert(t("profile_saved", "Profil muvaffaqiyatli saqlandi!"));
    } catch (err) {
      console.error("Profilni saqlashda xatolik:", err);
      alert(t("profile_save_error", "Xatolik yuz berdi. Iltimos qayta urinib ko'ring."));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(t("image_size_limit", "Rasm hajmi 2MB dan oshmasligi kerak!"));
      return;
    }

    setUploadingAvatar(true);
    try {
      let newAvatarUrl: string | null = null;

      // 1. Try Supabase storage
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { upsert: true });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
          newAvatarUrl = publicUrlData.publicUrl;
        }
      } catch (storageErr) {
        console.warn("Storage upload notice:", storageErr);
      }

      // 2. Fallback to base64 Data URL if storage bucket fails
      if (!newAvatarUrl) {
        newAvatarUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      // Update via API
      try {
        await fetch("/api/users/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            id: user.id,
            avatar_url: newAvatarUrl,
          }),
        });
      } catch (e) {
        console.warn("API avatar update notice:", e);
      }

      // Also try Supabase update
      try {
        await supabase
          .from("profiles")
          .update({ avatar_url: newAvatarUrl })
          .eq("id", user.id);
      } catch (e) {
        // ignore
      }

      setProfileData((prev: any) => ({ ...prev, avatar_url: newAvatarUrl }));
      setAuth({ ...user, avatar: newAvatarUrl }, token || "");

    } catch (err: any) {
      console.error("Avatar yuklash xatosi:", err);
      alert(t("image_upload_error", "Rasm yuklashda xatolik yuz berdi."));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveStreamer = async () => {
    if (!streamForm.stream_url || !streamForm.platform) {
      alert(t("fill_stream_fields", "Havola va platformani kiriting!"));
      return;
    }

    setSavingStream(true);
    try {
      let resultError;
      if (streamerData) {
        // Update
        const { error } = await supabase
          .from("streamers")
          .update(streamForm)
          .eq("id", streamerData.id);
        resultError = error;
      } else {
        // Insert
        const { data, error } = await supabase
          .from("streamers")
          .insert({
            user_id: user?.id,
            ...streamForm
          })
          .select()
          .single();
        if (data) setStreamerData(data);
        resultError = error;
      }

      if (resultError) throw resultError;
      alert(t("stream_settings_saved", "Strim sozlamalari saqlandi!"));
      setActiveSetting(null);
    } catch (err) {
      console.error("Strim sozlamalarini saqlashda xatolik:", err);
      alert(t("stream_settings_error", "Xatolik yuz berdi. Iltimos qayta urinib ko'ring."));
    } finally {
      setSavingStream(false);
    }
  };



  if (!mounted || (loading && !profileData && !user)) {
    return (
      <main className="min-h-screen bg-background relative flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-secondary font-bold uppercase tracking-widest">Profil yuklanmoqda...</span>
        </div>
      </main>
    );
  }

  const currentProfile = profileData || (user ? {
    id: user.id,
    full_name: user.full_name || user.nickname || user.username || "Kuzatuvchi",
    username: user.username || user.nickname || "kuzatuvchi",
    email: user.email || "",
    phone_number: user.phone_number || "",
    role: user.role || "VIEWER",
    avatar_url: user.avatar || null,
    coins: user.coins ?? 50,
    elo: user.elo ?? 1000,
    level: 1,
    is_premium: user.is_premium || false,
    created_at: new Date().toISOString(),
  } : null);

  if (!currentProfile) {
    return (
      <main className="min-h-screen bg-background relative flex flex-col items-center justify-center p-4">
        <div className="glass-card p-8 text-center max-w-md w-full border-primary/20">
          <User size={48} className="mx-auto text-primary mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">{t("login_required", "Profilni ko'rish uchun kiring")}</h2>
          <p className="text-secondary text-xs mb-6">Profil ma'lumotlarini ko'rish uchun iltimos hisobingizga kiring.</p>
          <Link href="/login" className="btn-primary py-2.5 px-6 inline-flex text-xs font-bold uppercase tracking-wider">
            {t("login", "Kirish")}
          </Link>
        </div>
      </main>
    );
  }

  const roleBadge: Record<string, string> = {
    ADMIN: "bg-primary/15 border-primary/30 text-primary shadow-[0_0_12px_rgba(255,51,85,0.2)]",
    GAMEDEV: "bg-violet-500/15 border-violet-500/30 text-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.2)]",
    GAMER: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]",
    STREAMER: "bg-pink-500/15 border-pink-500/30 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.2)]",
    INVESTOR: "bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]",
    VIEWER: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
  };
  const roleClass = roleBadge[currentProfile.role as string] || "bg-white/5 border-white/10 text-secondary";

  const getRoleTitle = (role: string) => {
    switch (role) {
      case "VIEWER": return t("role_viewer", "Kuzatuvchi");
      case "GAMER": return t("role_gamer", "Gamer");
      case "GAMEDEV": return t("role_gamedev", "GameDev");
      case "STREAMER": return t("role_streamer", "Strimer");
      case "INVESTOR": return t("role_investor", "Investor");
      case "ADMIN": return "Admin";
      default: return role;
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="container-app pt-28 pb-24">
        <BackButton />

        {/* Profile Header Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card overflow-hidden mt-2"
        >
          {/* Cover */}
          <div className="relative h-40 md:h-48 bg-brand-gradient bg-[length:200%_200%] animate-gradient-move">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
            <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/20 to-transparent" />
          </div>

          <div className="px-6 md:px-10 pb-8">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              {/* Avatar */}
              <div className="relative w-32 h-32 md:w-36 md:h-36 group shrink-0 mx-auto md:mx-0 -mt-20 md:-mt-24">
                <div className="w-full h-full rounded-3xl overflow-hidden border-4 border-background bg-card flex items-center justify-center relative z-10 shadow-glow">
                  {currentProfile.avatar_url ? (
                    <img src={currentProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={56} className="text-secondary" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 bg-black/60 rounded-3xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer backdrop-blur-sm"
                >
                  {uploadingAvatar ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Camera size={22} className="text-white mb-1" />
                      <span className="text-[9px] font-bold text-white uppercase">{t("change_avatar", "O'zgartirish")}</span>
                    </>
                  )}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Identity + actions */}
              {isEditing ? (
                <div className="flex-1 w-full space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-secondary font-bold uppercase tracking-wider block mb-1.5 ml-1">{t("fullname_label_profile", "To'liq ism")}</label>
                      <input
                        type="text"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-secondary font-bold uppercase tracking-wider block mb-1.5 ml-1">{t("username_label_profile", "Taxallus (@username)")}</label>
                      <input
                        type="text"
                        value={editForm.username}
                        onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-primary/50 text-sm text-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="btn-primary !py-2.5 !px-6 text-sm gap-1.5"
                    >
                      {saving ? t("saving_profile", "Saqlanmoqda...") : <><Check size={16} /> {t("save_profile", "Saqlash")}</>}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm({ full_name: currentProfile.full_name, username: currentProfile.username });
                      }}
                      className="btn-outline !py-2.5 !px-4 text-sm"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 w-full flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2 text-center md:text-left">
                  <div>
                    <div className="flex items-center justify-center md:justify-start gap-2.5 flex-wrap mb-2">
                      <h1 className="font-display text-2xl md:text-3xl font-black text-white tracking-tight">{currentProfile.full_name}</h1>
                      {currentProfile.is_premium && (
                        <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-black text-[10px] font-black uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1 shadow-[0_0_14px_rgba(245,158,11,0.4)]">
                          <Crown size={10} className="fill-current" />
                          PRO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-2.5 flex-wrap">
                      <p className="text-primary font-bold text-sm">@{currentProfile.username}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${roleClass} inline-flex items-center gap-1`}>
                        {currentProfile.role === 'VIEWER' && <Eye size={12} className="stroke-[2.5]" />}
                        {getRoleTitle(currentProfile.role)}
                      </span>
                    </div>
                    <p className="text-secondary text-xs mt-2">
                      {t("joined_date", "A'zo bo'ldi: ")}{new Date(currentProfile.created_at || Date.now()).toLocaleDateString(localeStr, { month: 'long', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 shrink-0">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn-primary !py-2.5 !px-5 text-sm gap-2"
                    >
                      <Edit3 size={16} />
                      <span>{t("edit", "Tahrirlash")}</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 py-2.5 px-4 text-primary hover:bg-primary/10 border border-white/10 hover:border-primary/30 rounded-full transition-colors font-bold text-sm"
                    >
                      <LogOut size={16} />
                      <span className="hidden sm:inline">{t("logout", "Chiqish")}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mt-8">
              <div className="glass-card !rounded-2xl p-4 md:p-5 text-center">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-2 text-base">
                  🪙
                </div>
                <p className="font-display text-xl md:text-2xl font-black text-amber-300 tabular-nums">{(currentProfile.coins || user?.coins || 0).toLocaleString()}</p>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-1">Tangalar</p>
              </div>
              <div className="glass-card !rounded-2xl p-4 md:p-5 text-center">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                  <TrendingUp size={16} />
                </div>
                <p className="font-display text-xl md:text-2xl font-black text-white tabular-nums">{currentProfile.level || 1}</p>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-1">{t("level_label", "Daraja")}</p>
              </div>
              <div className="glass-card !rounded-2xl p-4 md:p-5 text-center">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  {currentProfile.role === 'VIEWER' ? <Eye size={16} /> : <Zap size={16} className="text-violet-400" />}
                </div>
                <p className="font-display text-base md:text-xl font-black text-white truncate">
                  {currentProfile.role === 'VIEWER' ? "Faol" : (currentProfile.elo ?? 1000)}
                </p>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-1">
                  {currentProfile.role === 'VIEWER' ? "Tomoshabin" : "ELO"}
                </p>
              </div>
              <div className="glass-card !rounded-2xl p-4 md:p-5 text-center">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-2">
                  <Shield size={16} />
                </div>
                <p className="font-display text-base md:text-xl font-black text-white truncate">{getRoleTitle(currentProfile.role)}</p>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-1">{t("your_role", "Rolingiz")}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ==================== KUZATUVCHI (VIEWER) DEDICATED HUB ==================== */}
        {currentProfile.role === "VIEWER" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="space-y-6 mt-6"
          >
            {/* VIP Status & Privileges Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-card/80 to-background p-6 md:p-8 backdrop-blur-2xl shadow-[0_0_35px_rgba(16,185,129,0.12)]">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                      <Eye size={13} className="stroke-[2.5]" />
                      Faol Kuzatuvchi (Tomoshabin)
                    </span>
                    <span className="text-[11px] text-secondary font-medium">
                      Platformadagi barcha bepul xizmatlardan foydalanishingiz mumkin
                    </span>
                  </div>
                  <h2 className="font-display text-xl md:text-2xl font-black text-white">
                    Xush kelibsiz, {currentProfile.full_name}! 👋
                  </h2>
                  <p className="text-secondary text-xs md:text-sm leading-relaxed">
                    Siz Maroqli platformasida tomoshabin sifatida strimlarni kuzatishingiz, bepul brauzer o'yinlarini o'ynashingiz va forumlarda qatnashishingiz mumkin.
                  </p>
                  
                  {/* Privilege Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                    <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                      <Radio size={16} className="text-pink-400 shrink-0" />
                      <span className="text-[11px] font-bold text-white truncate">Jonli Strimlar</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                      <Gamepad2 size={16} className="text-cyan-400 shrink-0" />
                      <span className="text-[11px] font-bold text-white truncate">Bepul O'yinlar</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                      <MessageSquare size={16} className="text-amber-400 shrink-0" />
                      <span className="text-[11px] font-bold text-white truncate">Ochiq Forum</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                      <Sparkles size={16} className="text-emerald-400 shrink-0" />
                      <span className="text-[11px] font-bold text-white truncate">Tangalar yig'ish</span>
                    </div>
                  </div>
                </div>

                {/* Upgrade Role Action Box */}
                <div className="w-full lg:w-auto shrink-0 bg-white/[0.04] border border-white/10 rounded-2xl p-5 text-center lg:text-left flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Imkoniyatlarni oshirish</span>
                    <h4 className="text-sm font-black text-white mt-0.5">Gamer yoki Strimer bo'lmoqchimisiz?</h4>
                    <p className="text-[11px] text-secondary mt-1 max-w-xs">Turnirlarda qatnashish yoki jonli efirlarni boshlash uchun rolingizni bir zumda yangilang.</p>
                  </div>
                  <button
                    onClick={() => setActiveSetting("upgrade_role")}
                    className="btn-primary w-full !py-2.5 !px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-glow"
                  >
                    <Zap size={14} />
                    <span>Rolni Yangilash</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Live Streams & Followed Streamers Section */}
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center">
                    <Radio size={16} />
                  </div>
                  <div>
                    <h3 className="font-display text-base md:text-lg font-black text-white">Jonli Strimlar & Kuzatilayotganlar</h3>
                    <p className="text-[11px] text-secondary">Platformadagi iqtidorli strimerlar va ularning efirlari</p>
                  </div>
                </div>
                <Link
                  href="/streamers"
                  className="text-xs font-bold text-primary hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>Barcha strimerlar</span>
                  <ChevronRight size={14} />
                </Link>
              </div>

              {liveStreamers.length === 0 && followedStreamers.length === 0 ? (
                <div className="text-center py-10 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <Radio size={36} className="text-pink-400/40 mx-auto mb-3" />
                  <p className="text-sm font-bold text-white mb-1">Hozircha strimlar sahifasida yangi efirlar kutilmoqda</p>
                  <p className="text-xs text-secondary mb-4">Maroqli platformasining strimlar katalogiga o'tib, qiziqarli efirlarni tomosha qiling.</p>
                  <Link
                    href="/streamers"
                    className="btn-primary inline-flex !py-2 !px-5 text-xs font-bold uppercase tracking-wider"
                  >
                    Strimlar katalogiga o'tish
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(liveStreamers.length > 0 ? liveStreamers : followedStreamers).slice(0, 4).map((s: any, idx: number) => {
                    const isLive = s.is_live ?? true;
                    return (
                      <div
                        key={s.id || idx}
                        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-pink-500/40 hover:bg-white/[0.06]"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-brand-gradient text-sm font-bold text-white">
                            {s.avatar_url ? (
                              <img src={s.avatar_url} alt={s.username || "streamer"} className="h-full w-full object-cover" />
                            ) : (
                              (s.username?.[0] || "S").toUpperCase()
                            )}
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            isLive
                              ? "bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse"
                              : "bg-white/10 text-secondary"
                          }`}>
                            {isLive && <span className="h-1.5 w-1.5 rounded-full bg-red-400" />}
                            {isLive ? "LIVE" : (s.platform || "Twitch")}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-white truncate">{s.full_name || s.username || "Strimer"}</h4>
                        <p className="text-[11px] text-pink-400 font-medium truncate">@{s.username || "streamer"}</p>
                        <p className="text-[10px] text-secondary mt-1 truncate">
                          🎮 {s.game || "Turli o'yinlar"}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                          <span className="text-[10px] text-secondary font-bold">
                            👁️ {(s.viewers_count || 12).toLocaleString()} tomoshabin
                          </span>
                          <Link
                            href={s.username ? `/streams/${s.username}` : `/streamers/${s.id || ''}`}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-primary/20 hover:bg-primary border border-primary/30 hover:border-primary px-2.5 py-1 rounded-lg transition-all"
                          >
                            <Play size={10} className="fill-current" />
                            <span>Ko'rish</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Free Instant Play Games Section */}
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                    <Gamepad2 size={16} />
                  </div>
                  <div>
                    <h3 className="font-display text-base md:text-lg font-black text-white">Kuzatuvchilar Uchun Bepul O'yinlar</h3>
                    <p className="text-[11px] text-secondary">Brauzerda hech narsa o'rnatmasdan to'g'ridan-to'g'ri o'ynang</p>
                  </div>
                </div>
                <Link
                  href="/games"
                  className="text-xs font-bold text-cyan-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>Barcha o'yinlar</span>
                  <ChevronRight size={14} />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(featuredFreeGames.length > 0 ? featuredFreeGames : [
                  { id: 1, title: "Aks", slug: "aks-nusxa", platform: "WEB", cover: "/games-online/aks-nusxa/covers/aks-nusxa.png" },
                  { id: 2, title: "Arqon tortish", slug: "arqon", platform: "WEB", cover: "/games-online/arqon/cover.png" },
                  { id: 3, title: "Aks Sado", slug: "aks-sado", platform: "WEB", cover: "/games-online/aks-sado/covers/aks-sado.png" },
                  { id: 4, title: "Death Mine", slug: "death-mine", platform: "WEB", cover: "" }
                ]).map((game: any, idx: number) => (
                  <div
                    key={game.id || idx}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 transition-all hover:border-cyan-500/40 hover:bg-white/[0.06]"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-white/5 mb-3 flex items-center justify-center">
                      {game.cover ? (
                        <img
                          src={game.cover}
                          alt={game.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e: any) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Gamepad2 size={28} className="text-secondary/50" />
                      )}
                      <span className="absolute top-2 left-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-400 backdrop-blur-md">
                        BEPUL
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-white truncate">{game.title}</h4>
                      <p className="text-[10px] text-secondary font-bold uppercase tracking-wider mt-0.5">
                        {game.platform || "WEB"} BRAUZER
                      </p>
                    </div>

                    <Link
                      href={game.slug ? `/games/play/${game.slug}` : `/games/${game.id}`}
                      className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 bg-cyan-500/15 hover:bg-cyan-500 text-cyan-300 hover:text-black border border-cyan-500/30 rounded-xl text-xs font-bold transition-all"
                    >
                      <Play size={12} className="fill-current" />
                      <span>O'ynash</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/streamers"
                className="glass-card p-5 group hover:border-pink-500/40 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Radio size={22} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-white group-hover:text-pink-400 transition-colors">Strimlar Zali</h4>
                  <p className="text-[11px] text-secondary line-clamp-1 mt-0.5">Jonli efirlarni kuzating va chatda qatnashing</p>
                </div>
              </Link>

              <Link
                href="/forum"
                className="glass-card p-5 group hover:border-amber-500/40 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <MessageSquare size={22} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">Hamjamiyat Forumi</h4>
                  <p className="text-[11px] text-secondary line-clamp-1 mt-0.5">Mavzularni o'qing va fikringizni qoldiring</p>
                </div>
              </Link>

              <Link
                href="/tournaments"
                className="glass-card p-5 group hover:border-cyan-500/40 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Trophy size={22} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors">Kiber Turnirlar</h4>
                  <p className="text-[11px] text-secondary line-clamp-1 mt-0.5">Bahslarni kuzating va natijalardan boxabar bo'ling</p>
                </div>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card p-8 lg:col-span-1"
          >
            <h3 className="text-lg font-bold mb-6 flex items-center">
              <Award size={20} className="mr-3 text-primary" />
              {t("achievements_title", "Yutuqlar va Nishonlar")}
            </h3>
            <div className="grid grid-cols-3 lg:grid-cols-2 gap-5">
              <div className="text-center group">
                <div className="w-16 h-16 bg-white/5 border border-white/10 group-hover:border-warning/50 transition-colors rounded-2xl mx-auto mb-3 flex items-center justify-center">
                  <Star size={24} className="text-warning" />
                </div>
                <p className="text-xs font-bold text-white">{t("new_member_achievement", "Yangi a'zo")}</p>
              </div>
              {currentProfile.is_premium && (
                <div className="text-center group">
                  <div className="w-16 h-16 bg-white/5 border border-white/10 group-hover:border-amber-500/50 transition-colors rounded-2xl mx-auto mb-3 flex items-center justify-center">
                    <Crown size={24} className="text-amber-400 fill-amber-400/20" />
                  </div>
                  <p className="text-xs font-bold text-white">{t("premium_achievement", "Premium")}</p>
                </div>
              )}
              {currentProfile.role === 'VIEWER' && (
                <div className="text-center group">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 group-hover:border-emerald-500/60 transition-colors rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                    <Eye size={24} className="text-emerald-400" />
                  </div>
                  <p className="text-xs font-bold text-white">{t("role_viewer", "Kuzatuvchi")}</p>
                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block mt-0.5">Tomoshabin</span>
                </div>
              )}
              {currentProfile.role === 'GAMEDEV' && (
                <div className="text-center group">
                  <div className="w-16 h-16 bg-white/5 border border-white/10 group-hover:border-violet/50 transition-colors rounded-2xl mx-auto mb-3 flex items-center justify-center">
                    <Shield size={24} className="text-violet" />
                  </div>
                  <p className="text-xs font-bold text-white">{t("developer_achievement", "Dasturchi")}</p>
                </div>
              )}
              <div className="w-16 h-16 bg-white/2 rounded-2xl mx-auto flex items-center justify-center border-2 border-dashed border-white/10 hover:border-white/20 transition-colors cursor-pointer">
                <span className="text-xl text-secondary">+</span>
              </div>
            </div>
          </motion.div>

          {/* Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-0 overflow-hidden lg:col-span-2"
          >
            <div className="p-8 border-b border-white/5">
              <h3 className="text-lg font-bold flex items-center">
                <Settings size={20} className="mr-3 text-primary" />
                {t("settings_title", "Sozlamalar")}
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {[
                ...(currentProfile.role === "VIEWER" ? [
                  { key: "followed_streamers", label: "👀 Kuzatilayotgan Strimerlar va Jonli Efirlar" },
                  { key: "upgrade_role", label: "⚡ Rolni Yangilash (Gamer yoki Strimer bo'lish)" },
                ] : [
                  { key: "upgrade_role", label: "⚡ Rolni O'zgartirish (Rol tanlash)" },
                ]),
                { key: "game_high_scores", label: "🏆 O'yin Rekordlarim va Statistika" },
                { key: "my_wishlist", label: "Sotib olish rejasi" },
                ...(currentProfile.role === "GAMER" || currentProfile.role === "ADMIN" ? [{ key: "my_library", label: t("my_library", "Mening Kutubxonam") }] : []),
                ...((streamerData !== null || currentProfile.role === "ADMIN" || currentProfile.role === "STREAMER") ? [{ key: "streaming_settings", label: t("streaming_settings", "Striming sozlamalari") }] : []),
                { key: "account_security", label: t("account_security", "Hisob xavfsizligi") },
                { key: "notification_settings", label: t("notification_settings", "Xabarnomalar sozlamalari") },
                { key: "payment_methods", label: t("payment_methods", "To'lov usullari") },
                { key: "privacy_and_security", label: t("privacy_and_security", "Maxfiylik va Xavfsizlik") }
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveSetting(item.key)}
                  className="w-full p-5 md:p-6 flex items-center justify-between hover:bg-white/5 transition-colors group"
                >
                  <span className="font-medium text-sm text-secondary group-hover:text-white transition-colors">{item.label}</span>
                  <ChevronRight size={18} className="text-secondary group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {activeSetting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setActiveSetting(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card relative z-10 w-full max-w-md p-6 overflow-hidden shadow-2xl"
            >
              <button
                onClick={() => setActiveSetting(null)}
                className="absolute top-4 right-4 text-secondary hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all"
              >
                <X size={18} />
              </button>

              <div className="flex items-center space-x-3 mb-6">
                {activeSetting === "game_high_scores" ? (
                  <Trophy size={24} className="text-amber-400" />
                ) : activeSetting === "followed_streamers" ? (
                  <Radio size={24} className="text-emerald-400" />
                ) : activeSetting === "upgrade_role" ? (
                  <Zap size={24} className="text-primary" />
                ) : (
                  <Settings size={24} className="text-primary" />
                )}
                <h3 className="text-xl font-bold">
                  {activeSetting === "game_high_scores" ? "🏆 O'yin Rekordlarim va Statistika" :
                   activeSetting === "followed_streamers" ? "👀 Kuzatilayotgan Strimerlar" :
                   activeSetting === "upgrade_role" ? "⚡ Rolni O'zgartirish / Yangilash" :
                   activeSetting === "my_wishlist" ? "Sotib olish rejasi" :
                   activeSetting === "my_team" ? t("my_team", "Mening Jamoam") :
                   activeSetting === "my_library" ? t("my_library", "Mening Kutubxonam") :
                   activeSetting === "streaming_settings" ? t("streaming_settings", "Striming sozlamalari") :
                   activeSetting === "account_security" ? t("account_security", "Hisob xavfsizligi") :
                   activeSetting === "notification_settings" ? t("notification_settings", "Xabarnomalar sozlamalari") :
                   activeSetting === "payment_methods" ? t("payment_methods", "To'lov usullari") :
                   activeSetting === "privacy_and_security" ? t("privacy_and_security", "Maxfiylik va Xavfsizlik") : activeSetting}
                </h3>
              </div>

              {activeSetting === "followed_streamers" ? (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                  <p className="text-secondary text-xs">
                    Siz kuzatib borayotgan platforma strimerlari va ularning jonli efirlari.
                  </p>

                  {loadingFollowed ? (
                    <div className="py-12 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : followedStreamers.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
                      <Radio size={40} className="text-emerald-400/40 mx-auto mb-4" />
                      <p className="text-white font-bold text-sm mb-1">Hozircha hech qanday strimer kuzatilmayapti</p>
                      <p className="text-secondary text-xs max-w-xs mx-auto mb-4">Maroqli platformasidagi iqtidorli strimerlarni kuzatib boring!</p>
                      <Link
                        href="/streamers"
                        onClick={() => setActiveSetting(null)}
                        className="btn-primary inline-flex py-2 px-5 text-xs font-bold uppercase tracking-wider"
                      >
                        Strimerlarni ko'rish
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {followedStreamers.map((st: any) => (
                        <div key={st.id || Math.random()} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                              <Radio size={18} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-white truncate">{st.title || st.game || "Jonli Strim"}</h4>
                                {st.is_live && (
                                  <span className="flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-[8px] font-black uppercase text-red-400 animate-pulse">
                                    LIVE
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-secondary truncate">{st.platform} • {st.followers_count || 0} kuzatuvchi</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Link
                              href={st.id ? `/streamers/${st.id}` : "/streamers"}
                              onClick={() => setActiveSetting(null)}
                              className="py-1.5 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all"
                            >
                              Tomosha
                            </Link>
                            <button
                              onClick={() => handleUnfollowStreamer(st.id)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-colors"
                              title="Kuzatuvni bekor qilish"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeSetting === "upgrade_role" ? (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                  <p className="text-secondary text-xs">
                    Platformadagi rolingizni o'zgartirib yangi imkoniyatlarni ochishingiz mumkin.
                  </p>

                  <div className="space-y-2">
                    {[
                      { role: "VIEWER", label: "Kuzatuvchi", desc: "Yangiliklar va forumlarni o'qish, bepul tomosha" },
                      { role: "GAMER", label: "Gamer", desc: "Turnirlarda ishtirok etish, o'yin rekordlari, kutubxona" },
                      { role: "STREAMER", label: "Strimer", desc: "Jonli efirlar, obunachilar, strim paneli" },
                      { role: "GAMEDEV", label: "GameDev", desc: "O'yinlar yuklash va sotish, daromad paneli" },
                      { role: "INVESTOR", label: "Investor", desc: "Loyiha taqdimotlari va hamkorlik" },
                    ].map((item) => (
                      <div
                        key={item.role}
                        onClick={() => setSelectedUpgradeRole(item.role)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedUpgradeRole === item.role
                            ? "bg-primary/10 border-primary text-white"
                            : "bg-white/5 border-white/10 text-secondary hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{item.label}</span>
                            {currentProfile.role === item.role && (
                              <span className="text-[9px] bg-white/10 border border-white/20 px-2 py-0.5 rounded-full uppercase">Joriy rol</span>
                            )}
                          </div>
                          <p className="text-[10px] text-secondary mt-0.5">{item.desc}</p>
                        </div>
                        {selectedUpgradeRole === item.role && (
                          <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center shrink-0">
                            <Check size={12} className="stroke-[3]" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {upgradeSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold text-center animate-pulse">
                      Tabriklaymiz! Sizning rolingiz muvaffaqiyatli o'zgartirildi!
                    </div>
                  )}

                  <button
                    onClick={handleUpgradeRole}
                    disabled={upgradingRole || selectedUpgradeRole === currentProfile.role}
                    className="btn-primary w-full !py-3 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                  >
                    {upgradingRole ? "Yangilanmoqda..." : "Rolni tasdiqlash va saqlash"}
                  </button>
                </div>
              ) : activeSetting === "game_high_scores" ? (
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                  <p className="text-secondary text-xs">Maroqli.uz platformasidagi onlayn o'yinlarda erishgan shaxsiy rekordlaringiz ro'yxati.</p>

                  {loadingScores ? (
                    <div className="py-12 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : userScores.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
                      <Trophy size={40} className="text-amber-400/30 mx-auto mb-4" />
                      <p className="text-secondary text-sm">Hali birorta o'yinda rekord o'rnatmadingiz.</p>
                      <Link
                        href="/games"
                        onClick={() => setActiveSetting(null)}
                        className="btn-primary mt-4 inline-flex py-2 px-5 text-xs font-bold uppercase tracking-wider"
                      >
                        O'yinlarni o'ynash
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userScores.map((sc: any, idx: number) => {
                        const gameTitle = sc.game_slug
                          .split('-')
                          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(' ');

                        return (
                          <div key={sc.id || idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-amber-500/30 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                                <Trophy size={18} />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-white">{gameTitle}</h4>
                                <p className="text-[10px] text-secondary">
                                  {new Date(sc.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="font-display font-black text-amber-300 text-sm md:text-base tabular-nums">
                                {Number(sc.score).toLocaleString()}
                              </span>
                              <p className="text-[9px] text-secondary font-bold uppercase">ball</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : activeSetting === "my_wishlist" ? (
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                  
                  {/* Tabs */}
                  <div className="flex bg-white/5 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveWishlistTab("wishlist")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${activeWishlistTab === 'wishlist' ? 'bg-amber-500 text-black shadow-lg' : 'text-secondary hover:text-white'}`}
                    >
                      <Bookmark size={14} className={activeWishlistTab === 'wishlist' ? 'fill-current' : ''} />
                      Sotib olish rejasi
                    </button>
                    <button
                      onClick={() => setActiveWishlistTab("plan")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${activeWishlistTab === 'plan' ? 'bg-amber-500/80 text-black shadow-lg' : 'text-secondary hover:text-white'}`}
                    >
                      <CalendarPlus size={14} />
                      Rejalashtirilgan
                    </button>
                  </div>

                  {activeWishlistTab === "wishlist" && (
                    <>
                      <p className="text-secondary text-xs">Siz 'Sotib olish rejasi' ro'yxatiga qo'shgan va kelajakda sotib olmoqchi bo'lgan o'yinlaringiz.</p>

                      {loadingWishlist ? (
                        <div className="py-12 flex items-center justify-center">
                          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : wishlistGames.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
                          <Bookmark size={40} className="text-amber-500/30 mx-auto mb-4" />
                          <p className="text-secondary text-sm">'Sotib olish rejasi' ro'yxatida hali o'yinlar mavjud emas.</p>
                          <Link
                            href="/games"
                            onClick={() => setActiveSetting(null)}
                            className="btn-primary mt-4 inline-flex py-2 px-5 text-xs font-bold uppercase tracking-wider"
                          >
                            Do'konga o'tish
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {wishlistGames.map((item) => {
                            const gameDetails = item.game_details || {};
                            return (
                              <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col sm:flex-row gap-4 p-4 relative group hover:border-rose-500/30 transition-all duration-300">
                                {/* Cover */}
                                <div className="w-full sm:w-24 aspect-video sm:aspect-[4/3] rounded-xl overflow-hidden bg-white/5 shrink-0 flex items-center justify-center">
                                  {gameDetails.cover ? (
                                    <img
                                      src={gameDetails.cover}
                                      alt={gameDetails.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-brand-gradient-soft flex items-center justify-center">
                                      <Gamepad2 size={24} className="text-secondary" />
                                    </div>
                                  )}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                  <div>
                                    <h4 className="font-bold text-base text-white truncate mb-1">{gameDetails.title}</h4>
                                    <p className="text-[10px] text-secondary font-bold uppercase tracking-wider mb-2">
                                      {gameDetails.platform} • {Number(gameDetails.price) === 0 ? "BEPUL" : `${Number(gameDetails.price).toLocaleString()} UZS`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Link
                                      href={`/games/${gameDetails.id}`}
                                      onClick={() => setActiveSetting(null)}
                                      className="flex-1 py-2 px-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                    >
                                      <ShoppingCart size={13} />
                                      <span>O'yinga o'tish</span>
                                    </Link>
                                    <button
                                      onClick={() => handleRemoveFromWishlist(item.id)}
                                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-colors"
                                      title="Ro'yxatdan o'chirish"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {activeWishlistTab === "plan" && (
                    <>
                      <p className="text-secondary text-xs">Sotib olish rejangizga kiritilgan o'yinlar ro'yxati.</p>

                      {loadingPurchasePlan ? (
                        <div className="py-12 flex items-center justify-center">
                          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : purchasePlanGames.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
                          <CalendarPlus size={40} className="text-amber-500/30 mx-auto mb-4" />
                          <p className="text-secondary text-sm">Sotib olish rejasida o'yinlar mavjud emas.</p>
                          <Link
                            href="/games"
                            onClick={() => setActiveSetting(null)}
                            className="btn-primary mt-4 inline-flex py-2 px-5 text-xs font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-black"
                          >
                            Do'konga o'tish
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {purchasePlanGames.map((item) => {
                            const gameDetails = item.game_details || {};
                            return (
                              <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col sm:flex-row gap-4 p-4 relative group hover:border-amber-500/30 transition-all duration-300">
                                {/* Cover */}
                                <div className="w-full sm:w-24 aspect-video sm:aspect-[4/3] rounded-xl overflow-hidden bg-white/5 shrink-0 flex items-center justify-center">
                                  {gameDetails.cover ? (
                                    <img
                                      src={gameDetails.cover}
                                      alt={gameDetails.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-brand-gradient-soft flex items-center justify-center">
                                      <Gamepad2 size={24} className="text-secondary" />
                                    </div>
                                  )}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                  <div>
                                    <h4 className="font-bold text-base text-white truncate mb-1">{gameDetails.title}</h4>
                                    <p className="text-[10px] text-secondary font-bold uppercase tracking-wider mb-2">
                                      {gameDetails.platform} • {Number(gameDetails.price) === 0 ? "BEPUL" : `${Number(gameDetails.price).toLocaleString()} UZS`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Link
                                      href={`/games/${gameDetails.id}`}
                                      onClick={() => setActiveSetting(null)}
                                      className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                    >
                                      <ShoppingCart size={13} />
                                      <span>O'yinga o'tish</span>
                                    </Link>
                                    <button
                                      onClick={() => handleRemoveFromPurchasePlan(item.id)}
                                      className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl transition-colors"
                                      title="Ro'yxatdan o'chirish"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Budget Summary */}
                          <div className="mt-2 p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-[10px] text-amber-300 font-bold uppercase tracking-widest">💰 Taxminiy umumiy narx</p>
                              <p className="font-display font-black text-amber-300 text-lg tabular-nums">
                                {purchasePlanGames
                                  .reduce((sum: number, item: any) => {
                                    const price = Number(item.game_details?.price || 0);
                                    return sum + (price > 0 ? (user?.is_premium ? (item.game_details?.premium_price ? Number(item.game_details.premium_price) : Math.round(price * 0.8)) : price) : 0);
                                  }, 0)
                                  .toLocaleString()} <span className="text-sm font-bold">UZS</span>
                              </p>
                            </div>
                            <Link
                              href="/games"
                              onClick={() => setActiveSetting(null)}
                              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all"
                            >
                              <ShoppingCart size={14} />
                              Do'konga o'tib sotib olish
                            </Link>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : activeSetting === "my_library" ? (
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                  <p className="text-secondary text-xs">{t("my_library_desc", "Siz sotib olgan va faollashtirgan o'yinlar ro'yxati.")}</p>

                  {loadingLibrary ? (
                    <div className="py-12 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : libraryGames.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
                      <Gamepad2 size={40} className="text-white/20 mx-auto mb-4" />
                      <p className="text-secondary text-sm">{t("no_games_in_library", "Sizda hali sotib olingan o'yinlar mavjud emas.")}</p>
                      <Link
                        href="/games"
                        onClick={() => setActiveSetting(null)}
                        className="btn-primary mt-4 inline-flex py-2 px-5 text-xs font-bold uppercase tracking-wider"
                      >
                        {t("go_to_store", "Do'konga o'tish")}
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {libraryGames.map((item) => {
                        const gameDetails = item.game_details || {};

                        return (
                          <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col md:flex-row gap-4 p-4 relative group hover:border-primary/30 transition-all duration-300">
                            {/* Game Cover */}
                            <div className="w-full md:w-24 aspect-video md:aspect-[4/3] rounded-xl overflow-hidden bg-white/5 shrink-0 flex items-center justify-center">
                              {gameDetails.cover ? (
                                <img
                                  src={gameDetails.cover}
                                  alt={gameDetails.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full bg-brand-gradient-soft flex items-center justify-center">
                                  <Gamepad2 size={24} className="text-secondary" />
                                </div>
                              )}
                            </div>

                            {/* Game Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <h4 className="font-bold text-base text-white truncate mb-1">{gameDetails.title}</h4>
                                <p className="text-[10px] text-secondary font-bold uppercase tracking-wider mb-2">{gameDetails.platform} {t("platform_label", "platformasi")}</p>
                              </div>

                              {/* CD-Key Display */}
                              <div className="space-y-1">
                                <p className="text-[8px] text-secondary font-bold uppercase tracking-widest">{t("your_cd_key", "Sizning CD-KEY")}</p>
                                <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 gap-2">
                                  <code className="text-[10px] text-warning font-mono select-all tracking-wider">{item.cd_key}</code>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.cd_key);
                                      alert(t("cd_key_copied", "CD-Key nusxalandi!"));
                                    }}
                                    className="text-[9px] text-primary hover:text-white font-bold hover:underline transition-colors shrink-0"
                                  >
                                    {t("copy", "Nusxalash")}
                                  </button>
                                </div>
                              </div>

                              {gameDetails.download_url && (
                                <a
                                  href={gameDetails.download_url.startsWith('http') ? gameDetails.download_url : `https://github.com/otbk-uz/maroqli-uz/releases/download/v1.0.0/${gameDetails.download_url.startsWith('/') ? gameDetails.download_url.slice(1) : gameDetails.download_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-3 w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20"
                                >
                                  <Download size={12} />
                                  <span>O'yinni yuklab olish</span>
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : activeSetting === "streaming_settings" ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-secondary font-bold block mb-1">{t("stream_url", "Strim havolasi (URL)")}</label>
                    <input
                      type="text"
                      placeholder="https://twitch.tv/..."
                      value={streamForm.stream_url}
                      onChange={(e) => setStreamForm({...streamForm, stream_url: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-primary/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-secondary font-bold block mb-1">{t("platform", "Platforma")}</label>
                    <select
                      value={streamForm.platform}
                      onChange={(e) => setStreamForm({...streamForm, platform: e.target.value})}
                      className="w-full bg-background border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-primary/50 text-sm text-white"
                    >
                      <option value="Twitch">Twitch</option>
                      <option value="YouTube">YouTube</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-secondary font-bold block mb-1">{t("game_name", "O'yin nomi")}</label>
                    <input
                      type="text"
                      placeholder="Dota 2, CS2..."
                      value={streamForm.game}
                      onChange={(e) => setStreamForm({...streamForm, game: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-primary/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-secondary font-bold block mb-1">{t("stream_title", "Strim sarlavhasi")}</label>
                    <input
                      type="text"
                      placeholder="Bugun kuchli o'yin bo'ladi..."
                      value={streamForm.title}
                      onChange={(e) => setStreamForm({...streamForm, title: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-primary/50 text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl mt-4">
                    <div>
                      <h4 className="font-bold text-sm">{t("live_now", "Jonli efirda")}</h4>
                      <p className="text-[10px] text-secondary">{t("streaming_now_question", "Hozir strim qilyapsizmi?")}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={streamForm.is_live}
                        onChange={(e) => setStreamForm({...streamForm, is_live: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <button
                    onClick={handleSaveStreamer}
                    disabled={savingStream}
                    className="btn-primary w-full mt-4 !py-3 text-sm"
                  >
                    {savingStream ? t("saving_profile", "Saqlanmoqda...") : t("save", "Saqlash")}
                  </button>
                </div>

              ) : (
                <>
                  <div className="text-center py-8">
                    <Shield size={48} className="text-white/20 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-white mb-2">{t("soon_title", "Tez orada!")}</h4>
                    <p className="text-secondary text-sm leading-relaxed">
                      {t("soon_desc", "Ushbu bo'lim ustida jadal ish olib borilmoqda. Yangi funksiyalar tez orada Maroqli.uz platformasida mavjud bo'ladi.")}
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveSetting(null)}
                    className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all"
                  >
                    {t("got_it", "Tushunarli")}
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default ProfilePage;
