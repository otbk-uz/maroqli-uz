"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ArrowLeft, BookOpen, Shield, HelpCircle, Phone, Calendar } from "lucide-react";

export default function TermsPage() {
  const sections = [
    { id: "1", title: "1. Umumiy Qoidalar" },
    { id: "2", title: "2. Ro'yxatdan O'tish va Hisob" },
    { id: "3", title: "3. Foydalanuvchi Majburiyatlari" },
    { id: "4", title: "4. To'lov va Do'kon Xizmatlari" },
    { id: "5", title: "5. Turnirlar va Musobaqalar" },
    { id: "6", title: "6. Intellektual Mulk" },
    { id: "7", title: "7. Qaytarish Siyosati" },
    { id: "8", title: "8. Javobgarlik Chegaralari" },
    { id: "9", title: "9. Hisob Bloklash va Xizmatni To'xtatish" },
    { id: "10", title: "10. Nizolarni Hal Qilish" },
    { id: "11", title: "11. O'zgarishlar" },
    { id: "12", title: "12. Aloqa" },
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
            <BookOpen size={14} />
            <span>Foydalanuvchi Shartnomasi</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6">
            FOYDALANISH SHARTLARI (OFERTA)
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
                Ushbu Foydalanish Shartlari (&quot;Shartnoma&quot;) PlayNationUz platformasi (playnation.uz) bilan foydalanuvchi o'rtasidagi huquqiy munosabatlarni tartibga soladi. Platforma xizmatlaridan ro'yxatdan o'tish va foydalanish ushbu shartlarni to'liq qabul qilishingizni anglatadi.
                <br />
                <span className="text-primary font-bold">Agar siz ushbu shartlarga rozi bo'lmasangiz, platforma xizmatlaridan foydalanmang.</span>
              </p>

              {/* Section 1 */}
              <div id="section-1" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">1. Umumiy Qoidalar</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-bold mb-2">1.1. Platforma haqida</h3>
                    <p>
                      PlayNationUz — O'zbekistondagi gamerlar, e-sport ishtirokchilari, kontent yaratuvchilar va game developerlar uchun yaratilgan raqamli ekotizim. Platforma quyidagi xizmatlarni taqdim etadi:
                    </p>
                    <ul className="list-disc list-inside space-y-1 mt-2 pl-4">
                      <li>O'yin do'koni (5% komissiya bilan mahalliy va xalqaro o'yinlar)</li>
                      <li>E-sport turnirlari va musobaqalari tashkil etish</li>
                      <li>Donat tizimi (streamerlarga qo'llab-quvvatlash)</li>
                      <li>GameDev va Investor Hub (dasturchilarga investorlar bilan bog'lanish)</li>
                      <li>Kontent ekotizimi (streaming, manga, animatsiya)</li>
                      <li>Gaming klublar xaritasi va offline tadbirlar</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-2">1.2. Huquqiy asos</h3>
                    <p>
                      Ushbu shartnoma O'zbekiston Respublikasining Fuqarolik kodeksi, &quot;Elektron tijorat to'g'risida&quot; qonuni, &quot;Shaxsga doir ma'lumotlar to'g'risida&quot; qonuni va boshqa amaldagi qonun hujjatlariga muvofiq tuzilgan.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div id="section-2" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">2. Ro'yxatdan O'tish va Hisob</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-bold mb-2">2.1. Ro'yxatdan o'tish shartlari</h3>
                    <p>Platformadan to'liq foydalanish uchun ro'yxatdan o'tish majburiy. Ro'yxatdan o'tish uchun:</p>
                    <ul className="list-disc list-inside space-y-1 mt-2 pl-4">
                      <li>13 yosh va undan katta bo'lishingiz kerak (13-18 yosh oralig'idagilar uchun ota-ona roziligi talab etiladi)</li>
                      <li>Haqiqiy va to'g'ri shaxsiy ma'lumotlar kiritish shart</li>
                      <li>Bir shaxs faqat bitta asosiy hisob yaratishi mumkin</li>
                      <li>Hisob ma'lumotlari (login/parol) shaxsiy maxfiy bo'lishi shart</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-2">2.2. Hisob xavfsizligi</h3>
                    <p>
                      Siz o'z hisobingiz xavfsizligi uchun to'liq javobgarsiz. Hisobingiz ruxsatsiz ishlatilganda darhol <span className="text-white font-semibold">info@playnation.uz</span> manziliga xabar bering. PlayNationUz hisobingizdan noto'g'ri foydalanish oqibatida yuzaga kelgan zararlar uchun javobgar emas.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-2">2.3. Hisobni o'chirish</h3>
                    <p>
                      Istalgan vaqtda hisobingizni o'chirishingiz mumkin. Hisob o'chirilgandan so'ng barcha ma'lumotlar 30 kun ichida butunlay o'chiriladi. To'langan mablag'lar qaytarilmaydi (qaytarish siyosati 7-bo'limda).
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div id="section-3" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">3. Foydalanuvchi Majburiyatlari</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-bold mb-2">3.1. Ruxsat etilgan faoliyat</h3>
                    <p>Platforma faqat qonuniy va halol maqsadlarda ishlatilishi kerak:</p>
                    <ul className="list-disc list-inside space-y-1 mt-2 pl-4">
                      <li>O'yin xarid qilish va o'ynash</li>
                      <li>Turnirlar va musobaqalarda halol ishtirok etish</li>
                      <li>O'z ijodiy kontentini (streaming, san'at, maqolalar) joylash</li>
                      <li>Boshqa foydalanuvchilar bilan hurmatli muloqot</li>
                      <li>Streamerlar uchun donat o'tkazish</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-2">3.2. Taqiqlangan faoliyat</h3>
                    <p>Quyidagi harakatlar qat'iyan taqiqlanadi:</p>
                    <ul className="list-disc list-inside space-y-1 mt-2 pl-4">
                      <li>Boshqa foydalanuvchilar haqida yolg'on, haqoratli yoki tahdidli kontent joylash</li>
                      <li>Spam, aldov sxemalari va firibgarlik</li>
                      <li>Mualliflik huquqi bilan himoyalangan kontentni ruxsatsiz joylashtirish</li>
                      <li>O'yinlarda cheat, hack yoki bot ishlatish</li>
                      <li>Turnirlar natijalarini soxtalashtirish yoki mansabdor shaxslarga pora berish</li>
                      <li>Platforma infratuzilmasiga zarar yetkazish (DDoS, SQL injection va h.k.)</li>
                      <li>Boshqa foydalanuvchilarning hisobini o'g'irlash yoki firibgarlik yo'li bilan olish</li>
                      <li>18+ kontent joylashtirish (tegishli bo'lim bo'lmagan holda)</li>
                      <li>Siyosiy propaganda va din bilan bog'liq nizolarni keltirib chiqaruvchi kontent</li>
                      <li>Bir nechta hisob yaratib, turnir afzalliklaridan noo'rin foydalanish</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-2">3.3. Kontent qoidalari</h3>
                    <p>
                      Foydalanuvchi tomonidan joylashtirilgan kontent uchun foydalanuvchining o'zi to'liq javobgar. PlayNationUz shartlarni buzuvchi kontentni ogohlantirmasdan o'chirish, cheklash yoki moderatsiya qilish huquqini saqlab qoladi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 4 */}
              <div id="section-4" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">4. To'lov va Do'kon Xizmatlari</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-bold mb-2">4.1. To'lov tizimlari</h3>
                    <p>Platforma quyidagi mahalliy to'lov tizimlari bilan ishlaydi:</p>
                    <ul className="list-disc list-inside space-y-1 mt-2 pl-4">
                      <li>Payme</li>
                      <li>Click</li>
                      <li>Uzum Bank</li>
                    </ul>
                    <p className="mt-2">
                      Barcha to'lovlar O'zbekiston so'mi (UZS) yoki ko'rsatilgan valyutada amalga oshiriladi. To'lov xavfsizligi tegishli to'lov operatorlari tomonidan ta'minlanadi.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-2">4.2. O'yinlar do'koni va komissiya</h3>
                    <p>
                      PlayNationUz game developerlardan 5% komissiya oladi — bu Steam (30%) va Epic Games (12%) bilan solishtirganda sezilarli darajada past. Developerlar o'z narxlarini o'zlari belgilaydi.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-2">4.3. Donat tizimi</h3>
                    <p>
                      Foydalanuvchilar sevgan streamer yoki ijodkorlariga donat o'tkazishi mumkin. Donat mablag'larining 85% ijodkonga, 15% platforma operatsion xarajatlariga ajratiladi. Donat qaytarilmaydi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 5 */}
              <div id="section-5" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">5. Turnirlar va Musobaqalar</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-bold mb-2">5.1. Ishtirok shartlari</h3>
                    <ul className="list-disc list-inside space-y-1 pl-4">
                      <li>Har bir turnir uchun alohida qoidalar e'lon qilinadi</li>
                      <li>Ishtirokchilar yosh chegirmalari, reyting yoki boshqa talablarga javob berishi shart</li>
                      <li>Ro'yxatdan o'tish muddati o'tgandan so'ng bekor qilish mumkin emas</li>
                      <li>Turnir davomida platforma qoidalari va sport ahloq kodeksiga rioya qilish majburiy</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-2">5.2. Sovrinlar</h3>
                    <p>
                      Sovrinlar turnirgacha e'lon qilinadi. G'oliblar natijalar rasman tasdiqlangandan so'ng 14 ish kuni ichida mukofotlarini oladilar. Firibgarlik aniqlansa, sovrin bekor qilinadi va foydalanuvchi bloklanadi.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-2">5.3. Nizolar</h3>
                    <p>
                      Turnir natijalariga e'tiroz bildirish uchun natija e'lon qilinganidan 48 soat ichida <span className="text-white font-semibold">info@playnation.uz</span> manziliga murojaat qiling. PlayNationUz qarorlari yakuniy hisoblanadi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 6 */}
              <div id="section-6" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">6. Intellektual Mulk</h2>
                <p>
                  PlayNationUz platformasidagi barcha kontent (logotip, dizayn, dasturiy ta'minot, kontent katalogi) PlayNationUz yoki tegishli huquq egalarinikiga tegishli. Ruxsatsiz nusxa ko'chirish, tarqatish yoki tijoriy maqsadlarda ishlatish taqiqlanadi.
                </p>
                <p>
                  Foydalanuvchi o'zi joylagan kontentning mualliflik huquqiga egaligini kafolatlaydi. Agar joylashtirilgan kontent uchinchi tomonning huquqlarini buzsa, foydalanuvchining o'zi to'liq javob beradi.
                </p>
              </div>

              {/* Section 7 */}
              <div id="section-7" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">7. Qaytarish Siyosati</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-bold mb-2">7.1. Raqamli mahsulotlar</h3>
                    <p>Raqamli o'yinlar va kontent yuklab olinganidan so'ng, qoida bo'yicha, qaytarilmaydi. Istisno hollar:</p>
                    <ul className="list-disc list-inside space-y-1 mt-2 pl-4">
                      <li>Texnik nosozlik tufayli mahsulot ishlamasa va bu platforma tomonida isbotlansa</li>
                      <li>Xarid tasodifan ikki marta amalga oshirilgan bo'lsa (24 soat ichida murojaat qiling)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-2">7.2. Turnir ro'yxatdan o'tish to'lovi</h3>
                    <p>
                      Turnir boshlanishidan 48 soat oldin bekor qilingan ishtirok uchun to'lov qaytariladi. Kechroq bekor qilinsa yoki ishtirokchi kelmasa, to'lov qaytarilmaydi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 8 */}
              <div id="section-8" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">8. Javobgarlik Chegaralari</h2>
                <p>PlayNationUz quyidagi hollar uchun javobgar emas:</p>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  <li>Foydalanuvchining o'z harakatlari natijasida yuzaga kelgan zararlar</li>
                  <li>Uchinchi tomon xizmatlari (to'lov tizimlari, tarmoq aloqasi) ishlamay qolishi</li>
                  <li>Force majeure holatlari (tabiiy ofat, urush, pandemiya, davlat cheklovlari)</li>
                  <li>Foydalanuvchi ma'lumotlarining o'zi tomonidan noto'g'ri saqlanishi oqibatida yo'qotish</li>
                  <li>Platforma vaqtincha texnik xizmat ko'rsatish uchun to'xtatilgan davr</li>
                </ul>
                <p className="mt-2">
                  Platforma xizmatlari &quot;borligidek&quot; (as-is) asosida taqdim etiladi. PlayNationUz xizmatlarning uzluksizligi yoki muayyan maqsadga to'liq muvofiqligi haqida kafolat bermaydi.
                </p>
              </div>

              {/* Section 9 */}
              <div id="section-9" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">9. Hisob Bloklash va Xizmatni To'xtatish</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-bold mb-2">9.1. Bloklash asoslari</h3>
                    <p>PlayNationUz quyidagi holatlarda hisobni vaqtincha yoki doimiy ravishda bloklab qo'yish huquqiga ega:</p>
                    <ul className="list-disc list-inside space-y-1 mt-2 pl-4">
                      <li>Ushbu Foydalanish Shartlarini buzish</li>
                      <li>O'zbekiston qonunchiligini buzish</li>
                      <li>Boshqa foydalanuvchilarga zarar yetkazish</li>
                      <li>Firibgarlik, aldov yoki turnirda soxtakorlik</li>
                      <li>Platforma infratuzilmasiga hujum</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-2">9.2. Bloklashga e'tiroz</h3>
                    <p>
                      Hisobingiz bloklanganiga e'tiroz bildirish uchun <span className="text-white font-semibold">info@playnation.uz</span> manziliga 10 kun ichida murojaat qiling. Har bir holat alohida ko'rib chiqiladi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 10 */}
              <div id="section-10" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">10. Nizolarni Hal Qilish</h2>
                <p>
                  Ushbu shartnomadan kelib chiqadigan barcha nizolar avvalo muzokaralar yo'li bilan hal qilinadi. Agar tomonlar 30 kun ichida kelisha olmasa, O'zbekiston Respublikasining amaldagi qonunchiligi asosida sudga murojaat qilish mumkin.
                </p>
                <p className="font-semibold text-white mt-2">Yurisdiktsiya: O'zbekiston Respublikasi, Toshkent shahri.</p>
              </div>

              {/* Section 11 */}
              <div id="section-11" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">11. O'zgarishlar</h2>
                <p>
                  PlayNationUz ushbu Foydalanish Shartlarini xabardorlik bilan yoki xabardorliksiz o'zgartirish huquqiga ega. Muhim o'zgarishlar haqida foydalanuvchilar kamida 7 kun oldin xabardor qilinadi. Yangilangan shartlar bilan tanishib chiqish foydalanuvchining o'z mas'uliyatidir.
                </p>
              </div>

              {/* Section 12 */}
              <div id="section-12" className="space-y-4 scroll-mt-28">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">12. Aloqa</h2>
                <p>Ushbu Foydalanish Shartlari bo'yicha savollar uchun:</p>
                <ul className="space-y-2 mt-2 font-medium">
                  <li className="flex items-center gap-2">
                    <Phone size={14} className="text-primary" />
                    <span>Telefon: +998 93-823-7773</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <HelpCircle size={14} className="text-primary" />
                    <span>Elektron pochta: info@playnation.uz</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary font-bold">@</span>
                    <span>Telegram: @playnationuz</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary font-bold">IG</span>
                    <span>Instagram: @playnation.uz</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
