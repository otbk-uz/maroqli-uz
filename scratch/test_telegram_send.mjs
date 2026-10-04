const TOKEN = '8917394976:AAFmQ8dwmSs2yTs8IudHSQ1WzlahLL02_4U';
const CHAT_ID = '5116279804';

async function testSend() {
  const text = `👋 <b>Assalomu alaykum! Maroqli.uz rasmiy to'lov va yordamchi botiga xush kelibsiz!</b> 🎮\n\n` +
    `✨ <b>Ushbu bot orqali siz quyidagilarni bajarishingiz mumkin:</b>\n\n` +
    `1️⃣ 💳 <b>O'yinlar xaridi va chek yuborish</b>:\n` +
    `Sayt yoki bot orqali o'yin xarid qilishda plastik kartadan to'lov o'tkazib, to'lov cheki (skrinshot)ni ushbu botga yuborasiz. Tizim summani tekshirib, <b>1 soniya ichida o'yinni va CD-Key'ni avtomatik faollashtiradi</b>.\n\n` +
    `2️⃣ 🏆 <b>Kibersport Turnirlari</b>:\n` +
    `Maroqli platformasidagi o'yinlar hamda turnirlar uchun ro'yxatdan o'tishingiz va turnir chiptalarini olishingiz mumkin.\n\n` +
    `3️⃣ 📢 <b>Rasmiy Kanal va Yangiliklar</b>:\n` +
    `Rasmiy Telegram kanalimizga a'zo bo'lib eng so'nggi yangiliklardan va aksiyalardan xabardor bo'lasiz.\n\n` +
    `👇 <b>Tushungan bo'lsangiz va davom etish uchun quyidagi tugmani bosing:</b>`;

  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: text,
      parse_mode: 'HTML',
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
  console.log("Telegram API HTML send response:", JSON.stringify(data, null, 2));
}

testSend().catch(console.error);
