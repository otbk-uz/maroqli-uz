import Link from "next/link";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import { Trophy, ArrowRight, Play, Gamepad2 } from "lucide-react";

const tournaments = [
  {
    id: 1,
    title: "Counter-Strike 2: Uz Cup #12",
    prize: "$500",
    participants: "32/64",
    status: "LIVE",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070",
  },
  {
    id: 2,
    title: "Dota 2: Central Asia League",
    prize: "$1,200",
    participants: "12/16",
    status: "UPCOMING",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071",
  },
  {
    id: 3,
    title: "Valorant: Night Warriors",
    prize: "$300",
    participants: "8/32",
    status: "UPCOMING",
    image: "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?q=80&w=2070",
  },
  {
    id: 4,
    title: "PUBG Mobile: Toshkent Open",
    prize: "$1,000",
    participants: "100/100",
    status: "UPCOMING",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1947",
  },
  {
    id: 5,
    title: "FC 24: Uzbekistan Championship",
    prize: "$2,000",
    participants: "64/128",
    status: "UPCOMING",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?q=80&w=2070",
  },
];

export default function Home() {
  return (
    <main className="bg-background min-h-screen">
      <Navbar />
      <Hero />
      
      {/* Featured Tournaments Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div>
              <div className="flex items-center space-x-2 text-primary font-bold text-xs uppercase tracking-widest mb-4">
                <Trophy size={14} />
                <span>Raqobatbardosh o'yinlar</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white">Faol turnirlar</h2>
            </div>
            <Link href="/tournaments" className="group flex items-center space-x-2 text-secondary hover:text-primary transition-all font-bold">
              <span>Barcha turnirlarni ko'rish</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tournaments.map((t, i) => (
              <div key={i} className="glass-card overflow-hidden group hover:border-primary/50 transition-all duration-500">
                <div className="aspect-[16/10] bg-white/5 relative overflow-hidden">
                  <img 
                    src={t.image} 
                    alt={t.title}
                    className="w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:opacity-80 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
                  
                  <div className="absolute top-4 left-4 flex space-x-2">
                    <span className={`${t.status === 'LIVE' ? 'bg-primary' : 'bg-blue-500'} px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-black/50`}>
                      {t.status}
                    </span>
                  </div>
                  
                  {t.status === 'LIVE' && (
                    <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">LIVE NOW</span>
                    </div>
                  )}
                </div>
                
                <div className="p-8">
                  <h3 className="text-xl font-bold text-white mb-6 group-hover:text-primary transition-colors line-clamp-1">{t.title}</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Sovrin</p>
                      <p className="text-lg font-black text-white">{t.prize}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Slots</p>
                      <p className="text-lg font-black text-white">{t.participants}</p>
                    </div>
                  </div>
                  
                  <Link 
                    href={t.status === 'LIVE' ? `/streamers` : `/tournaments/${t.id}`}
                    className="w-full py-4 bg-white/5 hover:bg-primary text-white font-bold rounded-xl transition-all duration-300 border border-white/10 hover:border-primary active:scale-95 flex items-center justify-center space-x-2"
                  >
                    {t.status === 'LIVE' ? (
                      <>
                        <Play size={16} fill="white" />
                        <span>Tomosha qilish</span>
                      </>
                    ) : (
                      <>
                        <Gamepad2 size={16} />
                        <span>Ro'yxatdan o'tish</span>
                      </>
                    )}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="py-20 bg-primary/5 border-y border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            <div>
              <p className="text-4xl md:text-6xl font-black text-white mb-2">12M+</p>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest">Jami ko'rishlar</p>
            </div>
            <div>
              <p className="text-4xl md:text-6xl font-black text-white mb-2">850</p>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest">Turnirlar yakunlangan</p>
            </div>
            <div>
              <p className="text-4xl md:text-6xl font-black text-white mb-2">15K</p>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest">Faol streamerlar</p>
            </div>
            <div>
              <p className="text-4xl md:text-6xl font-black text-white mb-2">99%</p>
              <p className="text-xs font-bold text-secondary uppercase tracking-widest">Hakamlik aniqligi</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
