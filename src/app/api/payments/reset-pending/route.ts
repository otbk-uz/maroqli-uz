import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromRequest } from '@/lib/authServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const authedUser = await getUserFromRequest(req);
    if (!authedUser) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi." }, { status: 401 });
    }

    const { gameId, itemType } = await req.json().catch(() => ({}));

    // Update PENDING payment requests for user to REJECTED so user can resubmit
    let query = supabaseAdmin
      .from('payment_requests')
      .update({ status: 'REJECTED' })
      .eq('user_id', authedUser.id)
      .eq('status', 'PENDING');

    if (gameId) {
      query = query.eq('item_id', gameId);
    }
    if (itemType) {
      query = query.eq('item_type', itemType);
    }

    const { error } = await query;
    if (error) {
      console.error("Reset pending payment error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Kutishdagi so'rov tozalandi." });
  } catch (err: any) {
    console.error("Reset pending exception:", err);
    return NextResponse.json({ error: err.message || "Server xatoligi." }, { status: 500 });
  }
}
