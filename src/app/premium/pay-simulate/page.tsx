"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, CreditCard, ArrowLeft, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";

interface TransactionDetails {
  id: number;
  amount: number;
  provider: string;
  status: string;
  description: string;
}

function PaySimulateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transactionId = searchParams.get("transaction_id");
  const providerParam = searchParams.get("provider");
  
  const { user, token, setAuth } = useAuthStore();
  
  const [tx, setTx] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"card" | "sms" | "success" | "error">("card");
  
  // Form fields
  const [cardNumber, setCardNumber] = useState("8600 1234 5678 9010");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [smsCode, setSmsCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (transactionId) {
      fetchTransactionDetails();
    } else {
      setLoading(false);
      setErrorMessage("Tranzaksiya topilmadi.");
      setStep("error");
    }
  }, [transactionId]);

  const fetchTransactionDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/payments/transactions/${transactionId}/`);
      setTx(res.data);
      if (res.data.status === "COMPLETED") {
        setStep("success");
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || "Tranzaksiya ma'lumotlarini yuklashda xatolik yuz berdi.");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, "").length < 16) {
      alert("Karta raqami noto'g'ri kiritildi.");
      return;
    }
    setStep("sms");
  };

  const handleSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsCode || smsCode.length < 4) {
      alert("SMS kodni to'liq kiriting.");
      return;
    }

    setProcessing(true);
    setErrorMessage("");

    try {
      if (!tx) return;

      const mockExternalId = `mock-${providerParam}-${Date.now()}`;

      if (providerParam === "payme") {
        const amountTiyins = Math.round(tx.amount * 100);
        
        // Step 1: CheckPerformTransaction
        const checkRes = await api.post("/payments/callback/payme/", {
          method: "CheckPerformTransaction",
          params: {
            amount: amountTiyins,
            account: {
              transaction_id: tx.id
            }
          },
          id: 1
        });

        if (checkRes.data.error) {
          throw new Error(checkRes.data.error.message?.uz || "Payme tekshiruvda rad etdi.");
        }

        // Step 2: CreateTransaction
        const createRes = await api.post("/payments/callback/payme/", {
          method: "CreateTransaction",
          params: {
            id: mockExternalId,
            amount: amountTiyins,
            account: {
              transaction_id: tx.id
            }
          },
          id: 2
        });

        if (createRes.data.error) {
          throw new Error(createRes.data.error.message?.uz || "Payme tranzaksiya ochishda xatolik.");
        }

        // Step 3: PerformTransaction
        const performRes = await api.post("/payments/callback/payme/", {
          method: "PerformTransaction",
          params: {
            id: mockExternalId
          },
          id: 3
        });

        if (performRes.data.error) {
          throw new Error(performRes.data.error.message?.uz || "Payme to'lovni bajarishda xatolik.");
        }

      } else if (providerParam === "click") {
        // Step 1: Prepare action=0
        const prepareRes = await api.post("/payments/callback/click/", {
          click_trans_id: mockExternalId,
          merchant_trans_id: tx.id,
          amount: tx.amount.toFixed(2),
          action: 0,
          error: 0
        });

        if (prepareRes.data.error !== 0) {
          throw new Error(prepareRes.data.error_note || "Click tayyorgarlikda xatolik.");
        }

        // Step 2: Complete action=1
        const completeRes = await api.post("/payments/callback/click/", {
          click_trans_id: mockExternalId,
          merchant_trans_id: tx.id,
          amount: tx.amount.toFixed(2),
          action: 1,
          error: 0
        });

        if (completeRes.data.error !== 0) {
          throw new Error(completeRes.data.error_note || "Click to'lov yakunlashda xatolik.");
        }
      }

      // Refresh user auth details (so PRO status updates on Navbar immediately)
      const profileRes = await api.get("/users/profile/");
      if (user && token) {
        setAuth({
          ...user,
          is_premium: profileRes.data.is_premium
        }, token);
      }

      setStep("success");
    } catch (err: any) {
      setErrorMessage(err.message || "To'lovni amalga oshirishda xatolik yuz berdi. Iltimos qaytadan urining.");
      setStep("sms");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d0d0f] text-white">
        <Loader2 className="animate-spin text-primary mb-4" size={40} />
        <p className="text-secondary text-sm">To'lov ma'lumotlari yuklanmoqda...</p>
      </div>
    );
  }

  const isPayme = providerParam === "payme";
  const themeColor = isPayme ? "from-[#00c9c9] to-[#00aeae]" : "from-[#00a5ff] to-[#008be5]";
  const brandName = isPayme ? "Payme" : "Click";

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4 text-white font-sans">
      <div className="w-full max-w-md bg-[#16161a] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
        
        {/* Header Indicator */}
        <div className={`h-2 bg-gradient-to-r ${themeColor}`} />

        {/* Card Entry Screen */}
        {step === "card" && tx && (
          <div className="p-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-xs text-secondary hover:text-white mb-6 transition-all"
            >
              <ArrowLeft size={14} /> Orqaga
            </button>

            <div className="text-center mb-6">
              <span className="text-xs opacity-50 uppercase tracking-widest">Simulyatsiya to'lovi</span>
              <h2 className="text-2xl font-bold mt-1 flex items-center justify-center gap-2">
                {brandName} Checkout
              </h2>
              <div className="mt-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 inline-block w-full">
                <p className="text-xs text-secondary">To'lov miqdori:</p>
                <p className="text-2xl font-extrabold tracking-tight mt-1 text-white">{tx.amount.toLocaleString()} UZS</p>
                <p className="text-[11px] text-secondary/60 mt-1">{tx.description}</p>
              </div>
            </div>

            <form onSubmit={handleCardSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Karta raqami (Simulyatsiya)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary">
                    <CreditCard size={18} />
                  </span>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    required
                    className="w-full bg-[#1e1e24] border border-white/5 focus:border-white/20 rounded-xl py-3 pl-12 pr-4 text-sm font-semibold tracking-widest focus:outline-none"
                    placeholder="8600 0000 0000 0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1">Muddati</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    required
                    className="w-full bg-[#1e1e24] border border-white/5 focus:border-white/20 rounded-xl py-3 px-4 text-sm font-semibold tracking-wider focus:outline-none text-center"
                    placeholder="MM/YY"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1">Karta PIN kodi</label>
                  <input
                    type="password"
                    defaultValue="1234"
                    required
                    className="w-full bg-[#1e1e24] border border-white/5 focus:border-white/20 rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none text-center"
                    placeholder="****"
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-4 mt-6 bg-gradient-to-r ${themeColor} text-white font-bold rounded-xl text-center shadow-lg transition-all hover:brightness-110`}
              >
                Karta ma'lumotlarini yuborish
              </button>
            </form>
          </div>
        )}

        {/* SMS code Verification Screen */}
        {step === "sms" && tx && (
          <div className="p-8">
            <button
              onClick={() => setStep("card")}
              className="flex items-center gap-2 text-xs text-secondary hover:text-white mb-6 transition-all"
            >
              <ArrowLeft size={14} /> Kartaga qaytish
            </button>

            <div className="text-center mb-8">
              <span className="text-xs text-primary uppercase tracking-widest font-semibold">Tasdiqlash kodi</span>
              <h2 className="text-2xl font-bold mt-1">SMS Kodni Kiriting</h2>
              <p className="text-xs text-secondary mt-2">
                Simulyatsiya to'lovi uchun ixtiyoriy 4 xonali son kiriting (Masalan: 7777).
              </p>
            </div>

            <form onSubmit={handleSmsSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={4}
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  placeholder="SMS KOD"
                  required
                  autoFocus
                  className="w-full bg-[#1e1e24] border border-white/5 focus:border-white/20 rounded-xl py-4 text-center text-xl font-extrabold tracking-widest focus:outline-none"
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-red-400 text-center font-medium bg-red-400/5 p-3 rounded-lg border border-red-400/10">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={processing}
                className={`w-full py-4 mt-4 bg-gradient-to-r ${themeColor} text-white font-bold rounded-xl text-center shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110`}
              >
                {processing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Tranzaksiya bajarilmoqda...
                  </>
                ) : (
                  <>To'lovni Tasdiqlash</>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Success screen */}
        {step === "success" && (
          <div className="p-8 text-center flex flex-col items-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 mt-4"
            >
              <CheckCircle2 size={44} />
            </motion.div>

            <h2 className="text-2xl font-bold text-white mb-2">To'lov Muvaffaqiyatli!</h2>
            <p className="text-sm text-secondary mb-6 leading-relaxed">
              Tranzaksiya bajarildi va sizning PlayNation Premium obunangiz faollashtirildi. Ekotizimimizni qo'llab-quvvatlaganingiz uchun tashakkur!
            </p>

            <div className="w-full p-4 bg-white/[0.02] border border-white/5 rounded-2xl mb-8 flex items-center justify-between text-left">
              <div>
                <p className="text-[10px] text-secondary uppercase font-semibold">Obuna holati</p>
                <p className="text-sm font-bold mt-0.5 text-emerald-400 flex items-center gap-1.5">
                  <Sparkles size={14} className="animate-pulse" /> PREMIUM (FAOL)
                </p>
              </div>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase">
                To'landi
              </span>
            </div>

            <button
              onClick={() => router.push("/premium")}
              className="w-full py-4 bg-primary text-white font-bold rounded-xl text-center shadow-lg transition-all hover:bg-primary-hover flex items-center justify-center gap-2"
            >
              Platformaga Qaytish
            </button>
          </div>
        )}

        {/* Error Screen */}
        {step === "error" && (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-6">
              <span className="text-2xl font-bold">!</span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">To'lovda Xatolik</h2>
            <p className="text-sm text-secondary mb-8">
              {errorMessage || "Noma'lum xatolik yuz berdi. Tranzaksiya bekor qilingan yoki mavjud emas."}
            </p>

            <button
              onClick={() => router.push("/premium")}
              className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-center transition-all"
            >
              Premium sahifasiga qaytish
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}

export default function PaySimulatePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d0d0f] text-white">
        <Loader2 className="animate-spin text-primary mb-4" size={40} />
        <p className="text-secondary text-sm">To'lov sahifasi yuklanmoqda...</p>
      </div>
    }>
      <PaySimulateContent />
    </Suspense>
  );
}
