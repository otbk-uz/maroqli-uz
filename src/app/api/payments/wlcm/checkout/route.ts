import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { wlcmClient } from '@/lib/wlcm';

const isUuid = (str: any) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

const PREMIUM_PLANS: Record<string, { title: string; price: number; days: number }> = {
  monthly: { title: "1 Oylik Premium", price: 29000, days: 30 },
  quarterly: { title: "3 Oylik Premium", price: 79000, days: 90 },
  yearly: { title: "1 Yillik Premium", price: 149000, days: 365 },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, itemType, itemId, paymentProvider, returnUrl: customReturnUrl } = body;

    // 1. Mandatory input checks
    if (!userId || !itemType) {
      return NextResponse.json({ error: "Foydalanuvchi yoki xarid turi ko'rsatilmagan." }, { status: 400 });
    }

    if (itemType !== 'GAME' && itemType !== 'PREMIUM') {
      return NextResponse.json({ error: "Noto'g'ri xarid turi." }, { status: 400 });
    }

    // 2. Verify user profile exists
    const { data: userProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, username, is_premium')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr || !userProfile) {
      return NextResponse.json({ error: "Foydalanuvchi tizimda topilmadi." }, { status: 404 });
    }

    let verifiedAmount = 0;
    let verifiedTitle = '';
    let dbItemId: string | null = null;
    let planKey: string | null = null;

    // 3. Server-side price calculation & ownership verification
    if (itemType === 'GAME') {
      if (!itemId || !isUuid(itemId)) {
        return NextResponse.json({ error: "O'yin identifikatori (UUID) noto'g'ri." }, { status: 400 });
      }

      // Check if user already owns this game
      const { data: alreadyOwned } = await supabaseAdmin
        .from('bought_games')
        .select('id')
        .eq('user_id', userId)
        .eq('game_id', itemId)
        .maybeSingle();

      if (alreadyOwned) {
        return NextResponse.json({ error: "Siz ushbu o'yinni avval xarid qilgansiz." }, { status: 400 });
      }

      // Fetch authentic game details from DB
      const { data: game, error: gameErr } = await supabaseAdmin
        .from('developed_games')
        .select('id, title, price, premium_price')
        .eq('id', itemId)
        .single();

      if (gameErr || !game) {
        return NextResponse.json({ error: "Xarid qilinayotgan o'yin bazada topilmadi." }, { status: 404 });
      }

      dbItemId = game.id;
      verifiedTitle = `${game.title} - Maroqli.uz O'yini`;
      const basePrice = Math.max(0, parseFloat(game.price as any) || 0);

      // Apply authentic premium discount if user has active premium status
      if (userProfile.is_premium) {
        verifiedAmount = game.premium_price 
          ? Math.max(0, parseFloat(game.premium_price as any))
          : Math.round(basePrice * 0.8);
      } else {
        verifiedAmount = basePrice;
      }
    } else if (itemType === 'PREMIUM') {
      planKey = (typeof itemId === 'string' && itemId.toLowerCase() in PREMIUM_PLANS) 
        ? itemId.toLowerCase() 
        : 'monthly';

      const selectedPlan = PREMIUM_PLANS[planKey];
      verifiedTitle = `${selectedPlan.title} - Maroqli.uz Obunasi`;
      verifiedAmount = selectedPlan.price;
    }

    if (verifiedAmount <= 0) {
      return NextResponse.json({ error: "To'lov summasi 0 bo'lishi mumkin emas." }, { status: 400 });
    }

    // 4. Create pending payment request in database
    const metadataPayload = {
      planKey,
      itemName: verifiedTitle,
      user_id: userId,
      verifiedAt: new Date().toISOString()
    };

    let requestId: string = '';

    const { data: requestData, error: insertError } = await supabaseAdmin
      .from('payment_requests')
      .insert({
        user_id: userId,
        item_type: itemType,
        item_id: dbItemId,
        amount: verifiedAmount,
        status: 'PENDING',
        receipt_url: `WLCM_GATEWAY:${itemType}:${planKey || dbItemId || 'item'}`
      })
      .select('id')
      .single();

    if (insertError || !requestData) {
      console.error("[WLCM DB Insert Error]:", insertError);
      return NextResponse.json({ error: "To'lov arizasini bazada qayd etishda xatolik yuz berdi." }, { status: 500 });
    }

    requestId = requestData.id;
    const orderId = `order_wlcm_${requestId}_${Date.now()}`;

    // 5. Construct return URL safely
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://maroqli.uz';
    const defaultReturnUrl = itemType === 'GAME'
      ? `${appUrl}/profile/library?orderId=${encodeURIComponent(orderId)}&payment=success`
      : `${appUrl}/premium?orderId=${encodeURIComponent(orderId)}&payment=success`;
    const finalReturnUrl = customReturnUrl || defaultReturnUrl;

    // 6. Request checkout session from WLCM Gateway
    const checkoutResult = await wlcmClient.createCheckoutSession({
      externalId: orderId,
      amount: verifiedAmount,
      currency: 'UZS',
      description: verifiedTitle,
      returnUrl: finalReturnUrl,
      paymentProvider: paymentProvider || 'payme'
    });

    return NextResponse.json({
      success: true,
      requestId,
      orderId,
      amount: verifiedAmount,
      checkoutUrl: checkoutResult.checkoutUrl
    });
  } catch (err: any) {
    console.error("[WLCM Checkout Route Error]:", err.message);
    return NextResponse.json({ 
      error: "To'lov shlyuziga ulanishda xatolik yuz berdi. Iltimos qayta urinib ko'ring." 
    }, { status: 500 });
  }
}
