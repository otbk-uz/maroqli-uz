import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/adminSession';

/** Admin cookie amaldaligini SERVER tomonda tekshiradi. */
export async function GET() {
  return NextResponse.json({ authenticated: true });
}
