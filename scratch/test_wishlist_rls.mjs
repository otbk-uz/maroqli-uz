import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testWishlistRLS() {
  console.log("Testing game_wishlist table permissions...");

  // Try fetching count
  const { data, count, error } = await supabase
    .from('game_wishlist')
    .select('*', { count: 'exact' });

  console.log("Select count result:", count, error);

  // Try inserting test item without auth
  const { data: insData, error: insErr } = await supabase
    .from('game_wishlist')
    .insert({
      user_id: 'c3c1d3a5-b3fb-4637-b8c5-6ef0b2c10ec2',
      game_id: 'ce1b7cca-3fbb-463f-9b23-e2241f2939c6'
    })
    .select('*');

  console.log("Anon insert result:", insData, insErr);
}

testWishlistRLS();
