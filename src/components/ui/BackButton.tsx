"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export const BackButton = () => {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center space-x-2 text-secondary hover:text-white transition-colors mb-8 group"
    >
      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
        <ChevronLeft size={20} />
      </div>
      <span className="text-sm font-bold uppercase tracking-widest">Orqaga</span>
    </button>
  );
};
