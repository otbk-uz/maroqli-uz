"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ArrowLeft, BookOpen, Shield, HelpCircle, Phone, Calendar } from "lucide-react";

export default function PrivacyPage() {
  const sections = [
    { id: "1", title: "1. Operatorning Ma'lumotlari" },
    { id: "2", title: "2. To'planadigan Ma'lumotlar" },
    { id: "3", title: "3. Ma'lumotlardan Foydalanish Maqsadlari" },
    { id: "4", title: "4. Ma'lumotlarni Himoyalash va Saqlash" },
    { id: "5", title: "5. Uchinchi Shaxslar bilan Ulashish" },
    { id: "6", title: "6. Foydalanuvchilarning Huquqlari" },
    { id: "7", title: "7. Siyosatga O'zgartirish Kiritish" },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(`section-${id}`);
    if (element) {
      const yOffset = -100; // Offset for navbar
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <main className="bg-background min-h-screen relative overflow-hidden pb-20">
      <Navbar />
      
      {/* Background Glow Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 pt-32">
        {/* Back Link */}
        <Link 
          href="/" 
          className="inline-flex items-center space-x-2 text-secondary hover:text-primary transition-colors mb-8 group font-bold text-sm"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Bosh sahifaga qaytish</span>
        </Link>

        {/* Header Section */}
        <div className="mb-16">
          <div className="flex items-center space-x-2 text-primary font-bold text-xs uppercase tracking-widest mb-4">
            <Shield size={14} className="text-primary animate-pulse" />
            <span>Maxfiylik va Xavfsizlik</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6">
            MAXFIYLIK SIYOSATI
          </h1>
          <div className="flex items-center text-sm text-secondary">
            <Calendar size={14} className="mr-2 text-primary" />
            <span>So'nggi yangilanish: 2026-yil 1-yanvar</span>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-4 lg:sticky lg:top-28 h-fit hidden lg:block">
            <div className="glass-card p-6 border-white/5 bg-card/40 backdrop-blur-md">
              <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                <Shield size={18} className="text-primary" />
                Mundarija
              </h3>
              <div className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="w-full text-left text-sm text-secondary hover:text-primary transition-colors py-2 px-3 rounded-lg hover:bg-white/5 block font-medium"
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Document Content */}
          <div className="lg:col-span-8 space-y-12 text-secondary leading-relaxed">
            <div className="glass-card p-8 md:p-10 border-white/5 bg-card/30 backdrop-blur-md space-y-8">
              
              <p className="text-white font-medium text-lg leading-relaxed border-l-2 border-primary pl-4">
                Ushbu Maxfiylik Siyosati Maroqli.uz platformasi (MAROQLI.uz) foydalanuvchilaridan to'planadigan ma'lumotlar, ulardan foydalanish tartibi va himoya choralari haqida to'liq ma'lumot beradi. Platforma xizmatlaridan foydalanishdan oldin ushbu siyosat bilan diqqat bilan tanishib chiqishingizni so'raymiz.
              </p>

              {/* Section 1 */}
              <div id="section-1" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">1. Operatorning Ma'lumotlari</h2>
                <ul className="space-y-2 font-medium">
                  <li>Platforma operatori: <span className="text-white">Maroqli.uz</span></li>
                  <li>Veb-sayt: <span className="text-white">MAROQLI.uz</span></li>
                  <li>Elektron pochta: <span className="text-white">info@MAROQLI.uz</span></li>
                  <li>Telefon: <span className="text-white">+998 93-823-7773</span></li>
                  <li>Telegram: <span className="text-white">@Maroqli.uz</span></li>
                </ul>
              </div>

              {/* Section 2 */}
              <div id="section-2" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">2. To'planadigan Ma'lumotlar</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-bold mb-2">2.1. Ro'yxatdan o'tishda beriladigan ma'lumotlar</h3>
                    <ul className="list-disc list-inside space-y-1 pl-4">
                      <li>To'liq ism va familiya</li>
                      <li>Elektron pochta manzili</li>
                      <li>Telefon raqami</li>
                      <li>Tug'ilgan sana (yoshni tasdiqlash uchun)</li>
                      <li>O'yin nomi (nickname / username)</li>
                      <li>Parol (shifrlangan holda xavfsiz saqlanadi)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-2">2.2. Platforma faoliyati davomida avtomatik to'planadigan ma'lumotlar</h3>
                    <ul className="list-disc list-inside space-y-1 pl-4">
                      <li>IP manzil va qurilma ma'lumotlari</li>
                      <li>Brauzer turi va versiyasi</li>
                      <li>Platforma sahifalariga kirish tarixi (log fayllar)</li>
                      <li>O'yin natijalari, turnir ishtiroki va statistikasi</li>
                      <li>To'lov tarixi va tranzaksiyalar (donat, do'kon xaridlari)</li>
                      <li>Foydalanuvchi tomonidan yuklangan kontent (avatar, fotosuratlar)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-2">2.3. To'planmaydigan ma'lumotlar</h3>
                    <p>Maroqli.uz quyidagilarni to'plamaydi va so'ramaydi:</p>
                    <ul className="list-disc list-inside space-y-1 pl-4">
                      <li>Bank kartasining to'liq raqami (to'lovlar Payme, Click, Uzum orqali amalga oshiriladi)</li>
                      <li>Pasport yoki shaxsiy guvohnoma raqami (agar qonun talab qilmasa)</li>
                      <li>Foydalanuvchining shaxsiy yozishmalari (agar xavfsizlik tergovi talab qilmasa)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div id="section-3" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">3. Ma'lumotlardan Foydalanish Maqsadlari</h2>
                <p>Biz sizning shaxsiy ma'lumotlaringizni quyidagi maqsadlarda ishlatamiz:</p>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  <li>Platformadagi shaxsiy profilingizni yaratish va boshqarish</li>
                  <li>Sotib olingan o'yinlarni yetkazib berish va to'lovlarni qayta ishlash</li>
                  <li>Turnirlarni tashkil qilish, g'oliblarni aniqlash va mukofotlash</li>
                  <li>Tizimdagi xabarlar, yangiliklar va bildirishnomalarni yetkazish</li>
                  <li>Platforma xavfsizligini ta'minlash va firibgarlikka qarshi kurashish</li>
                  <li>Foydalanuvchi qo'llab-quvvatlash xizmati orqali savollaringizga javob berish</li>
                </ul>
              </div>

              {/* Section 4 */}
              <div id="section-4" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">4. Ma'lumotlarni Himoyalash va Saqlash</h2>
                <p>
                  Biz sizning shaxsiy ma'lumotlaringiz xavfsizligini ta'minlash uchun zamonaviy tashkiliy va texnik choralardan foydalanamiz (masalan, parollarni xavfsiz shifrlash (hashlash), HTTPS protokoli, xavfsiz ma'lumotlar bazasi zaxiralari).
                </p>
                <p>
                  Sizning ma'lumotlaringiz platformadagi hisobingiz faol bo'lgan davrda yoki qonunchilikda belgilangan muddatda saqlanadi. Hisob o'chirilgandan so'ng, barcha shaxsiy ma'lumotlar 30 kun ichida butunlay o'chiriladi.
                </p>
              </div>

              {/* Section 5 */}
              <div id="section-5" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">5. Uchinchi Shaxslar bilan Ulashish</h2>
                <p>
                  Maroqli.uz foydalanuvchilarning shaxsiy ma'lumotlarini uchinchi shaxslarga sotmaydi yoki ijaraga bermaydi. Ma'lumotlar uchinchi shaxslarga faqat quyidagi holatlarda berilishi mumkin:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  <li>To'lov operatorlari (Payme, Click, Uzum) tranzaksiyani amalga oshirishlari uchun</li>
                  <li>O'zbekiston Respublikasi qonunchiligi talab qilgan rasmiy tergov jarayonlarida</li>
                  <li>Sizning aniq roziligingiz bilan</li>
                </ul>
              </div>

              {/* Section 6 */}
              <div id="section-6" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">6. Foydalanuvchilarning Huquqlari</h2>
                <p>Siz o'zingiz taqdim etgan ma'lumotlarga nisbatan quyidagi huquqlarga egasiz:</p>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  <li>Shaxsiy ma'lumotlaringizni ko'rish, o'zgartirish va yangilash (Profil bo'limi orqali)</li>
                  <li>Bizdan shaxsiy ma'lumotlaringizni butunlay o'chirib tashlashni talab qilish</li>
                  <li>Platformaning maxfiylik choralari bo'yicha qo'shimcha ma'lumot olish</li>
                </ul>
              </div>

              {/* Section 7 */}
              <div id="section-7" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">7. Siyosatga O'zgartirish Kiritish</h2>
                <p>
                  Maroqli.uz ushbu Maxfiylik Siyosatini o'zgartirish huquqiga ega. Siyosat o'zgarganda yangi versiya saytga joylashtiriladi va so'nggi yangilanish sanasi yangilanadi. Yangiliklar va muhim o'zgarishlar haqida foydalanuvchilarga bildirishnomalar yuboriladi.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
