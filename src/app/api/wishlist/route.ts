import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('game_id');
    const userId = searchParams.get('user_id');

    if (gameId) {
      // Fetch total count for a specific game
      const { count } = await supabaseAdmin
        .from('game_wishlist')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', gameId);

      let isWishlisted = false;
      if (userId) {
        const { data: userWish } = await supabaseAdmin
          .from('game_wishlist')
          .select('id')
          .eq('game_id', gameId)
          .eq('user_id', userId)
          .maybeSingle();

        if (userWish) isWishlisted = true;
      }

      return NextResponse.json({
        game_id: gameId,
        count: count || 0,
        isWishlisted
      });
    }

    // Otherwise, fetch all wishlist items for Admin Panel & Catalog counts
    const { data: items, error } = await supabaseAdmin
      .from('game_wishlist')
      .select('id, created_at, user_id, game_id, profiles(id, username, full_name, phone_number, avatar_url), developed_games(id, title, slug, price, cover)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Fetch all wishlist error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Build counts map per game
    const countsMap: Record<string, number> = {};
    (items || []).forEach((item: any) => {
      if (item.game_id) {
        countsMap[item.game_id] = (countsMap[item.game_id] || 0) + 1;
      }
    });

    return NextResponse.json({
      items: items || [],
      countsMap
    });
  } catch (err: any) {
    console.error("Wishlist GET API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, game_id } = body;

    if (!user_id || !game_id) {
      return NextResponse.json({ error: 'user_id and game_id are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('game_wishlist')
      .upsert({
        user_id,
        game_id
      }, { onConflict: 'user_id,game_id' })
      .select('id, created_at, user_id, game_id');

    if (error) {
      console.error("Wishlist POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get updated count for this game
    const { count } = await supabaseAdmin
      .from('game_wishlist')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game_id);

    return NextResponse.json({
      ok: true,
      isWishlisted: true,
      count: count || 0,
      item: data ? data[0] : null
    });
  } catch (err: any) {
    console.error("Wishlist POST API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get('user_id');
    let gameId = searchParams.get('game_id');

    if (!userId || !gameId) {
      try {
        const body = await req.json();
        userId = userId || body.user_id;
        gameId = gameId || body.game_id;
      } catch {}
    }

    if (!userId || !gameId) {
      return NextResponse.json({ error: 'user_id and game_id are required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('game_wishlist')
      .delete()
      .eq('user_id', userId)
      .eq('game_id', gameId);

    if (error) {
      console.error("Wishlist DELETE error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get updated count for this game
    const { count } = await supabaseAdmin
      .from('game_wishlist')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId);

    return NextResponse.json({
      ok: true,
      isWishlisted: false,
      count: count || 0
    });
  } catch (err: any) {
    console.error("Wishlist DELETE API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
