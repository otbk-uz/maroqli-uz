import fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';
import { createClient } from '@supabase/supabase-js';

const zipPath = 'd:/project/maroqli-uz/.next/server/doom-2v.zip';
const targetDir = 'd:/project/maroqli-uz/public/games-online/apex-doom-v2';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const doomDescription = `APEX DOOM-LIKE v2 — klassik FPS Shooter janridan ilhomlangan, APEX 3D Engine asosida yaratilgan dinamik 3D brauzer o‘yini. O‘yinchi ikki xil levelda jang qiladi, turli qurollardan foydalanadi, kalitlarni topib yopiq hududlarni ochadi, maxfiy joylarni izlaydi va kuchli bosslarga qarshi kurashadi.

O‘yinda 5 xil qurol, turli xususiyatlarga ega dushmanlar, maxfiy xonalar, tuzoqlar, kalitlar, yopiq eshiklar va bonuslar mavjud. Har bir level o‘ziga xos muhit va jangovar vaziyatlarga ega.

🎮 Boshqaruv:
• W A S D — Harakatlanish
• Mouse — Nishonga olish
• Left Click — Otish
• Shift — Yugurish
• E / Space — Eshik, tugma va obyektlar bilan o‘zaro ta'sir
• 1–5 — Qurollarni almashtirish
• Tab — Xarita
• M — Musiqani yoqish/o‘chirish
• Enter / Click — Davom etish yoki qayta boshlash

⚔️ O‘yin imkoniyatlari:
• 2 ta to‘liq level
• 5 xil qurol: Pistol, Shotgun, Chaingun, Rocket Launcher va Plasma Rifle
• Turli xil dushmanlar va bosslar
• Kalitlar va qulflangan eshiklar
• Maxfiy xonalar va yashirin qurollar
• Tuzoq va ambush mexanikalari
• Armor va Supercharge kabi bonuslar
• Brauzerda to‘g‘ridan-to‘g‘ri o‘ynash imkoniyati
Loyiha muntazam yangilanib, yangi kontent va imkoniyatlar bilan rivojlantirib boriladi.`;

async function deployApexDoom() {
  console.log("Checking zip file at:", zipPath);
  if (!fs.existsSync(zipPath)) {
    console.error("ZIP file not found at:", zipPath);
    return;
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log("Extracting zip to:", targetDir);
  await fs.createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: targetDir }))
    .promise();

  console.log("Extraction complete. Inspecting files...");
  let files = fs.readdirSync(targetDir);
  console.log("Extracted top-level files:", files);

  // If nested in a single directory, move files up
  if (files.length === 1 && fs.statSync(path.join(targetDir, files[0])).isDirectory()) {
    const innerDir = path.join(targetDir, files[0]);
    console.log("Moving files up from inner directory:", innerDir);
    const innerFiles = fs.readdirSync(innerDir);
    for (const f of innerFiles) {
      fs.renameSync(path.join(innerDir, f), path.join(targetDir, f));
    }
    fs.rmdirSync(innerDir);
    files = fs.readdirSync(targetDir);
  }

  console.log("Final target directory contents:", files);

  // Sign in developer to insert into Supabase
  console.log("Signing in as developer...");
  const email = `furqatjon_b_official@maroqli.uz`;
  const password = "FurqatjonDev2026!SecurePassword";

  const { data: authRes, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) {
    console.error("Auth error:", authErr);
    return;
  }

  const devId = authRes.user.id;

  const gameData = {
    title: 'APEX DOOM-LIKE v2',
    slug: 'apex-doom-v2',
    developer_id: devId,
    price: 0,
    premium_price: null,
    platform: 'WEB',
    demo_url: '/games-online/apex-doom-v2/index.html',
    download_url: '/games-online/apex-doom-v2/index.html',
    executable_path: 'index.html',
    cover: '/games-online/apex-doom-v2/cover.png',
    description: doomDescription,
    language: "O'zbek",
    rating: 5.0,
    sys_requirements: "Barcha zamonaviy brauzerlar (Chrome, Firefox, Edge, Opera, Safari) va WebGL qo'llab-quvvatlovi."
  };

  const { data: existing } = await supabase
    .from('developed_games')
    .select('id')
    .eq('slug', 'apex-doom-v2')
    .maybeSingle();

  if (existing) {
    console.log("Updating existing APEX DOOM-LIKE v2 record...");
    const { data: updated, error } = await supabase
      .from('developed_games')
      .update(gameData)
      .eq('id', existing.id)
      .select('*');
    console.log("Update result:", updated, error);
  } else {
    console.log("Inserting new APEX DOOM-LIKE v2 record...");
    const { data: inserted, error } = await supabase
      .from('developed_games')
      .insert(gameData)
      .select('*');
    console.log("Insert result:", inserted, error);
  }
}

deployApexDoom();
