import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { wlcmClient } from '@/lib/wlcm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, itemType, itemId, amount, itemName } = body;

    if (!userId || !itemType || !amount) {
      return NextResponse.json({ error: "Majburiy parametrlar kiritilmagan." }, { status: 400 });
    }

    // 1. Create a payment request in Supabase payment_requests table
    const { data: requestData, error: insertError } = await supabaseAdmin
      .from('payment_requests')
      .insert({
        user_id: userId,
        item_type: itemType,
        item_id: itemId || null,
        amount: amount,
        status: 'PENDING',
        receipt_url: 'WLCM_GATEWAY_SANDBOX'
      })
      .select('*')
      .single();

    if (insertError) {
      console.error("Payment request DB insert error:", insertError);
      return NextResponse.json({ error: "Bazada tranzaksiya yaratishda xatolik." }, { status: 500 });
    }

    const orderId = `order_wlcm_${requestData.id}_${Date.now()}`;
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://maroqli.uz'}/premium/pay-simulate?transaction_id=${requestData.id}&provider=payme`;

    // 2. Call WLCM Payment Gateway to create checkout session
    const checkoutResult = await wlcmClient.createCheckoutSession({
      externalId: orderId,
      amount: amount,
      currency: 'UZS',
      description: `${itemName || 'Maroqli.uz xaridi'} (WLCM Gateway)`,
      returnUrl: returnUrl
    });

    return NextResponse.json({
      success: true,
      requestId: requestData.id,
      checkoutUrl: checkoutResult.checkoutUrl,
      orderId: orderId
    });
  } catch (err: any) {
    console.error("WLCM checkout API error:", err);
    return NextResponse.json({ error: err.message || "To'lov oqimida xatolik yuz berdi." }, { status: 500 });
  }
}
