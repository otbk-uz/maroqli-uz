import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import React from "react";
import GlobalNotifications from "@/components/GlobalNotifications";
import MobileNav from "@/components/MobileNav";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: "MAROQLI",
  description: "O'zbekiston va Markaziy Osiyoda gaming hamjamiyatini birlashtiruvchi ekotizim platformasi.",
  icons: {
    icon: "/logo.jpg.png",
  },
};

import Providers from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased text-white bg-background overflow-x-hidden selection:bg-primary/30 selection:text-white">
        <Providers>
          <GlobalNotifications />
          <Sidebar />
          <Topbar />
          <div className="min-h-screen flex flex-col bg-background text-foreground pb-20 lg:pb-0 lg:ml-64 pt-20">
            {children}
            <Footer />
            <MobileNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
