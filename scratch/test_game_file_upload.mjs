import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkGameFilesBucket() {
  console.log("Checking game_files bucket...");
  const { data, error } = await supabase.storage.from('game_files').list();
  console.log("game_files list result:", data, error);
}

checkGameFilesBucket();
