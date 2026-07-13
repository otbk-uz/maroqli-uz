"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Rocket, DollarSign, Download, UploadCloud, Plus, RefreshCw, Layers, MapPin, Users, Calendar, Gift, Trash2, Sparkles, Package, TrendingUp, PlayCircle, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore, useTranslation } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { BackButton } from "@/components/ui/BackButton";

interface DevelopedGame {
  id: string;
  title: string;
  slug: string;
  price: number;
  platform: string;
  rating: string;
  description: string;
}

interface DevDashboardData {
  games: DevelopedGame[];
  total_sales: number;
  total_earnings: number;
}

interface StudioProfile {
  id: string;
  user_id: string;
  studio_name: string;
  team_members: string;
  location: string;
  demo_url: string;
  demo_type: "image" | "video";
  release_date: string;
  donation_url: string;
  profile?: {
    username: string;
    avatar_url: string;
  };
}

export default function GamedevPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"community" | "dashboard">("community");
  const [dashboardSubTab, setDashboardSubTab] = useState<"games" | "profile" | "past_projects">("games");


  // Dashboard & Studio data
  const [dashboardData, setDashboardData] = useState<DevDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [studiosLoading, setStudiosLoading] = useState(false);
  const [registeredStudios, setRegisteredStudios] = useState<StudioProfile[]>([]);

  // Studio Profile Form States
  const [studioName, setStudioName] = useState("");
  const [teamMembers, setTeamMembers] = useState("");
  const [location, setLocation] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [demoType, setDemoType] = useState<"image" | "video">("image");
  const [releaseDate, setReleaseDate] = useState("");
  const [donationUrl, setDonationUrl] = useState("");
  const [profileExists, setProfileExists] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Game Upload Form states
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [platform, setPlatform] = useState("PC");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("O'zbek, Rus, Ingliz");
  const [sysRequirements, setSysRequirements] = useState("OS: Windows 10, RAM: 8GB, GPU: GTX 1050");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [gameFile, setGameFile] = useState<File | null>(null);
  const [executablePath, setExecutablePath] = useState("");

  // Past Projects Form States
  const [pastTitle, setPastTitle] = useState("");
  const [pastDescription, setPastDescription] = useState("");
  const [pastGenre, setPastGenre] = useState("");
  const [pastPlatform, setPastPlatform] = useState("PC");
  const [pastReleaseDate, setPastReleaseDate] = useState("");
  const [pastProjects, setPastProjects] = useState<any[]>([]);
  const [loadingPastProjects, setLoadingPastProjects] = useState(false);
  const [savingPastProject, setSavingPastProject] = useState(false);



  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "community" || tab === "dashboard") {
        setActiveTab(tab);
      }
    }
    fetchRegisteredStudios();
  }, [typeof window !== "undefined" ? window.location.search : ""]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "GAMEDEV") {
      fetchDashboardData();
      fetchStudioProfile();
      fetchPastProjects();
    }
  }, [isAuthenticated, user]);

  const fetchRegisteredStudios = async () => {
    try {
      setStudiosLoading(true);
      const { data, error } = await supabase
        .from("gamedev_profiles")
        .select(`
          *,
          profile:user_id(username, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRegisteredStudios(data || []);
    } catch (err) {
      console.error("Studiyalarni yuklashda xatolik:", err);
    } finally {
      setStudiosLoading(false);
    }
  };

  const fetchStudioProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("gamedev_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStudioName(data.studio_name || "");
        setTeamMembers(data.team_members || "");
        setLocation(data.location || "");
        setDemoUrl(data.demo_url || "");
        setDemoType(data.demo_type || "image");
        setReleaseDate(data.release_date || "");
        setDonationUrl(data.donation_url || "");
        setProfileExists(true);
      }
    } catch (err) {
      console.error("Studio profilini yuklashda xatolik:", err);
    }
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: games, error } = await supabase
        .from("developed_games")
        .select("*")
        .eq("developer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      let total_sales = 0;
      let total_earnings = 0;
      games?.forEach((g) => {
        total_sales += g.sales_count || 0;
        total_earnings += (g.price || 0) * (g.sales_count || 0);
      });

      setDashboardData({
        games: games || [],
        total_sales,
        total_earnings
      });
    } catch (err) {
      console.error("Dashboard yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPastProjects = async () => {
    if (!user) return;
    try {
      setLoadingPastProjects(true);
      const { data, error } = await supabase
        .from("gamedev_past_projects")
        .select("*")
        .eq("developer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPastProjects(data || []);
    } catch (err) {
      console.error("Avvalgi loyihalarni yuklashda xatolik:", err);
    } finally {
      setLoadingPastProjects(false);
    }
  };

  const handleSaveStudioProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioName.trim() || !user) {
      alert("Iltimos, studio nomini kiriting!");
      return;
    }

    setProfileSaving(true);
    try {
      const profileData = {
        user_id: user.id,
        studio_name: studioName,
        team_members: teamMembers,
        location,
        demo_url: demoUrl,
        demo_type: demoType,
        release_date: releaseDate,
        donation_url: donationUrl,
      };

      let error;
      if (profileExists) {
        const { error: err } = await supabase
          .from("gamedev_profiles")
          .update(profileData)
          .eq("user_id", user.id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from("gamedev_profiles")
          .insert(profileData);
        error = err;
        if (!error) setProfileExists(true);
      }

      if (error) throw error;
      alert("Studiya profili muvaffaqiyatli saqlandi!");
      fetchRegisteredStudios(); // Refresh directory list
    } catch (err: any) {
      alert(err.message || "Profilni saqlashda xatolik yuz berdi.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUploadGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !description || !user) {
      alert("Iltimos barcha majburiy maydonlarni to'ldiring.");
      return;
    }

    setSubmitting(true);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now();

    try {
      let download_url = null;
      if (gameFile) {
        const fileExt = gameFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_game.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('game_files')
          .upload(fileName, gameFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('game_files')
          .getPublicUrl(fileName);

        download_url = publicUrl;
      }

      const { error } = await supabase.from("developed_games").insert({
        developer_id: user.id,
        title,
        slug,
        price: parseFloat(price),
        platform,
        description,
        language,
        sys_requirements: sysRequirements,
        download_url,
        executable_path: executablePath,
      });

      if (error) throw error;

      alert("O'yin muvaffaqiyatli yuklandi va do'konga qo'shildi!");
      setShowUploadForm(false);

      // Reset form
      setTitle("");
      setPrice("");
      setPlatform("PC");
      setDescription("");
      setGameFile(null);
      setExecutablePath("");

      // Refresh dashboard data
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || "O'yin yuklashda xatolik yuz berdi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPastProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastTitle.trim() || !user) {
      alert("Iltimos, loyiha nomini kiriting!");
      return;
    }

    setSavingPastProject(true);
    try {
      const { error } = await supabase
        .from("gamedev_past_projects")
        .insert({
          developer_id: user.id,
          title: pastTitle,
          description: pastDescription,
          genre: pastGenre,
          platform: pastPlatform,
          release_date: pastReleaseDate,
        });

      if (error) throw error;

      alert("Loyiha muvaffaqiyatli qo'shildi!");
      setPastTitle("");
      setPastDescription("");
      setPastGenre("");
      setPastPlatform("PC");
      setPastReleaseDate("");

      fetchPastProjects();
    } catch (err: any) {
      alert(err.message || "Loyihani qo'shishda xatolik yuz berdi.");
    } finally {
      setSavingPastProject(false);
    }
  };

  const handleDeletePastProject = async (projectId: string) => {
    if (!confirm("Haqiqatan ham ushbu loyihani o'chirishni xohlaysizmi?")) return;

    try {
      const { error } = await supabase
        .from("gamedev_past_projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      alert("Loyiha o'chirildi!");
      fetchPastProjects();
    } catch (err: any) {
      alert(err.message || "Loyihani o'chirishda xatolik yuz berdi.");
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm("Haqiqatan ham o'yinni o'chirishni xohlaysizmi? Bu amalni ortga qaytarib bo'lmaydi!")) return;

    try {
      const { error } = await supabase
        .from("developed_games")
        .delete()
        .eq("id", gameId);

      if (error) throw error;

      alert("O'yin muvaffaqiyatli o'chirildi!");
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || "O'yinni o'chirishda xatolik yuz berdi.");
    }
  };

  const isDeveloper = user?.role === "GAMEDEV";

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-secondary/60";

  return (
    <main className="min-h-screen bg-background text-white">
      <Navbar />

      {/* Premium Header */}
      <section className="relative pt-36 pb-10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(139,92,246,0.16),transparent_60%)]" />
        <div className="absolute inset-x-0 top-0 h-[540px] -z-10 bg-[radial-gradient(circle_at_15%_0%,rgba(255,51,85,0.12),transparent_55%)]" />

        <div className="container-app">
          <BackButton />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mt-2">
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="chip mb-5 border-violet/25 bg-violet/10 text-violet"
              >
                <Rocket size={14} />
                <span className="font-display uppercase tracking-[0.2em] text-[11px]">
                  {t("gamedev_short", "Studiyalar")}
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-4xl sm:text-5xl md:text-6xl font-black mb-4 tracking-tight leading-[1.05] uppercase"
              >
                GameDev <span className="text-gradient">Hub</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-secondary text-base md:text-lg leading-relaxed"
              >
                {t("gamedev_subtitle", "O'zbekistondagi o'yin yaratuvchilar jamoasi va indie studiyalar portali.")}
              </motion.p>
            </div>

            {/* Tab Toggles for Everyone */}
            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 w-full md:w-auto">
              <button
                onClick={() => setActiveTab("community")}
                className="relative flex-1 md:flex-none py-2.5 px-6 rounded-xl font-bold text-sm transition-all z-10"
              >
                {activeTab === "community" && (
                  <motion.span
                    layoutId="gamedevTab"
                    className="absolute inset-0 bg-brand-gradient rounded-xl -z-10 shadow-glow-violet"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className={activeTab === "community" ? "text-white" : "text-secondary hover:text-white"}>
                  {t("community_tab", "Hamjamiyat")}
                </span>
              </button>
              {isAuthenticated && isDeveloper && (
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="relative flex-1 md:flex-none py-2.5 px-6 rounded-xl font-bold text-sm transition-all z-10 flex items-center justify-center gap-2"
                >
                  {activeTab === "dashboard" && (
                    <motion.span
                      layoutId="gamedevTab"
                      className="absolute inset-0 bg-brand-gradient rounded-xl -z-10 shadow-glow-violet"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Layers size={16} className={activeTab === "dashboard" ? "text-white" : "text-secondary"} />
                  <span className={activeTab === "dashboard" ? "text-white" : "text-secondary hover:text-white"}>Dashboard</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container-app pb-24">
        <AnimatePresence mode="wait">
          {activeTab === "community" ? (
            <motion.div
              key="community"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-16"
            >
              {/* Local Studios Section */}
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-2xl bg-violet/10 border border-violet/20 text-violet flex items-center justify-center">
                    <Package size={20} />
                  </div>
                  <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight">{t("local_studios", "Mahalliy Studiyalar")}</h2>
                </div>

                {studiosLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="skeleton h-72 rounded-3xl" />
                    ))}
                  </div>
                ) : registeredStudios.length === 0 ? (
                  <div className="glass-card py-20 px-6 text-center flex flex-col items-center">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-violet/20 blur-2xl rounded-full" />
                      <div className="relative w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center animate-float">
                        <Rocket size={34} className="text-violet" />
                      </div>
                    </div>
                    <h3 className="font-display text-xl md:text-2xl font-black text-white mb-2 uppercase tracking-tight">
                      {t("no_studios", "Hozircha ro'yxatdan o'tgan studiyalar mavjud emas.")}
                    </h3>
                    {isDeveloper && (
                      <button
                        onClick={() => {
                          setActiveTab("dashboard");
                          setDashboardSubTab("profile");
                        }}
                        className="btn-gradient mt-6 !py-2.5 !px-6 text-xs uppercase tracking-wider"
                      >
                        {t("first_register", "O'z studiyangizni birinchilardan bo'lib ro'yxatdan o'tkazing")}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {registeredStudios.map((s) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card-interactive p-6 flex flex-col justify-between group"
                      >
                        <div>
                          {/* Demo Media Preview Teaser if available */}
                          {s.demo_url && (
                            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/40 border border-white/5 mb-5 relative">
                              {s.demo_type === "image" ? (
                                <img src={s.demo_url} alt="Demo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-black/60 relative gap-2">
                                  <PlayCircle size={32} className="text-violet animate-pulse-glow" />
                                  <span className="text-[10px] text-secondary font-bold">Video Demo mavjud</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex justify-between items-start gap-3 mb-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                {s.profile?.avatar_url ? (
                                  <img src={s.profile.avatar_url} alt={s.studio_name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="font-display font-black text-sm text-violet uppercase">
                                    {s.studio_name?.substring(0, 2) || "ST"}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-lg group-hover:text-primary transition-colors truncate">{s.studio_name}</h4>
                            </div>
                          </div>

                          <div className="space-y-2.5 mb-5">
                            <div className="flex items-center gap-2 text-xs text-secondary">
                              <MapPin size={14} className="text-primary shrink-0" />
                              <span className="truncate">{s.location || "Noma'lum"}</span>
                            </div>
                            {s.team_members && (
                              <div className="flex items-center gap-2 text-xs text-secondary">
                                <Users size={14} className="text-violet shrink-0" />
                                <span className="line-clamp-1">{t("team_members", "Jamoa")}: {s.team_members}</span>
                              </div>
                            )}
                            {s.release_date && (
                              <div className="flex items-center gap-2 text-xs text-secondary">
                                <Calendar size={14} className="text-cyan shrink-0" />
                                <span>{t("expected_release", "Kutilayotgan reliz")}: {s.release_date}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 border-t border-white/5 pt-4 mt-2">
                          <button
                            onClick={() => router.push(`/gamedev/${s.id}`)}
                            className="flex-1 py-2.5 px-4 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                          >
                            <Rocket size={14} />
                            <span>{t("details_page", "Batafsil Sahifa")}</span>
                          </button>

                          {s.donation_url && (
                            <a
                              href={s.donation_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 bg-warning/10 hover:bg-warning border border-warning/20 hover:border-warning text-warning hover:text-black rounded-xl transition-all"
                              title={t("donate", "Donat qilish")}
                            >
                              <Gift size={14} />
                            </a>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* How to join banner */}
              <div className="relative overflow-hidden rounded-3xl border border-violet/20 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="absolute inset-0 bg-brand-gradient-soft -z-10" />
                <div className="absolute -right-10 -top-10 w-48 h-48 bg-violet/20 blur-3xl rounded-full -z-10" />
                <div>
                  <h3 className="font-display text-2xl md:text-3xl font-black mb-2 uppercase tracking-tight">{t("gamedev_banner_title", "Siz ham o'yin yaratuvchimisiz?")}</h3>
                  <p className="text-sm text-secondary max-w-2xl">
                    {t("gamedev_banner_desc", "O'zingizning o'yinlaringizni Maroqli.uz do'koniga joylashtirib daromad olishni boshlang.")}
                  </p>
                </div>
                <Sparkles size={40} className="text-violet shrink-0 hidden md:block animate-float" />
              </div>
            </motion.div>
          ) : activeTab === "dashboard" ? (
            // Developer Dashboard Tab
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Dashboard Sub Tabs */}
              <div className="flex flex-wrap gap-1 border-b border-white/5">
                {([
                  { key: "games", label: "Loyihalar & Savdolar" },
                  { key: "profile", label: "Studiya Profilini Tahrirlash" },
                  { key: "past_projects", label: "Avvalgi Loyihalar (Tajriba)" },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setDashboardSubTab(tab.key)}
                    className={`relative py-3 px-5 font-bold text-sm transition-all ${
                      dashboardSubTab === tab.key ? "text-white" : "text-secondary hover:text-white"
                    }`}
                  >
                    {tab.label}
                    {dashboardSubTab === tab.key && (
                      <motion.span
                        layoutId="gamedevSubTab"
                        className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary rounded-full"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {dashboardSubTab === "games" && (
                <div className="space-y-12">
                  {/* Dev stats cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card p-6 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-secondary uppercase font-semibold tracking-wider">Jami O'yinlar</span>
                        <h3 className="font-display text-3xl font-black mt-2 tabular-nums">{dashboardData?.games.length || 0} ta</h3>
                      </div>
                      <div className="p-3.5 bg-primary/10 text-primary rounded-2xl">
                        <Rocket size={24} />
                      </div>
                    </div>

                    <div className="glass-card p-6 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-secondary uppercase font-semibold tracking-wider">Sotilgan Nusxalar</span>
                        <h3 className="font-display text-3xl font-black mt-2 tabular-nums">{dashboardData?.total_sales || 0} nusxa</h3>
                      </div>
                      <div className="p-3.5 bg-success/10 text-success rounded-2xl">
                        <Download size={24} />
                      </div>
                    </div>

                    <div className="glass-card p-6 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-secondary uppercase font-semibold tracking-wider">Jami Daromad</span>
                        <h3 className="font-display text-3xl font-black mt-2 tabular-nums">
                          {dashboardData?.total_earnings.toLocaleString() || 0} UZS
                        </h3>
                      </div>
                      <div className="p-3.5 bg-warning/10 text-warning rounded-2xl">
                        <DollarSign size={24} />
                      </div>
                    </div>
                  </div>

                  {/* Games & Upload Header */}
                  <div className="flex flex-wrap justify-between items-center gap-4">
                    <h2 className="font-display text-2xl font-black uppercase tracking-tight">Yuklangan O'yinlar</h2>
                    <button
                      onClick={() => setShowUploadForm(!showUploadForm)}
                      className="btn-primary !py-2.5 !px-5 text-sm gap-2"
                    >
                      <Plus size={16} />
                      <span>Yangi O'yin Yuklash</span>
                    </button>
                  </div>

                  {/* Upload Game Form Drawer/Modal */}
                  <AnimatePresence>
                    {showUploadForm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <form
                          onSubmit={handleUploadGame}
                          className="glass-card p-6 md:p-8 border-primary/20 space-y-6"
                        >
                          <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                            <UploadCloud size={20} /> Yangi o'yin loyihasini joylashtirish
                          </h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-xs font-semibold text-secondary block mb-1.5">O'yin nomi (Majburiy)</label>
                              <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                className={inputClass}
                                placeholder="Masalan: Shadow of Bukhara"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-secondary block mb-1.5">Narxi (UZS, Bepul uchun 0)</label>
                              <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                required
                                className={inputClass}
                                placeholder="Narxi kiriting"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="text-xs font-semibold text-secondary block mb-1.5">Platforma</label>
                              <select
                                value={platform}
                                onChange={(e) => setPlatform(e.target.value)}
                                className={inputClass}
                              >
                                <option value="PC">Kompyuter (PC)</option>
                                <option value="MOBILE">Mobil (Mobile)</option>
                                <option value="BOTH">Har ikkalasi (Both)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-secondary block mb-1.5">Tillar</label>
                              <input
                                type="text"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className={inputClass}
                                placeholder="O'zbek, Rus, Ingliz"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-secondary block mb-1.5">O'yin tavsifi (Majburiy)</label>
                            <textarea
                              rows={4}
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              required
                              className={inputClass}
                              placeholder="O'yin haqida batafsil tavsif bering..."
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-secondary block mb-1.5">Tizim talablari</label>
                            <input
                              type="text"
                              value={sysRequirements}
                              onChange={(e) => setSysRequirements(e.target.value)}
                              className={inputClass}
                              placeholder="OS: Windows 10, CPU: Intel i5, RAM: 8GB, GPU: GTX 1050"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-secondary block mb-1.5">Asosiy ishga tushiruvchi fayl nomi (Majburiy emas, Launcher uchun)</label>
                            <input
                              type="text"
                              value={executablePath}
                              onChange={(e) => setExecutablePath(e.target.value)}
                              className={inputClass}
                              placeholder="Masalan: MyGame.exe yoki Launcher.exe"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-secondary block mb-1.5">O'yin fayli (.zip, .exe, .rar - Majburiy emas)</label>
                            <input
                              type="file"
                              accept=".zip,.exe,.rar"
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  setGameFile(e.target.files[0]);
                                }
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs focus:outline-none text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary/20 file:text-primary file:text-xs file:font-bold"
                            />
                            {gameFile && (
                              <p className="text-[10px] text-primary mt-1.5">Tanlandi: {gameFile.name} ({(gameFile.size/1024/1024).toFixed(2)} MB)</p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-4">
                            <button
                              type="submit"
                              disabled={submitting}
                              className="btn-primary !py-3 !px-8 text-sm disabled:opacity-50"
                            >
                              {submitting ? "Yuklanmoqda..." : "Do'konga joylashtirish"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowUploadForm(false)}
                              className="btn-outline !py-3 !px-8 text-sm"
                            >
                              Bekor qilish
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Developer Games Catalog */}
                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[1, 2].map((n) => (
                        <div key={n} className="skeleton h-40 rounded-3xl" />
                      ))}
                    </div>
                  ) : dashboardData?.games && dashboardData.games.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {dashboardData.games.map((game) => (
                        <div
                          key={game.id}
                          className="card-interactive p-6 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-2 gap-3">
                              <h4 className="font-bold text-lg">{game.title}</h4>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                                  {game.platform}
                                </span>
                                <button
                                  onClick={() => handleDeleteGame(game.id)}
                                  className="text-secondary hover:text-primary transition-colors p-1"
                                  title="O'yinni o'chirish"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-secondary/80 line-clamp-2 mb-4 leading-relaxed">
                              {game.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2 text-xs">
                            <div>
                              <span className="text-secondary/70">O'yin narxi:</span>
                              <p className="font-bold text-sm text-white tabular-nums">
                                {game.price === 0 ? "Bepul" : `${game.price.toLocaleString()} UZS`}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-secondary/70">Reyting:</span>
                              {game.rating ? (
                                <p className="font-bold text-sm text-warning flex items-center gap-1 justify-end tabular-nums">
                                  <Star size={13} className="fill-warning text-warning" /> {game.rating}
                                </p>
                              ) : (
                                <p className="font-bold text-sm text-secondary">Baholanmagan</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="glass-card py-16 px-6 text-center flex flex-col items-center">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                        <Rocket size={28} className="text-primary" />
                      </div>
                      <p className="text-secondary mb-5">Siz hali birorta o'yin yuklamagansiz.</p>
                      <button
                        onClick={() => setShowUploadForm(true)}
                        className="btn-outline !py-2.5 !px-6 text-sm"
                      >
                        Birinchi o'yiningizni yuklang
                      </button>
                    </div>
                  )}
                </div>
              )}

              {dashboardSubTab === "profile" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="max-w-2xl"
                >
                  <form onSubmit={handleSaveStudioProfile} className="glass-card p-6 md:p-8 space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                      <Rocket size={20} /> Studiya Profil Sozlamalari
                    </h3>
                    <p className="text-xs text-secondary">
                      Ushbu ma'lumotlar platforma a'zolari va boshqa tashrif buyuruvchilarga ko'rinadi.
                    </p>

                    <div>
                      <label className="text-xs font-semibold text-secondary block mb-1.5">Studiya nomi (Majburiy)</label>
                      <input
                        type="text"
                        value={studioName}
                        onChange={(e) => setStudioName(e.target.value)}
                        required
                        className={inputClass}
                        placeholder="Masalan: PixelForge UZ"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-secondary block mb-1.5">Jamoa a'zolari</label>
                      <input
                        type="text"
                        value={teamMembers}
                        onChange={(e) => setTeamMembers(e.target.value)}
                        className={inputClass}
                        placeholder="Masalan: Sardor (Lead Dev), Nodir (3D Art), Malika (UX/UI)"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-secondary block mb-1.5">Manzil / Joylashuv</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className={inputClass}
                        placeholder="Masalan: Toshkent shahri, Chilonzor"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-semibold text-secondary block mb-1.5">Kutilayotgan reliz sanasi</label>
                        <input
                          type="text"
                          value={releaseDate}
                          onChange={(e) => setReleaseDate(e.target.value)}
                          className={inputClass}
                          placeholder="Masalan: 2026 yil Dekabr yoki Q4 2026"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-secondary block mb-1.5">Donat qilish havolasi (SSILKA)</label>
                        <input
                          type="url"
                          value={donationUrl}
                          onChange={(e) => setDonationUrl(e.target.value)}
                          className={inputClass}
                          placeholder="Masalan: https://payme.uz/@studio_name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                      <div className="md:col-span-2">
                        <label className="text-xs font-semibold text-secondary block mb-1.5">Demo rasm yoki video havolasi (URL)</label>
                        <input
                          type="url"
                          value={demoUrl}
                          onChange={(e) => setDemoUrl(e.target.value)}
                          className={inputClass}
                          placeholder="Masalan: https://youtube.com/watch?v=... yoki rasm ssilkasi"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-secondary block mb-1.5">Demo turi</label>
                        <select
                          value={demoType}
                          onChange={(e) => setDemoType(e.target.value as "image" | "video")}
                          className={inputClass}
                        >
                          <option value="image">Rasm (Image)</option>
                          <option value="video">Video (YouTube embed/link)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="btn-primary !py-3 !px-8 text-sm gap-2 disabled:opacity-50"
                    >
                      {profileSaving ? (
                        <>
                          <RefreshCw className="animate-spin" size={16} />
                          Saqlanmoqda...
                        </>
                      ) : (
                        "Profilni saqlash"
                      )}
                    </button>
                  </form>
                </motion.div>
              )}

              {dashboardSubTab === "past_projects" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form on left */}
                    <div className="lg:col-span-1">
                      <form onSubmit={handleAddPastProject} className="glass-card p-6 space-y-4">
                        <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                          <Plus size={18} /> Yangi Loyiha Qo'shish
                        </h3>
                        <p className="text-xs text-secondary">
                          Avvalgi jamoalarda yoki mustaqil yaratgan o'yinlaringizni qo'shib, tajribangizni ko'rsating.
                        </p>

                        <div>
                          <label className="text-xs font-semibold text-secondary block mb-1.5">O'yin nomi (Majburiy)</label>
                          <input
                            type="text"
                            value={pastTitle}
                            onChange={(e) => setPastTitle(e.target.value)}
                            required
                            className={inputClass}
                            placeholder="Masalan: Bo'g'irsoq Sarguzashti"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-secondary block mb-1.5">O'yin janri</label>
                          <input
                            type="text"
                            value={pastGenre}
                            onChange={(e) => setPastGenre(e.target.value)}
                            className={inputClass}
                            placeholder="Masalan: RPG, Shooter, Strategiya"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-secondary block mb-1.5">Platforma</label>
                          <select
                            value={pastPlatform}
                            onChange={(e) => setPastPlatform(e.target.value)}
                            className={inputClass}
                          >
                            <option value="PC">PC (Kompyuter)</option>
                            <option value="Mobile">Mobile (Mobil)</option>
                            <option value="Har ikkisi">PC & Mobile</option>
                            <option value="Konsol">Konsol</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-secondary block mb-1.5">Chiqarilgan vaqti (Sana)</label>
                          <input
                            type="text"
                            value={pastReleaseDate}
                            onChange={(e) => setPastReleaseDate(e.target.value)}
                            className={inputClass}
                            placeholder="Masalan: 2024-yil may yoki 2025"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-secondary block mb-1.5">Qisqa izoh</label>
                          <textarea
                            rows={3}
                            value={pastDescription}
                            onChange={(e) => setPastDescription(e.target.value)}
                            className={inputClass}
                            placeholder="O'yin haqida qisqacha tavsif bering..."
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={savingPastProject}
                          className="btn-primary w-full !py-3 text-xs gap-2 disabled:opacity-50"
                        >
                          {savingPastProject ? (
                            <>
                              <RefreshCw className="animate-spin" size={14} />
                              Saqlanmoqda...
                            </>
                          ) : (
                            "Loyihani qo'shish"
                          )}
                        </button>
                      </form>
                    </div>

                    {/* List on right */}
                    <div className="lg:col-span-2 space-y-4">
                      <h3 className="font-display text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        <TrendingUp size={20} className="text-primary" />
                        Avvalgi Loyihalar Ro'yxati
                      </h3>

                      {loadingPastProjects ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[1, 2].map((n) => (
                            <div key={n} className="skeleton h-40 rounded-3xl" />
                          ))}
                        </div>
                      ) : pastProjects.length === 0 ? (
                        <div className="glass-card p-12 text-center text-secondary text-sm">
                          Siz hali avvalgi loyihalaringiz haqida ma'lumot kiritmagansiz.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {pastProjects.map((project) => (
                            <div key={project.id} className="card-interactive p-5 flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-start mb-2 gap-2">
                                  <h4 className="font-bold text-base text-white">{project.title}</h4>
                                  <span className="bg-white/5 border border-white/10 text-[9px] text-secondary font-bold px-2 py-0.5 rounded shrink-0">
                                    {project.platform}
                                  </span>
                                </div>
                                <p className="text-[10px] text-primary font-bold mb-2 uppercase tracking-wider">{project.genre || "Janrsiz"}</p>
                                <p className="text-xs text-secondary/80 line-clamp-3 leading-relaxed mb-4">{project.description}</p>
                              </div>

                              <div className="flex justify-between items-center pt-3 border-t border-white/5 text-[10px]">
                                <span className="text-secondary/70">Sana: {project.release_date || "Noma'lum"}</span>
                                <button
                                  onClick={() => handleDeletePastProject(project.id)}
                                  className="text-secondary hover:text-primary font-bold transition-colors flex items-center gap-1"
                                >
                                  <Trash2 size={12} />
                                  <span>O'chirish</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
}
