import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testStorage() {
  console.log("Signing in...");
  const email = `furqatjon_b_official@maroqli.uz`;
  const password = "FurqatjonDev2026!SecurePassword";

  const { data: authRes, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) {
    console.error("Auth error:", authErr);
    return;
  }

  // Create bucket 'game-files' if not exists
  const { data: bucketData, error: bucketErr } = await supabase.storage.createBucket('game-files', {
    public: true,
    fileSizeLimit: 524288000 // 500 MB
  });
  console.log("Create bucket result:", bucketData, bucketErr);

  // Get public url test
  const { data: publicUrl } = supabase.storage.from('game-files').getPublicUrl('SHIROQ_v1.1.rar');
  console.log("Public URL:", publicUrl);
}

testStorage();
