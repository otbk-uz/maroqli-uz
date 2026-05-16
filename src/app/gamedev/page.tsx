"use client";

import React from "react";
import Navbar from "../../components/Navbar";
import { Code2, Palette, Box, Rocket } from "lucide-react";
import { motion } from "framer-motion";

const studios = [
  { name: "PixelForge UZ", focus: "3D Platformer", location: "Toshkent" },
  { name: "NomadStudios", focus: "Mobile RPG", location: "Samarqand" },
  { name: "ByteShift", focus: "FPS Shooter", location: "Buxoro" },
];

import { BackButton } from "../../components/ui/BackButton";

const GamedevPage = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20">
        <BackButton />
        <div className="max-w-3xl mb-16">
          <h1 className="text-4xl font-black mb-4">GameDev & Studios</h1>
          <p className="text-secondary text-lg">O'zbekistondagi o'yin yaratuvchilar va studiyalar hamjamiyati.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="glass-card p-8 border-primary/20">
            <Code2 size={40} className="text-primary mb-6" />
            <h3 className="text-xl font-bold mb-2">Dasturlash</h3>
            <p className="text-sm text-secondary">Unity, Unreal Engine va Godot bo'yicha darsliklar va hamkorlik.</p>
          </div>
          <div className="glass-card p-8">
            <Palette size={40} className="text-blue-500 mb-6" />
            <h3 className="text-xl font-bold mb-2">Dizayn & Art</h3>
            <p className="text-sm text-secondary">3D modellashtirish, 2D art va o'yin interfeyslari dizayni.</p>
          </div>
          <div className="glass-card p-8">
            <Box size={40} className="text-green-500 mb-6" />
            <h3 className="text-xl font-bold mb-2">Publishing</h3>
            <p className="text-sm text-secondary">O'yinlarni global bozorga (Steam, Play Store) chiqarishda yordam.</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-8">Mahalliy Studiyalar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {studios.map((s) => (
            <div key={s.name} className="glass-card p-6 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-lg">{s.name}</h4>
                <p className="text-sm text-secondary">{s.focus} • {s.location}</p>
              </div>
              <button 
                onClick={() => alert(`${s.name} studiyasi profili tez kunda ochiladi!`)}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
              >
                <Rocket size={20} className="text-primary group-hover:scale-110 transition-transform" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default GamedevPage;
