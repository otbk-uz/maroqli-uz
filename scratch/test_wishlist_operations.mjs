import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testWishlistOperations() {
  console.log("Signing in dev user...");
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'maroqli_admin_dev@maroqli.uz',
    password: 'MaroqliDev2026!SecurePassword',
  });

  const userId = authData.user.id;
  console.log("User ID:", userId);

  // Get Shiroq game ID
  const { data: game } = await supabase.from('developed_games').select('id, title').eq('slug', 'shiroq-afsonasi').single();
  console.log("Game ID:", game.id, game.title);

  console.log("Inserting record into game_wishlist...");
  const { data: insertData, error: insertErr } = await supabase
    .from('game_wishlist')
    .insert({
      user_id: userId,
      game_id: game.id
    })
    .select('*');

  if (insertErr) {
    console.error("Insert error:", insertErr);
  } else {
    console.log("Insert success:", insertData);
  }

  console.log("Fetching wishlist with profiles & developed_games joins...");
  const { data: listData, error: listErr } = await supabase
    .from('game_wishlist')
    .select('id, created_at, profiles(id, username, full_name, role, phone_number), developed_games(id, title, slug, price, cover)');

  if (listErr) {
    console.error("Fetch list error:", listErr);
  } else {
    console.log("Wishlist items with join details:");
    console.log(JSON.stringify(listData, null, 2));
  }
}

testWishlistOperations();
