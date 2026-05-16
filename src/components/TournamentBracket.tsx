"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trophy, Swords } from "lucide-react";

interface Match {
  id: number;
  player1: string;
  player2: string;
  score1?: number;
  score2?: number;
  winner?: 1 | 2;
  status: "UPCOMING" | "LIVE" | "FINISHED";
}

const rounds: { name: string; matches: Match[] }[] = [
  {
    name: "Chorak final",
    matches: [
      { id: 1, player1: "AnaKiller", player2: "ZafarGamer", score1: 2, score2: 0, winner: 1, status: "FINISHED" },
      { id: 2, player1: "NodirPro", player2: "BekzodXL", score1: 1, score2: 2, winner: 2, status: "FINISHED" },
      { id: 3, player1: "SardorLEG", player2: "JavohirX", score1: 0, score2: 2, winner: 2, status: "FINISHED" },
      { id: 4, player1: "DarkKnight", player2: "Storm", score1: 2, score2: 1, winner: 1, status: "FINISHED" },
    ],
  },
  {
    name: "Yarim final",
    matches: [
      { id: 5, player1: "AnaKiller", player2: "BekzodXL", score1: 1, score2: 0, status: "LIVE" },
      { id: 6, player1: "JavohirX", player2: "DarkKnight", score1: 0, score2: 0, status: "UPCOMING" },
    ],
  },
  {
    name: "Final",
    matches: [
      { id: 7, player1: "TBD", player2: "TBD", status: "UPCOMING" },
    ],
  },
];

const TournamentBracket = () => {
  return (
    <div className="flex space-x-16 p-12 overflow-x-auto no-scrollbar min-h-[600px] items-center">
      {rounds.map((round, roundIdx) => (
        <div key={roundIdx} className="flex flex-col justify-around h-full min-w-[280px]">
          <div className="mb-12 text-center">
             <h4 className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              {round.name}
            </h4>
          </div>
          <div className="flex flex-col space-y-24">
            {round.matches.map((match, matchIdx) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: roundIdx * 0.1 + matchIdx * 0.05 }}
                key={match.id}
                className="relative group"
              >
                {/* Match Card */}
                <div className="glass-card overflow-hidden border-white/10 hover:border-primary/40 transition-all duration-300 shadow-2xl shadow-black/40">
                  {/* Status indicator */}
                  {match.status === "LIVE" && (
                    <div className="bg-primary/20 border-b border-primary/30 px-3 py-1 flex items-center justify-between">
                       <span className="flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                          <span className="text-[9px] font-black text-primary uppercase tracking-widest">LIVE</span>
                       </span>
                       <Swords size={10} className="text-primary" />
                    </div>
                  )}

                  {/* Player 1 */}
                  <div className={`flex items-center justify-between p-4 border-b border-white/5 transition-colors ${
                    match.winner === 1 ? "bg-primary/5" : ""
                  }`}>
                    <div className="flex items-center space-x-3">
                       <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${
                         match.winner === 1 ? "bg-primary/20 border-primary/40 text-white" : "bg-white/5 border-white/10 text-secondary"
                       }`}>
                         {match.player1.substring(0, 2).toUpperCase()}
                       </div>
                       <span className={`text-sm font-bold tracking-tight ${match.winner === 2 ? "text-secondary" : "text-white"}`}>
                         {match.player1}
                       </span>
                    </div>
                    <span className={`text-sm font-black ${match.winner === 1 ? "text-primary" : "text-white"}`}>
                      {match.score1 ?? (match.status === "UPCOMING" ? "" : "0")}
                    </span>
                  </div>

                  {/* Player 2 */}
                  <div className={`flex items-center justify-between p-4 transition-colors ${
                    match.winner === 2 ? "bg-primary/5" : ""
                  }`}>
                    <div className="flex items-center space-x-3">
                       <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${
                         match.winner === 2 ? "bg-primary/20 border-primary/40 text-white" : "bg-white/5 border-white/10 text-secondary"
                       }`}>
                         {match.player2.substring(0, 2).toUpperCase()}
                       </div>
                       <span className={`text-sm font-bold tracking-tight ${match.winner === 1 ? "text-secondary" : "text-white"}`}>
                         {match.player2}
                       </span>
                    </div>
                    <span className={`text-sm font-black ${match.winner === 2 ? "text-primary" : "text-white"}`}>
                      {match.score2 ?? (match.status === "UPCOMING" ? "" : "0")}
                    </span>
                  </div>
                </div>

                {/* Connector Lines (Premium Visuals) */}
                {roundIdx < rounds.length - 1 && (
                  <>
                    <div className="absolute top-1/2 -right-16 w-16 h-px bg-gradient-to-r from-white/20 to-white/5" />
                    {matchIdx % 2 === 0 ? (
                      <div className="absolute top-1/2 -right-16 w-px h-12 bg-white/5 translate-y-0" />
                    ) : (
                      <div className="absolute top-1/2 -right-16 w-px h-12 bg-white/5 -translate-y-full" />
                    )}
                  </>
                )}

                {/* Champion Badge (For the very last round) */}
                {roundIdx === rounds.length - 1 && match.winner && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
                    <Trophy className="text-yellow-500 mb-2" size={32} />
                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Champion</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TournamentBracket;
