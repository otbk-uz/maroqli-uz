import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testUpdateProfile() {
  const email = `maroqli_admin_dev@maroqli.uz`;
  const password = "MaroqliDev2026!SecurePassword";

  console.log("Signing in...");
  const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
  const myId = signInData.user.id;
  console.log("My user ID:", myId);

  // Try updating profile to XANpro / Akramov Shoxruxbek
  const { data, error } = await supabase
    .from('profiles')
    .update({
      username: 'XANpro',
      full_name: 'Akramov Shoxruxbek',
      role: 'GAMEDEV'
    })
    .eq('id', myId)
    .select('*');

  console.log("Update profile result:", data, error);
}

testUpdateProfile();
