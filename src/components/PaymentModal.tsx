"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldClose, CreditCard, Copy, Check, Upload, Zap, ExternalLink, ShieldCheck, Gamepad2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import Link from "next/link";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'GAME' | 'PREMIUM';
  itemId?: string | number;
  itemName: string;
  itemPrice: number;
  onSuccess?: (cdKey?: string) => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  itemType,
  itemId,
  itemName,
  itemPrice,
  onSuccess
}: PaymentModalProps) {
  const { user } = useAuthStore();
  const [paymentTab, setPaymentTab] = useState<'WLCM' | 'MANUAL'>('WLCM');
  const [wlcmLoading, setWlcmLoading] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [approvedCdKey, setApprovedCdKey] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<'APPROVED' | 'PENDING' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cardNumber = "5614688706762274";
  const cardHolder = "Isfandiyor Zokirjonov";

  const handleWlcmPayment = async () => {
    if (!user) {
      alert("Iltimos, avval tizimga kiring.");
      return;
    }
    setWlcmLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/payments/wlcm/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          itemType,
          itemId: itemId ? String(itemId) : null,
          amount: itemPrice,
          itemName: itemName,
          returnUrl: typeof window !== 'undefined' ? window.location.href : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "WLCM to'lov shlyuziga ulanishda xatolik.");
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("To'lov havolasi olinmadi.");
      }
    } catch (err: any) {
      console.error("WLCM payment error:", err);
      setErrorMessage(err.message || "Onlayn to'lov tizimida vaqtincha xatolik. Karta orqali to'lov tabidan foydalanishingiz mumkin.");
    } finally {
      setWlcmLoading(false);
    }
  };

  const handleCopyCard = () => {
    navigator.clipboard.writeText(cardNumber);
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Iltimos, avval tizimga kiring.");
      return;
    }
    if (!receiptFile && !receiptPreview) {
      setErrorMessage("Iltimos, to'lov cheki skrinshotini yuklang!");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      let receiptUrl = receiptPreview;

      if (receiptFile) {
        try {
          const fileExt = receiptFile.name.split('.').pop();
          const fileName = `receipt_${user.id}_${Date.now()}.${fileExt}`;
          const { data, error } = await supabase.storage
            .from('receipts')
            .upload(fileName, receiptFile);

          if (!error && data) {
            const { data: pubData } = supabase.storage
              .from('receipts')
              .getPublicUrl(fileName);
            receiptUrl = pubData.publicUrl;
          }
        } catch (sErr) {
          console.warn("Supabase storage upload fallback to data URL:", sErr);
        }
      }

      const res = await fetch('/api/payments/submit-request', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        },
        body: JSON.stringify({
          itemType,
          itemId: itemId ? String(itemId) : null,
          amount: itemPrice,
          receiptUrl: receiptUrl,
          itemName: itemName,
          username: user.username
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "To'lov so'rovini yuborishda xatolik yuz berdi.");
      }

      if (data.status === 'APPROVED') {
        setSuccessStatus('APPROVED');
        setApprovedCdKey(data.cdKey || null);
        if (onSuccess) onSuccess(data.cdKey);
      } else {
        setSuccessStatus('PENDING');
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "To'lov chekini yuklashda xatolik yuz berdi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-card border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto custom-scrollbar"
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-6 pb-4 border-b border-white/10">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md">
                ⚡ Hozirgi To'lov Tizimi
              </span>
              <h3 className="text-xl md:text-2xl font-black text-white mt-2 flex items-center gap-2">
                <CreditCard className="text-emerald-400 shrink-0" size={24} />
                <span>{itemType === 'GAME' ? "O'yinni Xarid Qilish" : "Premium Obunani Xarid Qilish"}</span>
              </h3>
              <p className="text-xs text-secondary mt-1 font-semibold">{itemName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-secondary hover:text-white transition-colors"
            >
              <ShieldClose size={20} />
            </button>
          </div>

          {/* Success Screens */}
          {successStatus === 'APPROVED' ? (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_24px_rgba(16,185,129,0.3)]">
                <Zap size={36} className="fill-emerald-400" />
              </div>
              <div>
                <h4 className="text-2xl font-black text-white mb-2">🎉 TABRIKLAYMIZ!</h4>
                <p className="text-xs text-emerald-400 font-extrabold uppercase tracking-wider">
                  To'lovingiz Avtomatik Tasdiqlandi va O'yin Ochildi!
                </p>
              </div>

              {approvedCdKey && (
                <div className="bg-black/60 border border-amber-500/30 p-5 rounded-2xl space-y-2 max-w-md mx-auto">
                  <p className="text-[10px] text-amber-400 uppercase font-black tracking-widest">Sizning CD-Keyingiz (O'yin kaliti)</p>
                  <code className="text-base md:text-lg text-amber-300 font-mono font-bold tracking-wider select-all block bg-black/80 py-2 rounded-lg border border-white/10">
                    {approvedCdKey}
                  </code>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Link
                  href="/profile/library"
                  onClick={onClose}
                  className="flex-1 btn-primary py-3.5 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Gamepad2 size={16} />
                  <span>Kutubxonaga o'tish</span>
                </Link>
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Yopish
                </button>
              </div>
            </div>
          ) : successStatus === 'PENDING' ? (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
                <ShieldCheck size={36} />
              </div>
              <div>
                <h4 className="text-xl font-black text-white mb-2">To'lov Cheki Qabul Qilindi!</h4>
                <p className="text-xs text-secondary leading-relaxed max-w-md mx-auto">
                  Chekingiz admin panelga va tizimga muvaffaqiyatli yuborildi. Admin tekshirib chiqqach, o'yiningiz darhol faollashadi.
                </p>
              </div>
              <button
                onClick={onClose}
                className="btn-primary px-8 py-3.5 text-xs font-bold uppercase tracking-wider"
              >
                Tushundim, Yopish
              </button>
            </div>
          ) : (
            /* Main Payment View */
            <div className="space-y-6">
              {/* Item Summary Box */}
              <div className="glass-card p-4 border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-secondary uppercase font-bold tracking-wider">To'lanadigan summa</p>
                  <h4 className="text-2xl font-black text-emerald-400 font-display">
                    {itemPrice.toLocaleString()} <span className="text-xs text-white">UZS</span>
                  </h4>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    <ShieldCheck size={12} /> Xavfsiz To'lov
                  </span>
                </div>
              </div>

              {/* Payment Method Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/40 border border-white/10 rounded-2xl">
                <button
                  type="button"
                  onClick={() => { setPaymentTab('WLCM'); setErrorMessage(null); }}
                  className={`py-3 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                    paymentTab === 'WLCM'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-glow-emerald'
                      : 'text-secondary hover:text-white bg-transparent'
                  }`}
                >
                  <Zap size={14} className={paymentTab === 'WLCM' ? 'fill-black' : ''} />
                  <span>⚡ Onlayn To'lov (WLCM)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setPaymentTab('MANUAL'); setErrorMessage(null); }}
                  className={`py-3 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                    paymentTab === 'MANUAL'
                      ? 'bg-white/15 text-white shadow-lg border border-white/10'
                      : 'text-secondary hover:text-white bg-transparent'
                  }`}
                >
                  <CreditCard size={14} />
                  <span>💳 Karta / Chek</span>
                </button>
              </div>

              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-xl font-bold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* TAB 1: WLCM ONLINE PAYMENT */}
              {paymentTab === 'WLCM' ? (
                <div className="space-y-5">
                  <div className="bg-black/60 border border-white/10 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                        Qo'llab-quvvatlanadigan provayderlar
                      </span>
                      <span className="text-[10px] text-secondary font-mono">1 soniyada avto-tasdiq</span>
                    </div>

                    {/* Provider Pills */}
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center flex flex-col items-center justify-center">
                        <span className="text-xs font-black text-cyan-400">Payme</span>
                        <span className="text-[8px] text-secondary mt-0.5">Ilova orqali</span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center flex flex-col items-center justify-center">
                        <span className="text-xs font-black text-sky-400">Click</span>
                        <span className="text-[8px] text-secondary mt-0.5">Click Up / Web</span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center flex flex-col items-center justify-center">
                        <span className="text-xs font-black text-purple-400">Uzum</span>
                        <span className="text-[8px] text-secondary mt-0.5">Uzum Pay / Bank</span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center flex flex-col items-center justify-center">
                        <span className="text-xs font-black text-emerald-400">UzCard</span>
                        <span className="text-[8px] text-secondary mt-0.5">Barcha banklar</span>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center flex flex-col items-center justify-center">
                        <span className="text-xs font-black text-amber-400">Humo</span>
                        <span className="text-[8px] text-secondary mt-0.5">Barcha kartalar</span>
                      </div>
                    </div>

                    <p className="text-xs text-secondary leading-relaxed pt-1">
                      To'lov tugmasini bosganingizdan so'ng xavfsiz WLCM to'lov sahifasiga o'tasiz. To'lov amalga oshirilishi bilan o'yin kalitingiz darhol yaratiladi yoki obunangiz faollashadi.
                    </p>
                  </div>

                  {/* WLCM Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-1/3 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl transition-colors"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="button"
                      onClick={handleWlcmPayment}
                      disabled={wlcmLoading}
                      className="w-2/3 btn-primary py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-emerald"
                    >
                      {wlcmLoading ? (
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <>
                          <Zap size={16} className="fill-black" />
                          <span>WLCM orqali To'lash</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* TAB 2: MANUAL CARD TRANSFER & RECEIPT */
                <form onSubmit={handleSubmitPayment} className="space-y-6">
                  {/* Bank Card Info Box */}
                  <div className="bg-black/60 border border-white/10 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] text-secondary font-bold uppercase tracking-wider">To'lov qilish uchun Karta</p>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">UzCard / Humo</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div>
                        <code className="text-lg font-mono font-black text-white tracking-widest">{cardNumber}</code>
                        <p className="text-[11px] text-secondary font-bold mt-0.5">{cardHolder}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyCard}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                          copiedCard 
                            ? 'bg-emerald-500 text-black' 
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                        }`}
                      >
                        {copiedCard ? (
                          <>
                            <Check size={14} /> Nusxalandi
                          </>
                        ) : (
                          <>
                            <Copy size={14} /> Nusxalash
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Upload Receipt Section */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-white uppercase tracking-wider">
                      📸 To'lov Cheki Skrinshotini Yuklang:
                    </label>

                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-white/10 border-dashed rounded-2xl cursor-pointer bg-white/5 hover:bg-white/10 transition-colors relative overflow-hidden group">
                      {receiptPreview ? (
                        <div className="relative w-full h-full p-2 flex items-center justify-center bg-black/60">
                          <img src={receiptPreview} alt="Chek" className="max-h-full max-w-full object-contain rounded-xl" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white">
                            Rasmni o'zgartirish
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-emerald-400 animate-bounce" />
                          <p className="text-xs text-white font-bold">
                            Chek rasmini bu yerga tashlang yoki tanlang
                          </p>
                          <p className="text-[10px] text-secondary mt-1">PNG, JPG yoki screenshot</p>
                        </div>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>

                  {/* Option 2: Telegram Bot Activation Link */}
                  <div className="bg-sky-500/10 border border-sky-500/20 p-3.5 rounded-2xl flex items-center justify-between gap-3">
                    <div className="text-xs text-sky-300 font-medium">
                      Yoki to'lov chekini rasmiy Telegram botimizga yuborishingiz mumkin:
                    </div>
                    <a
                      href="https://t.me/maroqlitolovrasmiybot"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-black font-extrabold text-[10px] uppercase rounded-lg shrink-0 flex items-center gap-1 transition-colors"
                    >
                      <span>@maroqlitolovrasmiybot</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-1/3 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl transition-colors"
                    >
                      Bekor qilish
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || (!receiptFile && !receiptPreview)}
                      className="w-2/3 btn-primary py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-emerald"
                    >
                      {submitting ? (
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <>
                          <Zap size={16} />
                          <span>Chekni Yuborish</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
