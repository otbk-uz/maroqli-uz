import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TELEGRAM_BOT_TOKEN = process.env.KIBERSPORT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '8691594274:AAFuehA_27DpYZM_Fd2XZQyrURIjWA6Qddo';
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '-1003901938291';
const CHANNEL_USERNAME = '@maroqliku';

// Helper: Telegram API so'rovlari
async function sendTelegram(method: string, payload: any) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error(`Telegram API error (${method}):`, txt);
    }
    return res;
  } catch (err) {
    console.error(`Fetch error in ${method}:`, err);
  }
}

// Obunani tekshirish
async function checkSubscription(userId: string | number): Promise<boolean> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${CHANNEL_USERNAME}&user_id=${userId}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Subscription Check Response:", JSON.stringify(data));
    if (!data.ok) {
      console.warn("getChatMember API error:", data.description);
      return true; // Fallback: bot kanalda admin bo'lmasa o'tkazib yuboradi
    }
    const status = data.result?.status;
    return ['member', 'administrator', 'creator'].includes(status);
  } catch (err: any) {
    console.error("Subscription check exception:", err);
    return true;
  }
}

// Asosiy menyuni ko'rsatish
async function showMainMenu(chatId: string | number) {
  await sendTelegram('sendMessage', {
    chat_id: chatId,
    text: "🏆 Turnirlarda ishtirok etish uchun bo'limni tanlang:",
    reply_markup: {
      keyboard: [
        [{ text: "🏆 Turnirlar" }],
        [{ text: "👤 Profilim" }]
      ],
      resize_keyboard: true
    }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Message yoki Callback Query ekanini aniqlash
    const message = body.message;
    const callbackQuery = body.callback_query;
    
    if (callbackQuery) {
      const chatId = callbackQuery.message.chat.id;
      const userId = callbackQuery.from.id.toString();
      const data = callbackQuery.data;
      const callbackQueryId = callbackQuery.id;

      if (data === 'check_subscription') {
        const isSubscribed = await checkSubscription(userId);
        if (!isSubscribed) {
          await sendTelegram('answerCallbackQuery', {
            callback_query_id: callbackQueryId,
            text: "❌ Siz hali kanalga a'zo bo'lmadingiz. Iltimos a'zo bo'lib keyin tasdiqlang.",
            show_alert: true
          });
        } else {
          await sendTelegram('answerCallbackQuery', {
            callback_query_id: callbackQueryId,
            text: "✅ Obuna tasdiqlandi!"
          });
          
          await sendTelegram('deleteMessage', {
            chat_id: chatId,
            message_id: callbackQuery.message.message_id
          });

          // Foydalanuvchini bazadan tekshirish
          const { data: userRow } = await supabase
            .from('bot_users')
            .select('*')
            .eq('telegram_id', userId)
            .single();

          if (!userRow) {
            // Ro'yxatdan o'tishni boshlash
            await supabase.from('bot_states').upsert({
              telegram_id: userId,
              step: 'AWAITING_NAME'
            });

            await sendTelegram('sendMessage', {
              chat_id: chatId,
              text: "✅ *Obuna tasdiqlandi!*\n\nTurnirlarda qatnashish uchun ro'yxatdan o'tishingiz kerak.\n\n👤 *Ism va familiyangizni kiriting:*",
              parse_mode: 'Markdown',
              reply_markup: { remove_keyboard: true }
            });
          } else {
            await showMainMenu(chatId);
          }
        }
      }
      else if (data === 'buy_bronze_ticket') {
        await sendTelegram('answerCallbackQuery', { callback_query_id: callbackQueryId });
        
        await supabase.from('bot_states').upsert({
          telegram_id: userId,
          step: 'AWAITING_RECEIPT'
        });

        await sendTelegram('sendMessage', {
          chat_id: chatId,
          text: `💳 *CHIPTA XARID QILISH*\n\n` +
            `Turnir chiptasini olish uchun quyidagi kartaga to'lovni amalga oshiring:\n\n` +
            `💳 *Karta raqami:* \`9860010137992664\`\n` +
            `👤 *Karta egasi:* Zokirjonov Isfandiyor\n` +
            `💰 *Summa:* 10 000 UZS\n\n` +
            `To'lovni amalga oshirgach, to'lov chekining (skrinshotini) rasmini ushbu botga yuboring.`,
          parse_mode: 'Markdown'
        });
      }
      else if (data.startsWith('approve_ticket:')) {
        const targetUserId = data.split(':')[1];
        
        // Fetch user data to build correct caption
        const { data: userRow } = await supabase
          .from('bot_users')
          .select('*')
          .eq('telegram_id', targetUserId)
          .single();
        
        const userName = userRow ? userRow.full_name : 'Noma\'lum';
        const userPhone = userRow ? userRow.phone_number : 'Noma\'lum';
        const userDob = userRow ? userRow.dob : 'Noma\'lum';
        const userRegion = userRow ? userRow.region : 'Noma\'lum';
        
        // Grant ticket in Supabase
        await supabase
          .from('bot_users')
          .update({ has_bronze_ticket: true })
          .eq('telegram_id', targetUserId);
          
        await sendTelegram('answerCallbackQuery', {
          callback_query_id: callbackQueryId,
          text: "Chipta tasdiqlandi!"
        });
        
        const adminUsername = callbackQuery.from.username ? `@${callbackQuery.from.username}` : callbackQuery.from.first_name;
        
        // Edit admin caption
        await sendTelegram('editMessageCaption', {
          chat_id: chatId,
          message_id: callbackQuery.message.message_id,
          caption: `✅ *BRONZA TICKET TASDIQLANDI!*\n\n` +
                   `👤 *Ishtirokchi:* ${userName}\n` +
                   `📞 *Telefon:* ${userPhone}\n` +
                   `📅 *Tug'ilgan sana:* ${userDob}\n` +
                   `📍 *Hudud:* ${userRegion}\n` +
                   `🆔 *Telegram ID:* ${targetUserId}\n` +
                   `✍️ *Tasdiqladi:* ${adminUsername}\n` +
                   `📅 *Sana:* ${new Date().toLocaleString('uz-UZ')}`,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [] }
        });
        
        // Notify user in private chat
        await sendTelegram('sendMessage', {
          chat_id: targetUserId,
          text: "🎉 *Tabriklaymiz!* Siz yuborgan to'lov cheki adminlar tomonidan tasdiqlandi. *Bronza turniri chiptasi* profilingizga muvaffaqiyatli qo'shildi!",
          parse_mode: 'Markdown'
        });
      }
      else if (data.startsWith('reject_ticket:')) {
        const targetUserId = data.split(':')[1];
        
        const { data: userRow } = await supabase
          .from('bot_users')
          .select('*')
          .eq('telegram_id', targetUserId)
          .single();
        
        const userName = userRow ? userRow.full_name : 'Noma\'lum';
        const userPhone = userRow ? userRow.phone_number : 'Noma\'lum';
        const userDob = userRow ? userRow.dob : 'Noma\'lum';
        const userRegion = userRow ? userRow.region : 'Noma\'lum';
        
        await sendTelegram('answerCallbackQuery', {
          callback_query_id: callbackQueryId,
          text: "Chipta rad etildi."
        });
        
        const adminUsername = callbackQuery.from.username ? `@${callbackQuery.from.username}` : callbackQuery.from.first_name;
        
        // Edit admin caption
        await sendTelegram('editMessageCaption', {
          chat_id: chatId,
          message_id: callbackQuery.message.message_id,
          caption: `❌ *BRONZA TICKET RAD ETILDI!*\n\n` +
                   `👤 *Ishtirokchi:* ${userName}\n` +
                   `📞 *Telefon:* ${userPhone}\n` +
                   `📅 *Tug'ilgan sana:* ${userDob}\n` +
                   `📍 *Hudud:* ${userRegion}\n` +
                   `🆔 *Telegram ID:* ${targetUserId}\n` +
                   `✍️ *Rad etdi:* ${adminUsername}\n` +
                   `📅 *Sana:* ${new Date().toLocaleString('uz-UZ')}`,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [] }
        });
        
        // Notify user in private chat
        await sendTelegram('sendMessage', {
          chat_id: targetUserId,
          text: "❌ Kechirasiz, siz yuborgan to'lov cheki adminlar tomonidan rad etildi. Muammo bo'lsa, adminlar bilan bog'laning."
        });
      }
      return NextResponse.json({ success: true });
    }

    if (message) {
      const chatId = message.chat.id;
      const userId = message.from.id.toString();
      const text = message.text;
      const photo = message.photo;
      const contact = message.contact;

      // /start komandasi
      if (text === '/start') {
        // Holatni o'chirish
        await supabase.from('bot_states').delete().eq('telegram_id', userId);

        await sendTelegram('sendMessage', {
          chat_id: chatId,
          text: `👋 *Assalomu alaykum! Maroqli.uz kibersport botiga xush kelibsiz!*\n\nBotdan foydalanish uchun iltimos rasmiy kanalimizga a'zo bo'ling va obunani tasdiqlang:`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📢 Kanalga obuna bo'lish", url: `https://t.me/${CHANNEL_USERNAME.replace('@', '')}` }
              ],
              [
                { text: "✅ Obunani tasdiqlash", callback_data: 'check_subscription' }
              ]
            ]
          }
        });
        return NextResponse.json({ success: true });
      }

      // Foydalanuvchi holatini tekshirish
      const { data: stateRow } = await supabase
        .from('bot_states')
        .select('*')
        .eq('telegram_id', userId)
        .single();

      if (stateRow) {
        if (stateRow.step === 'AWAITING_NAME' && text) {
          await supabase.from('bot_states').update({
            step: 'AWAITING_DOB',
            full_name: text.trim()
          }).eq('telegram_id', userId);

          await sendTelegram('sendMessage', {
            chat_id: chatId,
            text: "📅 *Tug'ilgan sanangizni kiriting:*\n(Masalan: 12.04.2003)",
            parse_mode: 'Markdown'
          });
        }
        else if (stateRow.step === 'AWAITING_DOB' && text) {
          await supabase.from('bot_states').update({
            step: 'AWAITING_REGION',
            dob: text.trim()
          }).eq('telegram_id', userId);

          const regions = [
            ["Toshkent", "Andijon"],
            ["Buxoro", "Farg'ona"],
            ["Jizzax", "Namangan"],
            ["Navoiy", "Qashqadaryo"],
            ["Samarqand", "Sirdaryo"],
            ["Surxondaryo", "Xorazm"],
            ["Qoraqalpog'iston"]
          ];

          await sendTelegram('sendMessage', {
            chat_id: chatId,
            text: "📍 *Yashash hududingizni tanlang yoki yozing:*",
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: regions,
              resize_keyboard: true,
              one_time_keyboard: true
            }
          });
        }
        else if (stateRow.step === 'AWAITING_REGION' && text) {
          const region = text.trim();
          await supabase.from('bot_states').update({
            step: 'AWAITING_PHONE',
            region: region
          }).eq('telegram_id', userId);

          await sendTelegram('sendMessage', {
            chat_id: chatId,
            text: "📞 *Telefon raqamingizni yuboring:*\n(Pastdagi tugmani bosib kontakt ulashishingiz yoki yozib yuborishingiz mumkin)",
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [
                [{ text: "📞 Kontaktni ulashish", request_contact: true }]
              ],
              resize_keyboard: true,
              one_time_keyboard: true
            }
          });
        }
        else if (stateRow.step === 'AWAITING_PHONE') {
          const phone = contact?.phone_number || text || '';
          if (!phone) {
            await sendTelegram('sendMessage', {
              chat_id: chatId,
              text: "⚠️ Iltimos, telefon raqamingizni yuboring yoki yozib yuboring:"
            });
            return NextResponse.json({ success: true });
          }

          // Foydalanuvchini bot_users jadvaliga yozish
          await supabase.from('bot_users').upsert({
            telegram_id: userId,
            full_name: stateRow.full_name,
            dob: stateRow.dob,
            region: stateRow.region,
            phone_number: phone
          });

          // Holatni o'chirish
          await supabase.from('bot_states').delete().eq('telegram_id', userId);

          await sendTelegram('sendMessage', {
            chat_id: chatId,
            text: "🎉 *Muvaffaqiyatli ro'yxatdan o'tdingiz!*",
            parse_mode: 'Markdown'
          });
          await showMainMenu(chatId);
        }
        else if (stateRow.step === 'AWAITING_RECEIPT' && photo && photo.length > 0) {
          const highestPhoto = photo[photo.length - 1];
          const fileId = highestPhoto.file_id;

          const { data: userRow } = await supabase
            .from('bot_users')
            .select('*')
            .eq('telegram_id', userId)
            .single();

          const userName = userRow ? userRow.full_name : 'Noma\'lum';
          const userDob = userRow ? userRow.dob : 'Noma\'lum';
          const userRegion = userRow ? userRow.region : 'Noma\'lum';

          // Admin guruhiga yuborish
          await sendTelegram('sendPhoto', {
            chat_id: TELEGRAM_ADMIN_CHAT_ID,
            photo: fileId,
            caption: `🔔 *BRONZA TICKET TO'LOV SO'ROVI!*\n\n` +
                     `👤 *Ishtirokchi:* ${userName}\n` +
                     `📞 *Telefon:* ${userRow?.phone_number || 'Noma\'lum'}\n` +
                     `📅 *Tug'ilgan sana:* ${userDob}\n` +
                     `📍 *Hudud:* ${userRegion}\n` +
                     `🆔 *Telegram ID:* ${userId}\n` +
                     `💰 *Summa:* 10 000 UZS\n\n` +
                     `Karta: Isfandiyor Zokirjonov (\`9860010137992664\`)`,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "✅ Tasdiqlash", callback_data: `approve_ticket:${userId}` },
                  { text: "❌ Rad etish", callback_data: `reject_ticket:${userId}` }
                ]
              ]
            }
          });

          // Holatni o'chirish
          await supabase.from('bot_states').delete().eq('telegram_id', userId);

          await sendTelegram('sendMessage', {
            chat_id: chatId,
            text: "✅ *To'lov chekingiz yuborildi!*\n\nAdminlar tez orada to'lovni tasdiqlab sizga xabar berishadi. Rahmat!",
            parse_mode: 'Markdown'
          });
          await showMainMenu(chatId);
        }
        return NextResponse.json({ success: true });
      }

      // Oddiy menyu tugmalari
      if (text === "🏆 Turnirlar") {
        await sendTelegram('sendMessage', {
          chat_id: chatId,
          text: `🏆 *BRONZA TURNIRI*\n\n` +
            `🎮 *O'yin:* CS2, PUBG yoki Mobile Legends\n` +
            `💰 *Mukofot jamg'armasi:* 1 000 000 so'm\n` +
            `📅 *Boshlanish sanasi:* Tez kunda\n\n` +
            `Ushbu turnirda ishtirok etish uchun chipta xarid qilishingiz kerak.`,
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
        const { data: userRow } = await supabase
          .from('bot_users')
          .select('*')
          .eq('telegram_id', userId)
          .single();

        if (userRow) {
          await sendTelegram('sendMessage', {
            chat_id: chatId,
            text: `👤 *Sizning Profilingiz:*\n\n` +
              `📝 *F.I.SH:* ${userRow.full_name}\n` +
              `📞 *Tel:* ${userRow.phone_number || 'Kiritilmagan'}\n` +
              `📅 *Tug'ilgan sana:* ${userRow.dob}\n` +
              `📍 *Hudud:* ${userRow.region}\n` +
              `🆔 *Telegram ID:* ${userId}`,
            parse_mode: 'Markdown'
          });
        } else {
          await sendTelegram('sendMessage', {
            chat_id: chatId,
            text: "Siz hali ro'yxatdan o'tmagansiz. Qaytadan /start buyrug'ini bosing."
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Bot webhook handler error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
