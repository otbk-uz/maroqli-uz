import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function publishDeathMine() {
  const email = `furqatjon_b_official@maroqli.uz`;
  const password = "FurqatjonDev2026!SecurePassword";

  console.log("1. Authenticating developer account for @furqatjon_b...");
  let { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });

  if (signInErr || !signInData.user) {
    console.log("Account not found, signing up...");
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });
    if (signUpErr) {
      console.error("SignUp error:", signUpErr);
      return;
    }
    signInData = signUpData;
  }

  const userId = signInData.user.id;
  console.log("Authenticated User ID:", userId);

  console.log("2. Updating profile for @furqatjon_b...");
  const { data: profData, error: profErr } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      full_name: 'Furqatjon Bostonov',
      username: 'furqatjon_b_dev',
      age: 19,
      region: 'FARGONA',
      phone_number: '+998954221701',
      role: 'GAMEDEV',
      avatar_url: 'https://gxbiznuvinnfitppovsd.supabase.co/storage/v1/object/public/avatars/3d5dfb20-f571-456f-ab8b-938e0fb3f027-0.5589474974062104.png'
    }, { onConflict: 'id' })
    .select('*');

  console.log("Profile setup result:", profData, profErr);

  console.log("3. Upserting paid game 'Death Mine' (9,900 UZS)...");
  const gameData = {
    developer_id: userId,
    title: 'Death Mine',
    slug: 'death-mine',
    price: 9900,
    premium_price: 7900,
    platform: 'PC',
    description: `Qorong'u va xavfli ma'dan konlarida omon qolish va sarguzasht! Death Mine — maruzli va qorong'u mistik kon ichida dahshatli mavjudotlarga qarshi kurashish hamda kon sirlarini oshkor qilishga asoslangan Unity 3D fantastik sarguzasht va horror o'yini. Kon tubiga tushing, resurslarni yig'ing va tirik qoling!

O'yinda ajoyib vizual va ovoz effektlari, dahshatli atmosfera hamda murakkab jumboqlar mavjud.`,
    language: "O'zbek, Ingliz",
    sys_requirements: 'OS: Windows 10/11 (64-bit), RAM: 8GB, GPU: NVIDIA GeForce GTX 1050 / AMD Radeon RX 560, HDD/SSD: 2GB bo\'sh joy',
    download_url: '/Death-Mine.zip',
    cover: '/death_mine_cover.png',
    executable_path: 'Death Mine.exe',
    rating: 5.0
  };

  const { data: gameRes, error: gameErr } = await supabase
    .from('developed_games')
    .upsert([gameData], { onConflict: 'slug' })
    .select('*, profiles:developer_id(*)');

  if (gameErr) {
    console.error("Game publish error:", gameErr);
  } else {
    console.log("🎉 SUCCESS! Paid game 'Death Mine' successfully published!");
    console.log("Published game record:", JSON.stringify(gameRes, null, 2));
  }
}

publishDeathMine();
