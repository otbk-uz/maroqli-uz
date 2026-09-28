import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function updateProfile() {
  const email = `maroqli_admin_dev@maroqli.uz`;
  const password = "MaroqliDev2026!SecurePassword";

  console.log("Signing in as admin dev...");
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInErr || !signInData.user) {
    console.error("Sign in error:", signInErr);
    return;
  }

  const myId = signInData.user.id;

  const { data: profData, error: profErr } = await supabase
    .from('profiles')
    .update({
      username: 'XANpro_Dev',
      full_name: 'Akramov Shoxruxbek (XANpro)',
      role: 'GAMEDEV',
      avatar_url: 'https://gxbiznuvinnfitppovsd.supabase.co/storage/v1/object/public/avatars/e02e479e-ac9d-4d87-ae08-fd32049abaa1-0.8637682641884834.jpg'
    })
    .eq('id', myId)
    .select('*');

  console.log("Profile update result:", profData, profErr);

  // Check the game record in DB
  const { data: gameData } = await supabase
    .from('developed_games')
    .select('*, profiles:developer_id(*)')
    .eq('slug', 'isle-of-forgotten-memories');

  console.log("Updated Game in DB:", JSON.stringify(gameData, null, 2));
}

updateProfile();
