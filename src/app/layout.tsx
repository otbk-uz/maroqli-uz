import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import React from "react";
import GlobalNotifications from "@/components/GlobalNotifications";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: "MAROQLI",
  description: "O'zbekiston va Markaziy Osiyoda gaming hamjamiyatini birlashtiruvchi ekotizim platformasi.",
  icons: {
    icon: [
      { url: "/logo.jpg.png?v=3", type: "image/png" },
      { url: "/favicon.ico?v=3", sizes: "any" }
    ],
    apple: "/logo.jpg.png?v=3"
  },
};

import Providers from "./providers";
import LayoutShell from "@/components/LayoutShell";

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
          <LayoutShell>
            {children}
          </LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
