import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const { userId, itemType, itemId, amount, receiptUrl, itemName, username } = await req.json();

    if (!userId || !itemType || !amount || !receiptUrl) {
      return NextResponse.json({ error: "Barcha majburiy maydonlarni to'ldiring." }, { status: 400 });
    }

    // 1. Insert request into payment_requests table
    const { data: requestData, error: insertError } = await supabase
      .from('payment_requests')
      .insert({
        user_id: userId,
        item_type: itemType,
        item_id: itemId || null,
        amount: parseFloat(amount),
        receipt_url: receiptUrl,
        status: 'PENDING'
      })
      .select()
      .single();

    if (insertError) {
      console.error("Supabase payment request insert error:", insertError);
      return NextResponse.json({ error: "To'lov arizasini bazada yaratishda xatolik yuz berdi." }, { status: 500 });
    }

    // 2. Notify Telegram Bot Admin
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (botToken && adminChatId) {
      const cleanItemName = itemName || (itemType === 'PREMIUM' ? 'Premium Obuna' : 'O\'yin');
      const caption = `🔔 *YANGI TO'LOV SO'ROVI!*\n\n` +
                      `👤 *Foydalanuvchi:* @${username || 'foydalanuvchi'}\n` +
                      `🎮 *Mahsulot:* ${cleanItemName}\n` +
                      `💰 *Summa:* ${parseFloat(amount).toLocaleString()} UZS\n` +
                      `📅 *Sana:* ${new Date().toLocaleString('uz-UZ')}\n\n` +
                      `To'lovni tekshiring va quyidagi amallardan birini tanlang:`;

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: "✅ Tasdiqlash", callback_data: `approve:${requestData.id}` },
            { text: "Rad etish ❌", callback_data: `reject:${requestData.id}` }
          ]
        ]
      };

      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
      const res = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          photo: receiptUrl,
          caption: caption,
          parse_mode: 'Markdown',
          reply_markup: inlineKeyboard
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Telegram sendPhoto API failed:", errText);
      }
    } else {
      console.warn("Telegram BOT settings are not configured. Request saved in database only.");
    }

    return NextResponse.json({ success: true, requestId: requestData.id });
  } catch (err: any) {
    console.error("Submit request handler error:", err);
    return NextResponse.json({ error: err.message || "Server xatoligi yuz berdi." }, { status: 500 });
  }
}
