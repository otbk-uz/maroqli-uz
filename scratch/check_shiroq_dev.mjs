import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkShiroq() {
  const { data, error } = await supabase
    .from('developed_games')
    .select('id, title, slug, download_url, developer_id')
    .eq('slug', 'shiroq-afsonasi');

  console.log("Shiroq record:", data, error);
}

checkShiroq();
