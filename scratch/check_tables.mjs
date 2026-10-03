import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTables() {
  const { data: wData, error: wErr } = await supabase.from('game_wishlist').select('*').limit(1);
  console.log("game_wishlist check:", wData, wErr ? wErr.message : "OK");

  const { data: pData, error: pErr } = await supabase.from('game_purchase_plan').select('*').limit(1);
  console.log("game_purchase_plan check:", pData, pErr ? pErr.message : "OK");
}

checkTables();
