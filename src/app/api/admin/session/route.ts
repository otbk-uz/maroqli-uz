import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/adminSession';

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  const isValid = verifyAdminToken(token);
  return NextResponse.json({ authenticated: isValid }, { status: isValid ? 200 : 401 });
}

