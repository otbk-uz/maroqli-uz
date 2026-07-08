"use client";

import React, { useEffect, useState } from "react";
import FloatingConsoleHUD from "./FloatingConsoleHUD";
import Footer from "./Footer";
import MobileNav from "./MobileNav";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <FloatingConsoleHUD />
      <div 
        className="min-h-screen flex flex-col bg-background text-foreground pb-28 lg:pb-0 pt-16 lg:pt-28 transition-all duration-300 ease-in-out"
      >
        <main className="flex-1">
          {children}
        </main>
        <Footer />
        <MobileNav />
      </div>
    </>
  );
}
