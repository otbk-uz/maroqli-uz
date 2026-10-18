import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { findLocalUser, createLocalUser, createSessionToken } from '@/lib/localAuth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { full_name, username, email, password, age, region, phone_number, role, avatar_url } = body;

    if (!email || !password || !username || !full_name) {
      return NextResponse.json(
        { error: "Barcha majburiy maydonlar to'ldirilishi shart." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Local / Cloud bazada bor-yo'qligini tekshirish
    const existingLocal = (await findLocalUser(cleanUsername)) || (await findLocalUser(cleanEmail));
    if (existingLocal) {
      if (existingLocal.email === cleanEmail) {
        return NextResponse.json(
          { error: "Ushbu email bilan avval ro'yxatdan o'tilgan. Iltimos hisobingizga kiring." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Ushbu foydalanuvchi nomi band. Boshqa nom tanlang." },
        { status: 400 }
      );
    }

    // 2. Supabase profiles jadvalida bor-yo'qligini tekshirish
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (existingProfile) {
        return NextResponse.json(
          { error: "Ushbu foydalanuvchi nomi band. Boshqa nom tanlang." },
          { status: 400 }
        );
      }
    } catch (e) {
      console.warn("Supabase profile check notice:", e);
    }

    // 3. Supabase Auth orqali ham ro'yxatdan o'tishni sinab ko'rish (fon rejimida)
    let supabaseUserId = null;
    const finalRole = role || 'VIEWER';

    try {
      const { data: supaData, error: supaErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            username: username.trim(),
            full_name: full_name.trim(),
            role: finalRole,
            phone_number: phone_number?.trim(),
            region: region,
          }
        }
      });
      if (!supaErr && supaData?.user) {
        supabaseUserId = supaData.user.id;
      }
    } catch (supaEx) {
      // Supabase trigger xatosi bo'lsa ham ro'yxatdan o'tish to'xtamasin
      console.warn("Supabase signUp warning (trigger fallback active):", supaEx);
    }

    // 4. Foydalanuvchini bulutli va xavfsiz bazada yaratish
    const newUser = await createLocalUser({
      id: supabaseUserId || undefined,
      email: cleanEmail,
      username: username.trim(),
      full_name: full_name.trim(),
      password,
      age: age ? Number(age) : undefined,
      region,
      phone_number: phone_number?.trim(),
      role: finalRole,
      avatar_url: avatar_url || null,
    });

    // 5. profiles jadvaliga ham to'g'ridan-to'g'ri sinxronlash (supabaseAdmin orqali RLS cheklovisiz)
    try {
      await supabaseAdmin.from('profiles').upsert({
        id: newUser.id,
        email: cleanEmail,
        username: newUser.username,
        full_name: newUser.full_name,
        age: newUser.age || null,
        region: newUser.region || null,
        phone_number: newUser.phone_number || null,
        role: newUser.role,
        avatar_url: newUser.avatar_url || null,
        visit_count: 1,
        coins: 50,
        created_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      });
    } catch (profErr) {
      console.warn("Direct profile upsert attempt with supabaseAdmin:", profErr);
      try {
        await supabase.from('profiles').upsert({
          id: newUser.id,
          email: cleanEmail,
          username: newUser.username,
          full_name: newUser.full_name,
          age: newUser.age || null,
          region: newUser.region || null,
          phone_number: newUser.phone_number || null,
          role: newUser.role,
          avatar_url: newUser.avatar_url || null,
          visit_count: 1,
          coins: 50,
          created_at: new Date().toISOString(),
          last_seen: new Date().toISOString(),
        });
      } catch (fallbackErr) {
        console.warn("Fallback direct profile upsert:", fallbackErr);
      }
    }

    const token = createSessionToken(newUser);

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        nickname: newUser.username,
        full_name: newUser.full_name,
        email: newUser.email,
        phone_number: newUser.phone_number,
        role: newUser.role,
        avatar: newUser.avatar_url,
        is_premium: false,
        coins: 50,
      },
      token,
    });
  } catch (err: any) {
    console.error("Register API error:", err);
    return NextResponse.json(
      { error: err.message || "Ro'yxatdan o'tishda xatolik yuz berdi." },
      { status: 500 }
    );
  }
}
