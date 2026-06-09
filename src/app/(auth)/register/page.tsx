"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Chrome, Send, ArrowLeft, ArrowRight, UserCheck, Upload, Check, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { registerSchema } from "@/lib/validations";
import { BackButton } from "../../../components/ui/BackButton";

const REGIONS = [
  { value: "TOSHKENT_S", label: "Toshkent shahri" },
  { value: "TOSHKENT_V", label: "Toshkent viloyati" },
  { value: "ANDIJON", label: "Andijon viloyati" },
  { value: "BUXORO", label: "Buxoro viloyati" },
  { value: "FARGONA", label: "Fargʻona viloyati" },
  { value: "JIZZAX", label: "Jizzax viloyati" },
  { value: "NAMANGAN", label: "Namangan viloyati" },
  { value: "NAVOIY", label: "Navoiy viloyati" },
  { value: "QASHQADARYO", label: "Qashqadaryo viloyati" },
  { value: "SAMARQAND", label: "Samarqand viloyati" },
  { value: "SIRDARYO", label: "Sirdaryo viloyati" },
  { value: "SURXONDARYO", label: "Surxondaryo viloyati" },
  { value: "XORAZM", label: "Xorazm viloyati" },
  { value: "QORAQALPOGISTON", label: "Qoraqalpogʻiston Respublikasi" },
];

const ROLES = [
  {
    value: "VIEWER",
    label: "Kuzatuvchi",
    description: "Yangiliklar va forumlarni o'qish, bepul imkoniyatlar",
  },
  {
    value: "GAMER",
    label: "Gamer",
    description: "Turnirlarda ishtirok etish, o'yinlar sotib olish, statistika",
  },
  {
    value: "GAMEDEV",
    label: "GameDev",
    description: "O'yinlar yuklash va sotish, daromad paneli, portfolio",
  },
  {
    value: "INVESTOR",
    label: "Investor",
    description: "Loyiha taqdimotlari, Investor Hub va hamkorlik",
  },
];

