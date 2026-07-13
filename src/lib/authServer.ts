import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from './supabaseAdmin';

/**
 * API route'larida foydalanuvchi haqiqatan kim ekanini SERVER tomonda tekshiradi.
 *
 * Eski kodda API'lar so'rov ichidagi `userId` ga ko'r-ko'rona ishonardi —
 * bu har kimga boshqa odam nomidan ish qilish imkonini berardi (IDOR).
 * Endi mijoz o'zining Supabase access-token'ini `Authorization: Bearer <token>`
 * sarlavhasida yuboradi, biz uni tekshirib, HAQIQIY user id ni qaytaramiz.
 */
export async function getUserFromRequest(req: Request): Promise<{ id: string } | null> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !anon) return null;

  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id };
}

/** Foydalanuvchi ADMIN rolida ekanini bazadan tekshiradi. */
export async function isAdmin(userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from('profiles').select('role').eq('id', userId).single();
  return data?.role === 'ADMIN';
}
