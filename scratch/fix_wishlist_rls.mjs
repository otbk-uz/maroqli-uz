import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixWishlistRLS() {
  console.log("Signing in developer...");
  const email = `furqatjon_b_official@maroqli.uz`;
  const password = "FurqatjonDev2026!SecurePassword";

  const { data: authRes, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) {
    console.error("Auth error:", authErr);
    return;
  }

  const userId = authRes.user.id;
  console.log("Authenticated developer ID:", userId);

  // Fetch games to test
  const { data: games } = await supabase.from('developed_games').select('id, title, slug').limit(3);
  console.log("Available games:", games);

  if (games && games.length > 0) {
    const targetGame = games[0];
    console.log("Inserting developer wishlist entry for game:", targetGame.title);

    const { data: insData, error: insErr } = await supabase
      .from('game_wishlist')
      .upsert({
        user_id: userId,
        game_id: targetGame.id
      })
      .select('*');

    console.log("Authenticated insert result:", insData, insErr);
  }
}

fixWishlistRLS();
