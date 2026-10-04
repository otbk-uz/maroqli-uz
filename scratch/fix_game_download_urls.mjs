import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function updateDownloadUrls() {
  console.log("Signing in...");
  const email = `furqatjon_b_official@maroqli.uz`;
  const password = "FurqatjonDev2026!SecurePassword";

  const { data: authRes, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) {
    console.error("Auth error:", authErr);
    return;
  }

  console.log("Authenticated user:", authRes.user.id);

  // Fetch all games first
  const { data: games, error: fetchErr } = await supabase
    .from('developed_games')
    .select('id, title, slug, download_url');

  if (fetchErr) {
    console.error("Fetch games error:", fetchErr);
    return;
  }

  console.log("Current games in DB:", games);

  const updatesMap = {
    'shiroq-afsonasi': 'https://github.com/otbk-uz/maroqli-uz/releases/download/v1.0.0/SHIROQ_v1.1.rar',
    'death-mine': 'https://github.com/otbk-uz/maroqli-uz/releases/download/v1.0.0/Death-Mine.zip',
    'isle-of-forgotten-memories': 'https://github.com/otbk-uz/maroqli-uz/releases/download/v1.0.0/Isle-of-Forgotten-Memories.rar'
  };

  for (const g of games || []) {
    const targetUrl = updatesMap[g.slug] || (g.download_url && g.download_url.startsWith('http') ? g.download_url : `https://github.com/otbk-uz/maroqli-uz/releases/download/v1.0.0/${g.slug}.zip`);
    
    const { data, error } = await supabase
      .from('developed_games')
      .update({ download_url: targetUrl })
      .eq('id', g.id)
      .select('id, title, slug, download_url');

    console.log(`Updated ${g.slug} (${g.id}):`, data, error);
  }
}

updateDownloadUrls();
