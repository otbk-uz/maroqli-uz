import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { findLocalUser, verifyLocalPassword, createSessionToken, upsertLocalUser, hashPassword } from '@/lib/localAuth';
import crypto from 'crypto';

// Known studio/admin email mappings for seamless username/phone login
const KNOWN_ACCOUNT_MAP: Record<string, string> = {
  'maroqli': 'furqatjon_b_official@maroqli.uz',
  '+998954221701': 'furqatjon_b_official@maroqli.uz',
  '954221701': 'furqatjon_b_official@maroqli.uz',
  'xanpro_dev': 'maroqli_admin_dev@maroqli.uz',
  'ss412': 'ss412@maroqli.uz',
  '+998976594696': 'ss412@maroqli.uz',
  '976594696': 'ss412@maroqli.uz',
  'xanpro': 'xanpro_official_dev@maroqli.uz',
  '+998907860586': 'xanpro_official_dev@maroqli.uz',
  '907860586': 'xanpro_official_dev@maroqli.uz',
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Email, foydalanuvchi nomi yoki telefon raqami va parol kiritilishi shart." },
        { status: 400 }
      );
    }

    const rawInput = identifier.trim();
    const cleanLower = rawInput.toLowerCase().replace(/^@/, '');
    const cleanDigits = rawInput.replace(/\D/g, '');

    // 1. Mahalliy va bulutli ro'yxatdan o'tgan foydalanuvchilarni tekshirish
    const localUser = await findLocalUser(rawInput);
    if (localUser) {
      const isValid = verifyLocalPassword(localUser, password);
      if (isValid) {
        const token = createSessionToken(localUser);
        return NextResponse.json({
          success: true,
          user: {
            id: localUser.id,
            username: localUser.username,
            nickname: localUser.username,
            full_name: localUser.full_name,
            email: localUser.email,
            phone_number: localUser.phone_number,
            role: localUser.role,
            avatar: localUser.avatar_url,
            is_premium: localUser.is_premium || false,
            coins: localUser.coins || 50,
          },
          token,
        });
      }
    }

    // 2. Supabase foydalanuvchilarini tekshirish
    let emailToUse = rawInput;
    if (!rawInput.includes('@')) {
      // Known account mapping check
      if (KNOWN_ACCOUNT_MAP[cleanLower]) {
        emailToUse = KNOWN_ACCOUNT_MAP[cleanLower];
      } else if (cleanDigits && KNOWN_ACCOUNT_MAP[cleanDigits]) {
        emailToUse = KNOWN_ACCOUNT_MAP[cleanDigits];
      }
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailToUse.toLowerCase(),
      password,
    });

    if (!authError && authData.user && authData.session) {
      // Foydalanuvchi profilini xavfsiz olish (profiles.email ustunini so'ramasdan)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, full_name, phone_number, role, avatar_url')
        .eq('id', authData.user.id)
        .maybeSingle();

      const resolvedUsername = profile?.username || authData.user.user_metadata?.username || cleanLower || "Gamer";
      const resolvedFullName = profile?.full_name || authData.user.user_metadata?.full_name || resolvedUsername;
      const resolvedRole = profile?.role || "GAMER";
      const resolvedAvatar = profile?.avatar_url || null;
      const resolvedPhone = profile?.phone_number || null;

      // Kelgusi tezkor kirish uchun mahalliy bazaga ham sinxronlash
      try {
        const salt = crypto.randomBytes(16).toString('hex');
        const password_hash = hashPassword(password, salt);
        await upsertLocalUser({
          id: authData.user.id,
          email: authData.user.email?.toLowerCase() || emailToUse.toLowerCase(),
          username: resolvedUsername,
          full_name: resolvedFullName,
          phone_number: resolvedPhone || undefined,
          role: resolvedRole,
          avatar_url: resolvedAvatar || undefined,
          password_hash,
          salt,
          created_at: new Date().toISOString(),
          is_premium: false,
          coins: 50,
        });
      } catch (syncErr) {
        console.warn("Local sync warning:", syncErr);
      }

      return NextResponse.json({
        success: true,
        user: {
          id: authData.user.id,
          username: resolvedUsername,
          nickname: resolvedUsername,
          full_name: resolvedFullName,
          email: authData.user.email,
          phone_number: resolvedPhone,
          role: resolvedRole,
          avatar: resolvedAvatar,
          is_premium: false,
          coins: 50,
        },
        token: authData.session.access_token,
      });
    }

    // Agar ikkalasidan ham o'tmasa
    return NextResponse.json(
      { error: "Email, foydalanuvchi nomi yoki parol noto'g'ri." },
      { status: 401 }
    );
  } catch (err: any) {
    console.error("Login API error:", err);
    return NextResponse.json(
      { error: err.message || "Kirishda xatolik yuz berdi." },
      { status: 500 }
    );
  }
}
