"use client";

import React, { useState } from "react";
import Navbar from "../../components/Navbar";
import { Trophy, Medal, Target, Star, ChevronUp, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

const leaders = [
  { rank: 1, name: "AnaKiller", elo: 4820, winRate: "76%", matches: 154, trend: "up" },
  { rank: 2, name: "ZafarGamer", elo: 4210, winRate: "68%", matches: 210, trend: "up" },
  { rank: 3, name: "NodirPro", elo: 3880, winRate: "62%", matches: 180, trend: "down" },
  { rank: 4, name: "BekzodXL", elo: 3750, winRate: "59%", matches: 95, trend: "up" },
  { rank: 5, name: "SardorLEG", rank_diff: 0, elo: 3430, winRate: "55%", matches: 120, trend: "neutral" },
  { rank: 6, name: "DarkKnight", elo: 3200, winRate: "52%", matches: 145, trend: "down" },
  { rank: 7, name: "Storm", elo: 3150, winRate: "51%", matches: 88, trend: "up" },
];

import { BackButton } from "../../components/ui/BackButton";

const LeaderboardPage = () => {
  const [game, setGame] = useState("CS2");

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20">
        <BackButton />
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-black mb-4">Top o'yinchilar</h1>
          <p className="text-secondary text-lg">O'zbekistonning eng kuchli gamerlari va ularning reytingi</p>
        </div>

        {/* Top 3 Podium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 items-end max-w-4xl mx-auto">
          {/* Rank 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-8 text-center border-blue-500/20 relative"
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/20">2</div>
            <div className="w-20 h-20 rounded-full bg-white/5 mx-auto mb-4 border-2 border-blue-500/50 flex items-center justify-center font-bold text-2xl">ZG</div>
            <h3 className="text-xl font-bold mb-1">ZafarGamer</h3>
            <p className="text-blue-500 font-bold mb-4">4210 ELO</p>
            <div className="flex justify-center space-x-4 text-xs text-secondary">
              <span>WR: 68%</span>
              <span>Matches: 210</span>
            </div>
          </motion.div>

          {/* Rank 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-10 text-center border-primary/40 relative transform md:scale-110 z-10"
          >
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-primary flex items-center justify-center font-black text-2xl shadow-lg shadow-primary/20">1</div>
            <Trophy className="absolute top-4 right-4 text-primary animate-bounce" size={24} />
            <div className="w-24 h-24 rounded-full bg-white/5 mx-auto mb-4 border-4 border-primary flex items-center justify-center font-bold text-3xl">AK</div>
            <h3 className="text-2xl font-black mb-1">AnaKiller</h3>
            <p className="text-primary font-black text-lg mb-4">4820 ELO</p>
            <div className="flex justify-center space-x-6 text-sm text-secondary">
              <span className="font-bold text-white">WR: 76%</span>
              <span className="font-bold text-white">Matches: 154</span>
            </div>
          </motion.div>

          {/* Rank 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-8 text-center border-orange-500/20 relative"
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center font-black text-xl shadow-lg shadow-orange-500/20">3</div>
            <div className="w-20 h-20 rounded-full bg-white/5 mx-auto mb-4 border-2 border-orange-500/50 flex items-center justify-center font-bold text-2xl">NP</div>
            <h3 className="text-xl font-bold mb-1">NodirPro</h3>
            <p className="text-orange-500 font-bold mb-4">3880 ELO</p>
            <div className="flex justify-center space-x-4 text-xs text-secondary">
              <span>WR: 62%</span>
              <span>Matches: 180</span>
            </div>
          </motion.div>
        </div>

        {/* Full Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex space-x-4">
              {["CS2", "Dota 2", "Valorant"].map((g) => (
                <button
                  key={g}
                  onClick={() => setGame(g)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    game === g ? "bg-white/10 text-white" : "text-secondary hover:text-white"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <p className="text-xs text-secondary uppercase tracking-widest">So'nggi yangilanish: Bugun, 10:45</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/2 px-6">
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Rank</th>
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">O'yinchi</th>
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest text-center">Trend</th>
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">Win Rate</th>
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest">O'yinlar</th>
                  <th className="px-8 py-5 text-xs font-bold text-secondary uppercase tracking-widest text-right">Reyting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leaders.map((player) => (
                  <tr 
                    key={player.rank} 
                    onClick={() => alert(`${player.name}ning batafsil statistikasi yuklanmoqda...`)}
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-6">
                      <span className={`font-black text-lg ${player.rank <= 3 ? "text-primary" : "text-secondary"}`}>
                        #{player.rank}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-xs text-primary border border-white/10">
                          {player.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold group-hover:text-primary transition-colors">{player.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      {player.trend === "up" ? (
                        <ChevronUp className="mx-auto text-green-500" size={20} />
                      ) : player.trend === "down" ? (
                        <ChevronDown className="mx-auto text-red-500" size={20} />
                      ) : (
                        <span className="text-secondary">-</span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="w-24 bg-white/5 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-primary h-full rounded-full" 
                          style={{ width: player.winRate }}
                        />
                      </div>
                      <span className="text-xs text-secondary mt-1 block">{player.winRate}</span>
                    </td>
                    <td className="px-8 py-6 text-secondary font-medium">{player.matches}</td>
                    <td className="px-8 py-6 text-right">
                      <span className="font-black text-lg">{player.elo}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
};

export default LeaderboardPage;
