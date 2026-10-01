import { createClient } from '@supabase/supabase-js';

const url = 'https://gxbiznuvinnfitppovsd.supabase.co';
const anonKey = 'sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ';

const supabase = createClient(url, anonKey);

async function inspectGames() {
  const { data, error } = await supabase
    .from('developed_games')
    .select('id, title, slug, platform, price, demo_url, download_url');

  console.log("DB Games Count:", data?.length);
  console.log("Games list:", data);
}

inspectGames();
