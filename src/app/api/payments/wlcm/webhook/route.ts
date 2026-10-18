import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { wlcmClient } from '@/lib/wlcm';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature') || req.headers.get('x-webhook-signature') || '';
    const timestamp = req.headers.get('x-timestamp');

    // 1. Strict signature verification according to WLCM official security rules
    const verification = wlcmClient.verifyWebhookSignature(rawBody, signature, timestamp);
    if (!verification.valid) {
      console.warn(`[WLCM Webhook Xavfsizlik Xatosi]: ${verification.reason}`);
      return NextResponse.json({ 
        error: verification.reason || "Unauthorized: Webhook signature verification failed" 
      }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Yaroqsiz JSON formati" }, { status: 400 });
    }

    const externalId: string = payload.external_id || payload.order_id || '';
    const statusRaw: string = String(payload.status || '').toUpperCase();
    const stateRaw: number = typeof payload.state === 'number' ? payload.state : -999;
    const providerTxId: string = payload.transaction_id || payload.payment_id || '';

    // 2. Extract internal database request ID
    let dbRequestId = payload.requestId || '';
    if (!dbRequestId && externalId && externalId.includes('order_wlcm_')) {
      const parts = externalId.split('_');
      // Format: order_wlcm_<requestId>_<timestamp>
      dbRequestId = parts[2] || '';
    }

    if (!dbRequestId) {
      console.warn("[WLCM Webhook] External ID formatidan buyurtma ID topilmadi:", externalId);
      return NextResponse.json({ ok: true, message: "Ignored: No internal requestId found" });
    }

    // 3. Fetch payment request record from database
    const { data: requestData, error: fetchErr } = await supabaseAdmin
      .from('payment_requests')
      .select('*, profiles:user_id(id, username, full_name, is_premium, premium_expires_at)')
      .eq('id', dbRequestId)
      .maybeSingle();

    if (fetchErr || !requestData) {
      console.warn("[WLCM Webhook] Baza yozuvi topilmadi:", dbRequestId);
      return NextResponse.json({ ok: true, message: "Order not found in database" });
    }

    // 4. Handle Pending / In-progress state
    const isPending = 
      stateRaw === 0 || 
      statusRaw === 'PENDING' || 
      statusRaw === 'PROCESSING' || 
      statusRaw === 'WAITING';

    if (isPending) {
      return NextResponse.json({ ok: true, status: "PENDING", message: "To'lov hali kutilmoqda" });
    }

    // 5. Handle Failed / Cancelled / Rejected state
    const isFailed = 
      stateRaw === 2 || 
      stateRaw === -1 || 
      statusRaw === 'FAILED' || 
      statusRaw === 'CANCELLED' || 
      statusRaw === 'CANCELED' || 
      statusRaw === 'REJECTED';

    if (isFailed) {
      if (requestData.status === 'PENDING') {
        await supabaseAdmin
          .from('payment_requests')
          .update({ 
            status: 'REJECTED',
            updated_at: new Date().toISOString()
          })
          .eq('id', dbRequestId);
      }
      return NextResponse.json({ ok: true, status: "REJECTED", message: "To'lov bekor qilingan yoki rad etilgan" });
    }

    // 6. Handle Successful payment state
    const isSuccess = 
      stateRaw === 1 || 
      statusRaw === 'COMPLETED' || 
      statusRaw === 'SUCCESS' || 
      statusRaw === 'PAID';

    if (!isSuccess) {
      return NextResponse.json({ ok: true, message: `Noma'lum status: ${statusRaw}` });
    }

    // 7. STRICT IDEMPOTENCY: Do not re-process already approved payments
    if (requestData.status === 'APPROVED') {
      return NextResponse.json({ 
        ok: true, 
        message: "Idempotent: Ushbu buyurtma avval muvaffaqiyatli yakunlangan" 
      }, { status: 200 });
    }

    // 8. Atomic database update (only transitions from PENDING -> APPROVED)
    const { data: updatedRows, error: updateErr } = await supabaseAdmin
      .from('payment_requests')
      .update({ 
        status: 'APPROVED',
        updated_at: new Date().toISOString()
      })
      .eq('id', dbRequestId)
      .eq('status', 'PENDING')
      .select('id');

    if (updateErr || !updatedRows || updatedRows.length === 0) {
      // Parallel execution already captured the lock
      return NextResponse.json({ ok: true, message: "Already processed concurrently" }, { status: 200 });
    }

    let generatedCdKey: string | null = null;

    // 9. Process item fulfillment
    if (requestData.item_type === 'GAME' && requestData.item_id) {
      // Generate clean CD-Key: WLCM-XXXX-XXXX-XXXX
      const segment = () => {
        const bytes = crypto.getRandomValues(new Uint8Array(3));
        return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').substring(0, 4).toUpperCase();
      };
      generatedCdKey = `WLCM-${segment()}-${segment()}-${segment()}`;

      // Insert or upsert into bought_games
      await supabaseAdmin
        .from('bought_games')
        .upsert({
          game_id: requestData.item_id,
          user_id: requestData.user_id,
          cd_key: generatedCdKey
        }, { onConflict: 'user_id,game_id' });

      // Increment game sales count
      try {
        const { data: gameData } = await supabaseAdmin
          .from('developed_games')
          .select('sales_count')
          .eq('id', requestData.item_id)
          .single();

        if (gameData) {
          await supabaseAdmin
            .from('developed_games')
            .update({ sales_count: (gameData.sales_count || 0) + 1 })
            .eq('id', requestData.item_id);
        }
      } catch (cntErr) {
        console.warn("Sales count update warning:", cntErr);
      }
    } else if (requestData.item_type === 'PREMIUM') {
      // Determine days based on receipt_url or amount
      let durationDays = 30;
      const receiptStr = String(requestData.receipt_url || '');

      if (receiptStr.includes('yearly') || requestData.amount >= 140000) {
        durationDays = 365;
      } else if (receiptStr.includes('quarterly') || requestData.amount >= 75000) {
        durationDays = 90;
      }

      // Calculate expiration date
      const currentExpires = requestData.profiles?.premium_expires_at 
        ? new Date(requestData.profiles.premium_expires_at) 
        : null;

      const now = new Date();
      const baseDate = (currentExpires && currentExpires > now) ? currentExpires : now;
      const newExpires = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

      await supabaseAdmin
        .from('profiles')
        .update({ 
          is_premium: true,
          premium_expires_at: newExpires.toISOString()
        })
        .eq('id', requestData.user_id);
    }

    // 10. Send instant notification to Admin Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (botToken && adminChatId) {
      try {
        const username = requestData.profiles?.username || 'Foydalanuvchi';
        const msg = 
          `⚡ *YANGI ONLAYN TO'LOV TASDIQLANDI (WLCM)*\n\n` +
          `👤 *Foydalanuvchi:* @${username}\n` +
          `💰 *Summa:* ${requestData.amount?.toLocaleString()} UZS\n` +
          `📦 *Xarid:* ${requestData.item_type}\n` +
          (generatedCdKey ? `🔑 *CD-Key:* \`${generatedCdKey}\`\n` : '') +
          `🆔 *Tranzaksiya:* \`${providerTxId || externalId}\`\n` +
          `✅ *Holat:* Muvaffaqiyatli yakunlandi`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminChatId,
            text: msg,
            parse_mode: 'Markdown'
          })
        });
      } catch (tgErr) {
        console.warn("[Telegram Notification Warning]:", tgErr);
      }
    }

    return NextResponse.json({ 
      ok: true, 
      message: "To'lov muvaffaqiyatli qabul qilindi va tasdiqlandi" 
    }, { status: 200 });
  } catch (err: any) {
    console.error("[WLCM Webhook Error]:", err);
    return NextResponse.json({ error: "Server ichki xatoligi" }, { status: 500 });
  }
}
