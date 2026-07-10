const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

// 1. .env.local faylini yuklash funksiyasi
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
          value = value.replace(/\\n/gm, '\n');
        }
        value = value.replace(/(^['"]|['"]$)/g, '').trim();
        process.env[key] = value;
      }
    });
  }
}
loadEnv();

// 2. Konfiguratsiyalar
const token = process.env.TELEGRAM_BOT_TOKEN || '8691594274:AAFuehA_27DpYZM_Fd2XZQyrURIjWA6Qddo';
const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '-1003901938291';
const channelUsername = '@maroqli_uz'; // Kanal username

console.log('Bot ishga tushmoqda...');
const bot = new TelegramBot(token, { polling: true });

const dbPath = path.join(__dirname, 'bot_users.json');

// 3. Foydalanuvchilar bazasini yuklash
let users = {};
if (fs.existsSync(dbPath)) {
  try {
    users = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (e) {
    users = {};
  }
}

function saveDB() {
  fs.writeFileSync(dbPath, JSON.stringify(users, null, 2), 'utf8');
}

// Foydalanuvchilarning holati (states)
const userStates = {};

// 4. Obunani tekshirish funksiyasi
async function checkSubscription(chatId, userId) {
  try {
    const member = await bot.getChatMember(channelUsername, userId);
    const status = member.status;
    return ['member', 'administrator', 'creator'].includes(status);
  } catch (err) {
    console.warn(`Kanal obunasini tekshirishda xatolik (Bot kanalda admin bo'lishi kerak): ${err.message}`);
    // Agar bot kanalda admin bo'lmasa, to'xtab qolmaslik uchun true qaytaramiz
    return true; 
  }
}

// Asosiy menyuni ko'rsatish
function showMainMenu(chatId) {
  bot.sendMessage(chatId, "🏆 Turnirlarda ishtirok etish uchun bo'limni tanlang:", {
    reply_markup: {
      keyboard: [
        ["🏆 Turnirlar"],
        ["👤 Profilim"]
      ],
      resize_keyboard: true
    }
  });
}

// 5. Start buyrug'i
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  delete userStates[chatId];
  
  bot.sendMessage(chatId, `👋 *Assalomu alaykum! Maroqli.uz kibersport botiga xush kelibsiz!*\n\nBotdan foydalanish uchun iltimos rasmiy kanalimizga a'zo bo'ling va obunani tasdiqlang:`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📢 Kanalga obuna bo'lish", url: `https://t.me/${channelUsername.replace('@', '')}` }
        ],
        [
          { text: "✅ Obunani tasdiqlash", callback_data: 'check_subscription' }
        ]
      ]
    }
  });
});

// 6. Callback tugmalarini boshqarish
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;
  
  if (data === 'check_subscription') {
    const isSubscribed = await checkSubscription(chatId, userId);
    if (!isSubscribed) {
      bot.answerCallbackQuery(query.id, {
        text: "❌ Siz hali kanalga a'zo bo'lmadingiz. Iltimos a'zo bo'lib keyin tasdiqlang.",
        show_alert: true
      });
    } else {
      bot.answerCallbackQuery(query.id, { text: "✅ Obuna tasdiqlandi!" });
      bot.deleteMessage(chatId, query.message.message_id);
      
      const userData = users[userId];
      if (!userData) {
        bot.sendMessage(chatId, "✅ *Obuna tasdiqlandi!*\n\nTurnirlarda qatnashish uchun ro'yxatdan o'tishingiz kerak.\n\n👤 *Ism va familiyangizni kiriting:*", {
          parse_mode: 'Markdown',
          reply_markup: { remove_keyboard: true }
        });
        userStates[chatId] = { step: 'AWAITING_NAME' };
      } else {
        showMainMenu(chatId);
      }
    }
  }
  else if (data === 'buy_bronze_ticket') {
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(chatId, `💳 *CHIPTA XARID QILISH*\n\n` +
      `Turnir chiptasini olish uchun quyidagi kartaga to'lovni amalga oshiring:\n\n` +
      `💳 *Karta raqami:* \`9860 0101 3799 2664\`\n` +
      `👤 *Karta egasi:* Zokirjonov Isfandiyor\n` +
      `💰 *Summa:* 10 000 UZS\n\n` +
      `To'lovni amalga oshirgach, to'lov chekining (skrinshotini) rasmini ushbu botga yuboring.`, {
        parse_mode: 'Markdown'
      });
    userStates[chatId] = { step: 'AWAITING_RECEIPT' };
  }
});

