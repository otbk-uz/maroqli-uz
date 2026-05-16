"use client";

import React, { useState } from "react";
import Navbar from "../../../components/Navbar";
import TournamentBracket from "../../../components/TournamentBracket";
import { Calendar, Trophy, Users, Shield, Info, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { BackButton } from "../../../components/ui/BackButton";

const TournamentDetail = ({ params }: { params: { id: string } }) => {
  const [activeTab, setActiveTab] = useState("BRACKET");

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      {/* Banner */}
      <div className="h-64 md:h-80 w-full bg-gradient-to-b from-primary/20 to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-32 relative z-10 pb-20">
        <BackButton />
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Info */}
          <div className="flex-1">
            <div className="glass-card p-8 mb-8">
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <span className="bg-primary px-4 py-1 rounded-full text-xs font-bold uppercase">LIVE</span>
                <span className="bg-white/10 px-4 py-1 rounded-full text-xs font-bold uppercase text-secondary">CS2</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-6">Counter-Strike 2: Uz Cup #12</h1>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 border-y border-white/5">
                <div className="text-center md:text-left">
                  <p className="text-xs text-secondary uppercase tracking-widest mb-1">Sovrin</p>
                  <p className="text-2xl font-bold text-primary">$500</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-xs text-secondary uppercase tracking-widest mb-1">Qatnashuvchilar</p>
                  <p className="text-2xl font-bold">32 / 64</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-xs text-secondary uppercase tracking-widest mb-1">Turi</p>
                  <p className="text-2xl font-bold">Single</p>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-xs text-secondary uppercase tracking-widest mb-1">Boshlanish</p>
                  <p className="text-2xl font-bold">18:00</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-8 border-b border-white/5 mb-8">
              {["BRACKET", "ISHTIROKCHILAR", "QOIDALAR", "MUHOKAMA"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-sm font-bold transition-all relative ${
                    activeTab === tab ? "text-primary" : "text-secondary hover:text-white"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {activeTab === "BRACKET" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <TournamentBracket />
                </motion.div>
              )}
              {activeTab === "ISHTIROKCHILAR" && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="glass-card p-4 flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-xs">P{i+1}</div>
                      <span className="font-medium">Gamer_{i+100}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-80">
            <div className="glass-card p-6 sticky top-32">
              <h3 className="font-bold mb-6 flex items-center">
                <Shield size={18} className="mr-2 text-primary" />
                Ro'yxatdan o'tish
              </h3>
              <p className="text-sm text-secondary mb-6 leading-relaxed">
                Ushbu turnirda qatnashish uchun sizning hisobingiz tasdiqlangan bo'lishi kerak.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Kirish to'lovi:</span>
                  <span className="font-bold text-green-500">BEPUL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Platforma:</span>
                  <span className="font-bold">PC</span>
                </div>
              </div>
              <button 
                onClick={() => alert("Tabriklaymiz! Siz muvaffaqiyatli ro'yxatdan o'tdingiz.")}
                className="btn-primary w-full py-4 mb-4"
              >
                Hozir qo'shilish
              </button>
              <button 
                onClick={() => alert("Havola nusxalandi! Do'stlaringizga yuboring.")}
                className="w-full py-3 text-sm text-secondary hover:text-white transition-colors"
              >
                Do'stlarni taklif qilish
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default TournamentDetail;
