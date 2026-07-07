"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Footer from "./Footer";
import MobileNav from "./MobileNav";
import { useUIStore } from "@/lib/store";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUIStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydrations mismatch by rendering with static layout during SSR
  const leftMarginClass = mounted 
    ? (sidebarCollapsed ? "lg:ml-20" : "lg:ml-64") 
    : "lg:ml-64";

  return (
    <>
      <Sidebar />
      <Topbar />
      <div 
        className={`min-h-screen flex flex-col bg-background text-foreground pb-20 lg:pb-0 pt-20 transition-all duration-300 ease-in-out ${leftMarginClass}`}
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
