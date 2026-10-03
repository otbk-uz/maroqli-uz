import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = "https://gxbiznuvinnfitppovsd.supabase.co";
const supabaseAnonKey = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupScreenshots() {
  console.log("Signing in to update Shiroq screenshots...");
  const email = `furqatjon_b_official@maroqli.uz`;
  const password = "FurqatjonDev2026!SecurePassword";

  const { data: authRes, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) {
    console.error("Auth error:", authErr);
    return;
  }

  const screenshotsDir = 'd:/project/maroqli-uz/public/shiroq_screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const baseArtifactDir = 'C:/Users/Dell/.gemini/antigravity-ide/brain/107a3124-8256-443c-ba8b-a7811fd1b733';
  const screenshotFiles = [
    'media__1791064847089.png',
    'media__1791064853521.jpg',
    'media__1791064860448.png',
    'media__1791064864990.png',
    'media__1791064869573.jpg'
  ];

  const relativePaths = [];

  screenshotFiles.forEach((file, index) => {
    const srcPath = path.join(baseArtifactDir, file);
    const ext = path.extname(file);
    const destName = `screenshot_${index + 1}${ext}`;
    const destPath = path.join(screenshotsDir, destName);

    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${file} -> public/shiroq_screenshots/${destName}`);
      relativePaths.push(`/shiroq_screenshots/${destName}`);
    } else {
      console.warn(`Source screenshot not found: ${srcPath}`);
    }
  });

  console.log("Updating Supabase record with screenshots:", relativePaths);

  const { data: game, error: findErr } = await supabase
    .from('developed_games')
    .select('id')
    .eq('slug', 'shiroq-afsonasi')
    .single();

  if (findErr || !game) {
    console.error("Could not find Shiroq game record:", findErr);
    return;
  }

  const { data: updated, error: updateErr } = await supabase
    .from('developed_games')
    .update({
      screenshots: relativePaths
    })
    .eq('id', game.id)
    .select('*');

  if (updateErr) {
    console.error("Update screenshots error:", updateErr);
  } else {
    console.log("Shiroq screenshots updated successfully in Supabase!", updated);
  }
}

setupScreenshots();
