import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function updateDownloadUrls() {
  console.log("Updating game download URLs in Supabase...");

  const updates = [
    {
      slug: 'shiroq-afsonasi',
      download_url: 'https://github.com/otbk-uz/maroqli-uz/releases/download/v1.0.0/SHIROQ_v1.1.rar'
    },
    {
      slug: 'death-mine',
      download_url: 'https://github.com/otbk-uz/maroqli-uz/releases/download/v1.0.0/Death-Mine.zip'
    },
    {
      slug: 'isle-of-forgotten-memories',
      download_url: 'https://github.com/otbk-uz/maroqli-uz/releases/download/v1.0.0/Isle-of-Forgotten-Memories.rar'
    }
  ];

  for (const u of updates) {
    const { data, error } = await supabase
      .from('developed_games')
      .update({ download_url: u.download_url })
      .eq('slug', u.slug)
      .select('id, title, slug, download_url');

    console.log(`Updated ${u.slug}:`, data, error);
  }
}

updateDownloadUrls();
