import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserFromRequest } from '@/lib/authServer';

export async function POST(req: Request) {
  try {
    // XAVFSIZLIK: kim ekanini tokendan aniqlaymiz, so'rov tanasidagi userId'ga ishonmaymiz.
    const authedUser = await getUserFromRequest(req);
    if (!authedUser) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
    }
    const userId = authedUser.id;

    // Direct auth client setup so RLS accepts user insert if service role key is absent
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? supabaseAdmin
      : createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { global: { headers: { Authorization: authHeader } } }
        );

    const { requestId, itemType, itemId, amount, receiptUrl, itemName, username } = await req.json();

    let finalRequestId = requestId;
    const reqAmount = parseFloat(amount || 0);

    if (!itemType || reqAmount <= 0 || !receiptUrl) {
      return NextResponse.json({ error: "Barcha majburiy maydonlarni to'ldiring." }, { status: 400 });
    }

    // 1. Fetch item details for verification & price check
    let targetPrice = reqAmount;
    let cleanItemName = itemName || (itemType === 'PREMIUM' ? 'Premium Obuna' : "O'yin");

    // XAVFSIZLIK: soxta chek skrinshotlari orqali o'yinlarni tekinga olib ketmaslik uchun
    // barcha cheklar Telegram Bot (admin) va Admin Panel orqali 1-bosish bilan tekshirilib tasdiqlanadi.
    let isAutoApprovable = false;

    if (itemType === 'GAME' && itemId) {
      const { data: gameData } = await supabaseAdmin
        .from('developed_games')
        .select('id, title, price, premium_price')
        .eq('id', itemId)
        .maybeSingle();

      if (gameData) {
        cleanItemName = gameData.title;
        targetPrice = Number(gameData.price) || 0;
      }
    } else if (itemType === 'PREMIUM') {
      targetPrice = 29000; // Standard premium price in UZS
    }

    let initialStatus = isAutoApprovable ? 'APPROVED' : 'PENDING';
    let generatedCdKey: string | null = null;

    // 2. Insert request into payment_requests table (NO non-existent approval_type column)
    const { data: requestData, error: insertError } = await supabase
      .from('payment_requests')
      .insert({
        user_id: userId,
        item_type: itemType,
        item_id: itemId || null,
        amount: reqAmount,
        receipt_url: receiptUrl,
        status: initialStatus
      })
      .select()
      .single();

    if (insertError) {
      console.error("Supabase payment request insert error:", insertError);
      return NextResponse.json({ error: insertError.message || "To'lov arizasini bazada yaratishda xatolik yuz berdi." }, { status: 500 });
    }
    finalRequestId = requestData.id;

    // 3. If AUTO APPROVED, grant game access or premium immediately using admin client
    if (isAutoApprovable) {
      if (itemType === 'GAME' && itemId) {
        // Generate CD Key
        const segment = () => {
          const bytes = crypto.getRandomValues(new Uint8Array(3));
          return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').substring(0, 4).toUpperCase();
        };
        generatedCdKey = `PN-${segment()}-${segment()}-${segment()}`;

        // Insert into bought_games table
        await supabaseAdmin
          .from('bought_games')
          .upsert({
            game_id: itemId,
            user_id: userId,
            cd_key: generatedCdKey
          }, { onConflict: 'user_id,game_id' });
      } else if (itemType === 'PREMIUM') {
        await supabaseAdmin
          .from('profiles')
          .update({ is_premium: true })
          .eq('id', userId);
      }
    }

    // 4. Notify Telegram Bot Admin
    const NEW_BOT_TOKEN = '8917394976:AAFmQ8dwmSs2yTs8IudHSQ1WzlahLL02_4U';
    const botToken = (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.startsWith('8917394976'))
      ? process.env.TELEGRAM_BOT_TOKEN
      : NEW_BOT_TOKEN;

    let rawAdminId = process.env.TELEGRAM_ADMIN_CHAT_ID || '5116279804';
    if (rawAdminId && !rawAdminId.startsWith('-')) {
      rawAdminId = rawAdminId.length >= 10 ? `-100${rawAdminId}` : `-${rawAdminId}`;
    }
    const adminChatId = rawAdminId;

    if (botToken && adminChatId) {
      let caption = "";
      let inlineKeyboard: any = { inline_keyboard: [] };

      if (isAutoApprovable) {
        caption = `⚡ *AVTOMATIK TO'LOV TASDIQLANDI!*\n\n` +
                  `👤 *Foydalanuvchi:* @${username || 'foydalanuvchi'}\n` +
                  `🎮 *Mahsulot:* ${cleanItemName}\n` +
                  `💰 *Summa:* ${reqAmount.toLocaleString()} UZS\n` +
                  `🤖 *Tizim:* Avtomatik tekshirildi va CD-Key berildi!\n` +
                  `🔑 *CD-Key:* \`${generatedCdKey || 'FAOL'}\`\n` +
                  `📅 *Sana:* ${new Date().toLocaleString('uz-UZ')}`;
      } else {
        caption = `🔔 *YANGI TO'LOV SO'ROVI (Qo'lda tekshirish)*\n\n` +
                  `👤 *Foydalanuvchi:* @${username || 'foydalanuvchi'}\n` +
                  `🎮 *Mahsulot:* ${cleanItemName}\n` +
                  `💰 *Summa:* ${reqAmount.toLocaleString()} UZS\n` +
                  `📅 *Sana:* ${new Date().toLocaleString('uz-UZ')}\n\n` +
                  `To'lovni tekshiring va quyidagi amallardan birini tanlang:`;

        inlineKeyboard = {
          inline_keyboard: [
            [
              { text: "✅ Tasdiqlash", callback_data: `approve:${finalRequestId}` },
              { text: "Rad etish ❌", callback_data: `reject:${finalRequestId}` }
            ]
          ]
        };
      }

      // Check if receiptUrl is a valid http link vs data url for Telegram
      const isHttpUrl = receiptUrl.startsWith('http://') || receiptUrl.startsWith('https://');

      if (isHttpUrl) {
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
        await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminChatId,
            photo: receiptUrl,
            caption: caption,
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard
          })
        }).catch(err => console.error("Telegram sendPhoto error:", err));
      } else {
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminChatId,
            text: caption + `\n\n🖼 *Chek skrinshoti:* (Sayt/Admin Paneldan ko'ring)`,
            parse_mode: 'Markdown',
            reply_markup: inlineKeyboard
          })
        }).catch(err => console.error("Telegram sendMessage error:", err));
      }
    }

    return NextResponse.json({
      success: true,
      autoApproved: isAutoApprovable,
      requestId: finalRequestId,
      cdKey: generatedCdKey
    });
  } catch (err: any) {
    console.error("Submit request handler error:", err);
    return NextResponse.json({ error: err.message || "Server xatoligi yuz berdi." }, { status: 500 });
  }
}
