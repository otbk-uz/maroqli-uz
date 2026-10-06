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

  const GOOGLE_CLIENT_ID = "144019147996-ma6ieepnipthcqsr7veq83oecgp147bt.apps.googleusercontent.com";

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      if (typeof window !== "undefined" && (window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: any) => {
            try {
              const res = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential: response.credential }),
              });
              const data = await res.json();
              if (!res.ok || !data.success) throw new Error(data.error || "Google orqali kirishda xatolik.");
              setAuth(data.user, data.token);
              router.push("/");
            } catch (err: any) {
              console.error("Google Auth error:", err);
              setErrorMsg(err.message || "Google orqali kirishda xatolik yuz berdi.");
            } finally {
              setIsLoading(false);
            }
          },
        });
        (window as any).google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Fallback for popup blocking or prompt skip: fallback to standard OAuth if needed
            supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: `${window.location.origin}/auth/callback` }
            }).catch(() => {});
          }
        });
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      setErrorMsg(err.message || t("google_login_error", "Google orqali kirishda xatolik yuz berdi."));
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

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#121214] px-3 text-secondary">{t("or", "Yoki")}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-3 transition-colors hover:border-white/20 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>{t("google_login", "Google orqali kirish")}</span>
        </button>



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
