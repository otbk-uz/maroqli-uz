"use client";

import React from "react";
import Navbar from "../../components/Navbar";
import { Gamepad2, Trophy, Users, Star } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const games = [
  { name: "Counter-Strike 2", genre: "FPS", players: "1.2M", color: "bg-orange-500" },
  { name: "Dota 2", genre: "MOBA", players: "800K", color: "bg-red-600" },
  { name: "Valorant", genre: "FPS", players: "1M", color: "bg-pink-500" },
  { name: "PUBG Mobile", genre: "Battle Royale", players: "2M", color: "bg-yellow-600" },
  { name: "Mobile Legends", genre: "MOBA", players: "1.5M", color: "bg-blue-500" },
  { name: "FIFA 24", genre: "Sports", players: "500K", color: "bg-green-500" },
];

import { BackButton } from "../../components/ui/BackButton";

const GamesPage = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20">
        <BackButton />
        <h1 className="text-4xl font-black mb-12">O'yinlar</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {games.map((game) => (
            <motion.div
              whileHover={{ y: -10 }}
              key={game.name}
              className="glass-card p-8 group cursor-pointer"
            >
              <div className={`w-16 h-16 ${game.color} rounded-2xl mb-6 flex items-center justify-center shadow-lg`}>
                <Gamepad2 size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">{game.name}</h3>
              <p className="text-secondary mb-6">{game.genre}</p>
              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <div className="flex items-center text-sm text-secondary">
                  <Users size={16} className="mr-2" />
                  {game.players} o'yinchi
                </div>
                <Link href="/tournaments" className="text-primary font-bold text-sm hover:underline">
                  Turnirlar →
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default GamesPage;
