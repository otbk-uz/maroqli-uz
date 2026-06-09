import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import MobileNav from "@/components/MobileNav";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PlayNationUz | O'zbekiston Gaming Hamjamiyati",
  description: "O'zbekiston va Markaziy Osiyoda gaming hamjamiyatini birlashtiruvchi ekotizim platformasi.",
};

import Providers from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col bg-background text-foreground pb-20 lg:pb-0">
            {children}
            <Footer />
            <MobileNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
