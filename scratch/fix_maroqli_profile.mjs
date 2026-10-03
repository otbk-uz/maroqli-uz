import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gxbiznuvinnfitppovsd.supabase.co";
const supabaseAnonKey = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixMaroqliDev() {
  await supabase.auth.signInWithPassword({
    email: 'maroqli_admin_dev@maroqli.uz',
    password: 'MaroqliDev2026!SecurePassword',
  });

  const { data: allProfiles } = await supabase.from('profiles').select('id, username, full_name');
  console.log("All profiles in DB:", allProfiles);

  // Find profile with username 'maroqli' or full_name containing 'MAROQLI'
  let maroqliProf = allProfiles.find(p => p.username === 'maroqli' || p.full_name?.includes('MAROQLI'));

  if (!maroqliProf) {
    // Pick the profile of Shiroq developer and update username/full_name
    const { data: shiroq } = await supabase.from('developed_games').select('developer_id').eq('slug', 'shiroq-afsonasi').single();
    await supabase.from('profiles').update({
      username: 'maroqli',
      full_name: 'MAROQLI Studio'
    }).eq('id', shiroq.developer_id);
    maroqliProf = { id: shiroq.developer_id };
  } else {
    // Update Shiroq's developer_id to maroqliProf.id
    console.log("Found maroqli profile:", maroqliProf);
    await supabase.from('profiles').update({
      full_name: 'MAROQLI Studio'
    }).eq('id', maroqliProf.id);

    await supabase.from('developed_games').update({
      developer_id: maroqliProf.id
    }).eq('slug', 'shiroq-afsonasi');
  }

  const { data: finalShiroq } = await supabase
    .from('developed_games')
    .select('id, slug, title, platform, price, premium_price, demo_url, download_url, cover, profiles(username, full_name)')
    .eq('slug', 'shiroq-afsonasi')
    .single();

  console.log("\n=== VERIFIED SHIROQ WITH DEVELOPER ===");
  console.log(JSON.stringify(finalShiroq, null, 2));
}

fixMaroqliDev();
