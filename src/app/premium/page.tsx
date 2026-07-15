"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Check, X, Award, Star, Sparkles, Crown, Zap, Upload, FileText, Clock } from "lucide-react";
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
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<any>(null);

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
      // Fetch latest premium payment request
      const { data: reqData } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_type', 'PREMIUM')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reqData) {
        setPaymentRequest(reqData);
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

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile || !user || !selectedPlan) return;

    setSubmittingPayment(true);
    try {
      const plan = PLANS.find(p => p.key === selectedPlan);
      if (!plan) throw new Error("Plan not found");

      const amountVal = parseFloat(plan.price.replace(/[^\d]/g, ''));

      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_receipt.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      // 1. Insert locally
      const { data: requestData, error: insertError } = await supabase
        .from('payment_requests')
        .insert({
          user_id: user.id,
          item_type: 'PREMIUM',
          item_id: null,
          amount: amountVal,
          receipt_url: publicUrl,
          status: 'PENDING'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Notify Telegram via API
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/payments/submit-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || useAuthStore.getState().token || ''}`,
        },
        body: JSON.stringify({
          requestId: requestData.id,
          itemType: 'PREMIUM',
          itemId: null,
          amount: amountVal,
          receiptUrl: publicUrl,
          itemName: plan.name,
          username: user.username || user.email?.split('@')[0] || 'username'
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "To'lov arizasini yuborishda xatolik yuz berdi.");
      }

      alert("To'lov cheki yuborildi! Admin tasdiqlashi bilan Premium obuna faollashadi.");
      setShowModal(false);
      setReceiptFile(null);

      setPaymentRequest({
        id: resData.requestId,
        status: 'PENDING',
        receipt_url: publicUrl,
        amount: amountVal
      });
    } catch (err: any) {
      console.error("Receipt submission error:", err);
      alert(err.message || "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    } finally {
      setSubmittingPayment(false);
    }
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
            ) : paymentRequest?.status === 'PENDING' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden rounded-3xl bg-amber-500/10 border border-amber-500/30 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4 text-center md:text-left">
                  <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
                    <Clock size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-amber-400">To'lov tekshirilmoqda</h3>
                    <p className="text-sm text-secondary">
                      Siz yuborgan to'lov cheki admin tomonidan tasdiqlanish jarayonida. Tasdiqlangach, Premium obuna avtomatik faollashadi.
                    </p>
                  </div>
                </div>
                <div className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold px-4 py-2 rounded-lg uppercase tracking-wider">
                  Kutish jarayonida
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
              className="glass-card relative w-full max-w-md p-8 overflow-hidden shadow-2xl"
            >
              <button
                onClick={() => {
                  setShowModal(false);
                  setReceiptFile(null);
                }}
                className="absolute top-4 right-4 text-secondary hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all"
              >
                <X size={18} />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-4">
                <Crown size={26} className="fill-current" />
              </div>
              <h3 className="font-display text-xl font-black mb-4 text-center">Premium Obuna To'lovi</h3>
              
              <form onSubmit={handleSubmitReceipt} className="space-y-4 text-left">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
                  <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">Karta raqami (P2P)</p>
                  <div className="flex items-center justify-between bg-black/40 px-3 py-2.5 rounded-xl border border-white/5">
                    <div>
                      <code className="text-sm text-white font-mono select-all tracking-wider">9860 0101 3799 2664</code>
                      <p className="text-[8px] text-secondary mt-0.5 uppercase font-bold">Zokirjonov Isfandiyor</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("9860010137992664");
                        alert("Karta raqami nusxalandi!");
                      }}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      Nusxalash
                    </button>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-secondary">To'lov summasi:</span>
                    <span className="font-black text-amber-400 text-sm">
                      {PLANS.find(p => p.key === selectedPlan)?.price}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-secondary leading-relaxed bg-primary/5 border border-primary/10 p-3 rounded-xl">
                  Har qanday to'lov ilovasi (Click, Payme, Uzum) orqali yuqoridagi kartaga to'lovni amalga oshiring va <span className="font-bold text-white">chek skrinshotini</span> pastda yuklang.
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary block">To'lov Cheki (Skrinshot)</label>
                  <div className="relative border border-dashed border-white/10 hover:border-primary/50 transition-colors rounded-2xl p-5 text-center cursor-pointer bg-black/20">
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setReceiptFile(e.target.files[0]);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {receiptFile ? (
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <FileText size={20} className="text-primary" />
                        <p className="text-xs font-bold text-white truncate max-w-xs">{receiptFile.name}</p>
                        <p className="text-[9px] text-secondary">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-1 text-secondary">
                        <Upload size={20} className="mx-auto" />
                        <p className="text-xs font-bold">Chek rasmini yuklash</p>
                        <p className="text-[9px] text-secondary/60">PNG, JPG (maks 5MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setReceiptFile(null);
                    }}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/5"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="flex-1 btn-primary py-3 text-xs font-bold flex items-center justify-center space-x-2"
                  >
                    {submittingPayment ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Chekni yuborish</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
