import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gxbiznuvinnfitppovsd.supabase.co";
const supabaseAnonKey = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectPurchasePlans() {
  await supabase.auth.signInWithPassword({
    email: 'maroqli_admin_dev@maroqli.uz',
    password: 'MaroqliDev2026!SecurePassword',
  });

  const { data, error } = await supabase
    .from('game_purchase_plan')
    .select('id, user_id, game_id, created_at, profiles(username, full_name), developed_games(title, cover, price)');

  if (error) {
    console.error("Error reading game_purchase_plan:", error);
  } else {
    console.log(`Total purchase plan records in DB: ${data?.length || 0}`);
    console.log(JSON.stringify(data, null, 2));
  }
}

inspectPurchasePlans();
