import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAdminPublish() {
  const email = `maroqli_admin_dev@maroqli.uz`;
  const password = "MaroqliDev2026!SecurePassword";

  console.log("Signing in as admin dev...");
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInErr || !signInData.user) {
    console.error("Sign in failed:", signInErr);
    return;
  }

  const userId = signInData.user.id;
  console.log("Admin user ID:", userId);

  // Set role to ADMIN
  await supabase.from('profiles').update({ role: 'ADMIN' }).eq('id', userId);

  // Target developer XANpro ID: e02e479e-ac9d-4d87-ae08-fd32049abaa1
  const xanproId = 'e02e479e-ac9d-4d87-ae08-fd32049abaa1';

  const gameData = {
    developer_id: xanproId,
    title: 'Isle of Forgotten Memories',
    slug: 'isle-of-forgotten-memories',
    price: 0,
    premium_price: 0,
    platform: 'PC',
    description: `Sirlarga to'la sirli orol, yo'qolgan xotiralar va unutilgan afsonalar. Isle of Forgotten Memories — Unity 3D vositasida yaratilgan, yuqori grafikali va sarguzashtga boy 3D fantastik o'yin. Orolni kashf eting, jumboqlarni yeching va qorong'u sirlarni oshkor qiling!

O'yinda ajoyib vizual effektlar, sarguzashtli syujet va yuqori atmosferaga ega soundtrack mavjud. Maroqli.uz platformasidan mutlaqo bepul yuklab olishingiz mumkin.`,
    language: "O'zbek, Ingliz",
    sys_requirements: 'OS: Windows 10/11 (64-bit), RAM: 8GB, GPU: NVIDIA GeForce GTX 1050 / AMD Radeon RX 560, HDD/SSD: 3GB bo\'sh joy',
    download_url: '/Isle-of-Forgotten-Memories.rar',
    cover: '/isle_of_forgotten_memories_cover.png',
    executable_path: 'Isle of Forgotten Memories.exe',
    rating: 5.0
  };

  console.log("Inserting game into developed_games table for XANpro...");
  const { data: gData, error: gErr } = await supabase
    .from('developed_games')
    .upsert([gameData], { onConflict: 'slug' })
    .select('*');

  if (gErr) {
    console.error("Game insert error:", gErr);
  } else {
    console.log("🎉 SUCCESS! Game successfully inserted for XANpro!");
    console.log("Inserted game:", gData);
  }
}

testAdminPublish();
