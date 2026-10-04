const TOKEN = '8917394976:AAFmQ8dwmSs2yTs8IudHSQ1WzlahLL02_4U';
const CHAT_ID = '5116279804';

async function testSend() {
  const text = `👋 *Assalomu alaykum! Maroqli.uz rasmiy to'lov va yordamchi botiga xush kelibsiz!* 🎮\n\n` +
    `✨ *Ushbu bot orqali siz quyidagilarni bajarishingiz mumkin:*\n\n` +
    `1️⃣ 💳 *O'yinlar xaridi va chek yuborish*:\n` +
    `Sayt yoki bot orqali o'yin xarid qilishda plastik kartadan to'lov o'tkazib, to'lov cheki (skrinshot)ni ushbu botga yuborasiz. Tizim summani tekshirib, *1 soniya ichida o'yinni va CD-Key'ni avtomatik faollashtiradi*.\n\n` +
    `2️⃣ 🏆 *Kibersport Turnirlari*:\n` +
    `Maroqli platformasidagi o'yinlar hamda turnirlar uchun ro'yxatdan o'tishingiz va turnir chiptalarini olishingiz mumkin.\n\n` +
    `3️⃣ 📢 *Rasmiy Kanal va Yangiliklar*:\n` +
    `Rasmiy Telegram kanalimizga a'zo bo'lib eng so'nggi yangiliklardan va aksiyalardan xabardor bo'lasiz.\n\n` +
    `👇 *Tushungan bo'lsangiz va davom etish uchun quyidagi tugmani bosing:*`;

  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📢 Rasmiy kanalimizga a'zo bo'lish", url: "https://t.me/maroqliku" }
          ],
          [
            { text: "✅ TUSHUNDIM, RAXMAT", callback_data: 'understand_thanks' }
          ]
        ]
      }
    })
  });

  const data = await res.json();
  console.log("Telegram API send response:", JSON.stringify(data, null, 2));
}

testSend().catch(console.error);
