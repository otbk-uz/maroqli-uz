import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function updateShiroqUrl() {
  console.log("Signing in...");
  const email = `furqatjon_b_official@maroqli.uz`;
  const password = "FurqatjonDev2026!SecurePassword";

  const { data: authRes, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) {
    console.error("Auth error:", authErr);
    return;
  }

  const { data, error } = await supabase
    .from('developed_games')
    .update({ download_url: 'https://github.com/otbk-uz/maroqli-uz/releases/download/v1.0.0/SHIROQ.v1.1.rar' })
    .eq('slug', 'shiroq-afsonasi')
    .select('id, title, slug, download_url');

  console.log("Updated Shiroq download_url:", data, error);
}

updateShiroqUrl();
