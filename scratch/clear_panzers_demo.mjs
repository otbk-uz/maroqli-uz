import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gxbiznuvinnfitppovsd.supabase.co";
const supabaseAnonKey = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function clearPanzersDemo() {
  console.log("Authenticating developer session with Supabase...");
  await supabase.auth.signInWithPassword({
    email: 'maroqli_admin_dev@maroqli.uz',
    password: 'MaroqliDev2026!SecurePassword',
  });

  console.log("Updating demo_url = null for World of Panzers...");
  const { data: updateRes, error: updateErr } = await supabase
    .from('developed_games')
    .update({ demo_url: null })
    .ilike('title', '%World of Panzers%')
    .select('id, slug, title, demo_url');

  if (updateErr) {
    console.error("Error updating World of Panzers:", updateErr);
  } else {
    console.log("World of Panzers updated:", updateRes);
  }

  // Also check if any other games besides Shiroq have demo_url
  const { data: demoGames } = await supabase
    .from('developed_games')
    .select('id, slug, title, platform, demo_url')
    .not('demo_url', 'is', null);

  console.log("\n=== ALL REMAINING DEMO GAMES IN DB ===");
  console.log(demoGames);
}

clearPanzersDemo();
