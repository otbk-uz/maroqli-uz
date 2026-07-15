"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { User, Settings, Shield, Award, LogOut, ChevronRight, Star, Camera, Check, X, Edit3, Crown, Gamepad2, Download, Zap, TrendingUp } from "lucide-react";
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

  // Electron launch states for Library
  const [isElectron, setIsElectron] = useState(false);
  const [installedGames, setInstalledGames] = useState<Record<string, boolean>>({});
  const [installProgress, setInstallProgress] = useState<Record<string, number>>({});
  const [installingGames, setInstallingGames] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && 'electron' in window);
  }, []);

  useEffect(() => {
    if (isElectron && libraryGames.length > 0) {
      const checkStatuses = async () => {
        const newInstalled: Record<string, boolean> = {};
        for (const item of libraryGames) {
          const gameDetails = item.game_details || {};
          if (gameDetails.slug && gameDetails.executable_path) {
            const installed = await (window as any).electron.checkInstalled(gameDetails.slug, gameDetails.executable_path);
            newInstalled[gameDetails.slug] = installed;
          }
        }
        setInstalledGames(newInstalled);
      };
      checkStatuses();

      // Listen to download progress
      const unsubscribe = (window as any).electron.onDownloadProgress((data: any) => {
        setInstallProgress(prev => ({ ...prev, [data.slug]: data.progress }));
      });

      return () => {
        unsubscribe();
      };
    }
  }, [isElectron, libraryGames]);

  const handleInstallLibraryGame = async (gameDetails: any) => {
    if (!gameDetails.slug || !gameDetails.download_url || !gameDetails.executable_path) return;
    const slug = gameDetails.slug;
    try {
      setInstallingGames(prev => ({ ...prev, [slug]: true }));
      setInstallProgress(prev => ({ ...prev, [slug]: 0 }));
      const res = await (window as any).electron.downloadGame(slug, gameDetails.download_url, gameDetails.executable_path);
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
        const launchRes = await (window as any).electron.launchGame(slug, gameDetails.executable_path);
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
    if (!gameDetails.slug || !gameDetails.executable_path) return;
    try {
      const res = await (window as any).electron.launchGame(gameDetails.slug, gameDetails.executable_path);
      if (!res.success) {
        alert(res.error || "O'yinni ishga tushirishda xatolik yuz berdi.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleWebDownloadClick = (e: React.MouseEvent, gameId: string | number) => {
    e.preventDefault();
    // 1. Launcherni ochishga harakat qilamiz (agar o'rnatilgan bo'lsa)
    window.location.href = `maroqli://games/${gameId}`;
    
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
    if (activeSetting === "my_library" && libraryGames.length === 0) {
      if (profileData?.role !== "GAMER" && profileData?.role !== "ADMIN") {
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
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user?.id)
          .single();

        if (error) throw error;

        setProfileData(data);
        setEditForm({
          full_name: data.full_name || "",
          username: data.username || "",
        });

        // Fetch streamer data if exists
        const { data: sData } = await supabase
          .from("streamers")
          .select("*")
          .eq("user_id", user?.id)
          .single();

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


      } catch (err) {
        console.error("Profile yuklashda xatolik:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, user, router]);

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
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          username: editForm.username,
        })
        .eq("id", user?.id);

      if (error) throw error;

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
    } catch (err) {
      console.error("Profilni saqlashda xatolik:", err);
      alert(t("profile_save_error", "Xatolik yuz berdi. Bu taxallus band bo'lishi mumkin."));
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const newAvatarUrl = publicUrlData.publicUrl;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfileData((prev: any) => ({ ...prev, avatar_url: newAvatarUrl }));
      setAuth({ ...user, avatar: newAvatarUrl }, token || "");

    } catch (err: any) {
      console.error("Avatar yuklash xatosi:", err);
      alert(t("image_upload_error", "Rasm yuklashda xatolik yuz berdi.") + " (" + (err.message || err) + ")");
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



  if (loading) {
    return (
      <main className="min-h-screen bg-background relative flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!profileData) return null;

  const roleBadge: Record<string, string> = {
    ADMIN: "bg-primary/15 border-primary/30 text-primary",
    GAMEDEV: "bg-violet/15 border-violet/30 text-violet",
    GAMER: "bg-cyan/15 border-cyan/30 text-cyan",
  };
  const roleClass = roleBadge[profileData.role as string] || "bg-white/5 border-white/10 text-secondary";

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
              {/* Avatar — faqat avatar banner ustiga chiqadi, ism pastda to'liq ko'rinadi */}
              <div className="relative w-32 h-32 md:w-36 md:h-36 group shrink-0 mx-auto md:mx-0 -mt-20 md:-mt-24">
                <div className="w-full h-full rounded-3xl overflow-hidden border-4 border-background bg-card flex items-center justify-center relative z-10 shadow-glow">
                  {profileData.avatar_url ? (
                    <img src={profileData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
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
                        setEditForm({ full_name: profileData.full_name, username: profileData.username });
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
                      <h1 className="font-display text-2xl md:text-3xl font-black text-white tracking-tight">{profileData.full_name}</h1>
                      {profileData.is_premium && (
                        <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-black text-[10px] font-black uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1 shadow-[0_0_14px_rgba(245,158,11,0.4)]">
                          <Crown size={10} className="fill-current" />
                          PRO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-2.5 flex-wrap">
                      <p className="text-primary font-bold text-sm">@{profileData.username}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${roleClass}`}>
                        {profileData.role}
                      </span>
                    </div>
                    <p className="text-secondary text-xs mt-2">
                      {t("joined_date", "A'zo bo'ldi: ")}{new Date(profileData.created_at).toLocaleDateString(localeStr, { month: 'long', year: 'numeric' })}
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
            <div className="grid grid-cols-3 gap-3 md:gap-4 mt-8">
              <div className="glass-card !rounded-2xl p-4 md:p-5 text-center">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                  <TrendingUp size={16} />
                </div>
                <p className="font-display text-2xl md:text-3xl font-black text-white tabular-nums">{profileData.level || 1}</p>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-1">{t("level_label", "Daraja")}</p>
              </div>
              <div className="glass-card !rounded-2xl p-4 md:p-5 text-center">
                <div className="w-9 h-9 rounded-xl bg-violet/10 text-violet flex items-center justify-center mx-auto mb-2">
                  <Zap size={16} />
                </div>
                <p className="font-display text-2xl md:text-3xl font-black text-white tabular-nums">{profileData.elo ?? 1000}</p>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-1">ELO</p>
              </div>
              <div className="glass-card !rounded-2xl p-4 md:p-5 text-center">
                <div className="w-9 h-9 rounded-xl bg-cyan/10 text-cyan flex items-center justify-center mx-auto mb-2">
                  <Shield size={16} />
                </div>
                <p className="font-display text-lg md:text-2xl font-black text-white truncate">{profileData.role}</p>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mt-1">{t("your_role", "Rolingiz")}</p>
              </div>
            </div>
          </div>
        </motion.div>

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
              {profileData.is_premium && (
                <div className="text-center group">
                  <div className="w-16 h-16 bg-white/5 border border-white/10 group-hover:border-amber-500/50 transition-colors rounded-2xl mx-auto mb-3 flex items-center justify-center">
                    <Crown size={24} className="text-amber-400 fill-amber-400/20" />
                  </div>
                  <p className="text-xs font-bold text-white">{t("premium_achievement", "Premium")}</p>
                </div>
              )}
              {profileData.role === 'GAMEDEV' && (
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
                ...(profileData.role === "GAMER" || profileData.role === "ADMIN" ? [{ key: "my_library", label: t("my_library", "Mening Kutubxonam") }] : []),
                ...((streamerData !== null || profileData.role === "ADMIN") ? [{ key: "streaming_settings", label: t("streaming_settings", "Striming sozlamalari") }] : []),
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
                <Settings size={24} className="text-primary" />
                <h3 className="text-xl font-bold">
                  {activeSetting === "my_team" ? t("my_team", "Mening Jamoam") :
                   activeSetting === "my_library" ? t("my_library", "Mening Kutubxonam") :
                   activeSetting === "streaming_settings" ? t("streaming_settings", "Striming sozlamalari") :
                   activeSetting === "account_security" ? t("account_security", "Hisob xavfsizligi") :
                   activeSetting === "notification_settings" ? t("notification_settings", "Xabarnomalar sozlamalari") :
                   activeSetting === "payment_methods" ? t("payment_methods", "To'lov usullari") :
                   activeSetting === "privacy_and_security" ? t("privacy_and_security", "Maxfiylik va Xavfsizlik") : activeSetting}
                </h3>
              </div>

              {activeSetting === "my_library" ? (
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

                              {isElectron && gameDetails.executable_path ? (
                                installedGames[gameDetails.slug] ? (
                                  <button
                                    onClick={() => handleLaunchLibraryGame(gameDetails)}
                                    className="mt-3 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-green-600/20"
                                  >
                                    <Gamepad2 size={12} />
                                    <span>O'ynash</span>
                                  </button>
                                ) : installingGames[gameDetails.slug] ? (
                                  <div className="mt-3 w-full py-2.5 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                      <span>Yuklanmoqda: {installProgress[gameDetails.slug] || 0}%</span>
                                    </div>
                                    <div className="w-11/12 bg-white/10 h-1 rounded-full overflow-hidden">
                                      <div className="bg-primary h-full transition-all duration-300" style={{ width: `${installProgress[gameDetails.slug] || 0}%` }} />
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleInstallLibraryGame(gameDetails)}
                                    className="mt-3 w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20"
                                  >
                                    <Download size={12} />
                                    <span>O'rnatish</span>
                                  </button>
                                )
                              ) : (
                                gameDetails.download_url && (
                                  <button
                                    onClick={(e) => handleWebDownloadClick(e, gameDetails.id)}
                                    className="mt-3 w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20"
                                  >
                                    <Download size={12} />
                                    <span>Launcher orqali yuklab olish</span>
                                  </button>
                                )
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
