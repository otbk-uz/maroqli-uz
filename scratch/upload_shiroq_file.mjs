import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function uploadShiroqFile() {
  console.log("Reading SHIROQ_v1.1.rar from public/...");
  const filePath = 'public/SHIROQ_v1.1.rar';
  if (!fs.existsSync(filePath)) {
    console.error("File public/SHIROQ_v1.1.rar not found!");
    return;
  }

  const fileStats = fs.statSync(filePath);
  console.log(`File size: ${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`);

  const fileBuffer = fs.readFileSync(filePath);
  const storagePath = `downloads/SHIROQ_v1.1.rar`;

  console.log(`Uploading to Supabase storage 'game_files/${storagePath}'...`);

  const { data, error } = await supabase.storage
    .from('game_files')
    .upload(storagePath, fileBuffer, {
      contentType: 'application/x-rar-compressed',
      upsert: true
    });

  if (error) {
    console.error("Upload error:", error);
  } else {
    console.log("Upload success:", data);
    const { data: pubData } = supabase.storage
      .from('game_files')
      .getPublicUrl(storagePath);
      
    console.log("Public Download URL:", pubData.publicUrl);
  }
}

uploadShiroqFile();
