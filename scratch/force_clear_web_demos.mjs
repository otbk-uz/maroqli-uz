import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gxbiznuvinnfitppovsd.supabase.co";
const supabaseAnonKey = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function forceClearWebDemos() {
  console.log("Signing in as maroqli_admin_dev...");
  const email = `maroqli_admin_dev@maroqli.uz`;
  const password = "MaroqliDev2026!SecurePassword";

  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInErr) {
    console.error("Sign in failed:", signInErr);
    return;
  }

  console.log("Authenticated user:", signInData.user.id);

  console.log("Updating demo_url = null for all WEB games...");
  const { data: webGames } = await supabase.from('developed_games').select('id, slug').eq('platform', 'WEB');
  console.log(`Found ${webGames.length} WEB games to update.`);

  for (const game of webGames) {
    const { error } = await supabase.from('developed_games').update({ demo_url: null }).eq('id', game.id);
    if (error) {
      console.error(`Failed to update ${game.slug}:`, error);
    }
  }

  // Also check if any other user created games:
  const email2 = `furqatjon_b_official@maroqli.uz`;
  const password2 = "FurqatjonDev2026!SecurePassword";
  await supabase.auth.signInWithPassword({ email: email2, password: password2 });

  const { data: webGames2 } = await supabase.from('developed_games').select('id, slug, demo_url').eq('platform', 'WEB').not('demo_url', 'is', null);
  console.log(`Remaining WEB games with demo_url non-null: ${webGames2 ? webGames2.length : 0}`);

  for (const game of (webGames2 || [])) {
    await supabase.from('developed_games').update({ demo_url: null }).eq('id', game.id);
  }

  // Fetch final list of games with demo_url
  const { data: finalDemoGames } = await supabase
    .from('developed_games')
    .select('id, slug, title, platform, demo_url, price, profiles(username, full_name)')
    .not('demo_url', 'is', null);

  console.log("\n=== FINAL GAMES WITH demo_url IN DB ===");
  console.log(JSON.stringify(finalDemoGames, null, 2));
}

forceClearWebDemos();