// 7. Xabarlarni boshqarish
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userId = msg.from.id;
  
  if (!text) return;
  if (text.startsWith('/')) return;
  
  const state = userStates[chatId];
  
  if (state) {
    if (state.step === 'AWAITING_NAME') {
      state.fullName = text.trim();
      state.step = 'AWAITING_DOB';
      bot.sendMessage(chatId, "📅 *Tug'ilgan sanangizni kiriting:*\n(Masalan: 12.04.2003)", {
        parse_mode: 'Markdown'
      });
    }
    else if (state.step === 'AWAITING_DOB') {
      state.dob = text.trim();
      state.step = 'AWAITING_REGION';
      
      const regions = [
        ["Toshkent", "Andijon"],
        ["Buxoro", "Farg'ona"],
        ["Jizzax", "Namangan"],
        ["Navoiy", "Qashqadaryo"],
        ["Samarqand", "Sirdaryo"],
        ["Surxondaryo", "Xorazm"],
        ["Qoraqalpog'iston"]
      ];
      
      bot.sendMessage(chatId, "📍 *Yashash hududingizni tanlang yoki yozing:*", {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: regions,
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
    }
    else if (state.step === 'AWAITING_REGION') {
      const region = text.trim();
      
      users[userId] = {
        fullName: state.fullName,
        dob: state.dob,
        region: region,
        registeredAt: new Date().toISOString()
      };
      saveDB();
      
      delete userStates[chatId];
      
      bot.sendMessage(chatId, "🎉 *Muvaffaqiyatli ro'yxatdan o'tdingiz!*", {
        parse_mode: 'Markdown'
      });
      showMainMenu(chatId);
    }
  } else {
    // Oddiy menyu tugmalari
    if (text === "🏆 Turnirlar") {
      bot.sendMessage(chatId, `🏆 *BRONZA TURNIRI*\n\n` +
        `🎮 *O'yin:* CS2, PUBG yoki Mobile Legends\n` +
        `💰 *Mukofot jamg'armasi:* 1 000 000 so'm\n` +
        `📅 *Boshlanish sanasi:* Tez kunda\n\n` +
        `Ushbu turnirda ishtirok etish uchun chipta xarid qilishingiz kerak.`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🎫 Bronza ticket xarid qilish", callback_data: 'buy_bronze_ticket' }
              ]
            ]
          }
        });
    }
    else if (text === "👤 Profilim") {
      const userData = users[userId];
      if (userData) {
        bot.sendMessage(chatId, `👤 *Sizning Profilingiz:*\n\n` +
          `📝 *F.I.SH:* ${userData.fullName}\n` +
          `📅 *Tug'ilgan sana:* ${userData.dob}\n` +
          `📍 *Hudud:* ${userData.region}\n` +
          `🆔 *Telegram ID:* ${userId}`, {
            parse_mode: 'Markdown'
          });
      } else {
        bot.sendMessage(chatId, "Siz hali ro'yxatdan o'tmagansiz. Qaytadan /start buyrug'ini bosing.");
      }
    }
  }
});

// 8. Chek rasmlarini qabul qilish
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const state = userStates[chatId];
  
  if (state && state.step === 'AWAITING_RECEIPT') {
    const photo = msg.photo[msg.photo.length - 1]; // eng yuqori sifatlisi
    const fileId = photo.file_id;
    const userData = users[userId] || {};
    
    // Admin guruhga yuborish
    try {
      await bot.sendPhoto(adminChatId, fileId, {
        caption: `🔔 *BRONZA TICKET TO'LOV SO'ROVI!*\n\n` +
                 `👤 *Ishtirokchi:* ${userData.fullName || 'Noma\'lum'}\n` +
                 `📅 *Tug'ilgan sana:* ${userData.dob || 'Noma\'lum'}\n` +
                 `📍 *Hudud:* ${userData.region || 'Noma\'lum'}\n` +
                 `🆔 *Telegram ID:* ${userId}\n` +
                 `💰 *Summa:* 10 000 UZS\n\n` +
                 `Karta: Isfandiyor Zokirjonov (Openbank/Uzcard)`,
        parse_mode: 'Markdown'
      });
      
      delete userStates[chatId];
      
      bot.sendMessage(chatId, "✅ *To'lov chekingiz yuborildi!*\n\nAdminlar tez orada to'lovni tasdiqlab sizga xabar berishadi. Rahmat!", {
        parse_mode: 'Markdown'
      });
      showMainMenu(chatId);
    } catch (err) {
      console.error("Admin guruhiga yuborishda xato:", err);
      bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Iltimos qaytadan chek rasmini yuborib ko'ring.");
    }
  }
});

console.log('Bot muvaffaqiyatli ishga tushdi va faol holatda!');
