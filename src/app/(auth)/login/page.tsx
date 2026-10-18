"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogIn, AlertCircle, User, Lock } from "lucide-react";
import { useAuthStore, useTranslation } from "@/lib/store";
import { loginSchema } from "@/lib/validations";
import { BackButton } from "../../../components/ui/BackButton";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import Script from "next/script";

const LoginPage = () => {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { t } = useTranslation();
  const { success } = useToast();

  const [formData, setFormData] = useState({
    email: "", // can be email, phone or username
    password: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          formattedErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(formattedErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Email, foydalanuvchi nomi yoki parol noto'g'ri.");
      }

      setAuth(data.user, data.token);
      success("Tizimga muvaffaqiyatli kirdingiz!", "Xush kelibsiz!");
      router.push("/");
    } catch (err: any) {
      console.error("Login error:", err);
      setErrorMsg(err.message || t("login_error_generic", "Kirishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background relative">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <div className="absolute top-8 left-8">
        <BackButton />
      </div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md glass-card p-8 md:p-10 border-white/10"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <span className="font-display text-2xl font-black uppercase tracking-[0.18em]">
              <span className="text-white">MAR</span>
              <span className="text-gradient">OQLI</span>
            </span>
          </Link>
          <h1 className="font-display text-2xl font-black text-white mb-2 uppercase tracking-tight">{t("welcome_back", "Xush kelibsiz!")}</h1>
          <p className="text-secondary text-xs">{t("login_subtitle", "Davom etish uchun hisobingizga kiring")}</p>
        </div>

        {errorMsg && (
          <div className="bg-primary/10 border border-primary/20 text-red-400 text-xs rounded-2xl p-4 mb-6 flex items-start space-x-2 animate-shake">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label={t("email_label", "Email, login yoki telefon raqami")}
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder={t("email_placeholder", "gamer_uz, +998901234567 yoki email")}
            leftIcon={<User size={16} />}
            error={errors.email}
          />

          <div className="space-y-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">{t("password_label", "Parol")}</label>
              <Link href="/forgot-password" className="text-[11px] text-primary hover:underline font-bold">
                {t("forgot_password_question", "Parolni unutdingizmi?")}
              </Link>
            </div>
            <Input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              leftIcon={<Lock size={16} />}
              error={errors.password}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full !py-4 text-xs font-display font-black uppercase tracking-widest flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={16} />
                <span>{t("login", "Kirish")}</span>
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-8 text-xs text-secondary">
          {t("no_account", "Hisobingiz yo'qmi?")}{" "}
          <Link href="/register" className="text-primary font-bold hover:underline ml-1">
            {t("register_link", "Ro'yxatdan o'ting")}
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