const RegisterPage = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    age: "",
    region: "",
    phone_number: "+998",
    email: "",
    role: "GAMER",
    password: "",
    confirmPassword: "",
    avatar: null as File | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!value.startsWith("+998")) {
      value = "+998";
    }
    // Only allow digits after +998
    const prefix = "+998";
    const rest = value.slice(prefix.length).replace(/\D/g, "");
    setFormData((prev) => ({ ...prev, phone_number: prefix + rest.slice(0, 9) }));
  };

  const handleRoleSelect = (roleValue: string) => {
    setFormData((prev) => ({ ...prev, role: roleValue }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, avatar: "Rasm hajmi 2MB dan oshmasligi kerak" }));
        return;
      }
      setFormData((prev) => ({ ...prev, avatar: file }));
      setAvatarPreview(URL.createObjectURL(file));
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.avatar;
        return copy;
      });
    }
  };

  const validateStep1 = () => {
    const step1Data = {
      full_name: formData.full_name,
      age: formData.age === "" ? undefined : Number(formData.age),
      region: formData.region,
      phone_number: formData.phone_number,
    };

    // Pick sub-schema for Step 1 validation
    const step1Schema = registerSchema.pick({
      full_name: true,
      age: true,
      region: true,
      phone_number: true,
    });

    const result = step1Schema.safeParse(step1Data);
    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          formattedErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(formattedErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
    setGlobalError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");

    const dataToValidate = {
      ...formData,
      age: formData.age === "" ? undefined : Number(formData.age),
    };

    const result = registerSchema.safeParse(dataToValidate);
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
      const submitData = new FormData();
      submitData.append("username", formData.username);
      submitData.append("email", formData.email);
      submitData.append("password", formData.password);
      submitData.append("full_name", formData.full_name);
      submitData.append("age", formData.age);
      submitData.append("region", formData.region);
      submitData.append("phone_number", formData.phone_number);
      submitData.append("role", formData.role);
      
      if (formData.avatar) {
        submitData.append("avatar", formData.avatar);
      }

      await api.post("/users/register/", submitData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      console.error(err);
      if (err.response?.data) {
        const apiErrors = err.response.data;
        const formattedErrors: Record<string, string> = {};
        let mainError = "";

        Object.keys(apiErrors).forEach((key) => {
          if (Array.isArray(apiErrors[key])) {
            formattedErrors[key] = apiErrors[key][0];
          } else {
            formattedErrors[key] = apiErrors[key];
          }
        });

        if (apiErrors.non_field_errors) {
          mainError = apiErrors.non_field_errors[0];
        } else if (formattedErrors.username) {
          mainError = `Foydalanuvchi nomi xatosi: ${formattedErrors.username}`;
        } else if (formattedErrors.email) {
          mainError = `Email xatosi: ${formattedErrors.email}`;
        } else {
          mainError = "Ro'yxatdan o'tishda xatolik yuz berdi. Iltimos qayta urinib ko'ring.";
        }

        setErrors(formattedErrors);
        setGlobalError(mainError);
      } else {
        setGlobalError("Server bilan aloqa o'rnatib bo'lmadi. Keyinroq urinib ko'ring.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background relative overflow-hidden">
      <div className="absolute top-8 left-8 z-10">
        <BackButton />
      </div>

      <AnimatePresence mode="wait">
        {isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md glass-card p-10 text-center relative overflow-hidden border-primary/30"
          >
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            
            <div className="w-20 h-20 bg-primary/10 border border-primary/30 text-primary rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
              <Check size={40} className="stroke-[3]" />
            </div>
            
            <h1 className="text-3xl font-black text-white mb-4">Tabriklaymiz!</h1>
            <p className="text-secondary text-sm mb-6 leading-relaxed">
              Ro'yxatdan o'tish muvaffaqiyatli yakunlandi. Elektron pochtangizga tasdiqlash xati yuboriladi.
            </p>
            <div className="text-xs text-primary font-bold animate-pulse">
              Kirish sahifasiga yo'naltirilmoqda...
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl glass-card p-8 md:p-10 my-12"
          >
            <div className="text-center mb-8">
              <Link href="/" className="text-3xl font-black tracking-tighter inline-block mb-4">
                PLAY<span className="text-primary">NATION</span>
              </Link>
              <h1 className="text-2xl font-bold mb-1">Hisob ochish</h1>
              <p className="text-secondary text-sm">Gaming hamjamiyatiga qo'shiling</p>
              
              {/* Step indicator */}
              <div className="flex items-center justify-center space-x-2 mt-6">
                <span className={`w-3 h-3 rounded-full transition-all duration-300 ${step === 1 ? 'bg-primary scale-125' : 'bg-white/20'}`} />
                <span className="w-8 h-px bg-white/10" />
                <span className={`w-3 h-3 rounded-full transition-all duration-300 ${step === 2 ? 'bg-primary scale-125' : 'bg-white/20'}`} />
              </div>
            </div>

            {globalError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-4 mb-6 flex items-start space-x-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{globalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 ? (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="text-sm font-bold text-white mb-2 uppercase tracking-wider text-center md:text-left">
                    1-qadam: Shaxsiy ma'lumotlar
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-secondary ml-1">To'liq ism (Ism, Familiya)</label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="Sherzod Karimov"
                      className={`w-full bg-white/5 border ${errors.full_name ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors text-sm text-white`}
                    />
                    {errors.full_name && <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.full_name}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-secondary ml-1">Yoshingiz</label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleChange}
                        placeholder="18"
                        min="10"
                        max="80"
                        className={`w-full bg-white/5 border ${errors.age ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors text-sm text-white`}
                      />
                      {errors.age && <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.age}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-secondary ml-1">Hududingiz (Viloyat)</label>
                      <select
                        name="region"
                        value={formData.region}
                        onChange={handleChange}
                        className={`w-full bg-[#121214] border ${errors.region ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors text-sm text-white`}
                      >
                        <option value="">Tanlang...</option>
                        {REGIONS.map((reg) => (
                          <option key={reg.value} value={reg.value}>
                            {reg.label}
                          </option>
                        ))}
                      </select>
                      {errors.region && <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.region}</p>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-secondary ml-1">Telefon raqamingiz</label>
                    <input
                      type="text"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handlePhoneChange}
                      placeholder="+998931234567"
                      className={`w-full bg-white/5 border ${errors.phone_number ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors text-sm text-white`}
                    />
                    {errors.phone_number && <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.phone_number}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="btn-primary w-full py-4 text-sm mt-6 flex items-center justify-center space-x-2"
                  >
                    <span>Davom etish</span>
                    <ArrowRight size={16} />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="text-sm font-bold text-white mb-2 uppercase tracking-wider text-center md:text-left flex items-center justify-between">
                    <span>2-qadam: Rol va Xavfsizlik</span>
                    <button
                      type="button"
                      onClick={handleBack}
                      className="text-xs text-primary font-bold hover:underline flex items-center space-x-1"
                    >
                      <ArrowLeft size={12} />
                      <span>Orqaga</span>
                    </button>
                  </div>

                  {/* Role Selection Grid */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-secondary ml-1">Sizning platformadagi toifangiz</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ROLES.map((role) => (
                        <div
                          key={role.value}
                          onClick={() => handleRoleSelect(role.value)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            formData.role === role.value
                              ? "bg-primary/10 border-primary text-white"
                              : "bg-white/5 border-white/5 text-secondary hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-black">{role.label}</span>
                            {formData.role === role.value && (
                              <span className="w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center p-0.5">
                                <Check size={10} className="stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] leading-snug opacity-75">{role.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Profile Avatar Upload */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-secondary ml-1">Profil rasmi (Ixtiyoriy)</label>
                    <div className="flex items-center space-x-4 bg-white/5 border border-white/15 p-4 rounded-2xl">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center relative shrink-0">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Upload size={20} className="text-secondary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-secondary mb-2">JPG, PNG yoki WEBP formatida, maks 2MB</p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/10 transition-colors"
                        >
                          Rasm tanlash
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleAvatarChange}
                          accept="image/png, image/jpeg, image/webp"
                          className="hidden"
                        />
                      </div>
                    </div>
                    {errors.avatar && <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.avatar}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-secondary ml-1">Foydalanuvchi nomi (@username)</label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="gamer_uz"
                        className={`w-full bg-white/5 border ${errors.username ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors text-sm text-white`}
                      />
                      {errors.username && <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.username}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-secondary ml-1">E-pochta</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="gamer@playnation.uz"
                        className={`w-full bg-white/5 border ${errors.email ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors text-sm text-white`}
                      />
                      {errors.email && <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-secondary ml-1">Parol</label>
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

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-secondary ml-1">Parolni tasdiqlash</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className={`w-full bg-white/5 border ${errors.confirmPassword ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors text-sm text-white`}
                      />
                      {errors.confirmPassword && <p className="text-[10px] text-red-400 ml-1 mt-0.5">{errors.confirmPassword}</p>}
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 py-2">
                    <input type="checkbox" className="mt-1 accent-primary shrink-0" id="terms" required />
                    <label htmlFor="terms" className="text-[11px] text-secondary leading-normal">
                      Men <Link href="/terms" className="text-primary hover:underline font-bold">Foydalanish shartlari</Link> va <Link href="/privacy" className="text-primary hover:underline font-bold">Maxfiylik siyosati</Link> bilan tanishdim va roziman.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full py-4 text-sm mt-4 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserCheck size={16} />
                        <span>Ro'yxatdan o'tish</span>
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                <span className="bg-background px-4 text-secondary">Tezkor ro'yxatdan o'tish</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className="flex items-center justify-center space-x-2 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl transition-colors text-white"
              >
                <Chrome size={18} />
                <span className="text-xs font-medium">Google</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center space-x-2 bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl transition-colors text-white"
              >
                <Send size={18} className="text-[#229ED9]" />
                <span className="text-xs font-medium">Telegram</span>
              </button>
            </div>

            <p className="text-center mt-8 text-sm text-secondary">
              Hisobingiz bormi?{" "}
              <Link href="/login" className="text-primary font-bold hover:underline">
                Kirish
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RegisterPage;
