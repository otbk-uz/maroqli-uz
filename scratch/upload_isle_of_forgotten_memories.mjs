import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function publishGame() {
  console.log("Authenticating as admin dev...");
  
  const email = `maroqli_admin_dev@maroqli.uz`;
  const password = "MaroqliDev2026!SecurePassword";

  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInErr) {
    console.log("SignIn failed, trying SignUp...", signInErr.message);
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpErr) {
      console.error("SignUp also failed:", signUpErr);
      return;
    }
  }

  console.log("Searching for GameDev profile '@XANpro'...");
  
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id, username, full_name, role')
    .or('username.eq.XANpro,username.eq.xanpro');

  if (profileErr) {
    console.error("Error fetching profile:", profileErr);
    return;
  }

  let devId = null;
  if (profiles && profiles.length > 0) {
    devId = profiles[0].id;
    console.log(`Found developer profile: Username: ${profiles[0].username}, ID: ${devId}`);
  } else {
    console.error("Developer '@XANpro' profile not found!");
    return;
  }

  const gameData = {
    developer_id: devId,
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

  console.log("Upserting game into 'developed_games' table in Supabase...");

  const { data, error } = await supabase
    .from('developed_games')
    .upsert([gameData], { onConflict: 'slug' })
    .select('*');

  if (error) {
    console.error("Error publishing game to Supabase:", error);
  } else {
    console.log("🎉 SUCCESS! Game 'Isle of Forgotten Memories' successfully published on behalf of @XANpro!");
    console.log("Published Game details:", data);
  }
}

publishGame();
