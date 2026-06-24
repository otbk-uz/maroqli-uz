"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Check, X, Award, Star, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore, useTranslation } from "@/lib/store";
import api from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface SubscriptionDetails {
  has_active_subscription: boolean;
  plan_name: string;
  is_active: boolean;
  expires_at: string | null;
}

export default function PremiumPage() {
  const router = useRouter();
  const { isAuthenticated, user, setAuth } = useAuthStore();
  const { t, locale } = useTranslation();
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const PLANS = [
    {
      key: "monthly",
      name: t("monthly_plan", "1 Oylik Premium"),
      price: "29 000 UZS",
      period: locale === "ru" ? "месяц" : locale === "en" ? "month" : "oy",
      desc: t("monthly_desc", "Gaming dunyosiga ilk qadam va platforma yordami."),
      popular: false,
      color: "from-blue-500 to-indigo-600",
    },
    {
      key: "quarterly",
      name: t("quarterly_plan", "3 Oylik Premium"),
      price: "79 000 UZS",
      period: locale === "ru" ? "3 месяца" : locale === "en" ? "3 months" : "3 oy",
      desc: t("quarterly_desc", "Eng ommabop va foydali variant. Cheklovsiz turnirlar va bonuslar."),
      popular: true,
      color: "from-primary to-pink-600",
    },
    {
      key: "yearly",
      name: t("yearly_plan", "1 Yillik Premium"),
      price: "149 000 UZS",
      oldPrice: "348 000 UZS",
      period: locale === "ru" ? "год" : locale === "en" ? "year" : "yil",
      desc: t("yearly_desc", "Haqiqiy professional geymerlar va kollektorlar uchun yillik to'liq paket."),
      popular: false,
      color: "from-amber-400 to-orange-600",
    },
  ];

  const FEATURES = [
    { name: t("feat_1", "Asosiy turnirlarga kirish"), free: true, premium: true },
    { name: t("feat_2", "Maxsus premium-only turnirlar"), free: false, premium: true },
    { name: t("feat_3", "Profil uchun oltin 'PRO' nishoni"), free: false, premium: true },
    { name: t("feat_4", "O'yinlar do'konidagi chegirmalar (CD-keys)"), free: false, premium: true },
    { name: t("feat_5", "2x daraja (XP) va ELO ko'paytirgichi"), free: false, premium: true },
    { name: t("feat_6", "E'lonlar (reklama)siz platforma interfeysi"), free: false, premium: true },
    { name: t("feat_7", "Texnik ko'makda birinchi navbat"), free: false, premium: true },
  ];

  useEffect(() => {
    if (isAuthenticated) {
      fetchSubscription();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchSubscription = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Fetch directly from Supabase to sync with Admin Panel overrides
      const { data, error } = await supabase
        .from('profiles')
        .select('is_premium, premium_expires_at')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      
      setSubscription({
        has_active_subscription: data.is_premium || false,
        plan_name: data.is_premium ? "Premium (Faol)" : "Free Plan",
        is_active: data.is_premium || false,
        expires_at: data.premium_expires_at || null
      });
      
      // Update local storage user premium status if changed
      if (data.is_premium !== user.is_premium) {
        setAuth({
          ...user,
          is_premium: data.is_premium || false
        }, useAuthStore.getState().token || "");
      }
    } catch (err) {
      console.error("Obunani yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseClick = (planKey: string) => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/premium");
      return;
    }
    setSelectedPlan(planKey);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />

      <div className="pt-32 pb-20 container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/20 blur-[120px] rounded-full -z-10" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full inline-flex items-center gap-1.5 mb-4">
              <Sparkles size={12} className="animate-spin" /> {t("premium_subtitle", "PLAYNATIONUZ PREMIUM")}
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              {locale === 'ru' ? (
                <>
                  Безграничные Возможности и <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-pink-500 to-amber-400">
                    Премиум Гейминг
                  </span>
                </>
              ) : locale === 'en' ? (
                <>
                  Unlimited Opportunities & <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-pink-500 to-amber-400">
                    Premium Gaming Experience
                  </span>
                </>
              ) : (
                <>
                  Cheksiz Imkoniyatlar va <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-pink-500 to-amber-400">
                    Premium Gaming Tajriba
                  </span>
                </>
              )}
            </h1>
            <p className="text-secondary max-w-2xl mx-auto text-base md:text-lg">
              {t("premium_desc", "Hamjamiyat turnirlarida birinchilardan bo'ling, maxsus sovrinlarni yutib oling va platformani qo'llab-quvvatlab o'zgacha mavqega ega bo'ling.")}
            </p>
          </motion.div>
        </div>

        {/* User Active Subscription info */}
        {isAuthenticated && subscription && (
          <div className="mb-12 max-w-3xl mx-auto">
            {subscription.has_active_subscription ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4 text-center md:text-left">
                  <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                    <Award size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-emerald-400">{t("sub_active", "Premium Obuna Faol!")}</h3>
                    <p className="text-sm text-secondary">
                      {t("plan_active", "Faol reja")}: <span className="font-semibold text-white">{subscription.plan_name}</span>
                    </p>
                    {subscription.expires_at && (
                      <p className="text-xs text-secondary/70 mt-1">
                        {t("expires_at", "Tugash muddati")}: {new Date(subscription.expires_at).toLocaleDateString(
                          locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          }
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-4 py-2 rounded-lg uppercase tracking-wider">
                  {t("active_status", "Faol Mavqei")}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl bg-card border border-white/5 p-6 flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4 text-center md:text-left">
                  <div className="p-3 bg-white/5 text-secondary rounded-xl">
                    <Star size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{t("free_plan_active", "Sizda hozircha Free reja faol")}</h3>
                    <p className="text-sm text-secondary">{t("select_plan_desc", "Premium imkoniyatlardan foydalanish uchun quyidagi rejalardan birini tanlang.")}</p>
                  </div>
                </div>
                <div className="text-xs text-secondary/60">{t("no_subscription", "Obuna yo'q")}</div>
              </motion.div>
            )}
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {PLANS.map((plan, idx) => {
            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className={`relative rounded-3xl bg-card border transition-all duration-300 flex flex-col justify-between overflow-hidden group ${
                  plan.popular ? "border-primary scale-100 md:scale-105 shadow-lg shadow-primary/10" : "border-white/5 hover:border-white/10"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 left-0 bg-primary text-black text-center text-xs font-bold py-1.5 uppercase tracking-widest font-mono">
                    {t("most_popular", "Eng Ommabop")}
                  </div>
                )}
                
                <div className={`p-8 ${plan.popular ? "pt-12" : ""}`}>
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-xs text-secondary mb-6 h-12 leading-relaxed">{plan.desc}</p>
                  
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                    <span className="text-secondary text-sm ml-2">/ {plan.period}</span>
                    {plan.oldPrice && (
                      <div className="text-sm text-red-400 line-through mt-1 font-semibold">{plan.oldPrice}</div>
                    )}
                  </div>
                </div>

                <div className="px-8 pb-8 pt-0 mt-auto">
                  <button
                    onClick={() => handlePurchaseClick(plan.key)}
                    className={`w-full py-4 rounded-xl font-bold text-center transition-all ${
                      plan.popular
                        ? "bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20 hover:shadow-primary/30"
                        : "bg-white/5 hover:bg-white/10 text-white"
                    }`}
                  >
                    {t("subscribe", "Obuna bo'lish")}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Features Table */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">{t("features_compare", "Rejalar Solishtiruvi")}</h2>
          <div className="rounded-2xl border border-white/5 overflow-hidden bg-card backdrop-blur-md">
            <div className="grid grid-cols-12 bg-white/5 border-b border-white/5 p-4 font-bold text-sm tracking-wider uppercase text-secondary">
              <div className="col-span-6 md:col-span-8">{t("features_label", "Imkoniyatlar")}</div>
              <div className="col-span-3 md:col-span-2 text-center">Free</div>
              <div className="col-span-3 md:col-span-2 text-center text-primary">Premium</div>
            </div>
            
            <div className="divide-y divide-white/5">
              {FEATURES.map((feat, idx) => (
                <div key={idx} className="grid grid-cols-12 p-4 text-sm items-center hover:bg-white/[0.02] transition-colors">
                  <div className="col-span-6 md:col-span-8 font-medium">{feat.name}</div>
                  <div className="col-span-3 md:col-span-2 flex justify-center">
                    {feat.free ? (
                      <Check size={18} className="text-emerald-500" />
                    ) : (
                      <X size={18} className="text-red-500/60" />
                    )}
                  </div>
                  <div className="col-span-3 md:col-span-2 flex justify-center">
                    {feat.premium ? (
                      <Check size={18} className="text-primary font-bold" />
                    ) : (
                      <X size={18} className="text-red-500/60" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Payment Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card border border-white/10 rounded-3xl p-8 overflow-hidden shadow-2xl text-center"
            >
              <h3 className="text-2xl font-bold mb-4">{t("payment", "To'lov")}</h3>
              <p className="text-sm text-secondary mb-6 leading-relaxed">
                {t("telegram_payment_desc", "Premium obunani xarid qilish uchun to'lovni amalga oshiring va to'lov chekini bizning Telegram administratorimizga yuboring.")}
              </p>

              <div className="flex flex-col gap-4">
                {(() => {
                  const plan = PLANS.find(p => p.key === selectedPlan);
                  const planName = plan ? plan.name : selectedPlan;
                  const messageText = `Salom, men Premium obuna sotib olmoqchiman.

Ma'lumotlarim:
- Nickname: ${user?.nickname || user?.username || "Noma'lum"}
- Email: ${user?.email || "Noma'lum"}
- ID: ${user?.id || "Noma'lum"}

Tanlangan reja: ${planName}

To'lov chekini quyida yuboraman:`;
                  
                  const telegramUrl = `https://t.me/izi_uzb?text=${encodeURIComponent(messageText)}`;

                  return (
                    <a
                      href={telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-4 rounded-xl border border-[#0088cc]/50 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 transition-all font-semibold text-[#0088cc]"
                    >
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.11.03-1.84 1.18-5.21 3.45-.49.34-.94.5-1.35.49-.45-.01-1.32-.26-1.96-.46-.79-.26-1.42-.4-1.36-.84.03-.23.35-.47.96-.73 3.78-1.64 6.3-2.73 7.55-3.25 3.59-1.49 4.33-1.75 4.81-1.76.11 0 .35.03.48.14.11.09.14.22.15.34-.01.07-.01.18-.03.26z"/>
                      </svg>
                      @izi_uzb ga o'tish
                    </a>
                  );
                })()}
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-secondary font-medium transition-all"
              >
                {t("close", "Yopish")}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
