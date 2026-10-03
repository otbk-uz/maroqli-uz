import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gxbiznuvinnfitppovsd.supabase.co";
const supabaseAnonKey = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupDemo() {
  console.log("1. Removing demo_url from all WEB games in Supabase DB...");
  
  // Set demo_url to null for all WEB games
  const { data: webUpdate, error: webErr } = await supabase
    .from('developed_games')
    .update({ demo_url: null })
    .eq('platform', 'WEB')
    .select('id, slug, title');

  if (webErr) {
    console.error("Error clearing demo_url for WEB games:", webErr);
  } else {
    console.log(`Successfully cleared demo_url for ${webUpdate?.length || 0} WEB games.`);
  }

  // Ensure maroqli profile is set for developer
  let devId = null;
  const { data: maroqliProfile } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', 'maroqli')
    .maybeSingle();

  if (maroqliProfile) {
    devId = maroqliProfile.id;
    await supabase.from('profiles').update({
      full_name: 'MAROQLI Studio',
      role: 'GAMEDEV'
    }).eq('id', devId);
  }

  console.log("2. Ensuring Shiroq game record has correct demo_url, PC platform, price, and MAROQLI developer...");
  const shiroqUpdatePayload = {
    platform: 'PC',
    price: 9999,
    premium_price: 7999,
    demo_url: '/SHIROQ_v1.1.rar',
    download_url: '/SHIROQ_v1.1.rar',
  };
  if (devId) {
    shiroqUpdatePayload.developer_id = devId;
  }

  const { data: shiroqRes, error: shiroqErr } = await supabase
    .from('developed_games')
    .update(shiroqUpdatePayload)
    .eq('slug', 'shiroq-afsonasi')
    .select('*');

  if (shiroqErr) {
    console.error("Error updating Shiroq:", shiroqErr);
  } else {
    console.log("Shiroq game updated:", shiroqRes);
  }

  console.log("3. Verifying games with non-null demo_url in database...");
  const { data: demoGames, error: listErr } = await supabase
    .from('developed_games')
    .select('id, slug, title, platform, demo_url, price')
    .not('demo_url', 'is', null);

  if (listErr) {
    console.error("Error fetching demo games:", listErr);
  } else {
    console.log("Games with demo_url currently in DB:", demoGames);
  }
}

cleanupDemo();
