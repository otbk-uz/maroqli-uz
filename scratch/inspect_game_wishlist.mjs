import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectWishlist() {
  const { data, error } = await supabase
    .from('game_wishlist')
    .select('*, profiles(username, full_name), developed_games(title, price)');

  if (error) console.error("Wishlist fetch error:", error);
  else {
    console.log("game_wishlist records count:", data?.length);
    console.log(JSON.stringify(data, null, 2));
  }
}

inspectWishlist();
