"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import { User, Settings, Shield, Award, LogOut, ChevronRight, Star, Camera, Check, X, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { BackButton } from "../../components/ui/BackButton";

const ProfilePage = () => {
  const router = useRouter();
  const { user, isAuthenticated, logout, setAuth, token } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      alert("Ism va taxallusni to'ldiring!");
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
      alert("Xatolik yuz berdi. Bu taxallus band bo'lishi mumkin.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Rasm hajmi 2MB dan oshmasligi kerak!");
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
      
    } catch (err) {
      console.error("Avatar yuklash xatosi:", err);
      alert("Rasm yuklashda xatolik yuz berdi.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveStreamer = async () => {
    if (!streamForm.stream_url || !streamForm.platform) {
      alert("Havola va platformani kiriting!");
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
      alert("Strim sozlamalari saqlandi!");
      setActiveSetting(null);
    } catch (err) {
      console.error("Strim sozlamalarini saqlashda xatolik:", err);
      alert("Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
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

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20">
        <BackButton />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="glass-card p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/20 to-transparent -z-10" />
              
              {/* Avatar Section */}
              <div className="relative w-28 h-28 mx-auto mb-6 group">
                <div className="w-full h-full rounded-full overflow-hidden border-4 border-background bg-white/5 flex items-center justify-center relative z-10 shadow-xl shadow-primary/10">
                  {profileData.avatar_url ? (
                    <img src={profileData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} className="text-secondary" />
                  )}
                </div>
                
                {/* Upload Overlay */}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer backdrop-blur-sm"
                >
                  {uploadingAvatar ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Camera size={20} className="text-white mb-1" />
                      <span className="text-[9px] font-bold text-white uppercase">O'zgartirish</span>
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

              {isEditing ? (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-[10px] text-secondary font-bold uppercase tracking-wider block text-left mb-1 ml-1">To'liq ism</label>
                    <input 
                      type="text" 
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-primary/50 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-secondary font-bold uppercase tracking-wider block text-left mb-1 ml-1">Taxallus (@username)</label>
                    <input 
                      type="text" 
                      value={editForm.username}
                      onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-primary/50 text-sm text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-2 rounded-xl text-sm transition-colors flex items-center justify-center gap-1"
                    >
                      {saving ? "Saqlanmoqda..." : <><Check size={16} /> Saqlash</>}
                    </button>
                    <button 
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm({ full_name: profileData.full_name, username: profileData.username });
                      }}
                      className="px-4 bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-xl transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-black mb-1 text-white">{profileData.full_name}</h2>
                  <p className="text-primary font-bold text-sm mb-4">@{profileData.username}</p>
                  <p className="text-secondary text-xs mb-6">
                    A'zo bo'ldi: {new Date(profileData.created_at).toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })}
                  </p>
                </>
              )}
              
              <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/5 mb-6">
                <div>
                  <p className="text-xl font-black text-white">{profileData.level || 1}</p>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Daraja (Level)</p>
                </div>
                <div>
                  <p className="text-xl font-black text-white">{profileData.role}</p>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Rolingiz</p>
                </div>
              </div>
              
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="btn-primary w-full py-3 mb-4 flex items-center justify-center gap-2"
                >
                  <Edit3 size={16} />
                  <span>Profilni tahrirlash</span>
                </button>
              )}

              <button 
                onClick={handleLogout}
                className="flex items-center justify-center space-x-2 w-full py-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
              >
                <LogOut size={18} />
                <span className="font-bold">Chiqish</span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 space-y-6">
            <div className="glass-card p-8">
              <h3 className="text-xl font-bold mb-8 flex items-center">
                <Award size={20} className="mr-3 text-primary" />
                Yutuqlar va Nishonlar
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center group">
                  <div className="w-16 h-16 bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors rounded-2xl mx-auto mb-3 flex items-center justify-center">
                    <Star size={24} className="text-yellow-500" />
                  </div>
                  <p className="text-xs font-bold text-white">Yangi a'zo</p>
                </div>
                {profileData.role === 'GAMEDEV' && (
                  <div className="text-center group">
                    <div className="w-16 h-16 bg-white/5 border border-white/10 group-hover:border-blue-500/50 transition-colors rounded-2xl mx-auto mb-3 flex items-center justify-center">
                      <Shield size={24} className="text-blue-500" />
                    </div>
                    <p className="text-xs font-bold text-white">Dasturchi</p>
                  </div>
                )}
                <div className="w-16 h-16 bg-white/2 rounded-2xl mx-auto flex items-center justify-center border-2 border-dashed border-white/10 hover:border-white/20 transition-colors cursor-pointer">
                   <span className="text-xl text-secondary">+</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-0 overflow-hidden">
               <div className="p-8 border-b border-white/5">
                 <h3 className="text-xl font-bold flex items-center">
                   <Settings size={20} className="mr-3 text-primary" />
                   Sozlamalar
                 </h3>
               </div>
               <div className="divide-y divide-white/5">
                 {["Striming sozlamalari", "Hisob xavfsizligi", "Xabarnomalar sozlamalari", "To'lov usullari", "Maxfiylik va Xavfsizlik"].map((item) => (
                   <button 
                     key={item} 
                     onClick={() => setActiveSetting(item)}
                     className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors group"
                   >
                     <span className="font-medium text-sm text-secondary group-hover:text-white transition-colors">{item}</span>
                     <ChevronRight size={18} className="text-secondary group-hover:text-primary transition-colors" />
                   </button>
                 ))}
               </div>
            </div>
          </div>
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
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setActiveSetting(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card relative z-10 w-full max-w-md p-6 overflow-hidden border-white/10 shadow-2xl"
            >
              <button 
                onClick={() => setActiveSetting(null)}
                className="absolute top-4 right-4 text-secondary hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-center space-x-3 mb-6">
                <Settings size={24} className="text-primary" />
                <h3 className="text-xl font-bold">{activeSetting}</h3>
              </div>

              {activeSetting === "Striming sozlamalari" ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-secondary font-bold block mb-1">Strim havolasi (URL)</label>
                    <input 
                      type="text" 
                      placeholder="https://twitch.tv/..."
                      value={streamForm.stream_url}
                      onChange={(e) => setStreamForm({...streamForm, stream_url: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-primary/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-secondary font-bold block mb-1">Platforma</label>
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
                    <label className="text-xs text-secondary font-bold block mb-1">O'yin nomi</label>
                    <input 
                      type="text" 
                      placeholder="Dota 2, CS2..."
                      value={streamForm.game}
                      onChange={(e) => setStreamForm({...streamForm, game: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-primary/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-secondary font-bold block mb-1">Strim sarlavhasi</label>
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
                      <h4 className="font-bold text-sm">Jonli efirda</h4>
                      <p className="text-[10px] text-secondary">Hozir strim qilyapsizmi?</p>
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
                    className="w-full mt-4 py-3 bg-primary hover:bg-primary/90 rounded-xl text-sm font-bold transition-all text-white"
                  >
                    {savingStream ? "Saqlanmoqda..." : "Saqlash"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center py-8">
                    <Shield size={48} className="text-white/20 mx-auto mb-4" />
                    <h4 className="text-lg font-bold text-white mb-2">Tez orada!</h4>
                    <p className="text-secondary text-sm leading-relaxed">
                      Ushbu bo'lim ustida jadal ish olib borilmoqda. Yangi funksiyalar tez orada PlayNationUz platformasida mavjud bo'ladi.
                    </p>
                  </div>

                  <button 
                    onClick={() => setActiveSetting(null)}
                    className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all"
                  >
                    Tushunarli
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
