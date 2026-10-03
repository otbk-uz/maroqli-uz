import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gxbiznuvinnfitppovsd.supabase.co";
const supabaseAnonKey = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function forceUpdatePanzers() {
  // Let's inspect the game record first
  const { data: game } = await supabase.from('developed_games').select('id, developer_id, title').eq('id', 'cc091be0-6545-47b6-9ed1-916c61895d15').single();
  console.log("Game developer_id:", game.developer_id);

  // Find profile of developer_id
  const { data: profile } = await supabase.from('profiles').select('id, username, email').eq('id', game.developer_id).single();
  console.log("Developer profile:", profile);

  // Try updating with RPC or directly if allowed
  const { data: updateRes, error: updateErr } = await supabase
    .from('developed_games')
    .update({ demo_url: null })
    .eq('id', 'cc091be0-6545-47b6-9ed1-916c61895d15')
    .select('id, slug, title, demo_url');

  if (updateErr) {
    console.error("Direct update error:", updateErr);
  } else {
    console.log("Update result:", updateRes);
  }

  // Let's check all remaining demo games
  const { data: remainingDemos } = await supabase
    .from('developed_games')
    .select('id, slug, title, platform, demo_url')
    .not('demo_url', 'is', null);

  console.log("\n=== FINAL REMAINING DEMO GAMES IN DB ===");
  console.log(remainingDemos);
}

forceUpdatePanzers();
