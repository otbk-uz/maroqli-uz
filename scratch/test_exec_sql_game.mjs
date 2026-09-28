import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const sql = `
    INSERT INTO public.developed_games (
      developer_id, title, slug, price, premium_price, platform, description, language, sys_requirements, download_url, cover, executable_path, rating
    )
    VALUES (
      'e02e479e-ac9d-4d87-ae08-fd32049abaa1',
      'Isle of Forgotten Memories',
      'isle-of-forgotten-memories',
      0,
      0,
      'PC',
      'Sirlarga to''la sirli orol, yo''qolgan xotiralar va unutilgan afsonalar. Isle of Forgotten Memories — Unity 3D vositasida yaratilgan, yuqori grafikali va sarguzashtga boy 3D fantastik o''yin. Orolni kashf eting, jumboqlarni yeching va qorong''u sirlarni oshkor qiling!

O''yinda ajoyib vizual effektlar, sarguzashtli syujet va yuqori atmosferaga ega soundtrack mavjud. Maroqli.uz platformasidan mutlaqo bepul yuklab olishingiz mumkin.',
      'O''zbek, Ingliz',
      'OS: Windows 10/11 (64-bit), RAM: 8GB, GPU: NVIDIA GeForce GTX 1050 / AMD Radeon RX 560, HDD/SSD: 3GB bo''sh joy',
      '/Isle-of-Forgotten-Memories.rar',
      '/isle_of_forgotten_memories_cover.png',
      'Isle of Forgotten Memories.exe',
      5.0
    )
    ON CONFLICT (slug) DO UPDATE SET
      developer_id = EXCLUDED.developer_id,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      download_url = EXCLUDED.download_url,
      cover = EXCLUDED.cover,
      executable_path = EXCLUDED.executable_path;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  console.log('RPC exec_sql result:', data, error);
}

run();
