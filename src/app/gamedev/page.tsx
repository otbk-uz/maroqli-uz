"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Code2, Palette, Box, Rocket, DollarSign, Download, UploadCloud, Plus, RefreshCw, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import { BackButton } from "@/components/ui/BackButton";

interface DevelopedGame {
  id: number;
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

const studios = [
  { name: "PixelForge UZ", focus: "3D Platformer", location: "Toshkent", developers: 8, rating: "4.9" },
  { name: "NomadStudios", focus: "Mobile RPG", location: "Samarqand", developers: 5, rating: "4.7" },
  { name: "ByteShift", focus: "FPS Shooter", location: "Buxoro", developers: 12, rating: "4.8" },
];

export default function GamedevPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"community" | "dashboard">("community");
  const [dashboardData, setDashboardData] = useState<DevDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [platform, setPlatform] = useState("PC");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("O'zbek, Rus, Ingliz");
  const [sysRequirements, setSysRequirements] = useState("OS: Windows 10, RAM: 8GB, GPU: GTX 1050");
  const [showUploadForm, setShowUploadForm] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role === "GAMEDEV") {
      fetchDashboardData();
    }
  }, [isAuthenticated, user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tournaments/store/developer_dashboard/");
      setDashboardData(res.data);
    } catch (err) {
      console.error("Dashboard yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !description) {
      alert("Iltimos barcha majburiy maydonlarni to'ldiring.");
      return;
    }

    setSubmitting(true);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    try {
      await api.post("/tournaments/store/", {
        title,
        slug,
        price: parseFloat(price),
        platform,
        description,
        language,
        sys_requirements: sysRequirements,
      });

      alert("O'yin muvaffaqiyatli yuklandi va do'konga qo'shildi!");
      setShowUploadForm(false);
      
      // Reset form
      setTitle("");
      setPrice("");
      setPlatform("PC");
      setDescription("");
      
      // Refresh dashboard data
      fetchDashboardData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "O'yin yuklashda xatolik yuz berdi.");
    } finally {
      setSubmitting(false);
    }
  };

  const isDeveloper = user?.role === "GAMEDEV";

  return (
    <main className="min-h-screen bg-background text-white">
      <Navbar />

      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20 max-w-6xl">
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Hero Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative">
          <div className="absolute top-0 left-0 w-[200px] h-[200px] bg-primary/10 blur-[80px] rounded-full -z-10" />
          <div>
            <h1 className="text-4xl md:text-5xl font-black mb-3">GameDev & Studios Hub</h1>
            <p className="text-secondary text-base md:text-lg">
              O'zbekistondagi o'yin yaratuvchilar jamoasi va indie studiyalar portali.
            </p>
          </div>

          {/* Role Check & Tab Toggles */}
          {isAuthenticated && isDeveloper && (
            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 w-full md:w-auto">
              <button
                onClick={() => setActiveTab("community")}
                className={`flex-1 md:flex-none py-2.5 px-6 rounded-xl font-bold text-sm transition-all ${
                  activeTab === "community" ? "bg-white/10 text-white" : "text-secondary hover:text-white"
                }`}
              >
                Hamjamiyat
              </button>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex-1 md:flex-none py-2.5 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === "dashboard" ? "bg-primary text-white" : "text-secondary hover:text-white"
                }`}
              >
                <Layers size={16} /> Dashboard
              </button>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "community" ? (
            <motion.div
              key="community"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-16"
            >
              {/* Category Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="glass-card p-8 border-primary/20 hover:border-primary/40 transition-colors">
                  <Code2 size={40} className="text-primary mb-6" />
                  <h3 className="text-xl font-bold mb-2">Dasturlash</h3>
                  <p className="text-sm text-secondary leading-relaxed">
                    Unity, Unreal Engine va Godot bo'yicha mahalliy darsliklar va hamjamiyat hamkorligi.
                  </p>
                </div>
                <div className="glass-card p-8 hover:border-blue-500/40 transition-colors">
                  <Palette size={40} className="text-blue-500 mb-6" />
                  <h3 className="text-xl font-bold mb-2">Dizayn & Art</h3>
                  <p className="text-sm text-secondary leading-relaxed">
                    3D modellashtirish, konsept art va o'yin interfeyslari dizayni bo'yicha maslahatlar.
                  </p>
                </div>
                <div className="glass-card p-8 hover:border-green-500/40 transition-colors">
                  <Box size={40} className="text-green-500 mb-6" />
                  <h3 className="text-xl font-bold mb-2">Publishing</h3>
                  <p className="text-sm text-secondary leading-relaxed">
                    O'yinlarni global do'konlarga (Steam, Google Play) yuklash va daromad qilish sirlari.
                  </p>
                </div>
              </div>

              {/* Local Studios Section */}
              <div>
                <h2 className="text-2xl font-bold mb-8">Mahalliy Studiyalar</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {studios.map((s) => (
                    <div
                      key={s.name}
                      className="glass-card p-6 flex items-center justify-between border border-white/5 hover:border-white/10 transition-all"
                    >
                      <div>
                        <h4 className="font-bold text-lg">{s.name}</h4>
                        <p className="text-sm text-secondary mt-1">
                          Mutaxassisligi: <span className="text-white font-medium">{s.focus}</span>
                        </p>
                        <p className="text-xs text-secondary/70 mt-1">
                          Joylashuv: {s.location} • Jamoa a'zolari: {s.developers} ta • Reyting: ⭐ {s.rating}
                        </p>
                      </div>
                      <button
                        onClick={() => alert(`${s.name} studiyasi profili tez kunda to'liq ochiladi!`)}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                      >
                        <Rocket size={20} className="text-primary group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to join banner */}
              <div className="rounded-3xl bg-gradient-to-r from-primary/10 via-pink-500/5 to-transparent border border-primary/20 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Siz ham o'yin yaratuvchimisiz?</h3>
                  <p className="text-sm text-secondary max-w-2xl">
                    O'zingizning o'yinlaringizni PlayNationUz do'koniga joylashtirib daromad olishni boshlang. Platformamizda GameDev roli orqali to'liq statistika va yuklash imkoniyatlariga ega bo'lasiz.
                  </p>
                </div>
                <button
                  onClick={() => alert("GameDev roliga o'tish uchun adminlarga murojaat qiling yoki ro'yxatdan o'tishda tanlang.")}
                  className="py-3.5 px-8 bg-primary hover:bg-primary-hover font-bold rounded-xl text-sm transition-all whitespace-nowrap shadow-lg shadow-primary/10"
                >
                  GameDev bo'lish
                </button>
              </div>
            </motion.div>
          ) : (
            // Developer Dashboard Tab
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-12"
            >
              {/* Dev stats cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-secondary uppercase font-semibold">Jami O'yinlar</span>
                    <h3 className="text-3xl font-extrabold mt-2">{dashboardData?.games.length || 0} ta</h3>
                  </div>
                  <div className="p-3.5 bg-primary/10 text-primary rounded-xl">
                    <Rocket size={24} />
                  </div>
                </div>

                <div className="glass-card p-6 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-secondary uppercase font-semibold">Sotilgan Nusxalar</span>
                    <h3 className="text-3xl font-extrabold mt-2">{dashboardData?.total_sales || 0} nusxa</h3>
                  </div>
                  <div className="p-3.5 bg-green-500/10 text-green-400 rounded-xl">
                    <Download size={24} />
                  </div>
                </div>

                <div className="glass-card p-6 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-secondary uppercase font-semibold">Jami Daromad</span>
                    <h3 className="text-3xl font-extrabold mt-2">
                      {dashboardData?.total_earnings.toLocaleString() || 0} UZS
                    </h3>
                  </div>
                  <div className="p-3.5 bg-amber-500/10 text-amber-400 rounded-xl">
                    <DollarSign size={24} />
                  </div>
                </div>
              </div>

              {/* Games & Upload Header */}
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Yuklangan O'yinlar</h2>
                <button
                  onClick={() => setShowUploadForm(!showUploadForm)}
                  className="py-2.5 px-5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-sm flex items-center gap-2 transition-all shadow-md shadow-primary/10"
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
                      className="glass-card p-6 md:p-8 border border-primary/20 space-y-6"
                    >
                      <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                        <UploadCloud size={20} /> Yangi o'yin loyihasini joylashtirish
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-xs font-semibold text-secondary block mb-1">O'yin nomi (Majburiy)</label>
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="w-full bg-[#1e1e24] border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-white/10"
                            placeholder="Masalan: Shadow of Bukhara"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-secondary block mb-1">Narxi (UZS, Bepul uchun 0)</label>
                          <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            required
                            className="w-full bg-[#1e1e24] border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-white/10"
                            placeholder="Narxi kiriting"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-xs font-semibold text-secondary block mb-1">Platforma</label>
                          <select
                            value={platform}
                            onChange={(e) => setPlatform(e.target.value)}
                            className="w-full bg-[#1e1e24] border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-white/10"
                          >
                            <option value="PC">Kompyuter (PC)</option>
                            <option value="MOBILE">Mobil (Mobile)</option>
                            <option value="BOTH">Har ikkalasi (Both)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-secondary block mb-1">Tillar</label>
                          <input
                            type="text"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="w-full bg-[#1e1e24] border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none"
                            placeholder="O'zbek, Rus, Ingliz"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-secondary block mb-1">O'yin tavsifi (Majburiy)</label>
                        <textarea
                          rows={4}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          required
                          className="w-full bg-[#1e1e24] border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-white/10"
                          placeholder="O'yin haqida batafsil tavsif bering..."
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-secondary block mb-1">Tizim talablari</label>
                        <input
                          type="text"
                          value={sysRequirements}
                          onChange={(e) => setSysRequirements(e.target.value)}
                          className="w-full bg-[#1e1e24] border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none"
                          placeholder="OS: Windows 10, CPU: Intel i5, RAM: 8GB, GPU: GTX 1050"
                        />
                      </div>

                      <div className="flex gap-4">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="py-3 px-8 bg-primary hover:bg-primary-hover font-bold rounded-xl text-sm transition-all disabled:opacity-50"
                        >
                          {submitting ? "Yuklanmoqda..." : "Do'konga joylashtirish"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowUploadForm(false)}
                          className="py-3 px-8 bg-white/5 hover:bg-white/10 font-bold rounded-xl text-sm transition-all"
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
                <div className="flex items-center justify-center py-10">
                  <RefreshCw className="animate-spin text-primary mr-2" size={20} />
                  <span>Ma'lumotlar yangilanmoqda...</span>
                </div>
              ) : dashboardData?.games && dashboardData.games.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {dashboardData.games.map((game) => (
                    <div
                      key={game.id}
                      className="glass-card p-6 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg">{game.title}</h4>
                          <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                            {game.platform}
                          </span>
                        </div>
                        <p className="text-xs text-secondary/80 line-clamp-2 mb-4 leading-relaxed">
                          {game.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2 text-xs">
                        <div>
                          <span className="text-secondary/70">O'yin narxi:</span>
                          <p className="font-bold text-sm text-white">
                            {game.price === 0 ? "Bepul" : `${game.price.toLocaleString()} UZS`}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-secondary/70">Reyting:</span>
                          <p className="font-bold text-sm text-amber-400">⭐ {game.rating || "5.0"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card p-12 text-center border border-dashed border-white/10">
                  <p className="text-secondary mb-4">Siz hali birorta o'yin yuklamagansiz.</p>
                  <button
                    onClick={() => setShowUploadForm(true)}
                    className="py-2 px-5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-all font-semibold"
                  >
                    Birinchi o'yiningizni yuklang
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
