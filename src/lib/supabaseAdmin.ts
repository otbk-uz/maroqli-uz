import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase admin client (service role — RLS'ni chetlab o'tadi).
 *
 * MUHIM: bu fayl HECH QACHON mijoz (browser) kodiga import qilinmasin.
 * Faqat `src/app/api/**` route'larida ishlating.
 *
 * Eski kodda service key mavjud bo'lmasa, jimgina anon key'ga tushib
 * qolar edi — bu xavfsizlikni buzadi. Endi bunday fallback yo'q:
 * kalit yo'q bo'lsa, ochiq-oydin xatolik beriladi.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Server sozlanmagan: NEXT_PUBLIC_SUPABASE_URL yoki SUPABASE_SERVICE_ROLE_KEY yo\'q. ' +
        '.env.local faylini to\'ldiring (anon key\'ga tushib qolish taqiqlangan).'
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
