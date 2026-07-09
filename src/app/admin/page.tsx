"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ShieldAlert, Users, Award, BarChart3, AlertOctagon, UserCheck, ShieldClose, Lock, Unlock, Check, RefreshCw, Activity, UserPlus, Gamepad2, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import { BackButton } from "@/components/ui/BackButton";
import { supabase } from "@/lib/supabase";
import { FileImage } from "lucide-react";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  nickname: string;
  role: string;
  is_verified: boolean;
  is_active: boolean;
  level: number;
  elo: number;
  is_premium?: boolean;
  premium_expires_at?: string;
}


interface ActivityLog {
  id: string;
  type: 'user' | 'game';
  message: string;
  time: Date;
}

export default function AdminPage() {
  const router = useRouter();
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCustomAdmin, setIsCustomAdmin] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalActiveSubs: 0,
    totalGames: 0,
    totalTournaments: 0,
  });

  // News form state
  const { user } = useAuthStore();
  const [newsForm, setNewsForm] = useState({ title: '', content: '' });
  const [newsFile, setNewsFile] = useState<File | null>(null);
  const [savingNews, setSavingNews] = useState(false);

  // Premium modal state
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [selectedUserForPremium, setSelectedUserForPremium] = useState<AdminUser | null>(null);
  const [premiumDuration, setPremiumDuration] = useState<number>(30);
  const [savingPremium, setSavingPremium] = useState(false);

  // Lesson form state
  const [lessonForm, setLessonForm] = useState({
    title: '',
    author: '',
    level: 'Boshlang\'ich',
    videoUrl: '',
    imageUrl: ''
  });
  const [savingLesson, setSavingLesson] = useState(false);

  useEffect(() => {
    const savedAdmin = sessionStorage.getItem('customAdminLogin');
    if (savedAdmin === 'true') {
      setIsCustomAdmin(true);
      fetchAdminData();
    } else {
      setLoading(false);
    }
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'admin' && loginForm.password === 'MAROQLI2026') {
      setIsCustomAdmin(true);
      sessionStorage.setItem('customAdminLogin', 'true');
      setLoginError('');
      fetchAdminData();
    } else {
      setLoginError('Login yoki parol xato!');
    }
  };

  useEffect(() => {
    if (!isCustomAdmin) return;

    const channel = supabase
      .channel('admin-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        (payload) => {
          const newProfile = payload.new;
          const log: ActivityLog = {
            id: `user-${newProfile.id}-${Date.now()}`,
            type: 'user',
            message: `Yangi a'zo: @${newProfile.username || "Noma'lum"}`,
            time: new Date()
          };
          setActivities(prev => [log, ...prev].slice(0, 10)); // keep last 10
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'developed_games' },
        (payload) => {
          const newGame = payload.new;
          const log: ActivityLog = {
            id: `game-${newGame.id}-${Date.now()}`,
            type: 'game',
            message: `Yangi o'yin yuklandi: ${newGame.title || "Nomsiz o'yin"}`,
            time: new Date()
          };
          setActivities(prev => [log, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isCustomAdmin]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      // Fetch users directly from Supabase profiles since auth migrated there
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      if (profiles) {
        // Map Supabase profiles to AdminUser format
        const mappedUsers = profiles.map((p: any) => ({
          id: p.id,
          username: p.username,
          email: p.email || `${p.username}@MAROQLI.uz`, // Profiles table might not have email
          full_name: p.full_name || '',
          nickname: p.full_name || p.username,
          role: p.role || 'GAMER',
          is_verified: true, // Mocked for now
          is_active: true, // Mocked for now
          level: p.level || 1,
          elo: p.elo || 1000,
          is_premium: p.is_premium || false,
          premium_expires_at: p.premium_expires_at
        }));
        setUsersList(mappedUsers as any);
        
        // Fetch other stats if possible, or mock if backend is down
        try {
          const tourneysRes = await api.get("/tournaments/");
          const gamesRes = await api.get("/tournaments/store/");
          setStats({
            totalUsers: profiles.length,
            totalActiveSubs: mappedUsers.filter((u: any) => u.is_premium).length,
            totalGames: gamesRes.data.length,
            totalTournaments: tourneysRes.data.length,
          });
        } catch (e) {
          // If django backend fails, just update users count
          setStats(prev => ({ ...prev, totalUsers: profiles.length }));
        }
      }
    } catch (err) {
      console.error("Admin ma'lumotlarini yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      // Direct Supabase update for role
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
        
      if (error) throw error;
      
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      alert("Foydalanuvchi roli muvaffaqiyatli o'zgartirildi!");
    } catch (err: any) {
      alert("Rolni o'zgartirishda xatolik yuz berdi.");
    }
  };

  const handleToggleBlock = async (userId: number, currentStatus: boolean) => {
    const actionWord = currentStatus ? "bloklash" : "blokdan chiqarish";
    if (!confirm(`Haqiqatan ham ushbu foydalanuvchini ${actionWord}ni xohlaysizmi?`)) {
      return;
    }

    try {
      await api.patch(`/users/admin/users/${userId}/`, { is_active: !currentStatus });
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
      );
      alert(`Foydalanuvchi muvaffaqiyatli ${currentStatus ? "bloklandi" : "blokdan chiqarildi"}!`);
    } catch (err) {
      alert("Foydalanuvchi holatini o'zgartirishda xatolik.");
    }
  };

  const handleToggleVerify = async (userId: number, currentStatus: boolean) => {
    try {
      await api.patch(`/users/admin/users/${userId}/`, { is_verified: !currentStatus });
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_verified: !currentStatus } : u))
      );
    } catch (err) {
      alert("Tasdiqlash holatini o'zgartirishda xatolik.");
    }
  };

  const handleGrantPremium = async () => {
    if (!selectedUserForPremium) return;
    
    setSavingPremium(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + premiumDuration);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_premium: premiumDuration > 0,
          premium_expires_at: premiumDuration > 0 ? expiresAt.toISOString() : null
        })
        .eq('id', selectedUserForPremium.id);
        
      if (error) throw error;
      
      setUsersList((prev) =>
        prev.map((u) => 
          u.id === selectedUserForPremium.id 
            ? { ...u, is_premium: premiumDuration > 0, premium_expires_at: premiumDuration > 0 ? expiresAt.toISOString() : undefined } 
            : u
        )
      );
      
      alert(`Foydalanuvchiga muvaffaqiyatli ${premiumDuration > 0 ? premiumDuration + ' kunlik premium berildi' : 'premium bekor qilindi'}!`);
      setPremiumModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert("Premium berishda xatolik yuz berdi.");
    } finally {
      setSavingPremium(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-white">
        <RefreshCw className="animate-spin text-primary mb-4" size={40} />
        <p className="text-secondary text-sm">Admin boshqaruv paneli yuklanmoqda...</p>
      </div>
    );
  }

  const handlePostNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsForm.title || !newsForm.content) {
      alert("Sarlavha va matnni kiriting!");
      return;
    }
    if (!user) {
      alert("Iltimos, avval asosiy saytdan (Profil orqali) o'z profilingizga kiring. Ruxsat tekshiruvi uchun bu majburiy.");
      return;
    }
    
    setSavingNews(true);
    try {
      let imageUrl = null;
      if (newsFile) {
        const fileExt = newsFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from('news')
          .upload(fileName, newsFile);
          
        if (error) throw error;
        
        const { data: pubData } = supabase.storage
          .from('news')
          .getPublicUrl(fileName);
        imageUrl = pubData.publicUrl;
      }

      const { error } = await supabase
        .from('news')
        .insert({
          title: newsForm.title,
          content: newsForm.content,
          image_url: imageUrl,
          author_id: user.id
        });
        
      if (error) throw error;
      
      alert("Yangilik muvaffaqiyatli chop etildi!");
      setNewsForm({ title: '', content: '' });
      setNewsFile(null);
    } catch (err: any) {
      console.error(err);
      alert("Xatolik: " + (err.message || "Yuklashda muammo yuz berdi. (Siz ADMIN rolidamisiz?)"));
    } finally {
      setSavingNews(false);
    }
  };

  const handlePostLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonForm.title || !lessonForm.videoUrl || !lessonForm.author) {
      alert("Iltimos, darslik sarlavhasi, muallifi va video havolasini kiriting!");
      return;
    }
    
    setSavingLesson(true);
    try {
      const { error } = await supabase
        .from('gamedev_lessons')
        .insert({
          title: lessonForm.title,
          author: lessonForm.author,
          level: lessonForm.level,
          video_url: lessonForm.videoUrl,
          img: lessonForm.imageUrl || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070",
        });
        
      if (error) throw error;
      
      alert("Darslik muvaffaqiyatli qo'shildi!");
      setLessonForm({
        title: '',
        author: '',
        level: 'Boshlang\'ich',
        videoUrl: '',
        imageUrl: ''
      });
    } catch (err: any) {
      console.error(err);
      alert("Xatolik: " + (err.message || "Darslikni saqlashda muammo yuz berdi. (Siz ADMIN rolidamisiz?)"));
    } finally {
      setSavingLesson(false);
    }
  };

  if (!isCustomAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background text-white p-4">
        <Navbar />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md glass-card p-8 md:p-10 border border-white/10"
        >
          <div className="text-center mb-8">
            <div className="bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="text-primary" size={32} />
            </div>
            <h2 className="text-2xl font-black mb-2">Admin Panel</h2>
            <p className="text-secondary text-sm">Kirish uchun maxsus login va parolni kiriting</p>
          </div>

          {loginError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-4 mb-6 text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-secondary ml-1 mb-1 block">Login</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                placeholder="Loginni kiriting"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors text-sm text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-secondary ml-1 mb-1 block">Parol</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors text-sm text-white"
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full py-3 mt-4 text-sm font-bold flex items-center justify-center space-x-2"
            >
              <span>Tizimga kirish</span>
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-white">
      <Navbar />

      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20 max-w-6xl">
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Title */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black mb-2 flex items-center gap-2">
              <ShieldAlert className="text-primary" /> Admin Panel (Boshqaruv)
            </h1>
            <p className="text-secondary text-sm">Foydalanuvchilar rollarini boshqarish va cheklovlar paneli.</p>
          </div>
          <button
            onClick={fetchAdminData}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-secondary hover:text-white transition-all"
            title="Yangilash"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="glass-card p-6 border border-white/5">
            <span className="text-xs text-secondary uppercase font-semibold">Jami Foydalanuvchilar</span>
            <h3 className="text-2xl font-extrabold mt-2 flex items-center gap-2">
              <Users className="text-primary" size={20} /> {stats.totalUsers}
            </h3>
          </div>

          <div className="glass-card p-6 border border-white/5">
            <span className="text-xs text-secondary uppercase font-semibold">Faol Premium A'zolar</span>
            <h3 className="text-2xl font-extrabold mt-2 flex items-center gap-2">
              <Award className="text-amber-400" size={20} /> {stats.totalActiveSubs}
            </h3>
          </div>

          <div className="glass-card p-6 border border-white/5">
            <span className="text-xs text-secondary uppercase font-semibold">Do'kondagi O'yinlar</span>
            <h3 className="text-2xl font-extrabold mt-2 flex items-center gap-2">
              <BarChart3 className="text-blue-400" size={20} /> {stats.totalGames}
            </h3>
          </div>

          <div className="glass-card p-6 border border-white/5">
            <span className="text-xs text-secondary uppercase font-semibold">Turnirlar Soni</span>
            <h3 className="text-2xl font-extrabold mt-2 flex items-center gap-2">
              <AlertOctagon className="text-green-400" size={20} /> {stats.totalTournaments}
            </h3>
          </div>
        </div>

        {/* News Management */}
        <div className="mb-12">
          <h2 className="text-xl font-bold mb-6">Yangilik Qo'shish</h2>
          <div className="glass-card p-6 md:p-8 border border-white/5 rounded-2xl">
            <form onSubmit={handlePostNews} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-secondary mb-2">Yangilik sarlavhasi</label>
                <input 
                  type="text" 
                  value={newsForm.title}
                  onChange={(e) => setNewsForm({...newsForm, title: e.target.value})}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-white"
                  placeholder="Masalan: Saytimizda yangi turnirlar boshlandi!"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-secondary mb-2">Asosiy rasm yuklash</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-white/10 border-dashed rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileImage className="w-8 h-8 mb-3 text-secondary" />
                      <p className="mb-2 text-sm text-secondary">
                        <span className="font-bold text-white">Yuklash uchun bosing</span> yoki rasmni shu yerga tashlang
                      </p>
                      {newsFile && <p className="text-xs text-primary font-bold mt-2">Tanlandi: {newsFile.name}</p>}
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setNewsFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-secondary mb-2">Yangilik matni</label>
                <textarea 
                  value={newsForm.content}
                  onChange={(e) => setNewsForm({...newsForm, content: e.target.value})}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-white min-h-[150px] custom-scrollbar"
                  placeholder="Yangilik haqida batafsil ma'lumot yozing..."
                ></textarea>
              </div>

              <button 
                type="submit" 
                disabled={savingNews}
                className="btn-primary px-8 py-3 w-full md:w-auto"
              >
                {savingNews ? "Yuklanmoqda..." : "Yangilikni chop etish"}
              </button>
            </form>
          </div>
        </div>

        {/* GameDev Lesson Management */}
        <div className="mb-12">
          <h2 className="text-xl font-bold mb-6">GameDev Darsligini Yuklash</h2>
          <div className="glass-card p-6 md:p-8 border border-white/5 rounded-2xl">
            <form onSubmit={handlePostLesson} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-secondary mb-2">Darslik sarlavhasi</label>
                  <input 
                    type="text" 
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm({...lessonForm, title: e.target.value})}
                    required
                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-white text-sm"
                    placeholder="Masalan: Blender 3D Modellashtirish"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-secondary mb-2">Muallif (Kompaniya yoki shaxs)</label>
                  <input 
                    type="text" 
                    value={lessonForm.author}
                    onChange={(e) => setLessonForm({...lessonForm, author: e.target.value})}
                    required
                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-white text-sm"
                    placeholder="Masalan: PixelForge UZ"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-secondary mb-2">Qiyinchilik darajasi</label>
                  <select 
                    value={lessonForm.level}
                    onChange={(e) => setLessonForm({...lessonForm, level: e.target.value})}
                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-white text-sm"
                  >
                    <option value="Boshlang'ich">Boshlang'ich (Beginner)</option>
                    <option value="O'rta">O'rta (Intermediate)</option>
                    <option value="Mukammal">Mukammal (Advanced)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-secondary mb-2">Muqova rasm havolasi (Image URL)</label>
                  <input 
                    type="url" 
                    value={lessonForm.imageUrl}
                    onChange={(e) => setLessonForm({...lessonForm, imageUrl: e.target.value})}
                    className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-white text-sm"
                    placeholder="Havolani kiriting (ixtiyoriy, rasmsiz standart qo'yiladi)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-secondary mb-2">Video havolasi (YouTube yoki Direct MP4 URL)</label>
                <input 
                  type="url" 
                  value={lessonForm.videoUrl}
                  onChange={(e) => setLessonForm({...lessonForm, videoUrl: e.target.value})}
                  required
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 text-white text-sm"
                  placeholder="Masalan: https://www.youtube.com/watch?v=... yoki https://sayt.com/video.mp4"
                />
                <span className="text-[10px] text-secondary mt-1 block">Tizim YouTube yoki to'g'ridan-to'g'ri MP4 havolasini qabul qiladi va uni o'zimizning maxsus brendsiz video pleyerimizda ko'rsatadi.</span>
              </div>

              <button 
                type="submit" 
                disabled={savingLesson}
                className="btn-primary px-8 py-3 w-full md:w-auto"
              >
                {savingLesson ? "Yuklanmoqda..." : "Darslikni qo'shish"}
              </button>
            </form>
          </div>
        </div>

        {/* Users Table & Live Feed Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-6">Foydalanuvchilarni Boshqarish</h2>
            <div className="glass-card overflow-x-auto border border-white/5 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-secondary uppercase tracking-wider text-[10px] font-bold">
                <th className="p-4">Foydalanuvchi</th>
                <th className="p-4">Email</th>
                <th className="p-4">Hozirgi Rol</th>
                <th className="p-4 text-center">Tasdiqlangan</th>
                <th className="p-4 text-center">Premium Berish</th>
                <th className="p-4 text-center">Rol O'zgartirish</th>
                <th className="p-4 text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                  {/* Name */}
                  <td className="p-4 font-semibold">
                    <div className="flex flex-col">
                      <span className="text-white text-sm">{u.nickname || u.username}</span>
                      <span className="text-[10px] text-secondary">@{u.username}</span>
                    </div>
                  </td>
                  
                  {/* Email */}
                  <td className="p-4 text-secondary">{u.email}</td>
                  
                  {/* Current Role */}
                  <td className="p-4">
                    <span className="inline-block bg-white/5 text-secondary font-bold px-2.5 py-1 rounded-md uppercase text-[10px]">
                      {u.role}
                    </span>
                  </td>

                  {/* Verified */}
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleToggleVerify(u.id, u.is_verified)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        u.is_verified
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-white/5 border-white/5 text-secondary hover:text-white"
                      }`}
                      title="Tasdiqlash holatini o'zgartirish"
                    >
                      <UserCheck size={14} />
                    </button>
                  </td>

                  {/* Premium Granting */}
                  <td className="p-4 text-center">
                    <button
                      onClick={() => {
                        setSelectedUserForPremium(u);
                        setPremiumDuration(u.is_premium ? 0 : 30);
                        setPremiumModalOpen(true);
                      }}
                      className={`py-1.5 px-3 rounded-lg border transition-all text-[10px] font-bold tracking-wide uppercase ${
                        u.is_premium
                          ? "bg-amber-500/20 border-amber-500/30 text-amber-400 hover:bg-amber-500/30"
                          : "bg-white/5 border-white/10 text-secondary hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {u.is_premium ? "Faol (O'zgartirish)" : "Premium Berish"}
                    </button>
                  </td>

                  {/* Override Role */}
                  <td className="p-4 text-center">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-[#1e1e24] border border-white/5 text-xs text-white rounded-lg py-1.5 px-3 focus:outline-none focus:border-white/10"
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="GAMER">Gamer</option>
                      <option value="GAMEDEV">GameDev</option>
                      <option value="INVESTOR">Investor</option>
                      <option value="MODERATOR">Moderator</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>

                  {/* Actions (Block/Unblock) */}
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleToggleBlock(u.id, u.is_active)}
                      className={`py-1.5 px-4 rounded-lg font-bold transition-all text-[10px] flex items-center gap-1 ml-auto ${
                        u.is_active
                          ? "bg-red-500/10 hover:bg-red-500/20 text-red-400"
                          : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {u.is_active ? (
                        <>
                          <Lock size={12} /> Bloklash
                        </>
                      ) : (
                        <>
                          <Unlock size={12} /> Blokdan yechish
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          </div>

          {/* Live Feed (Takes 1 col on lg) */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity className="text-emerald-400" size={24} /> Jonli Faollik
            </h2>
            <div className="glass-card p-6 border border-white/5 rounded-2xl h-[600px] overflow-y-auto">
              <div className="flex flex-col gap-4">
                <AnimatePresence>
                  {activities.length === 0 ? (
                    <p className="text-secondary text-sm text-center py-10">Hozircha yangi faolliklar yo'q...</p>
                  ) : (
                    activities.map(act => (
                      <motion.div
                        key={act.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                      >
                        <div className={`p-2 rounded-lg ${act.type === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                          {act.type === 'user' ? <UserPlus size={16} /> : <Gamepad2 size={16} />}
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">{act.message}</p>
                          <span className="text-[10px] text-secondary">{act.time.toLocaleTimeString()}</span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Grant Modal */}
      <AnimatePresence>
        {premiumModalOpen && selectedUserForPremium && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPremiumModalOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Premium Berish</h3>
                  <p className="text-sm text-secondary">
                    Foydalanuvchi: <span className="text-primary font-bold">@{selectedUserForPremium.username}</span>
                  </p>
                </div>
                <button 
                  onClick={() => setPremiumModalOpen(false)}
                  className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                >
                  <ShieldClose size={18} />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <button
                  onClick={() => setPremiumDuration(30)}
                  className={`w-full p-4 rounded-xl border text-left flex justify-between items-center transition-all ${
                    premiumDuration === 30 ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "bg-white/5 border-white/10 text-secondary hover:bg-white/10"
                  }`}
                >
                  <span className="font-bold">1 Oylik (30 kun)</span>
                  {premiumDuration === 30 && <Check size={18} />}
                </button>
                <button
                  onClick={() => setPremiumDuration(90)}
                  className={`w-full p-4 rounded-xl border text-left flex justify-between items-center transition-all ${
                    premiumDuration === 90 ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "bg-white/5 border-white/10 text-secondary hover:bg-white/10"
                  }`}
                >
                  <span className="font-bold">3 Oylik (90 kun)</span>
                  {premiumDuration === 90 && <Check size={18} />}
                </button>
                <button
                  onClick={() => setPremiumDuration(365)}
                  className={`w-full p-4 rounded-xl border text-left flex justify-between items-center transition-all ${
                    premiumDuration === 365 ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "bg-white/5 border-white/10 text-secondary hover:bg-white/10"
                  }`}
                >
                  <span className="font-bold">1 Yillik (365 kun)</span>
                  {premiumDuration === 365 && <Check size={18} />}
                </button>
                <button
                  onClick={() => setPremiumDuration(0)}
                  className={`w-full p-4 rounded-xl border text-left flex justify-between items-center transition-all mt-4 ${
                    premiumDuration === 0 ? "bg-red-500/20 border-red-500/50 text-red-400" : "bg-white/5 border-white/10 text-secondary hover:bg-red-500/10 hover:text-red-400"
                  }`}
                >
                  <span className="font-bold">Premiumni bekor qilish</span>
                  {premiumDuration === 0 && <Check size={18} />}
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setPremiumModalOpen(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-semibold transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleGrantPremium}
                  disabled={savingPremium}
                  className="flex-1 py-3 bg-primary hover:bg-primary-hover text-black font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {savingPremium ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
