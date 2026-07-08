"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import FloatingConsoleHUD from "./FloatingConsoleHUD";
import Footer from "./Footer";
import MobileNav from "./MobileNav";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <FloatingConsoleHUD />
      <div 
        className={`min-h-screen flex flex-col bg-background text-foreground pb-28 lg:pb-0 transition-all duration-300 ease-in-out ${
          pathname === "/" ? "" : "pt-16 lg:pt-28"
        }`}
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
