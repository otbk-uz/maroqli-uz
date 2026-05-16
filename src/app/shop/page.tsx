"use client";

import React from "react";
import Navbar from "../../components/Navbar";
import { ShoppingBag, MousePointer2, Headphones, Monitor, Cpu } from "lucide-react";
import { motion } from "framer-motion";

const products = [
  { name: "Gaming Mouse", price: "250,000 uzs", icon: MousePointer2 },
  { name: "Pro Headset", price: "480,000 uzs", icon: Headphones },
  { name: "Mechanical Keyboard", price: "720,000 uzs", icon: Cpu },
  { name: "Gaming Monitor", price: "2,400,000 uzs", icon: Monitor },
];

import { BackButton } from "../../components/ui/BackButton";

const ShopPage = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20">
        <BackButton />
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-4xl font-black">Do'kon</h1>
          <button className="flex items-center space-x-2 bg-primary px-6 py-2 rounded-xl font-bold text-sm">
            <ShoppingBag size={18} />
            <span>Savat (0)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((p) => (
            <motion.div
              whileHover={{ scale: 1.02 }}
              key={p.name}
              className="glass-card p-6 flex flex-col items-center text-center"
            >
              <div className="w-full aspect-square bg-white/5 rounded-2xl mb-6 flex items-center justify-center">
                <p.icon size={64} className="text-secondary opacity-50" />
              </div>
              <h3 className="font-bold mb-2">{p.name}</h3>
              <p className="text-primary font-black mb-6">{p.price}</p>
              <button 
                onClick={() => alert(`${p.name} savatga qo'shildi!`)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition-colors"
              >
                Sotib olish
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default ShopPage;
