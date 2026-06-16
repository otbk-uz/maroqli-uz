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
    if (loginForm.username === 'admin' && loginForm.password === 'playnation2026') {
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
          email: p.email || `${p.username}@playnation.uz`, // Profiles table might not have email
          full_name: p.full_name || '',
          nickname: p.full_name || p.username,
          role: p.role || 'GAMER',
          is_verified: true, // Mocked for now
          is_active: true, // Mocked for now
          level: p.level || 1,
          elo: p.elo || 1000
        }));
        setUsersList(mappedUsers as any);
        
        // Fetch other stats if possible, or mock if backend is down
        try {
          const tourneysRes = await api.get("/tournaments/");
          const gamesRes = await api.get("/tournaments/store/");
          setStats({
            totalUsers: profiles.length,
            totalActiveSubs: mappedUsers.filter((u: any) => u.role === 'PREMIUM').length,
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
      await api.patch(`/users/admin/users/${userId}/`, { role: newRole });
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      alert("Foydalanuvchi roli muvaffaqiyatli o'zgartirildi!");
    } catch (err: any) {
      alert(err.response?.data?.role?.[0] || "Rolni o'zgartirishda xatolik yuz berdi.");
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

  // Safe checks
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-white">
        <RefreshCw className="animate-spin text-primary mb-4" size={40} />
        <p className="text-secondary text-sm">Admin boshqaruv paneli yuklanmoqda...</p>
      </div>
    );
  }

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
    </main>
  );
}
