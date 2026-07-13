"use client";

import React from "react";
import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import TournamentLive from "@/components/TournamentLive";
import { BackButton } from "@/components/ui/BackButton";

export default function TournamentLivePage() {
  return (
    <div className="container-app min-h-screen pt-28 pb-24">
      <div className="mb-6">
        <BackButton />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <span className="chip mb-3">
          <Radio size={13} className="text-primary" />
          Turnir efiri
        </span>
        <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight text-white">
          Jonli <span className="text-gradient">efir</span> boshqaruvi
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-secondary">
          Administrator efirni boshlaydi va olingan RTMP manzili + kalitni PRISM Live Studio (yoki OBS)
          ga kiritib jonli translyatsiya qiladi. Tomoshabinlar shu yerda kuzatadi.
        </p>
      </motion.div>

      <div className="mx-auto max-w-4xl">
        <TournamentLive />
      </div>
    </div>
  );
}
