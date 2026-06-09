"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ShieldAlert, Users, Award, BarChart3, AlertOctagon, UserCheck, ShieldClose, Lock, Unlock, Check, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import { BackButton } from "@/components/ui/BackButton";

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


export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalActiveSubs: 0,
    totalGames: 0,
    totalTournaments: 0,
  });

  useEffect(() => {
    // If not authenticated or not admin, we handle it
    if (isAuthenticated && user?.role === "ADMIN") {
      fetchAdminData();
    } else if (isAuthenticated && user && user.role !== "ADMIN") {
      setLoading(false);
    } else {
      // Allow some time for mount and hydration
      const timer = setTimeout(() => {
        if (!isAuthenticated) {
          router.push("/login?redirect=/admin");
        } else if (user?.role !== "ADMIN") {
          setLoading(false);
        } else {
          fetchAdminData();
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      // Fetch users
      const usersRes = await api.get("/users/admin/users/");
      setUsersList(usersRes.data);

      // Fetch other stats
      const tourneysRes = await api.get("/tournaments/");
      const gamesRes = await api.get("/tournaments/store/");
      
      const activeSubs = usersRes.data.filter((u: any) => u.is_premium).length; // Check how many are premium

      setStats({
        totalUsers: usersRes.data.length,
        totalActiveSubs: activeSubs,
        totalGames: gamesRes.data.length,
        totalTournaments: tourneysRes.data.length,
      });
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

  if (!isAuthenticated || user?.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-white p-4">
        <Navbar />
        <div className="max-w-md text-center p-8 glass-card border-red-500/20">
          <ShieldAlert className="text-red-500 mx-auto mb-6" size={60} />
          <h2 className="text-2xl font-black mb-3 text-red-400">Kirish Taqiqlandi</h2>
          <p className="text-secondary text-sm leading-relaxed mb-6">
            Ushbu sahifa faqatgina tizim administratorlari uchun mo'ljallangan. Agar bu xatolik deb o'ylasangiz, iltimos tizim boshqaruvchisiga murojaat qiling.
          </p>
          <BackButton />
        </div>
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

        {/* Users Table */}
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
    </main>
  );
}
