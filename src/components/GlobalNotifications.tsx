"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, Play, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function GlobalNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel("global_notifications_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "global_notifications" },
        (payload) => {
          // Add new notification to state
          setNotifications((prev) => [...prev, payload.new]);
          
          // Auto-remove after 8 seconds
          setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== payload.new.id));
          }, 8000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const dismissNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="pointer-events-auto bg-black/80 backdrop-blur-xl border border-primary/40 p-4 rounded-2xl shadow-2xl shadow-primary/20 flex items-start gap-4 max-w-sm w-full relative"
          >
            <div className="bg-primary/20 p-2 rounded-full text-primary shrink-0">
              <Bell size={20} className="animate-pulse" />
            </div>
            
            <div className="flex-1 pr-6 cursor-pointer" onClick={() => { if(n.url) router.push(n.url); dismissNotification(n.id); }}>
              <h4 className="text-white font-bold text-sm mb-1">{n.title}</h4>
              <p className="text-secondary text-xs">{n.message}</p>
              {n.url && (
                <div className="mt-2 text-primary text-xs font-bold flex items-center gap-1">
                  <Play size={10} fill="currentColor" /> Tomosha qilish
                </div>
              )}
            </div>

            <button
              onClick={() => dismissNotification(n.id)}
              className="absolute top-2 right-2 p-1.5 text-secondary hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
