import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { wlcmClient } from '@/lib/wlcm';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature') || req.headers.get('x-signature') || '';

    // Verify webhook payload signature
    if (signature && !wlcmClient.verifyWebhookSignature(rawBody, signature)) {
      console.warn("WLCM webhook invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    console.log("WLCM Webhook payload received:", payload);

    const { external_id, status, requestId } = payload;
    const isSuccess = status === 'completed' || status === 'SUCCESS' || status === 'PAID';

    if (!isSuccess) {
      return NextResponse.json({ ok: true });
    }

    // Extract database payment request ID
    let dbRequestId = requestId;
    if (!dbRequestId && external_id && external_id.includes('order_wlcm_')) {
      const parts = external_id.split('_');
      dbRequestId = parts[2];
    }

    if (!dbRequestId) {
      return NextResponse.json({ ok: true });
    }

    // 1. Fetch payment request
    const { data: requestData, error: fetchErr } = await supabaseAdmin
      .from('payment_requests')
      .select('*, profiles:user_id(username, full_name)')
      .eq('id', dbRequestId)
      .single();

    if (fetchErr || !requestData) {
      console.error("Payment request not found:", fetchErr);
      return NextResponse.json({ ok: true });
    }

    if (requestData.status !== 'PENDING') {
      return NextResponse.json({ ok: true, message: "Already processed" });
    }

    // 2. Mark payment request as APPROVED
    await supabaseAdmin
      .from('payment_requests')
      .update({ status: 'APPROVED' })
      .eq('id', dbRequestId);

    // 3. Process item fulfillment
    if (requestData.item_type === 'GAME') {
      const segment = () => {
        const bytes = crypto.getRandomValues(new Uint8Array(3));
        return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').substring(0, 4).toUpperCase();
      };
      const cdKey = `WLCM-${segment()}-${segment()}-${segment()}`;

      await supabaseAdmin
        .from('bought_games')
        .insert({
          game_id: requestData.item_id,
          user_id: requestData.user_id,
          cd_key: cdKey
        });
    } else if (requestData.item_type === 'PREMIUM') {
      await supabaseAdmin
        .from('profiles')
        .update({ is_premium: true })
        .eq('id', requestData.user_id);
    }

    return NextResponse.json({ ok: true, message: "Payment processed successfully" });
  } catch (err: any) {
    console.error("WLCM webhook processing error:", err);
    return NextResponse.json({ ok: true });
  }
}
