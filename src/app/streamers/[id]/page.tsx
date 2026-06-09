"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Play, Users, Heart, Award, ArrowLeft, Send, Sparkles, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/lib/store";
import { BackButton } from "@/components/ui/BackButton";

interface Streamer {
  id: number;
  name: string;
  avatar: string;
  game: string;
  viewers: string;
  title: string;
  embedUrl: string;
  platform: string;
  bio: string;
}

const streamersList: Streamer[] = [
  {
    id: 1,
    name: "ZafarGamer",
    avatar: "ZG",
    game: "Counter-Strike 2",
    viewers: "1,245",
    title: "Pro match vs NaVi Academy | Sub goal 50/100",
    embedUrl: "https://www.youtube.com/embed/5Fv19KVV3s0?autoplay=1&mute=1",
    platform: "YouTube",
    bio: "CS2 professional kiber-sportchisi. O'zbekiston terma jamoasi a'zosi. Kundalik jonli efirlar va tahlillar.",
  },
  {
    id: 2,
    name: "NodirPro",
    avatar: "NP",
    game: "Dota 2",
    viewers: "840",
    title: "Ranked grind to Immortal | !giveaway",
    embedUrl: "https://www.youtube.com/embed/S2pTHe_L5P0?autoplay=1&mute=1",
    platform: "YouTube",
    bio: "Dota 2 tahlilchisi va professional o'yinchisi. E'tiboringiz uchun rahmat. Savollaringiz bo'lsa chatda yozing!",
  },
  {
    id: 3,
    name: "AnaKiller",
    avatar: "AK",
    game: "Valorant",
    viewers: "420",
    title: "Chilling and playing with subs",
    embedUrl: "https://www.youtube.com/embed/t83iB9B27kY?autoplay=1&mute=1",
    platform: "YouTube",
    bio: "Valorant kiber-o'yinchisi. Qizil sochi va tezkor reflekslari bilan mashhur. Jamoaga qo'shiling va birga yutaylik!",
  },
];

interface ChatMessage {
  id: number;
  user: string;
  text: string;
  isDonation?: boolean;
  amount?: string;
  isPremium?: boolean;
  time: string;
}

const INITIAL_DONATIONS = [
  { id: 1, user: "Jasur_Gamer", amount: "20 000 UZS", message: "Ajoyib o'yin, omad!", time: "5 daqiqa oldin" },
  { id: 2, user: "KiberUz", amount: "50 000 UZS", message: "Turnirlarda kutamiz ukam!", time: "12 daqiqa oldin" },
  { id: 3, user: "Sherzod", amount: "10 000 UZS", message: "Top o'yin", time: "25 daqiqa oldin" },
];

