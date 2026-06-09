"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Chrome, Send, LogIn, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import { loginSchema } from "@/lib/validations";
import { BackButton } from "../../../components/ui/BackButton";
import Script from "next/script";

const LoginPage = () => {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [formData, setFormData] = useState({
    email: "", // can be email, phone or username
    password: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleGoogleLoginSuccess = async (response: any) => {
    setErrorMsg("");
    setIsLoading(true);
    try {
      const res = await api.post("/users/google-login/", {
        id_token: response.credential,
      });
      const { access, user } = res.data;
      setAuth(user, access);
      router.push("/");
    } catch (err: any) {
      console.error("Google login error:", err);
      setErrorMsg(err.response?.data?.error || "Google orqali kirishda xatolik yuz berdi.");
    } finally {
      setIsLoading(false);
    }
  };

  const initGoogleLogin = () => {
    if (typeof window !== "undefined" && (window as any).google) {
      (window as any).google.accounts.id.initialize({
        client_id: "144019147996-mv63kns1oi2fsec4hsh7if7rp0pdk95g.apps.googleusercontent.com",
        callback: handleGoogleLoginSuccess,
      });

      (window as any).google.accounts.id.renderButton(
        document.getElementById("google-signin-btn"),
        { 
          theme: "outline", 
          size: "large", 
          width: 368,
          text: "signin_with",
          shape: "rectangular"
        }
      );
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).google) {
      initGoogleLogin();
    }
  }, []);


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
      // Send login request. Note that backend uses 'username' field to lookup username/email/phone
      const response = await api.post("/auth/login/", {
        username: formData.email,
        password: formData.password,
      });

      const { access, user } = response.data;
      setAuth(user, access);

      // Redirect to home or user profile
      router.push("/");
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        setErrorMsg("Email/Telefon yoki parol noto'g'ri.");
      } else if (err.response?.data?.detail) {
        setErrorMsg(err.response.data.detail);
      } else {
        setErrorMsg("Kirishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
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
            PLAY<span className="text-primary">NATION</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Xush kelibsiz!</h1>
          <p className="text-secondary text-sm">Davom etish uchun hisobingizga kiring</p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-4 mb-6 flex items-start space-x-2 animate-shake">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary ml-1">Email, Telefon yoki Username</label>
            <input
              type="text"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@mail.com yoki +998XXXXXXXXX"
              className={`w-full bg-white/5 border ${errors.email ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors text-sm text-white`}
            />
            {errors.email && <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-medium text-secondary">Parol</label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Parolni unutdingizmi?
              </Link>
            </div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className={`w-full bg-white/5 border ${errors.password ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors text-sm text-white`}
            />
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
                <span>Kirish</span>
              </>
            )}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-4 text-secondary">Yoki boshqa yo'l bilan</span>
          </div>
        </div>

        <div className="space-y-4">
          <div id="google-signin-btn" className="w-full flex justify-center"></div>
          
          <button className="w-full flex items-center justify-center space-x-2 bg-white/5 border border-white/10 hover:bg-white/10 py-3.5 rounded-xl transition-colors text-white active:scale-95">
            <Send size={18} className="text-[#229ED9]" />
            <span className="text-sm font-medium">Telegram bilan kirish</span>
          </button>
        </div>

        <p className="text-center mt-10 text-sm text-secondary">
          Hisobingiz yo'qmi?{" "}
          <Link href="/register" className="text-primary font-bold hover:underline">
            Ro'yxatdan o'ting
          </Link>
        </p>
      </motion.div>
      <Script 
        src="https://accounts.google.com/gsi/client" 
        onLoad={initGoogleLogin}
        strategy="afterInteractive"
      />
    </div>
  );
};

export default LoginPage;
