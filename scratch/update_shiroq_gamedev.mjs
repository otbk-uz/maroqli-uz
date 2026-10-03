import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gxbiznuvinnfitppovsd.supabase.co";
const supabaseAnonKey = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateDev() {
  console.log("Updating developer profile for MAROQLI Studio...");

  // 1. Find or update a profile with username 'maroqli'
  const { data: maroqliProfile, error: searchErr } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', 'maroqli')
    .maybeSingle();

  let devId;

  if (maroqliProfile) {
    devId = maroqliProfile.id;
    console.log("Found existing maroqli profile:", maroqliProfile.id);
  } else {
    // Find any profile to update username to 'maroqli' or create
    const { data: profiles } = await supabase.from('profiles').select('id, username').limit(1);
    if (profiles && profiles.length > 0) {
      devId = profiles[0].id;
      console.log("Updating profile", devId, "username to 'maroqli' and full_name to 'MAROQLI Studio'");
      await supabase.from('profiles').update({ username: 'maroqli', full_name: 'MAROQLI Studio' }).eq('id', devId);
    }
  }

  if (devId) {
    console.log("Updating Shiroq game record with developer_id:", devId);
    const { data, error } = await supabase
      .from('developed_games')
      .update({ developer_id: devId })
      .eq('slug', 'shiroq-afsonasi')
      .select('*');

    if (error) {
      console.error("Error updating Shiroq developer_id:", error);
    } else {
      console.log("Shiroq developer updated successfully:", data);
    }
  }
}

updateDev();
