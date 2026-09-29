import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { wlcmClient } from '@/lib/wlcm';

const isUuid = (str: any) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, itemType, itemId, amount, itemName } = body;

    if (!userId || !itemType || !amount) {
      return NextResponse.json({ error: "Majburiy parametrlar kiritilmagan." }, { status: 400 });
    }

    const validItemId = isUuid(itemId) ? itemId : null;
    const numericAmount = parseFloat(amount) || 0;

    let requestId: any = null;

    // 1. Create a payment request in Supabase payment_requests table (non-fatal if RLS blocks)
    try {
      const { data: requestData, error: insertError } = await supabaseAdmin
        .from('payment_requests')
        .insert({
          user_id: userId,
          item_type: itemType,
          item_id: validItemId,
          amount: numericAmount,
          status: 'PENDING',
          receipt_url: 'https://sandbox.wlcm.uz/receipt'
        })
        .select('*')
        .maybeSingle();

      if (insertError) {
        console.warn("Payment request DB insert warning (non-fatal):", insertError);
      } else if (requestData) {
        requestId = requestData.id;
      }
    } catch (dbErr) {
      console.warn("Payment request DB insert exception (non-fatal):", dbErr);
    }

    const orderId = requestId
      ? `order_wlcm_${requestId}_${Date.now()}`
      : `order_wlcm_${Date.now()}`;

    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://maroqli.uz'}/premium/pay-simulate?transaction_id=${requestId || 'temp'}&provider=payme`;

    // 2. Call WLCM Payment Gateway to create checkout session
    const checkoutResult = await wlcmClient.createCheckoutSession({
      externalId: orderId,
      amount: numericAmount,
      currency: 'UZS',
      description: `${itemName || 'Maroqli.uz xaridi'} (WLCM Gateway)`,
      returnUrl: returnUrl
    });

    return NextResponse.json({
      success: true,
      requestId: requestId,
      checkoutUrl: checkoutResult.checkoutUrl,
      orderId: orderId
    });
  } catch (err: any) {
    console.error("WLCM checkout API error:", err);
    return NextResponse.json({ error: err.message || "To'lov oqimida xatolik yuz berdi." }, { status: 500 });
  }
}
