import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gxbiznuvinnfitppovsd.supabase.co";
const supabaseAnonKey = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findDevAuth() {
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: 'ss412@maroqli.uz',
    password: 'MaroqliDev2026!SecurePassword',
  });
  console.log("Sign in SS412 attempt:", signInData, signInErr);

  // Let's also check if we can update developer_id of World of Panzers when signed in as furqatjon
  await supabase.auth.signInWithPassword({
    email: 'furqatjon_b_official@maroqli.uz',
    password: 'FurqatjonDev2026!SecurePassword',
  });

  const { data: updateRes2, error: updateErr2 } = await supabase
    .from('developed_games')
    .update({ demo_url: null })
    .eq('id', 'cc091be0-6545-47b6-9ed1-916c61895d15')
    .select('*');

  console.log("Furqatjon update result:", updateRes2, updateErr2);
}

findDevAuth();
