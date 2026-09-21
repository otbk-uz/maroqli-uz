import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkPurchasePlanTable() {
  console.log("Checking game_purchase_plan table in Supabase...");
  const { data, error } = await supabase.from('game_purchase_plan').select('*').limit(1);
  console.log("game_purchase_plan table check result:", data, error ? error.message : "OK");
}

checkPurchasePlanTable();
