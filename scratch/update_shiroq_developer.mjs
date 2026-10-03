import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gxbiznuvinnfitppovsd.supabase.co";
const supabaseAnonKey = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateShiroqDev() {
  await supabase.auth.signInWithPassword({
    email: 'maroqli_admin_dev@maroqli.uz',
    password: 'MaroqliDev2026!SecurePassword',
  });

  // Get current Shiroq record
  const { data: shiroq } = await supabase.from('developed_games').select('id, developer_id').eq('slug', 'shiroq-afsonasi').single();
  
  if (shiroq && shiroq.developer_id) {
    console.log("Updating developer profile id:", shiroq.developer_id);
    await supabase.from('profiles').update({
      username: 'maroqli',
      full_name: 'MAROQLI Studio',
      role: 'GAMEDEV'
    }).eq('id', shiroq.developer_id);
  }

  // Also check if there's a profile with username 'maroqli'
  const { data: maroqliProfile } = await supabase.from('profiles').select('id, username, full_name').eq('username', 'maroqli').maybeSingle();
  if (maroqliProfile && maroqliProfile.id !== shiroq.developer_id) {
    console.log("Setting Shiroq developer_id to maroqli profile:", maroqliProfile.id);
    await supabase.from('developed_games').update({ developer_id: maroqliProfile.id }).eq('slug', 'shiroq-afsonasi');
  }

  // Verify Shiroq game with join profile
  const { data: finalShiroq } = await supabase
    .from('developed_games')
    .select('id, slug, title, platform, price, premium_price, demo_url, download_url, cover, profiles(username, full_name)')
    .eq('slug', 'shiroq-afsonasi')
    .single();

  console.log("\n=== FINAL SHIROQ RECORD ===");
  console.log(JSON.stringify(finalShiroq, null, 2));
}

updateShiroqDev();
