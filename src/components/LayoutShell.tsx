"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import FloatingConsoleHUD from "./FloatingConsoleHUD";
import Footer from "./Footer";
import MobileNav from "./MobileNav";
import { WifiOff } from "lucide-react";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    if (typeof navigator !== "undefined") {
      setIsOffline(!navigator.onLine);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      <FloatingConsoleHUD />

      {/* Offline Status Warning Banner */}
      {mounted && isOffline && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[99999] w-[90%] max-w-sm">
          <div className="bg-[#14080a]/90 border border-red-500/20 text-white p-3.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(239,68,68,0.15)] backdrop-blur-md flex items-center gap-3 animate-pulse">
            <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-xl text-red-500 flex-shrink-0">
              <WifiOff size={18} />
            </div>
            <div className="min-w-0">
              <h5 className="font-display font-black text-[10px] uppercase tracking-widest text-red-400">Offline Rejim Faol</h5>
              <p className="text-[9px] text-secondary leading-normal mt-0.5">Internet ulanishi uzildi. Keshdan olingan ma'lumotlar ko'rsatilmoqda.</p>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen flex flex-col bg-background text-foreground pb-28 lg:pb-0 transition-all duration-300 ease-in-out">
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        <MobileNav />
      </div>
    </>
  );
}
