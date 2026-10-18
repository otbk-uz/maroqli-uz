"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: { type?: ToastType; title?: string; message: string; duration?: number }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = "info", title, message, duration = 4000 }: { type?: ToastType; title?: string; message: string; duration?: number }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: Toast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((message: string, title?: string) => addToast({ type: "success", title, message }), [addToast]);
  const error = useCallback((message: string, title?: string) => addToast({ type: "error", title, message }), [addToast]);
  const info = useCallback((message: string, title?: string) => addToast({ type: "info", title, message }), [addToast]);
  const warning = useCallback((message: string, title?: string) => addToast({ type: "warning", title, message }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info, warning }}>
      {children}
      <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2 sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => {
            const icons = {
              success: <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />,
              error: <AlertCircle size={18} className="text-primary shrink-0" />,
              warning: <AlertTriangle size={18} className="text-amber-400 shrink-0" />,
              info: <Info size={18} className="text-cyan-400 shrink-0" />,
            };

            const borders = {
              success: "border-emerald-500/30 bg-[#061811]/95 text-emerald-200 shadow-[0_8px_30px_rgba(16,185,129,0.15)]",
              error: "border-primary/40 bg-[#19060b]/95 text-red-200 shadow-[0_8px_30px_rgba(255,51,85,0.2)]",
              warning: "border-amber-500/30 bg-[#1a1205]/95 text-amber-200 shadow-[0_8px_30px_rgba(245,158,11,0.15)]",
              info: "border-cyan-500/30 bg-[#04141d]/95 text-cyan-200 shadow-[0_8px_30px_rgba(34,211,238,0.15)]",
            };

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                className={`pointer-events-auto rounded-2xl border p-4 backdrop-blur-xl shadow-2xl flex items-start gap-3 relative transition-all ${borders[t.type]}`}
              >
                <div className="mt-0.5">{icons[t.type]}</div>
                <div className="flex-1 min-w-0 pr-5">
                  {t.title && <h5 className="font-display font-black text-xs uppercase tracking-wider text-white mb-0.5">{t.title}</h5>}
                  <p className="text-xs leading-relaxed text-white/90 break-words">{t.message}</p>
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="absolute top-3 right-3 p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Yopish"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
