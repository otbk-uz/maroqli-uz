import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/adminSession';

/** Admin cookie amaldaligini SERVER tomonda tekshiradi. */
export async function GET() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  const ok = verifyAdminToken(token);
  return NextResponse.json({ authenticated: ok });
}
