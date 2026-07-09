import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
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
      // Update payment_request status
      const { error: updateError } = await supabase
        .from('payment_requests')
        .update({ status: 'APPROVED' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      if (requestData.item_type === 'GAME') {
        // Generate CD Key
        const segment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
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
