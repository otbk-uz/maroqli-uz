import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkBoughtGamesTable() {
  const { data, error } = await supabase
    .from('bought_games')
    .select('*, profiles(username, full_name, phone_number), developed_games(title, cover, price)')
    .limit(10);

  if (error) {
    console.error("Error querying bought_games:", error);
  } else {
    console.log("bought_games count:", data?.length || 0);
    console.log(JSON.stringify(data, null, 2));
  }
}

checkBoughtGamesTable();
