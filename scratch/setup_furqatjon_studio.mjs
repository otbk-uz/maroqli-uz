import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function setupStudio() {
  const email = `furqatjon_b_official@maroqli.uz`;
  const password = "FurqatjonDev2026!SecurePassword";

  console.log("Signing in...");
  const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
  const myId = signInData.user.id;

  const studioData = {
    user_id: myId,
    studio_name: 'Furqatjon Games',
    team_members: 'Furqatjon Bostonov (Solo Game Developer)',
    location: "Farg'ona viloyati",
    demo_url: '/death_mine_cover.png',
    demo_type: 'image',
    release_date: 'Mavjud (Pullik)',
    donation_url: ''
  };

  const { data, error } = await supabase
    .from('gamedev_profiles')
    .upsert(studioData, { onConflict: 'user_id' })
    .select('*');

  console.log("Studio profile setup result:", data, error);
}

setupStudio();
