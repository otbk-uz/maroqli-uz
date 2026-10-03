import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gxbiznuvinnfitppovsd.supabase.co";
const supabaseAnonKey = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setMaroqliProfile() {
  await supabase.auth.signInWithPassword({
    email: 'furqatjon_b_official@maroqli.uz',
    password: 'FurqatjonDev2026!SecurePassword',
  });

  const { data: updateRes, error: updateErr } = await supabase
    .from('profiles')
    .update({
      username: 'maroqli',
      full_name: 'MAROQLI Studio',
      role: 'GAMEDEV'
    })
    .eq('id', 'c3c1d3a5-b3fb-4637-b8c5-6ef0b2c10ec2')
    .select('*');

  if (updateErr) console.error("Profile update error:", updateErr);
  else console.log("Profile updated successfully:", updateRes);

  const { data: shiroq } = await supabase
    .from('developed_games')
    .select('id, slug, title, platform, price, premium_price, demo_url, download_url, cover, profiles(username, full_name)')
    .eq('slug', 'shiroq-afsonasi')
    .single();

  console.log("Shiroq with developer profile:", shiroq);
}

setMaroqliProfile();
