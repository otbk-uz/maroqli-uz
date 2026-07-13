"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/lib/store";
import { BackButton } from "../../../components/ui/BackButton";

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email.trim()) {
      setErrorMsg(t("email_placeholder", "Emailingizni kiriting"));
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccessMsg(t("reset_link_sent", "Tiklash havolasi yuborildi! Iltimos, pochtangizni tekshiring."));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || t("login_error_generic", "Kirishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background relative overflow-hidden">
      <div className="absolute top-8 left-8 z-10">
        <BackButton />
      </div>

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
          <h1 className="text-2xl font-bold mb-2">{t("forgot_password_title", "Parolni tiklash")}</h1>
          <p className="text-secondary text-sm">
            {t("forgot_password_desc", "Elektron pochta manzilingizni kiriting va biz sizga parolni tiklash havolasini yuboramiz.")}
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
                <label className="text-sm font-medium text-secondary ml-1">{t("email_label", "Email manzilingiz")}</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("email_placeholder", "Emailingizni kiriting")}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors text-sm text-white"
                  />
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
                    <Mail size={16} />
                    <span>{t("send_reset_link", "Havolani yuborish")}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </AnimatePresence>

        <p className="text-center mt-8 text-sm text-secondary">
          <Link href="/login" className="text-primary font-bold hover:underline inline-flex items-center gap-1">
            <span>{t("login", "Kirish")}</span>
            <ArrowRight size={14} />
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
