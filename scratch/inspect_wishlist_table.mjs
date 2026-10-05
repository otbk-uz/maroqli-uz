import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectWishlist() {
  const { data, error } = await supabase
    .from('game_wishlist')
    .select('*, profiles(username, full_name), developed_games(title, slug)')
    .limit(10);

  console.log("Wishlist data:", data, error);

  // Check counts per game
  const { data: counts, error: countErr } = await supabase
    .from('game_wishlist')
    .select('game_id');

  console.log("Total wishlist entries in DB:", counts?.length, countErr);
}

inspectWishlist();
