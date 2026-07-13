"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Check, X, Award, Star, Sparkles, Crown, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore, useTranslation } from "@/lib/store";
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
    { name: t("feat_8", "GameDev yopiq video darsliklari"), free: false, premium: true },
    { name: t("feat_3", "Profil uchun oltin 'PRO' nishoni"), free: false, premium: true },
    { name: t("feat_4", "O'yinlar do'konidagi chegirmalar (CD-keys 20% chegirma)"), free: false, premium: true },
    { name: t("feat_5", "2x daraja (XP) va ELO ko'paytirgichi"), free: false, premium: true },
    { name: t("feat_6", "E'lonlar (reklama)siz platforma interfeysi"), free: false, premium: true },
    { name: t("feat_7", "Texnik ko'makda birinchi navbat"), free: false, premium: true },
  ];

  const PREMIUM_FEATURES = FEATURES.filter((f) => f.premium);

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

      {/* Hero */}
      <section className="relative pt-36 pb-16 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[620px] -z-10 bg-[radial-gradient(circle_at_50%_-5%,rgba(255,51,85,0.20),transparent_60%)]" />
        <div className="absolute inset-x-0 top-0 h-[620px] -z-10 bg-[radial-gradient(circle_at_80%_10%,rgba(139,92,246,0.16),transparent_55%)]" />

        <div className="container-app max-w-6xl mx-auto">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="chip mb-6 border-primary/25 bg-primary/10 text-primary">
                <Sparkles size={13} className="animate-pulse-glow" />
                <span className="font-display uppercase tracking-[0.2em] text-[11px]">{t("premium_subtitle", "Maroqli.uz PREMIUM")}</span>
              </span>
              <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight mb-6 leading-[1.05] uppercase">
                {locale === 'ru' ? (
                  <>
                    Безграничные Возможности и <br />
                    <span className="text-gradient">Премиум Гейминг</span>
                  </>
                ) : locale === 'en' ? (
                  <>
                    Unlimited Opportunities & <br />
                    <span className="text-gradient">Premium Gaming Experience</span>
                  </>
                ) : (
                  <>
                    Cheksiz Imkoniyatlar va <br />
                    <span className="text-gradient">Premium Gaming Tajriba</span>
                  </>
                )}
              </h1>
              <p className="text-secondary max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
                {t("premium_desc", "Hamjamiyat turnirlarida birinchilardan bo'ling, maxsus sovrinlarni yutib oling va platformani qo'llab-quvvatlab o'zgacha mavqega ega bo'ling.")}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="container-app max-w-6xl mx-auto pb-24">
        {/* User Active Subscription info */}
        {isAuthenticated && subscription && (
          <div className="mb-12 max-w-3xl mx-auto">
            {subscription.has_active_subscription ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4 text-center md:text-left">
                  <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
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
                className="glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4 text-center md:text-left">
                  <div className="p-3 bg-white/5 text-secondary rounded-2xl">
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
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-20 items-start">
          {PLANS.map((plan, idx) => {
            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className={`relative rounded-3xl bg-card border transition-all duration-300 flex flex-col overflow-hidden group ${
                  plan.popular
                    ? "border-primary/60 md:scale-105 shadow-glow"
                    : "border-white/10 hover:border-white/20 hover:shadow-card-hover"
                }`}
              >
                {plan.popular && (
                  <>
                    <div className="absolute -right-16 -top-16 w-40 h-40 bg-primary/20 blur-3xl rounded-full" />
                    <div className="relative bg-brand-gradient bg-[length:200%_200%] animate-gradient-move text-white text-center text-[11px] font-black py-2 uppercase tracking-[0.2em] flex items-center justify-center gap-1.5">
                      <Crown size={13} className="fill-current" />
                      {t("most_popular", "Eng Ommabop")}
                    </div>
                  </>
                )}

                <div className={`p-7 md:p-8 ${plan.popular ? "" : "pt-8"} flex flex-col flex-1`}>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-5 shadow-lg`}>
                    <Zap size={22} className="text-white" />
                  </div>

                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-xs text-secondary mb-6 leading-relaxed min-h-[3rem]">{plan.desc}</p>

                  <div className="mb-6">
                    <div className="flex items-end gap-2">
                      <span className="font-display text-4xl font-black tracking-tight tabular-nums">{plan.price}</span>
                      <span className="text-secondary text-sm mb-1">/ {plan.period}</span>
                    </div>
                    {plan.oldPrice && (
                      <div className="text-sm text-primary/80 line-through mt-1 font-semibold">{plan.oldPrice}</div>
                    )}
                  </div>

                  {/* Feature checklist */}
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {PREMIUM_FEATURES.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-secondary">
                        <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${plan.popular ? "bg-primary/20 text-primary" : "bg-white/5 text-white/70"}`}>
                          <Check size={11} className="stroke-[3]" />
                        </span>
                        <span className="leading-snug">{feat.name}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handlePurchaseClick(plan.key)}
                    className={`w-full text-center text-sm ${
                      plan.popular
                        ? "btn-gradient !py-4"
                        : "btn-outline !py-4"
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
          <h2 className="font-display text-2xl md:text-3xl font-black text-center mb-10 uppercase tracking-tight">{t("features_compare", "Rejalar Solishtiruvi")}</h2>
          <div className="glass-card overflow-hidden">
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
                      <X size={18} className="text-white/25" />
                    )}
                  </div>
                  <div className="col-span-3 md:col-span-2 flex justify-center">
                    {feat.premium ? (
                      <span className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center">
                        <Check size={15} className="text-primary stroke-[3]" />
                      </span>
                    ) : (
                      <X size={18} className="text-white/25" />
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
              className="glass-card relative w-full max-w-md p-8 overflow-hidden shadow-2xl text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-4">
                <Crown size={26} className="fill-current" />
              </div>
              <h3 className="font-display text-2xl font-black mb-4">{t("payment", "To'lov")}</h3>
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
