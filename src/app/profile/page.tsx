"use client";

import React from "react";
import Navbar from "../../components/Navbar";
import { User, Settings, Shield, Award, LogOut, ChevronRight, Star } from "lucide-react";
import { motion } from "framer-motion";
import { BackButton } from "../../components/ui/BackButton";

const ProfilePage = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20">
        <BackButton />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="glass-card p-8 text-center">
              <div className="w-24 h-24 rounded-full bg-primary/20 mx-auto mb-6 flex items-center justify-center border-2 border-primary">
                <User size={48} className="text-primary" />
              </div>
              <h2 className="text-2xl font-black mb-1">Gamer_777</h2>
              <p className="text-secondary text-sm mb-6">Ro'yxatdan o'tgan: May 2026</p>
              
              <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/5 mb-6">
                <div>
                  <p className="text-xl font-black">2,450</p>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">ELO</p>
                </div>
                <div>
                  <p className="text-xl font-black">12</p>
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Turnirlar</p>
                </div>
              </div>
              
              <button className="btn-primary w-full py-3 mb-4">Profilni tahrirlash</button>
              <button className="flex items-center justify-center space-x-2 w-full py-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
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
                Yutuqlar
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl mx-auto mb-3 flex items-center justify-center">
                      <Star size={24} className="text-yellow-500" />
                    </div>
                    <p className="text-xs font-bold">Top 10 Player</p>
                  </div>
                ))}
                <div className="w-16 h-16 bg-white/2 rounded-2xl mx-auto flex items-center justify-center border-2 border-dashed border-white/10">
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
                 {["Hisob xavfsizligi", "Xabarnomalar", "To'lov usullari", "Maxfiylik"].map((item) => (
                   <button key={item} className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                     <span className="font-medium">{item}</span>
                     <ChevronRight size={18} className="text-secondary" />
                   </button>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ProfilePage;
