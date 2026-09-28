import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testXanproAuth() {
  const email = "xanpro_official_dev@maroqli.uz";
  const password = "XanPro2026!SecurePassword";

  console.log("Signing in or signing up XANpro auth user...");
  let { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });

  if (signInErr || !signInData.user) {
    console.log("SignIn notice:", signInErr?.message || "User not found, signing up...");
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpErr) {
      console.error("SignUp error:", signUpErr);
      return;
    }
    signInData = signUpData;
  }

  const userId = signInData.user.id;
  console.log("XANpro authenticated user ID:", userId);

  // Upsert profile for XANpro with this auth user ID
  console.log("Updating profile table for XANpro...");
  const { data: profData, error: profErr } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      full_name: 'Akramov Shoxruxbek',
      username: 'XANpro',
      age: 21,
      region: 'FARGONA',
      phone_number: '+998907860586',
      role: 'GAMEDEV',
      avatar_url: 'https://gxbiznuvinnfitppovsd.supabase.co/storage/v1/object/public/avatars/e02e479e-ac9d-4d87-ae08-fd32049abaa1-0.8637682641884834.jpg'
    }, { onConflict: 'id' })
    .select('*');

  console.log("Profile upsert result:", profData, profErr);

  // Now publish the game using the authenticated session!
  console.log("Publishing 'Isle of Forgotten Memories' under XANpro's account...");
  const gameData = {
    developer_id: userId,
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

  const { data: gData, error: gErr } = await supabase
    .from('developed_games')
    .upsert([gameData], { onConflict: 'slug' })
    .select('*');

  if (gErr) {
    console.error("Game upsert error:", gErr);
  } else {
    console.log("🎉 SUCCESS! Game published successfully under XANpro!");
    console.log("Published Game:", gData);
  }
}

testXanproAuth();
