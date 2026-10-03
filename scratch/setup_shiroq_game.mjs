import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = "https://gxbiznuvinnfitppovsd.supabase.co";
const supabaseAnonKey = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const shiroqDescription = `Shiroq afsonasi.

Janr: Stealth / Adventure 
Rejim: Bir o'yinchili (Singleplayer)

Demo haqida:
Miloddan avvalgi 519-yil. Doro I boshchiligidagi fors qo'shini Turon yeriga bostirib kiradi. Saklar ochiq jangda ularga dosh bera olmaydi.
Siz — oddiy chorvador. Qilich ko'tarib jang qila olmaysiz. Sizda bitta xanjar va bu yerni bilish bor.

Omon qoling. Suvsizlik, issiqlik va charchoq doimiy bosim ostida ushlab turadi. Har bir harakat suv talab qiladi.

Cho'lni qurolga aylantiring. Qum ostidan ilon va chayon toping, zaharni idishga yig'ing, dushman suviga qo'shing. Meshlarni to'king, otlarni qochiring, quduqlarni ko'ming.

O'z yo'lingizni tanlang. Qassob, arvoh yoki fitnachi bo'ling. Faqat tabiiy usullardan foydalansangiz, forslar bir-birini ayblay boshlaydi — va bu eng kuchli yo'l.

Har bir zarba sizga ham tegadi. Ko'milgan quduqdan o'zingiz ham icholmaysiz.
Bu o'yin Gerodot va Poliyen yozib qoldirgan haqiqiy afsonaga asoslangan.

Boshqaruv tugmalari:
• Shift: Yugurish
• Tab: Inventar
• E tugmasi: Buyumlarni olish, zahar qo'shish, suv meshini teshish
• C: O'tirish
• W, S, A, D tugmalari: Harakatlanish
• Sichqoncha o'ng tugmasi: Nishonga olish
• Sichqoncha chap tugmasi: Pichoqni nishonga otish`;

async function setupShiroq() {
  console.log("Signing in as developer...");
  const email = `furqatjon_b_official@maroqli.uz`;
  const password = "FurqatjonDev2026!SecurePassword";

  const { data: authRes, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) {
    console.error("Auth error:", authErr);
    return;
  }

  const devId = authRes.user.id;
  console.log("Authenticated developer ID:", devId);

  const publicDir = 'd:/project/maroqli-uz/public';
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Copy Cover
  const sourceCover = 'C:/Users/Dell/.gemini/antigravity-ide/brain/107a3124-8256-443c-ba8b-a7811fd1b733/media__1791063205854.jpg';
  const destCover = path.join(publicDir, 'shiroq_cover.jpg');
  if (fs.existsSync(sourceCover)) {
    fs.copyFileSync(sourceCover, destCover);
    console.log("Copied Shiroq cover image to public/shiroq_cover.jpg");
  }

  // Copy Game RAR Archive
  const sourceRar = 'd:/project/maroqli-uz/scratch/SHIROQ v1.1.rar';
  const destRar = path.join(publicDir, 'SHIROQ_v1.1.rar');
  if (fs.existsSync(sourceRar)) {
    fs.copyFileSync(sourceRar, destRar);
    console.log("Copied Shiroq game archive to public/SHIROQ_v1.1.rar");
  }

  const gamePayload = {
    title: 'Shiroq (Shiroq afsonasi)',
    slug: 'shiroq-afsonasi',
    developer_id: devId,
    price: 9999,
    premium_price: 7999,
    platform: 'PC',
    demo_url: '/SHIROQ_v1.1.rar',
    download_url: '/SHIROQ_v1.1.rar',
    executable_path: 'Shiroq.exe',
    cover: '/shiroq_cover.jpg',
    description: shiroqDescription,
    language: "O'zbek",
    rating: 5.0,
    sys_requirements: "OS: Windows 10/11 (64-bit), RAM: 8GB, GPU: GTX 1050 / AMD RX 560, HDD/SSD: 2GB bo'sh joy"
  };

  const { data: existing } = await supabase
    .from('developed_games')
    .select('id')
    .eq('slug', 'shiroq-afsonasi')
    .maybeSingle();

  if (existing) {
    console.log("Updating existing Shiroq game record:", existing.id);
    const { data: updated, error } = await supabase
      .from('developed_games')
      .update(gamePayload)
      .eq('id', existing.id)
      .select('*');
    if (error) console.error("Update error:", error);
    else console.log("Shiroq updated successfully:", updated);
  } else {
    console.log("Inserting new Shiroq game record...");
    const { data: inserted, error } = await supabase
      .from('developed_games')
      .insert(gamePayload)
      .select('*');
    if (error) console.error("Insert error:", error);
    else console.log("Shiroq inserted successfully:", inserted);
  }
}

setupShiroq();
