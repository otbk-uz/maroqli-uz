"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Chrome, Send, LogIn, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuthStore, useTranslation } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { loginSchema } from "@/lib/validations";
import { BackButton } from "../../../components/ui/BackButton";
import Script from "next/script";

const LoginPage = () => {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    email: "", // can be email, phone or username
    password: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);



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
      // Supabase orqali kirish
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email, // email kiritilishi shart
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user && authData.session) {
        // User profilini olish
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError) {
          console.warn("Profil topilmadi:", profileError);
        }

        // Store'ga saqlash
        setAuth({
          id: authData.user.id,
          nickname: profile?.username || "Foydalanuvchi",
          full_name: profile?.full_name || "",
          email: authData.user.email,
          role: profile?.role || "GAMER",
          avatar: profile?.avatar_url,
          is_premium: profile?.is_premium || false
        }, authData.session.access_token);

        router.push("/");
      }
    } catch (err: any) {
      console.error(err);
      if (err.message.includes("Invalid login credentials")) {
        setErrorMsg(t("invalid_credentials", "Email yoki parol noto'g'ri."));
      } else {
        setErrorMsg(err.message || t("login_error_generic", "Kirishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring."));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background relative">
      <div className="absolute top-8 left-8">
        <BackButton />
      </div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass-card p-8 md:p-10"
      >
        <div className="text-center mb-10">
          <Link href="/" className="text-3xl font-black tracking-tighter inline-block mb-6">
            MAR<span className="text-primary">OQLI</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">{t("welcome_back", "Xush kelibsiz!")}</h1>
          <p className="text-secondary text-sm">{t("login_subtitle", "Davom etish uchun hisobingizga kiring")}</p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-4 mb-6 flex items-start space-x-2 animate-shake">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary ml-1">{t("email_label", "Email manzilingiz")}</label>
            <input
              type="text"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t("email_placeholder", "Emailingizni kiriting")}
              className={`w-full bg-white/5 border ${errors.email ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors text-sm text-white`}
            />
            {errors.email && <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-medium text-secondary">{t("password_label", "Parol")}</label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                {t("forgot_password_question", "Parolni unutdingizmi?")}
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full bg-white/5 border ${errors.password ? 'border-red-500/50' : 'border-white/10'} rounded-xl pl-4 pr-12 py-3 outline-none focus:border-primary/50 transition-colors text-sm text-white`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.password}</p>}
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
                <LogIn size={16} />
                <span>{t("login", "Kirish")}</span>
              </>
            )}
          </button>
        </form>



        <p className="text-center mt-10 text-sm text-secondary">
          {t("no_account", "Hisobingiz yo'qmi?")}{" "}
          <Link href="/register" className="text-primary font-bold hover:underline">
            {t("register_link", "Ro'yxatdan o'ting")}
          </Link>
        </p>
      </motion.div>

    </div>
  );
};

export default LoginPage;
