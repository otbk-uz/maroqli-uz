import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setDeathMinePrice() {
  console.log("Signing in as developer...");
  const email = `furqatjon_b_official@maroqli.uz`;
  const password = "FurqatjonDev2026!SecurePassword";

  const { data: authRes, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) {
    console.error("Auth error:", authErr);
    return;
  }

  const { data, error } = await supabase
    .from('developed_games')
    .update({
      price: 5000,
      premium_price: 4000,
    })
    .eq('slug', 'death-mine')
    .select('id, title, slug, price, premium_price');

  console.log("Updated Death Mine price result:", data, error);
}

setDeathMinePrice();
