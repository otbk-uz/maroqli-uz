import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserFromRequest } from '@/lib/authServer';

const supabase = supabaseAdmin;

export async function POST(req: Request) {
  try {
    // XAVFSIZLIK: kim ekanini tokendan aniqlaymiz, so'rov tanasidagi userId'ga ishonmaymiz.
    const authedUser = await getUserFromRequest(req);
    if (!authedUser) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
    }
    const userId = authedUser.id;

    const { requestId, itemType, itemId, amount, receiptUrl, itemName, username } = await req.json();

    let finalRequestId = requestId;

    if (!finalRequestId) {
      if (!itemType || !amount || !receiptUrl) {
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
      finalRequestId = requestData.id;
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
            { text: "✅ Tasdiqlash", callback_data: `approve:${finalRequestId}` },
            { text: "Rad etish ❌", callback_data: `reject:${finalRequestId}` }
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

    return NextResponse.json({ success: true, requestId: finalRequestId });
  } catch (err: any) {
    console.error("Submit request handler error:", err);
    return NextResponse.json({ error: err.message || "Server xatoligi yuz berdi." }, { status: 500 });
  }
}
