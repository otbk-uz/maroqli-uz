import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAndSetupTables() {
  console.log("Checking Supabase connection and tables...");

  // Sign in or sign up dev account to get valid auth session
  const email = `maroqli_admin_dev@maroqli.uz`;
  const password = "MaroqliDev2026!SecurePassword";

  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!signInData?.user) {
    console.log("Signing up admin dev user...");
    await supabase.auth.signUp({ email, password });
  }

  // Check if coins column / game_scores table exist by querying them
  const { data: scores, error: sErr } = await supabase.from('game_scores').select('*').limit(1);
  console.log("game_scores table check:", scores, sErr ? sErr.message : "OK");

  const { data: daily, error: dErr } = await supabase.from('user_daily_rewards').select('*').limit(1);
  console.log("user_daily_rewards table check:", daily, dErr ? dErr.message : "OK");

  const { data: profile, error: pErr } = await supabase.from('profiles').select('id, coins').limit(1);
  console.log("profiles coins column check:", profile, pErr ? pErr.message : "OK");
}

checkAndSetupTables();