export default function StreamerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const streamerId = parseInt(params.id as string);
  const { user, isAuthenticated } = useAuthStore();
  
  const streamer = streamersList.find((s) => s.id === streamerId);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [donations, setDonations] = useState(INITIAL_DONATIONS);
  
  // Donation Modal States
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donateAmount, setDonateAmount] = useState("10000");
  const [donateMessage, setDonateMessage] = useState("Keyingi raundlarda omad!");
  const [donateProvider, setDonateProvider] = useState<"PAYME" | "CLICK">("PAYME");
  const [donating, setDonating] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Generate bot messages periodically to simulate active chat
  useEffect(() => {
    // Add initial messages
    setChatMessages([
      { id: 1, user: "Alibek", text: "Salom hammaga!", time: "18:40" },
      { id: 2, user: "KiberRider", text: "Zafar aka zo'r o'yin bo'lyapti", time: "18:41" },
      { id: 3, user: "DotaMaster", text: "Qachon turnir boshlanadi?", time: "18:41", isPremium: true },
    ]);

    const botNames = ["Bekzod", "Sardor", "Nodira", "KiberUz", "CyberHero", "UzGamer", "Geymer_99", "SniperUz"];
    const botTexts = [
      "GG!",
      "Ajoyib rount!",
      "Qaysi sichqondan foydalanasiz?",
      "Zo'r o'ynayapsiz lekin",
      "Stream qotyaptimi menda?",
      "Keyingi o'yinda meni ham oling iltimos",
      "Kameralarni to'g'irlang sal",
      "Kiber-sport rivojlanmoqda!",
      "Hujum qiling tezroq!",
      "Chiroyli kill bo'ldi"
    ];

    const interval = setInterval(() => {
      const randomName = botNames[Math.floor(Math.random() * botNames.length)];
      const randomText = botTexts[HTMLRank(botTexts.length)];
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          user: randomName,
          text: randomText,
          time: timeStr,
          isPremium: Math.random() > 0.7
        }
      ]);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const HTMLRank = (max: number) => {
    return Math.floor(Math.random() * max);
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (!streamer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-white">
        <Navbar />
        <h2 className="text-xl font-bold mb-4">Streamer topilmadi.</h2>
        <button onClick={() => router.push("/streamers")} className="btn-primary px-6 py-2">
          Ortga qaytish
        </button>
      </div>
    );
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const senderName = isAuthenticated && user ? user.nickname : "Mehmon";
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        user: senderName,
        text: newMessage,
        time: timeStr,
        isPremium: user?.is_premium
      }
    ]);
    setNewMessage("");
  };

  const handleDonateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDonating(true);

    setTimeout(() => {
      const amtStr = parseInt(donateAmount).toLocaleString() + " UZS";
      const donorName = isAuthenticated && user ? user.nickname : "Mehmon";
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // 1. Add donation message in chat
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          user: donorName,
          text: `Donat yubordi: "${donateMessage}"`,
          isDonation: true,
          amount: amtStr,
          time: timeStr,
          isPremium: user?.is_premium
        }
      ]);

      // 2. Add to donation log
      setDonations((prev) => [
        {
          id: Date.now(),
          user: donorName,
          amount: amtStr,
          message: donateMessage,
          time: "Hozirgina"
        },
        ...prev
      ]);

      setDonating(false);
      setShowDonateModal(false);
      alert(`${streamer.name}ga ${amtStr} muvaffaqiyatli donat qilindi!`);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />

      <div className="pt-32 pb-20 container mx-auto px-4 max-w-7xl">
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column: Player and Details */}
          <div className="lg:col-span-3 flex flex-col space-y-6">
            
            {/* Stream Player */}
            <div className="w-full aspect-video rounded-3xl overflow-hidden border border-white/5 bg-black shadow-2xl relative">
              <iframe
                src={streamer.embedUrl}
                title={streamer.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            {/* Stream Info & Actions */}
            <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center font-bold text-2xl border-2 border-white/10 shadow-lg shadow-primary/20">
                  {streamer.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black">{streamer.name}</h1>
                    <span className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" /> LIVE
                    </span>
                  </div>
                  <p className="text-primary text-sm font-semibold mt-0.5">{streamer.game}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setIsFollowing(!isFollowing)}
                  className={`flex-1 md:flex-initial py-3 px-6 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 ${
                    isFollowing ? "bg-white/10 text-white" : "bg-white/5 hover:bg-white/10 text-white"
                  }`}
                >
                  <Heart size={16} fill={isFollowing ? "white" : "transparent"} />
                  {isFollowing ? "Obuna bo'lindi" : "Kuzatish"}
                </button>

                <button
                  onClick={() => setShowDonateModal(true)}
                  className="flex-1 md:flex-initial py-3 px-6 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-extrabold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 hover:scale-[1.02]"
                >
                  <Gift size={16} />
                  <span>Donat qilish</span>
                </button>
              </div>
            </div>

            {/* Title & Description */}
            <div className="glass-card p-8 space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-3">{streamer.title}</h3>
                <div className="flex items-center gap-6 text-sm text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Users size={16} /> {streamer.viewers} tomoshabin
                  </span>
                  <span>Platforma: {streamer.platform}</span>
                </div>
              </div>
              
              <div className="h-px bg-white/5" />

              <div>
                <h4 className="text-sm font-bold text-secondary uppercase tracking-widest mb-3">Streamer haqida</h4>
                <p className="text-secondary text-sm leading-relaxed">{streamer.bio}</p>
              </div>
            </div>

            {/* Recent Donations Feed */}
            <div className="glass-card p-8">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                👑 Oxirgi Qo'llab-quvvatlashlar
              </h3>
              <div className="space-y-4">
                {donations.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-start justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-colors"
                  >
                    <div>
                      <span className="text-xs font-semibold text-secondary">{d.user}</span>
                      <p className="text-sm font-bold text-amber-400 mt-0.5">{d.amount}</p>
                      {d.message && <p className="text-xs text-secondary mt-1 italic">"{d.message}"</p>}
                    </div>
                    <span className="text-[10px] text-secondary/60">{d.time}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Live Chat */}
          <div className="lg:col-span-1 flex flex-col h-[600px] lg:h-auto lg:min-h-[600px] glass-card overflow-hidden">
            <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide uppercase">Jonli Chat</h3>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Faol
              </span>
            </div>

            {/* Chat message list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px] lg:max-h-[550px] min-h-[300px]">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-2xl text-xs leading-relaxed transition-all ${
                    msg.isDonation
                      ? "bg-gradient-to-r from-amber-400/10 to-orange-500/10 border border-amber-400/30 shadow-lg shadow-amber-400/5"
                      : "bg-white/[0.01] hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold flex items-center gap-1 text-white">
                      {msg.user}
                      {msg.isPremium && (
                        <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-[8px] text-black px-1 rounded-sm font-extrabold uppercase scale-90">
                          PRO
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] opacity-40">{msg.time}</span>
                  </div>
                  {msg.isDonation ? (
                    <div>
                      <span className="inline-block bg-amber-400/20 text-amber-400 font-black px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider mb-1">
                        💰 DONAT {msg.amount}
                      </span>
                      <p className="text-secondary italic font-medium mt-0.5">{msg.text}</p>
                    </div>
                  ) : (
                    <p className="text-secondary">{msg.text}</p>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Send Form */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white/[0.02] border-t border-white/5 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={isAuthenticated ? "Suhbatga qo'shiling..." : "Yozish uchun kiring..."}
                disabled={!isAuthenticated}
                className="flex-1 bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!isAuthenticated || !newMessage.trim()}
                className="p-3 bg-primary hover:bg-primary-hover text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Donation Simulation Modal */}
      <AnimatePresence>
        {showDonateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDonateModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#16161a] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
            >
              <h3 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <Sparkles className="text-amber-400" /> Streamerni Qo'llab-quvvatlash
              </h3>
              <p className="text-xs text-secondary mb-6">
                Streamerga xabar yuboring va kiber-sport rivojiga o'z hissangizni qo'shing.
              </p>

              <form onSubmit={handleDonateSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1">Donat miqdori (UZS)</label>
                  <select
                    value={donateAmount}
                    onChange={(e) => setDonateAmount(e.target.value)}
                    className="w-full bg-[#1e1e24] border border-white/5 rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none"
                  >
                    <option value="5000">5 000 UZS</option>
                    <option value="10000">10 000 UZS</option>
                    <option value="20000">20 000 UZS</option>
                    <option value="50000">50 000 UZS</option>
                    <option value="100000">100 000 UZS</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1">Qo'shimcha Xabar</label>
                  <textarea
                    rows={3}
                    value={donateMessage}
                    onChange={(e) => setDonateMessage(e.target.value)}
                    placeholder="Xabaringizni shu yerda yozing..."
                    maxLength={100}
                    className="w-full bg-[#1e1e24] border border-white/5 rounded-xl py-3 px-4 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1">To'lov Tizimi</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setDonateProvider("PAYME")}
                      className={`py-3 rounded-xl border font-bold text-center transition-all ${
                        donateProvider === "PAYME" ? "border-[#00c9c9] bg-[#00c9c9]/10 text-[#00c9c9]" : "border-white/5 bg-white/5"
                      }`}
                    >
                      Payme
                    </button>
                    <button
                      type="button"
                      onClick={() => setDonateProvider("CLICK")}
                      className={`py-3 rounded-xl border font-bold text-center transition-all ${
                        donateProvider === "CLICK" ? "border-[#00a5ff] bg-[#00a5ff]/10 text-[#00a5ff]" : "border-white/5 bg-white/5"
                      }`}
                    >
                      Click
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={donating}
                  className="w-full py-4 mt-6 bg-gradient-to-r from-amber-400 to-amber-600 text-black font-extrabold rounded-xl text-center shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {donating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Tranzaksiya...
                    </>
                  ) : (
                    <>Donat qilish</>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setShowDonateModal(false)}
                className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-secondary transition-all"
              >
                Bekor qilish
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
