import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('game_id');
    const userId = searchParams.get('user_id');

    if (gameId) {
      // Fetch wishlist items from bot_users (region=WISHLIST) & game_wishlist
      const { data: botWish } = await supabaseAdmin
        .from('bot_users')
        .select('full_name')
        .eq('region', 'WISHLIST')
        .eq('dob', gameId);

      const { data: directWish } = await supabaseAdmin
        .from('game_wishlist')
        .select('user_id')
        .eq('game_id', gameId);

      const uniqueUsers = new Set<string>();
      (botWish || []).forEach(w => w.full_name && uniqueUsers.add(w.full_name));
      (directWish || []).forEach(w => w.user_id && uniqueUsers.add(w.user_id));

      let isWishlisted = false;
      if (userId && uniqueUsers.has(userId)) {
        isWishlisted = true;
      }

      return NextResponse.json({
        game_id: gameId,
        count: uniqueUsers.size,
        isWishlisted
      });
    }

    // Fetch all wishlist items for Admin Panel & Catalog counts
    const { data: botItems } = await supabaseAdmin
      .from('bot_users')
      .select('telegram_id, created_at, full_name, dob')
      .eq('region', 'WISHLIST')
      .order('created_at', { ascending: false });

    const { data: directItems } = await supabaseAdmin
      .from('game_wishlist')
      .select('id, created_at, user_id, game_id')
      .order('created_at', { ascending: false });

    // Combine items map keyed by user_id:game_id
    const mergedMap = new Map<string, { id: string; created_at: string; user_id: string; game_id: string }>();

    (directItems || []).forEach((item: any) => {
      if (item.user_id && item.game_id) {
        mergedMap.set(`${item.user_id}:${item.game_id}`, {
          id: item.id || `wish_${item.user_id}_${item.game_id}`,
          created_at: item.created_at,
          user_id: item.user_id,
          game_id: item.game_id
        });
      }
    });

    (botItems || []).forEach((item: any) => {
      const uId = item.full_name;
      const gId = item.dob;
      if (uId && gId && !mergedMap.has(`${uId}:${gId}`)) {
        mergedMap.set(`${uId}:${gId}`, {
          id: item.telegram_id,
          created_at: item.created_at,
          user_id: uId,
          game_id: gId
        });
      }
    });

    const mergedList = Array.from(mergedMap.values());

    const userIds = Array.from(new Set(mergedList.map(i => i.user_id)));
    const gameIds = Array.from(new Set(mergedList.map(i => i.game_id)));

    let profilesMap: Record<string, any> = {};
    let gamesMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: pData } = await supabaseAdmin
        .from('profiles')
        .select('id, username, full_name, phone_number, avatar_url')
        .in('id', userIds);
      if (pData) {
        pData.forEach(p => { profilesMap[p.id] = p; });
      }
    }

    if (gameIds.length > 0) {
      const { data: gData } = await supabaseAdmin
        .from('developed_games')
        .select('id, title, slug, price, cover')
        .in('id', gameIds);
      if (gData) {
        gData.forEach(g => { gamesMap[g.id] = g; });
      }
    }

    const items = mergedList.map(item => ({
      id: item.id,
      created_at: item.created_at,
      user_id: item.user_id,
      game_id: item.game_id,
      profiles: profilesMap[item.user_id] || null,
      developed_games: gamesMap[item.game_id] || null
    }));

    const countsMap: Record<string, number> = {};
    mergedList.forEach(item => {
      if (item.game_id) {
        countsMap[item.game_id] = (countsMap[item.game_id] || 0) + 1;
      }
    });

    return NextResponse.json({
      items,
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

    const wishKey = `wishlist:${user_id}:${game_id}`;

    // 1. Guaranteed DB write to bot_users (region=WISHLIST)
    await supabaseAdmin
      .from('bot_users')
      .upsert({
        telegram_id: wishKey,
        full_name: user_id,
        dob: game_id,
        region: 'WISHLIST'
      }, { onConflict: 'telegram_id' });

    // 2. Best-effort write to game_wishlist
    try {
      await supabaseAdmin
        .from('game_wishlist')
        .upsert({ user_id, game_id }, { onConflict: 'user_id,game_id' });
    } catch (e) {
      console.warn("game_wishlist upsert warning:", e);
    }

    // 3. Count updated wishlist entries for game_id
    const { data: botWish } = await supabaseAdmin
      .from('bot_users')
      .select('full_name')
      .eq('region', 'WISHLIST')
      .eq('dob', game_id);

    const { data: directWish } = await supabaseAdmin
      .from('game_wishlist')
      .select('user_id')
      .eq('game_id', game_id);

    const uniqueUsers = new Set<string>();
    (botWish || []).forEach(w => w.full_name && uniqueUsers.add(w.full_name));
    (directWish || []).forEach(w => w.user_id && uniqueUsers.add(w.user_id));

    return NextResponse.json({
      ok: true,
      isWishlisted: true,
      count: uniqueUsers.size
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

    const wishKey = `wishlist:${userId}:${gameId}`;

    // 1. Delete from bot_users (region=WISHLIST)
    await supabaseAdmin
      .from('bot_users')
      .delete()
      .eq('telegram_id', wishKey);

    // 2. Delete from game_wishlist
    try {
      await supabaseAdmin
        .from('game_wishlist')
        .delete()
        .eq('user_id', userId)
        .eq('game_id', gameId);
    } catch (e) {
      console.warn("game_wishlist delete warning:", e);
    }

    // 3. Count updated wishlist entries for game_id
    const { data: botWish } = await supabaseAdmin
      .from('bot_users')
      .select('full_name')
      .eq('region', 'WISHLIST')
      .eq('dob', gameId);

    const { data: directWish } = await supabaseAdmin
      .from('game_wishlist')
      .select('user_id')
      .eq('game_id', gameId);

    const uniqueUsers = new Set<string>();
    (botWish || []).forEach(w => w.full_name && uniqueUsers.add(w.full_name));
    (directWish || []).forEach(w => w.user_id && uniqueUsers.add(w.user_id));

    return NextResponse.json({
      ok: true,
      isWishlisted: false,
      count: uniqueUsers.size
    });
  } catch (err: any) {
    console.error("Wishlist DELETE API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
