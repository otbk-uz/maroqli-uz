import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminToken, ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE } from '@/lib/adminSession';

/** Vaqt-doimiy solishtirish (timing attack'dan himoya). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function POST(req: Request) {
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || '';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json(
      { error: 'Admin sozlanmagan (.env.local: ADMIN_USERNAME/ADMIN_PASSWORD/ADMIN_SESSION_SECRET)' },
      { status: 503 }
    );
  }

  let username = '';
  let password = '';
  try {
    const body = await req.json();
    username = String(body.username || '');
    password = String(body.password || '');
  } catch {
    return NextResponse.json({ error: 'Noto\'g\'ri so\'rov' }, { status: 400 });
  }

  const ok = safeEqual(username, ADMIN_USERNAME) && safeEqual(password, ADMIN_PASSWORD);
  if (!ok) {
    return NextResponse.json({ error: 'Login yoki parol noto\'g\'ri' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}
