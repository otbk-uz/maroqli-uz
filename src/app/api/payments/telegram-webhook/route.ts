import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const supabase = getSupabaseAdmin();

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';

export async function POST(req: Request) {
  try {
    // XAVFSIZLIK 1: so'rov haqiqatan Telegram'dan kelganini tekshirish.
    if (TELEGRAM_WEBHOOK_SECRET) {
      const got = req.headers.get('x-telegram-bot-api-secret-token');
      if (got !== TELEGRAM_WEBHOOK_SECRET) {
        console.warn('Payment webhook: secret token noto\'g\'ri — rad etildi');
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
    }

    const payload = await req.json();

    // Verify it has callback_query
    if (!payload.callback_query) {
      return NextResponse.json({ ok: true });
    }

    const callbackQuery = payload.callback_query;
    const { data: callbackData, message, from } = callbackQuery;

    if (!callbackData || !callbackData.includes(':')) {
      return NextResponse.json({ ok: true });
    }

    // XAVFSIZLIK 2: tasdiqlash tugmasi FAQAT admin guruhida ko'rinadi.
    // Shu sabab callback ayni admin chatidan kelganini talab qilamiz —
    // aks holda begona odam soxta tasdiq yubora olmaydi.
    if (TELEGRAM_ADMIN_CHAT_ID && String(message?.chat?.id) !== String(TELEGRAM_ADMIN_CHAT_ID)) {
      console.warn('Payment webhook: admin bo\'lmagan chatdan tasdiq urinishi — rad etildi');
      await answerCallbackQuery(callbackQuery.id, "Sizda bu amalni bajarish huquqi yo'q.");
      return NextResponse.json({ ok: true });
    }

    const adminUsername = from.username ? `@${from.username}` : from.first_name;
    const [action, requestId] = callbackData.split(':');

    // 1. Fetch payment request from Supabase
    const { data: requestData, error: fetchError } = await supabase
      .from('payment_requests')
      .select('*, profiles:user_id(username, full_name)')
      .eq('id', requestId)
      .single();

    if (fetchError || !requestData) {
      console.error("Payment request not found or fetch error:", fetchError);
      await answerCallbackQuery(callbackQuery.id, "Ariza topilmadi yoki xatolik yuz berdi.");
      return NextResponse.json({ ok: true });
    }

    if (requestData.status !== 'PENDING') {
      await answerCallbackQuery(callbackQuery.id, "Ushbu ariza allaqachon ko'rib chiqilgan.");
      return NextResponse.json({ ok: true });
    }

    let itemTitle = "Mahsulot";
    if (requestData.item_type === 'GAME') {
      const { data: gameData } = await supabase
        .from('developed_games')
        .select('title')
        .eq('id', requestData.item_id)
        .single();
      if (gameData) itemTitle = gameData.title;
    } else if (requestData.item_type === 'PREMIUM') {
      itemTitle = "Premium Obuna";
    }

    let finalMessage = "";

    if (action === 'approve') {
      // ATOMIK yangilash: faqat hali PENDING bo'lsa APPROVED qilamiz.
      // Bu bir arizani ikki marta tasdiqlash (qo'sh CD-key/premium) oldini oladi.
      const { data: approvedRows, error: updateError } = await supabase
        .from('payment_requests')
        .update({ status: 'APPROVED' })
        .eq('id', requestId)
        .eq('status', 'PENDING')
        .select('id');

      if (updateError) throw updateError;
      if (!approvedRows || approvedRows.length === 0) {
        // Boshqa admin allaqachon ko'rib chiqqan
        await answerCallbackQuery(callbackQuery.id, "Ushbu ariza allaqachon ko'rib chiqilgan.");
        return NextResponse.json({ ok: true });
      }

      if (requestData.item_type === 'GAME') {
        // Xavfsiz CD-Key (crypto — bashorat qilib bo'lmaydi)
        const segment = () => {
          const bytes = crypto.getRandomValues(new Uint8Array(3));
          return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').substring(0, 4).toUpperCase();
        };
        const cdKey = `PN-${segment()}-${segment()}-${segment()}`;

        // Insert into bought_games table
        const { error: boughtError } = await supabase
          .from('bought_games')
          .insert({
            game_id: requestData.item_id,
            user_id: requestData.user_id,
            cd_key: cdKey
          });

        if (boughtError) throw boughtError;
      } else if (requestData.item_type === 'PREMIUM') {
        // Update user premium status in profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_premium: true })
          .eq('id', requestData.user_id);

        if (profileError) throw profileError;
      }

      finalMessage = `✅ *TO'LOV TASDIQLANDI!*\n\n` +
                     `👤 *Foydalanuvchi:* @${requestData.profiles?.username || 'foydalanuvchi'}\n` +
                     `🎮 *Mahsulot:* ${itemTitle}\n` +
                     `💰 *Summa:* ${parseFloat(requestData.amount).toLocaleString()} UZS\n` +
                     `✍️ *Tasdiqladi:* ${adminUsername}\n` +
                     `📅 *Sana:* ${new Date().toLocaleString('uz-UZ')}`;

      await answerCallbackQuery(callbackQuery.id, "To'lov muvaffaqiyatli tasdiqlandi!");
    } else if (action === 'reject') {
      // Reject request status
      const { error: updateError } = await supabase
        .from('payment_requests')
        .update({ status: 'REJECTED' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      finalMessage = `❌ *TO'LOV RAD ETILDI!*\n\n` +
                     `👤 *Foydalanuvchi:* @${requestData.profiles?.username || 'foydalanuvchi'}\n` +
                     `🎮 *Mahsulot:* ${itemTitle}\n` +
                     `💰 *Summa:* ${parseFloat(requestData.amount).toLocaleString()} UZS\n` +
                     `✍️ *Rad etdi:* ${adminUsername}\n` +
                     `📅 *Sana:* ${new Date().toLocaleString('uz-UZ')}`;

      await answerCallbackQuery(callbackQuery.id, "To'lov so'rovi rad etildi.");
    }

    // Update Telegram message caption & remove inline buttons
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && message) {
      const telegramUrl = `https://api.telegram.org/bot${botToken}/editMessageCaption`;
      await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: message.chat.id,
          message_id: message.message_id,
          caption: finalMessage,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [] }
        })
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Telegram callback webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;
  const telegramUrl = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
  await fetch(telegramUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text
    })
  });
}
