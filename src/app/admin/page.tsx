"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ShieldAlert, Users, Award, BarChart3, AlertOctagon, UserCheck, ShieldClose, Lock, Unlock, Check, RefreshCw, Activity, UserPlus, Gamepad2, KeyRound, Bookmark, Search, ChevronRight, CreditCard, CheckCircle2, XCircle, Eye, ExternalLink, ShieldCheck, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import { BackButton } from "@/components/ui/BackButton";
import { supabase } from "@/lib/supabase";
import { FileImage } from "lucide-react";

interface AdminUser {
  id: string | number;
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
  last_seen?: string;
}

interface PurchasePlanEntry {
  id: string;
  created_at: string;
  user_id: string;
  game_id: string;
  profiles?: {
    id: string;
    username: string;
    full_name: string;
    phone_number?: string | null;
    avatar_url?: string | null;
  };
  developed_games?: {
    id: string;
    title: string;
    slug: string;
    price: number | string;
    cover?: string | null;
  };
}

interface PaymentRequestEntry {
  id: string;
  created_at: string;
  user_id: string;
  item_type: string;
  item_id?: string | null;
  amount: number;
  receipt_url?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approval_type?: 'AUTO' | 'MANUAL' | null;
  profiles?: {
    id: string;
    username: string;
    full_name: string;
    phone_number?: string | null;
    avatar_url?: string | null;
  };
  developed_games?: {
    id: string;
    title: string;
    slug: string;
    price: number | string;
    cover?: string | null;
  };
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
  const [purchasePlansList, setPurchasePlansList] = useState<PurchasePlanEntry[]>([]);
  const [paymentRequestsList, setPaymentRequestsList] = useState<PaymentRequestEntry[]>([]);
  const [boughtGamesList, setBoughtGamesList] = useState<any[]>([]);
  const [planSearch, setPlanSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentFilterStatus, setPaymentFilterStatus] = useState<"ALL" | "AUTO" | "APPROVED" | "PENDING">("ALL");
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
    totalBotSubscribers: 0,
    totalCombinedSubscribers: 0,
    returningUsers: 0,
    retentionRate: 0,
    totalGamePlays: 0,
    activePlayersCount: 0,
    totalPurchasePlans: 0,
    uniquePlanUsersCount: 0,
  });

  // News form state
  const { user } = useAuthStore();
  const [newsForm, setNewsForm] = useState({ title: '', content: '' });
  const [newsFile, setNewsFile] = useState<File | null>(null);
  const [savingNews, setSavingNews] = useState(false);

  // Premium modal & Receipt modal state
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [selectedUserForPremium, setSelectedUserForPremium] = useState<AdminUser | null>(null);
  const [premiumDuration, setPremiumDuration] = useState<number>(30);
  const [savingPremium, setSavingPremium] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    // Admin session check
    (async () => {
      try {
        const res = await fetch('/api/admin/session');
        const data = await res.json();
        if (data.authenticated) {
          setIsCustomAdmin(true);
          fetchAdminData();
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    })();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      if (res.ok) {
        setIsCustomAdmin(true);
        fetchAdminData();
      } else {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || 'Login yoki parol xato!');
      }
    } catch {
      setLoginError('Serverga ulanishda xatolik.');
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
          setActivities(prev => [log, ...prev].slice(0, 10));
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
      // 1. Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      if (profiles) {
        const mappedUsers = profiles.map((p: any) => ({
          id: p.id,
          username: p.username,
          email: p.email || `${p.username}@MAROQLI.uz`,
          full_name: p.full_name || '',
          nickname: p.full_name || p.username,
          role: p.role || 'GAMER',
          is_verified: true,
          is_active: true,
          level: p.level || 1,
          elo: p.elo || 1000,
          is_premium: p.is_premium || false,
          premium_expires_at: p.premium_expires_at,
          last_seen: p.last_seen
        }));
        setUsersList(mappedUsers);

        // 2. Fetch Telegram Bot Subscribers
        let botUsersCount = 0;
        try {
          const { count } = await supabase
            .from('bot_users')
            .select('*', { count: 'exact', head: true });
          if (count) botUsersCount = count;
        } catch (botErr) {
          console.warn("Bot users fetch warning:", botErr);
        }

        // 3. Calculate Returning Users (Retention)
        const returningCount = profiles.filter((p: any) => {
          if (p.visit_count && p.visit_count > 1) return true;
          if (p.last_seen && p.created_at) {
            const diffHours = (new Date(p.last_seen).getTime() - new Date(p.created_at).getTime()) / (1000 * 3600);
            return diffHours > 1;
          }
          return false;
        }).length;

        const webUsersCount = profiles.length;
        const retentionPct = webUsersCount > 0 ? Math.round((returningCount / webUsersCount) * 100) : 0;

        // 4. Fetch Developed Games & Play Counts
        let gamesCount = 0;
        let totalPlaysCount = 0;
        try {
          const { data: devGames } = await supabase
            .from('developed_games')
            .select('id, play_count');
          if (devGames) {
            gamesCount = devGames.length;
            totalPlaysCount += devGames.reduce((acc: number, g: any) => acc + (g.play_count || 0), 0);
          }
        } catch (gErr) {
          console.warn("Developed games stats fetch warning:", gErr);
        }

        // 5. Fetch Game Scores & Session Activity
        let activePlayersSet = new Set<string>();
        try {
          const { data: scores } = await supabase
            .from('game_scores')
            .select('user_id');
          if (scores) {
            totalPlaysCount += scores.length;
            scores.forEach((s: any) => {
              if (s.user_id) activePlayersSet.add(s.user_id);
            });
          }
        } catch (sErr) {
          console.warn("Game scores stats fetch warning:", sErr);
        }

        try {
          const { data: sessions } = await supabase
            .from('game_play_sessions')
            .select('user_id');
          if (sessions) {
            totalPlaysCount += sessions.length;
            sessions.forEach((s: any) => {
              if (s.user_id) activePlayersSet.add(s.user_id);
            });
          }
        } catch (sessErr) {
          console.warn("Game play sessions fetch warning:", sessErr);
        }

        // 6. Fetch Tournaments
        let tourneysCount = 0;
        try {
          const { data: tourneys } = await supabase.from('tournaments').select('id');
          if (tourneys) tourneysCount = tourneys.length;
        } catch (tErr) {
          console.warn("Tournaments fetch warning:", tErr);
        }

        // 7. Fetch Purchase Plans (Sotib olish rejasiga qo'shganlar)
        let plansList: PurchasePlanEntry[] = [];
        try {
          const { data: pData } = await supabase
            .from('game_wishlist')
            .select('id, created_at, user_id, game_id, profiles(id, username, full_name, phone_number, avatar_url), developed_games(id, title, slug, price, cover)')
            .order('created_at', { ascending: false });

          if (pData) {
            plansList = pData as any;
          }
        } catch (pErr) {
          console.warn("Purchase plans fetch warning:", pErr);
        }
        setPurchasePlansList(plansList);

        // 8. Fetch Payment Requests & Receipts
        let payReqs: PaymentRequestEntry[] = [];
        try {
          const { data: payData } = await supabase
            .from('payment_requests')
            .select('id, created_at, user_id, item_type, item_id, amount, receipt_url, status, profiles(id, username, full_name, phone_number, avatar_url), developed_games(id, title, slug, price, cover)')
            .order('created_at', { ascending: false });

          if (payData) {
            payReqs = payData as any;
          }
        } catch (payErr) {
          console.warn("Payment requests fetch warning:", payErr);
        }
        setPaymentRequestsList(payReqs);

        // 9. Fetch Bought Games (Keys & Game Purchases)
        let boughtList: any[] = [];
        try {
          const { data: bData } = await supabase
            .from('bought_games')
            .select('id, created_at, user_id, game_id, cd_key, profiles(id, username, full_name, phone_number, avatar_url), developed_games(id, title, slug, price, cover)')
            .order('created_at', { ascending: false });

          if (bData) {
            boughtList = bData as any;
          }
        } catch (bErr) {
          console.warn("Bought games fetch warning:", bErr);
        }
        setBoughtGamesList(boughtList);

        const uniqueUsersCount = new Set(plansList.map(p => p.user_id)).size;

        setStats({
          totalUsers: webUsersCount,
          totalActiveSubs: mappedUsers.filter((u: any) => u.is_premium).length,
          totalGames: gamesCount,
          totalTournaments: tourneysCount,
          totalBotSubscribers: botUsersCount,
          totalCombinedSubscribers: webUsersCount + botUsersCount,
          returningUsers: returningCount,
          retentionRate: retentionPct,
          totalGamePlays: totalPlaysCount,
          activePlayersCount: activePlayersSet.size,
          totalPurchasePlans: plansList.length,
          uniquePlanUsersCount: uniqueUsersCount,
        });
      }
    } catch (err) {
      console.error("Admin ma'lumotlarini yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async (req: PaymentRequestEntry) => {
    if (!confirm(`Haqiqatan ham ushbu to'lovni tasdiqlab, o'yinni ochiqlamoqchimisiz?`)) return;

    try {
      const { error: reqErr } = await supabase
        .from('payment_requests')
        .update({ status: 'APPROVED', approval_type: 'MANUAL' })
        .eq('id', req.id);

      if (reqErr) throw reqErr;

      if (req.item_type === 'game' && req.item_id) {
        const cdKey = `PN-${Math.random().toString(36).substring(2,6).toUpperCase()}-${Math.random().toString(36).substring(2,6).toUpperCase()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;

        const { error: bErr } = await supabase
          .from('bought_games')
          .insert({
            user_id: req.user_id,
            game_id: req.item_id,
            cd_key: cdKey
          });

        if (bErr) console.warn("Bought games insert warning:", bErr);
      }

      alert("To'lov muvaffaqiyatli tasdiqlandi va o'yin taqdim etildi!");
      fetchAdminData();
    } catch (err: any) {
      console.error(err);
      alert("Tasdiqlashda xatolik: " + (err.message || 'Xatolik'));
    }
  };

  const handleRejectPayment = async (reqId: string) => {
    if (!confirm(`Haqiqatan ham ushbu chekni rad etmoqchimisiz?`)) return;

    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({ status: 'REJECTED' })
        .eq('id', reqId);

      if (error) throw error;

      alert("To'lov cheki rad etildi.");
      fetchAdminData();
    } catch (err: any) {
      console.error(err);
      alert("Rad etishda xatolik: " + (err.message || 'Xatolik'));
    }
  };

  const handleRevokeBoughtGame = async (boughtId: string) => {
    if (!confirm(`Haqiqatan ham ushbu foydalanuvchining o'yin kalitini va ruxsatini bekor qilmoqchimisiz?`)) return;

    try {
      const { error } = await supabase
        .from('bought_games')
        .delete()
        .eq('id', boughtId);

      if (error) throw error;

      alert("O'yin xaridi bekor qilindi.");
      fetchAdminData();
    } catch (err: any) {
      console.error(err);
      alert("Bekor qilishda xatolik: " + (err.message || 'Xatolik'));
    }
  };

  const handleRoleChange = async (userId: string | number, newRole: string) => {
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

  const handleToggleBlock = async (userId: string | number, currentStatus: boolean) => {
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

  const handleToggleVerify = async (userId: string | number, currentStatus: boolean) => {
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

  // Filter users active in the last 5 minutes
  const onlineUsers = usersList.filter(u => {
    if (!u.last_seen) return false;
    const diffMs = Date.now() - new Date(u.last_seen).getTime();
    return diffMs < 300000; // 5 minutes
  });

  // Sort users by last_seen DESC to get recent visits
  const recentVisitors = [...usersList]
    .filter(u => u.last_seen)
    .sort((a, b) => new Date(b.last_seen!).getTime() - new Date(a.last_seen!).getTime())
  // Filter purchase plans list
  const displayedPurchasePlans = purchasePlansList.filter(p => {
    if (!planSearch) return true;
    const q = planSearch.toLowerCase();
    const username = p.profiles?.username?.toLowerCase() || '';
    const fullName = p.profiles?.full_name?.toLowerCase() || '';
    const gameTitle = p.developed_games?.title?.toLowerCase() || '';
    return username.includes(q) || fullName.includes(q) || gameTitle.includes(q);
  });

  // Filter payment requests list
  const displayedPaymentRequests = paymentRequestsList.filter(p => {
    if (paymentFilterStatus === 'AUTO' && p.approval_type !== 'AUTO') return false;
    if (paymentFilterStatus === 'APPROVED' && p.status !== 'APPROVED') return false;
    if (paymentFilterStatus === 'PENDING' && p.status !== 'PENDING') return false;

    if (!paymentSearch) return true;
    const q = paymentSearch.toLowerCase();
    const username = p.profiles?.username?.toLowerCase() || '';
    const fullName = p.profiles?.full_name?.toLowerCase() || '';
    const phone = p.profiles?.phone_number?.toLowerCase() || '';
    const gameTitle = p.developed_games?.title?.toLowerCase() || '';
    return username.includes(q) || fullName.includes(q) || phone.includes(q) || gameTitle.includes(q);
  });

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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="glass-card p-5 border border-white/5 relative overflow-hidden group hover:border-primary/30 transition-all">
            <span className="text-[10px] text-secondary uppercase font-bold tracking-wider">Jami Obunachilar</span>
            <h3 className="text-xl font-extrabold mt-2 flex items-center gap-2 text-white">
              <Users className="text-primary shrink-0" size={18} /> 
              <span>{stats.totalCombinedSubscribers.toLocaleString()}</span>
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-secondary mt-2">
              <span className="text-emerald-400 font-bold">{stats.totalUsers} sayt</span> • 
              <span>{stats.totalBotSubscribers} bot</span>
            </div>
          </div>

          <div className="glass-card p-5 border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <span className="text-[10px] text-secondary uppercase font-bold tracking-wider">Qayta Tashrif</span>
            <h3 className="text-xl font-extrabold mt-2 flex items-center gap-2 text-emerald-400">
              <Activity className="text-emerald-400 shrink-0" size={18} /> 
              <span>{stats.returningUsers.toLocaleString()}</span>
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-secondary mt-2">
              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">
                {stats.retentionRate}% Retention
              </span>
            </div>
          </div>

          <div className="glass-card p-5 border border-white/5 relative overflow-hidden group hover:border-violet/30 transition-all">
            <span className="text-[10px] text-secondary uppercase font-bold tracking-wider">O'yinlar O'ynalishi</span>
            <h3 className="text-xl font-extrabold mt-2 flex items-center gap-2 text-violet">
              <Gamepad2 className="text-violet shrink-0" size={18} /> 
              <span>{stats.totalGamePlays.toLocaleString()}</span>
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-secondary mt-2">
              <span>{stats.activePlayersCount} o'yinchi</span>
            </div>
          </div>

          <div className="glass-card p-5 border border-white/5 relative overflow-hidden group hover:border-amber-500/30 transition-all">
            <span className="text-[10px] text-secondary uppercase font-bold tracking-wider">Faol Premium</span>
            <h3 className="text-xl font-extrabold mt-2 flex items-center gap-2 text-amber-400">
              <Award className="text-amber-400 shrink-0" size={18} /> 
              <span>{stats.totalActiveSubs.toLocaleString()} PRO</span>
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-secondary mt-2">
              <span>{stats.totalGames} ta o'yin mavjud</span>
            </div>
          </div>

          <div className="glass-card p-5 border border-cyan-500/20 relative overflow-hidden group hover:border-cyan-500/40 transition-all bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent col-span-2 lg:col-span-1">
            <span className="text-[10px] text-cyan-300 uppercase font-bold tracking-wider">Sotib Olish Rejalari</span>
            <h3 className="text-xl font-extrabold mt-2 flex items-center gap-2 text-cyan-400">
              <Bookmark className="text-cyan-400 shrink-0" size={18} /> 
              <span>{stats.totalPurchasePlans.toLocaleString()} ta</span>
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-cyan-300/80 mt-2">
              <span className="font-bold text-white">{stats.uniquePlanUsersCount} ta foydalanuvchi</span>
            </div>
          </div>
        </div>

        {/* Real-time Analytics Breakdown Banner */}
        <div className="glass-card p-6 border border-white/10 rounded-2xl mb-12 bg-gradient-to-r from-violet/10 via-white/[0.02] to-transparent flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet/20 border border-violet/30 text-violet flex items-center justify-center shrink-0">
              <BarChart3 size={24} />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Tizim Tahlili va Obunachilar Faolligi</h4>
              <p className="text-xs text-secondary mt-0.5">
                Obunachilarning {stats.retentionRate}% qismi platformaga takroriy tashrif buyurmoqda. Jami {stats.totalGamePlays.toLocaleString()} marotaba onlayn/yuklangan o'yinlar o'ynaldi.
              </p>
            </div>
          </div>
          <button
            onClick={fetchAdminData}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10 shrink-0 flex items-center gap-2"
          >
            <RefreshCw size={14} />
            <span>Statistikani Yangilash</span>
          </button>
        </div>

        {/* Payment Requests & Receipts Section */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <CreditCard className="text-emerald-400" size={22} />
                <span>O'yin Xaridlari va Cheklar ({paymentRequestsList.length})</span>
              </h2>
              <p className="text-xs text-secondary mt-1">
                Telegram bot va sayt orqali kelgan to'lov cheklari, avtomatik tasdiqlangan va qo'lda tasdiqlanadigan o'yin xaridlari
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filter Tabs */}
              <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 text-xs font-semibold">
                <button
                  onClick={() => setPaymentFilterStatus('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${paymentFilterStatus === 'ALL' ? 'bg-primary text-black font-bold' : 'text-secondary hover:text-white'}`}
                >
                  Barchasi ({paymentRequestsList.length})
                </button>
                <button
                  onClick={() => setPaymentFilterStatus('AUTO')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${paymentFilterStatus === 'AUTO' ? 'bg-emerald-500 text-black font-bold' : 'text-secondary hover:text-white'}`}
                >
                  <Zap size={13} /> Avtomatik ({paymentRequestsList.filter(p => p.approval_type === 'AUTO').length})
                </button>
                <button
                  onClick={() => setPaymentFilterStatus('APPROVED')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${paymentFilterStatus === 'APPROVED' ? 'bg-blue-500 text-white font-bold' : 'text-secondary hover:text-white'}`}
                >
                  Tasdiqlangan ({paymentRequestsList.filter(p => p.status === 'APPROVED').length})
                </button>
                <button
                  onClick={() => setPaymentFilterStatus('PENDING')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${paymentFilterStatus === 'PENDING' ? 'bg-amber-500 text-black font-bold' : 'text-secondary hover:text-white'}`}
                >
                  Kutilmoqda ({paymentRequestsList.filter(p => p.status === 'PENDING').length})
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" size={15} />
                <input
                  type="text"
                  placeholder="Foydalanuvchi yoki tel..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="glass-card overflow-x-auto border border-emerald-500/20 rounded-2xl bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent">
            {displayedPaymentRequests.length === 0 ? (
              <div className="text-center py-12 text-secondary text-xs">
                {paymentSearch || paymentFilterStatus !== 'ALL' ? "Mos to'lovlar topilmadi" : "Hali to'lov cheklari yuborilmadi"}
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-secondary uppercase tracking-wider text-[10px] font-bold">
                    <th className="p-4">Xaridor</th>
                    <th className="p-4">O'yin</th>
                    <th className="p-4">Summa & Chek</th>
                    <th className="p-4">Tasdiq Holati</th>
                    <th className="p-4">CD-Key (Kalit)</th>
                    <th className="p-4">Sana va Vaqt</th>
                    <th className="p-4 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayedPaymentRequests.map((req) => {
                    const boughtMatch = boughtGamesList.find(b => b.user_id === req.user_id && b.game_id === req.item_id);
                    return (
                      <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-300 uppercase shrink-0 overflow-hidden">
                              {req.profiles?.avatar_url ? (
                                <img src={req.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                (req.profiles?.username || "U")[0]
                              )}
                            </div>
                            <div>
                              <p className="text-white font-bold text-xs">{req.profiles?.full_name || req.profiles?.username || "Noma'lum"}</p>
                              <p className="text-[10px] text-secondary">@{req.profiles?.username || 'user'} {req.profiles?.phone_number ? `• ${req.profiles.phone_number}` : ''}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {req.developed_games?.cover ? (
                              <img src={req.developed_games.cover} alt="Cover" className="w-10 h-7 rounded object-cover shrink-0 border border-white/10" />
                            ) : (
                              <div className="w-10 h-7 rounded bg-white/10 flex items-center justify-center shrink-0">
                                <Gamepad2 size={14} className="text-secondary" />
                              </div>
                            )}
                            <span className="text-white font-semibold">{req.developed_games?.title || "O'yin"}</span>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-emerald-400">
                              {Number(req.amount).toLocaleString()} UZS
                            </span>
                            {req.receipt_url ? (
                              <button
                                onClick={() => setSelectedReceiptUrl(req.receipt_url || null)}
                                className="p-1.5 bg-white/5 hover:bg-emerald-500/20 text-emerald-300 rounded-lg border border-white/10 transition-colors flex items-center gap-1 text-[10px]"
                                title="Chek rasmini ko'rish"
                              >
                                <Eye size={12} />
                                <span>Chek</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-secondary italic">(Rasmsiz)</span>
                            )}
                          </div>
                        </td>

                        <td className="p-4">
                          {req.status === 'APPROVED' && req.approval_type === 'AUTO' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                              <Zap size={12} className="fill-emerald-400 text-emerald-400" />
                              ⚡ Avtomatik
                            </span>
                          )}
                          {req.status === 'APPROVED' && req.approval_type !== 'AUTO' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                              <ShieldCheck size={12} />
                              👤 Admin (Qo'lda)
                            </span>
                          )}
                          {req.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                              ⏳ Kutilmoqda
                            </span>
                          )}
                          {req.status === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/40">
                              <XCircle size={12} />
                              ❌ Rad etilgan
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          {boughtMatch?.cd_key ? (
                            <code className="bg-black/50 border border-white/10 px-2 py-1 rounded font-mono text-[10px] text-amber-300 tracking-wider">
                              {boughtMatch.cd_key}
                            </code>
                          ) : req.status === 'APPROVED' ? (
                            <span className="text-[10px] text-emerald-400 font-semibold">Ochilgan</span>
                          ) : (
                            <span className="text-[10px] text-secondary font-mono">—</span>
                          )}
                        </td>

                        <td className="p-4 text-secondary">
                          {new Date(req.created_at).toLocaleString()}
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {req.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleApprovePayment(req)}
                                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                                >
                                  <CheckCircle2 size={12} /> Tasdiqlash
                                </button>
                                <button
                                  onClick={() => handleRejectPayment(req.id)}
                                  className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                                >
                                  <XCircle size={12} /> Rad Etish
                                </button>
                              </>
                            )}
                            {req.status === 'APPROVED' && boughtMatch && (
                              <button
                                onClick={() => handleRevokeBoughtGame(boughtMatch.id)}
                                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-semibold transition-all"
                                title="O'yin ruxsatini va kalitini bekor qilish"
                              >
                                Revoke (Bekor qilish)
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Purchase Plans Section (Sotib olish rejasiga qo'shganlar) */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <Bookmark className="text-cyan-400" size={22} />
                <span>Sotib Olish Rejasiga Qo'shganlar ({purchasePlansList.length})</span>
              </h2>
              <p className="text-xs text-secondary mt-1">
                "Sotib olish rejasiga qo'shish" tugmasini bosgan foydalanuvchilar va ularning rejalashtirgan o'yinlari
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" size={15} />
              <input
                type="text"
                placeholder="Foydalanuvchi yoki o'yin..."
                value={planSearch}
                onChange={(e) => setPlanSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
          </div>

          <div className="glass-card overflow-x-auto border border-cyan-500/20 rounded-2xl bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent">
            {displayedPurchasePlans.length === 0 ? (
              <div className="text-center py-12 text-secondary text-xs">
                {planSearch ? "Qidiruv bo'yicha hech narsa topilmadi" : "Hali hech kim sotib olish rejasiga o'yin qo'shmadi"}
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-secondary uppercase tracking-wider text-[10px] font-bold">
                    <th className="p-4">Foydalanuvchi</th>
                    <th className="p-4">Rejalashtirilgan O'yin</th>
                    <th className="p-4">Narxi</th>
                    <th className="p-4">Qo'shilgan Sana va Vaqt</th>
                    <th className="p-4 text-right">O'yinga o'tish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayedPurchasePlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-xs font-bold text-cyan-300 uppercase shrink-0 overflow-hidden">
                            {plan.profiles?.avatar_url ? (
                              <img src={plan.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              (plan.profiles?.username || "U")[0]
                            )}
                          </div>
                          <div>
                            <p className="text-white font-bold text-xs">{plan.profiles?.full_name || plan.profiles?.username || "Noma'lum"}</p>
                            <p className="text-[10px] text-secondary">@{plan.profiles?.username || 'user'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {plan.developed_games?.cover ? (
                            <img src={plan.developed_games.cover} alt="Cover" className="w-10 h-7 rounded object-cover shrink-0 border border-white/10" />
                          ) : (
                            <div className="w-10 h-7 rounded bg-white/10 flex items-center justify-center shrink-0">
                              <Gamepad2 size={14} className="text-secondary" />
                            </div>
                          )}
                          <span className="text-white font-semibold">{plan.developed_games?.title || "O'yin"}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="font-bold text-amber-400">
                          {Number(plan.developed_games?.price) > 0 
                            ? `${Number(plan.developed_games?.price).toLocaleString()} UZS` 
                            : "Bepul"}
                        </span>
                      </td>

                      <td className="p-4 text-secondary">
                        {new Date(plan.created_at).toLocaleString()}
                      </td>

                      <td className="p-4 text-right">
                        <Link
                          href={`/games/${plan.developed_games?.slug || ''}`}
                          target="_blank"
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-bold text-white rounded-lg border border-white/10 transition-colors inline-flex items-center gap-1"
                        >
                          <span>Ko'rish</span>
                          <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
              {usersList.map((u) => {
                const isOnline = u.last_seen ? (Date.now() - new Date(u.last_seen).getTime() < 5 * 60 * 1000) : false;
                return (
                  <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                    {/* Name */}
                    <td className="p-4 font-semibold">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-white uppercase font-bold">
                            {u.username?.[0]}
                          </div>
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background shadow-[0_0_8px_#10B981]" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white text-sm">{u.nickname || u.username}</span>
                          <span className="text-[10px] text-secondary">@{u.username}</span>
                        </div>
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
              );
              })}
            </tbody>
          </table>
            </div>
          </div>

          {/* Live Feed & Online Users & Visits (Takes 1 col on lg) */}
          <div className="lg:col-span-1 space-y-8">
            {/* Online Users */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                Hozirda Online ({onlineUsers.length})
              </h2>
              <div className="glass-card p-5 border border-white/5 rounded-2xl max-h-[220px] overflow-y-auto custom-scrollbar">
                <div className="flex flex-col gap-3">
                  {onlineUsers.length === 0 ? (
                    <p className="text-secondary text-xs text-center py-4">Online foydalanuvchilar yo'q</p>
                  ) : (
                    onlineUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-brand-gradient text-[10px] font-bold text-white uppercase">
                            {u.username?.[0]}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white">@{u.username}</p>
                            <p className="text-[9px] text-secondary uppercase tracking-wider">{u.role}</p>
                          </div>
                        </div>
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Saytga Kirganlar (Recent visits/signups) */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Activity size={20} className="text-blue-400" /> Saytga Kirganlar (Yaqinda)
              </h2>
              <div className="glass-card p-5 border border-white/5 rounded-2xl max-h-[220px] overflow-y-auto custom-scrollbar">
                <div className="flex flex-col gap-3">
                  {recentVisitors.length === 0 ? (
                    <p className="text-secondary text-xs text-center py-4">Tashriflar yo'q</p>
                  ) : (
                    recentVisitors.map((u) => {
                      const lastSeenDate = new Date(u.last_seen!);
                      const diffMins = Math.floor((Date.now() - lastSeenDate.getTime()) / 60000);
                      const timeStr = diffMins === 0 
                        ? "Hozir" 
                        : diffMins < 60 
                        ? `${diffMins} daq oldin` 
                        : `${Math.floor(diffMins / 60)} soat oldin`;

                      return (
                        <div key={u.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-400 uppercase">
                              {u.username?.[0]}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-white">@{u.username}</p>
                              <p className="text-[9px] text-secondary uppercase tracking-wider">{u.role}</p>
                            </div>
                          </div>
                          <span className="text-[9px] text-secondary font-mono">
                            {timeStr}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Jonli Faollik */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ShieldAlert className="text-emerald-400" size={20} /> Jonli Faollik
              </h2>
              <div className="glass-card p-5 border border-white/5 rounded-2xl max-h-[220px] overflow-y-auto custom-scrollbar">
                <div className="flex flex-col gap-3">
                  <AnimatePresence>
                    {activities.length === 0 ? (
                      <p className="text-secondary text-sm text-center py-6">Yangi faolliklar yo'q...</p>
                    ) : (
                      activities.map(act => (
                        <motion.div
                          key={act.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5"
                        >
                          <div className={`p-2 rounded-lg ${act.type === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                            {act.type === 'user' ? <UserPlus size={14} /> : <Gamepad2 size={14} />}
                          </div>
                          <div>
                            <p className="text-xs text-white font-medium">{act.message}</p>
                            <span className="text-[9px] text-secondary">{act.time.toLocaleTimeString()}</span>
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

        {/* Receipt Image Preview Modal */}
        {selectedReceiptUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReceiptUrl(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-2xl max-h-[90vh] bg-card border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col items-center justify-center"
            >
              <div className="w-full flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="text-emerald-400" size={18} />
                  <span>To'lov Cheki Rasmi</span>
                </h3>
                <button
                  onClick={() => setSelectedReceiptUrl(null)}
                  className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-secondary hover:text-white transition-colors"
                >
                  <ShieldClose size={18} />
                </button>
              </div>

              <div className="w-full overflow-auto max-h-[70vh] flex items-center justify-center bg-black/50 rounded-2xl p-2 border border-white/5">
                <img
                  src={selectedReceiptUrl}
                  alt="Chek"
                  className="max-w-full max-h-[65vh] object-contain rounded-xl"
                />
              </div>

              <div className="mt-4 flex gap-3 w-full justify-end">
                <a
                  href={selectedReceiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-colors"
                >
                  <ExternalLink size={14} /> Asl rasmni yangi oynada ochish
                </a>
                <button
                  onClick={() => setSelectedReceiptUrl(null)}
                  className="px-4 py-2 bg-primary text-black font-bold rounded-xl text-xs transition-colors"
                >
                  Yopish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
