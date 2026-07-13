"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/lib/store";

const ResetPasswordPage = () => {
  const router = useRouter();
  const { t } = useTranslation();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check if session exists (redirect to login if not reset password context)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Supabase sets session automatically when clicking reset password link
      if (!session) {
        console.warn("No active recovery session found.");
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (password.length < 6) {
      setErrorMsg(t("password_error_short", "Parol kamida 6 ta belgidan iborat bo'lishi kerak."));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(t("password_error_match", "Parollar mos kelmadi."));
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) throw error;

      setSuccessMsg(t("password_updated", "Parol muvaffaqiyatli yangilandi! Kirish sahifasiga yo'naltirilmoqda..."));
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || t("login_error_generic", "Kirishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-card p-8 md:p-10 relative overflow-hidden"
      >
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />

        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black tracking-tighter inline-block mb-6">
            MAR<span className="text-primary">OQLI</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">{t("reset_password_title", "Yangi parol o'rnatish")}</h1>
          <p className="text-secondary text-sm">
            {t("reset_password_desc", "Iltimos, hisobingiz uchun new parol kiriting.")}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {successMsg ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl p-4 mb-6 flex items-start space-x-2"
            >
              <CheckCircle size={16} className="mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-4 flex items-start space-x-2 animate-shake">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary ml-1">{t("new_password_label", "Yangi parol")}</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 outline-none focus:border-primary/50 transition-colors text-sm text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary ml-1">{t("confirm_new_password_label", "Yangi parolni tasdiqlash")}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 outline-none focus:border-primary/50 transition-colors text-sm text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-4 text-sm font-bold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock size={16} />
                    <span>{t("save_new_password", "Parolni saqlash")}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
