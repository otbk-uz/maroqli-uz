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

    const adminTargets = [
      '8647586001',
      '1493433394',
      process.env.TELEGRAM_ADMIN_CHAT_ID,
      '5116279804'
    ].filter((v, idx, arr) => v && arr.indexOf(v) === idx);

    if (botToken && adminTargets.length > 0) {
      const isHttpUrl = receiptUrl && (receiptUrl.startsWith('http://') || receiptUrl.startsWith('https://'));
      const safeUsername = username ? username.replace(/[<>&]/g, '') : 'foydalanuvchi';
      const safeItemName = cleanItemName ? cleanItemName.replace(/[<>&]/g, '') : "O'yin";

      const htmlCaption = `🛒 <b>YANGI BUYURTMA (TO'LOV SO'ROVI)</b>\n\n` +
        `👤 <b>Foydalanuvchi:</b> @${safeUsername}\n` +
        `🎮 <b>Mahsulot:</b> ${safeItemName}\n` +
        `💰 <b>Summa:</b> ${reqAmount.toLocaleString()} UZS\n` +
        `📅 <b>Sana:</b> ${new Date().toLocaleString('uz-UZ')}\n\n` +
        `To'lovni tekshiring va quyidagi amallardan birini tanlang:`;

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: "✅ Tasdiqlash", callback_data: `approve:${finalRequestId}` },
            { text: "Rad etish ❌", callback_data: `reject:${finalRequestId}` }
          ]
        ]
      };

      for (const targetChatId of adminTargets) {
        try {
          if (isHttpUrl) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: targetChatId,
                photo: receiptUrl,
                caption: htmlCaption,
                parse_mode: 'HTML',
                reply_markup: inlineKeyboard
              })
            });
          } else {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: targetChatId,
                text: htmlCaption + `\n\n🖼 <b>Chek skrinshoti:</b> (Sayt / Admin Paneldan ko'ring)`,
                parse_mode: 'HTML',
                reply_markup: inlineKeyboard
              })
            });
          }
        } catch (tErr) {
          console.error(`Telegram notification error for ${targetChatId}:`, tErr);
        }
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
