import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getPendingPayment, updatePendingPaymentStatus } from '@/lib/paymentsStore';

const supabase = supabaseAdmin;

// Telegram Bot Token & Admin Group Chat ID
const TELEGRAM_BOT_TOKEN = '8917394976:AAH8rn5mRC7hk70JKtqfL4dEaM_86-wczCM';

let rawAdminId = process.env.TELEGRAM_ADMIN_CHAT_ID || '5116279804';
if (rawAdminId && !rawAdminId.startsWith('-')) {
  rawAdminId = rawAdminId.length >= 10 ? `-100${rawAdminId}` : `-${rawAdminId}`;
}
const TELEGRAM_ADMIN_CHAT_ID = rawAdminId;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const PAYMENT_CARD_NUMBER = process.env.PAYMENT_CARD_NUMBER || '5614688706762274';
const PAYMENT_CARD_HOLDER = process.env.PAYMENT_CARD_HOLDER || '';
const CHANNEL_USERNAME = '@maroqliku';

// GET request handlers for browser checks
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Maroqli Telegram Bot Webhook Endpoint Active",
    bot: "MAROQLI TOLOV (@maroqlitolovrasmiybot)"
  });
}

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
    // XAVFSIZLIK: so'rov haqiqatan Telegram'dan kelganini tekshirish.
    // setWebhook da secret_token bergan bo'lsak, har so'rovda shu sarlavha keladi.
    if (TELEGRAM_WEBHOOK_SECRET) {
      const got = req.headers.get('x-telegram-bot-api-secret-token');
      if (got !== TELEGRAM_WEBHOOK_SECRET) {
        console.warn('Bot webhook: noto\'g\'ri yoki yo\'q secret token — rad etildi');
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
    }

    if (!TELEGRAM_BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN sozlanmagan (.env.local)');
      return NextResponse.json({ error: 'bot not configured' }, { status: 503 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch (jsonErr) {
      return NextResponse.json({ ok: true, message: 'Empty or invalid JSON' });
    }

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json({ ok: true });
    }

    // 1. Message yoki Callback Query ekanini aniqlash
    const message = body.message;
    const callbackQuery = body.callback_query;
    
    if (callbackQuery) {
      const chatId = callbackQuery.message.chat.id;
      const userId = callbackQuery.from.id.toString();
      const data = callbackQuery.data;
      const callbackQueryId = callbackQuery.id;

      if (data === 'understand_thanks' || data === 'check_subscription') {
        const isSubscribed = await checkSubscription(userId);
        if (!isSubscribed) {
          await sendTelegram('answerCallbackQuery', {
            callback_query_id: callbackQueryId,
            text: "❌ Iltimos, rasmiy kanalimizga a'zo bo'ling va keyin qayta bosing!",
            show_alert: true
          });
        } else {
          await sendTelegram('answerCallbackQuery', {
            callback_query_id: callbackQueryId,
            text: "✅ Tushunganingiz uchun rahmat!"
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
            `💳 *Karta raqami:* \`${PAYMENT_CARD_NUMBER}\`\n` +
            `👤 *Karta egasi:* ${PAYMENT_CARD_HOLDER}\n` +
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
      else if (data.startsWith('approve:') || data.startsWith('reject:')) {
        const [action, codeOrId] = data.split(':');
        const adminName = callbackQuery.from.username ? `@${callbackQuery.from.username}` : callbackQuery.from.first_name;

        // 1. Try memory store lookup first for 100% reliable execution
        let targetId = codeOrId;
        let userId = '';
        let itemType = 'GAME';
        let itemId: string | null = null;
        let amount = 0;
        let username = 'foydalanuvchi';

        const storeItem = getPendingPayment(codeOrId);
        if (storeItem) {
          targetId = storeItem.id;
          userId = storeItem.user_id;
          itemType = storeItem.item_type;
          itemId = storeItem.item_id;
          amount = storeItem.amount;
          username = storeItem.username;
        } else {
          // Fallback to Supabase
          const { data: dbRow } = await supabase
            .from('payment_requests')
            .select('*, profiles:user_id(username)')
            .eq('id', codeOrId)
            .maybeSingle();

          if (dbRow) {
            targetId = dbRow.id;
            userId = dbRow.user_id;
            itemType = dbRow.item_type;
            itemId = dbRow.item_id;
            amount = Number(dbRow.amount) || 0;
            username = dbRow.profiles?.username || 'foydalanuvchi';
          }
        }

        if (!userId) {
          await sendTelegram('answerCallbackQuery', {
            callback_query_id: callbackQueryId,
            text: "❌ Ariza topilmadi!"
          });
          return NextResponse.json({ success: true });
        }

        let itemTitle = "Mahsulot";
        if (itemType === 'GAME' && itemId) {
          const { data: gData } = await supabase
            .from('developed_games')
            .select('title')
            .eq('id', itemId)
            .maybeSingle();
          if (gData) itemTitle = gData.title;
        } else if (itemType === 'PREMIUM') {
          itemTitle = "Premium Obuna";
        }

        if (action === 'approve') {
          const dbClient = storeItem?.userToken
            ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
                global: { headers: { Authorization: storeItem.userToken.startsWith('Bearer ') ? storeItem.userToken : `Bearer ${storeItem.userToken}` } }
              })
            : supabase;

          // Update status in database
          await dbClient
            .from('payment_requests')
            .update({ status: 'APPROVED' })
            .eq('id', targetId);

          updatePendingPaymentStatus(codeOrId, 'APPROVED');

          if (itemType === 'GAME' && itemId) {
            const segment = () => {
              const bytes = crypto.getRandomValues(new Uint8Array(3));
              return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').substring(0, 4).toUpperCase();
            };
            const cdKey = `PN-${segment()}-${segment()}-${segment()}`;

            await dbClient
              .from('bought_games')
              .upsert({
                game_id: itemId,
                user_id: userId,
                cd_key: cdKey
              }, { onConflict: 'user_id,game_id' });
          } else if (itemType === 'PREMIUM') {
            await dbClient
              .from('profiles')
              .update({ is_premium: true })
              .eq('id', userId);
          }

          await sendTelegram('answerCallbackQuery', {
            callback_query_id: callbackQueryId,
            text: "✅ To'lov tasdiqlandi va o'yin/premium berildi!"
          });

          await sendTelegram('editMessageCaption', {
            chat_id: chatId,
            message_id: callbackQuery.message.message_id,
            caption: `✅ <b>TO'LOV TASDIQLANDI!</b>\n\n` +
                     `👤 <b>Foydalanuvchi:</b> @${username}\n` +
                     `🎮 <b>Mahsulot:</b> ${itemTitle}\n` +
                     `💰 <b>Summa:</b> ${amount.toLocaleString()} UZS\n` +
                     `✍️ <b>Tasdiqladi:</b> ${adminName}\n` +
                     `📅 <b>Sana:</b> ${new Date().toLocaleString('uz-UZ')}`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [] }
          });
        } else if (action === 'reject') {
          await supabase
            .from('payment_requests')
            .update({ status: 'REJECTED' })
            .eq('id', targetId);

          updatePendingPaymentStatus(codeOrId, 'REJECTED');

          await sendTelegram('answerCallbackQuery', {
            callback_query_id: callbackQueryId,
            text: "❌ To'lov rad etildi."
          });

          await sendTelegram('editMessageCaption', {
            chat_id: chatId,
            message_id: callbackQuery.message.message_id,
            caption: `❌ <b>TO'LOV RAD ETILDI!</b>\n\n` +
                     `👤 <b>Foydalanuvchi:</b> @${username}\n` +
                     `🎮 <b>Mahsulot:</b> ${itemTitle}\n` +
                     `💰 <b>Summa:</b> ${amount.toLocaleString()} UZS\n` +
                     `✍️ <b>Rad etdi:</b> ${adminName}\n` +
                     `📅 <b>Sana:</b> ${new Date().toLocaleString('uz-UZ')}`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [] }
          });
        }
      }
      else if (data === 'remind_me_tournaments') {
        try {
          await supabase.from('bot_users').upsert({
            telegram_id: userId,
            wants_tournament_reminders: true
          }, { onConflict: 'telegram_id' });
        } catch (rErr) {
          console.warn("Tournament reminder upsert warning:", rErr);
        }

        await sendTelegram('answerCallbackQuery', {
          callback_query_id: callbackQueryId,
          text: "🔔 Rahmat! Yangi turnirlar e'lon qilinishi bilanoq sizga shaxsiy xabar yuboramiz!",
          show_alert: true
        });

        await sendTelegram('editMessageText', {
          chat_id: chatId,
          message_id: callbackQuery.message.message_id,
          text: `✅ <b>Eslatib qo'yish faollashtirildi!</b>\n\n` +
            `Yangi kibersport turniri e'lon qilinishi bilanoq ushbu bot orqali sizga shaxsiy bildirishnoma yuboriladi. 🏆\n\n` +
            `📢 Rasmiy kanalimizni ham kuzatib boring: ${CHANNEL_USERNAME}`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📢 Rasmiy kanalimiz", url: `https://t.me/${CHANNEL_USERNAME.replace('@', '')}` }
              ]
            ]
          }
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
      if (text && text.trim().startsWith('/start')) {
        try {
          await supabase.from('bot_states').delete().eq('telegram_id', userId);
        } catch (sErr) {
          console.warn("bot_states delete warning:", sErr);
        }

        await sendTelegram('sendMessage', {
          chat_id: chatId,
          text: `👋 <b>Assalomu alaykum! Maroqli.uz rasmiy to'lov va yordamchi botiga xush kelibsiz!</b> 🎮\n\n` +
            `✨ <b>Ushbu bot orqali siz quyidagilarni bajarishingiz mumkin:</b>\n\n` +
            `1️⃣ 💳 <b>O'yinlar xaridi va chek yuborish</b>:\n` +
            `Sayt yoki bot orqali o'yin xarid qilishda plastik kartadan to'lov o'tkazib, to'lov cheki (skrinshot)ni ushbu botga yuborasiz. Tizim summani tekshirib, <b>1 soniya ichida o'yinni va CD-Key'ni avtomatik faollashtiradi</b>.\n\n` +
            `2️⃣ 🏆 <b>Kibersport Turnirlari</b>:\n` +
            `Maroqli platformasidagi o'yinlar hamda turnirlar uchun ro'yxatdan o'tishingiz va turnir chiptalarini olishingiz mumkin.\n\n` +
            `3️⃣ 📢 <b>Rasmiy Kanal va Yangiliklar</b>:\n` +
            `Rasmiy Telegram kanalimizga a'zo bo'lib eng so'nggi yangiliklardan va aksiyalardan xabardor bo'lasiz.\n\n` +
            `👇 <b>Tushungan bo'lsangiz va davom etish uchun quyidagi tugmani bosing:</b>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📢 Rasmiy kanalimizga a'zo bo'lish", url: `https://t.me/${CHANNEL_USERNAME.replace('@', '')}` }
              ],
              [
                { text: "✅ TUSHUNDIM, RAXMAT", callback_data: 'understand_thanks' }
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
                     `Karta: ${PAYMENT_CARD_HOLDER} (\`${PAYMENT_CARD_NUMBER}\`)`,
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
          text: `🏆 <b>Maroqli Kibersport Turnirlari</b>\n\n` +
            `⏳ <b>Hozircha faol turnirlar mavjud emas.</b>\n` +
            `Yangi katta turnirlar va mukofotli musobaqalar tez kunda e'lon qilinadi!\n\n` +
            `📢 Turnirlar boshlanganda birinchilardan bo'lib xabardor bo'lish va eslatma olish uchun quyidagi <b>"🔔 Eslatib qo'yish"</b> tugmasini bosing:`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🔔 Eslatib qo'yish (Obuna bo'lish)", callback_data: 'remind_me_tournaments' }
              ],
              [
                { text: "📢 Rasmiy kanalimiz", url: `https://t.me/${CHANNEL_USERNAME.replace('@', '')}` }
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
              `🎫 *Bronza ticket:* ${userRow.has_bronze_ticket ? '✅ Tasdiqlangan (Sizda bor)' : '❌ Sotib olinmagan'}\n` +
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
