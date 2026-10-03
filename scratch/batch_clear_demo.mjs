import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gxbiznuvinnfitppovsd.supabase.co";
const supabaseAnonKey = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function batchClear() {
  await supabase.auth.signInWithPassword({
    email: 'maroqli_admin_dev@maroqli.uz',
    password: 'MaroqliDev2026!SecurePassword',
  });

  console.log("Batch updating all platform === WEB games...");
  const { data, error } = await supabase
    .from('developed_games')
    .update({ demo_url: null })
    .eq('platform', 'WEB')
    .select('id');

  if (error) {
    console.error("Batch update error:", error);
  } else {
    console.log("Successfully batch cleared demo_url for", data.length, "games.");
  }

  // Double check Shiroq
  const { data: shiroq } = await supabase
    .from('developed_games')
    .select('id, slug, title, platform, demo_url, profiles(username, full_name)')
    .eq('slug', 'shiroq-afsonasi')
    .single();

  console.log("Shiroq record:", shiroq);

  const { data: demoGames } = await supabase
    .from('developed_games')
    .select('id, slug, title, platform, demo_url')
    .not('demo_url', 'is', null);

  console.log("Total games with demo_url non-null in DB:", demoGames?.length);
  console.log("Demo games:", demoGames);
}

batchClear();
