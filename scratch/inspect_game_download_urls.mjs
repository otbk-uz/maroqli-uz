import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDownloadUrls() {
  const { data: games } = await supabase
    .from('developed_games')
    .select('id, title, slug, download_url, executable_path');

  console.log("Developed Games Download URLs:", games);
}

checkDownloadUrls();
