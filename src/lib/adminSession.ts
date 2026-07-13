import crypto from 'crypto';

/**
 * Admin sessiyasi uchun imzolangan token (JWT'ga o'xshash, lekin oddiy).
 * Cookie httpOnly bo'lgani uchun JavaScript uni o'qiy/o'zgartira olmaydi,
 * imzo ADMIN_SESSION_SECRET bilan qilingani uchun soxtalashtirib bo'lmaydi.
 *
 * Eski kodda admin gate faqat sessionStorage.customAdminLogin='true' edi —
 * har kim konsolda shu qatorni yozib admin bo'lardi. Endi bunday emas.
 */
const SECRET = process.env.ADMIN_SESSION_SECRET || '';
const MAX_AGE_SEC = 60 * 60 * 8; // 8 soat

export function createAdminToken(): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `admin.${exp}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token || !SECRET) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [role, expStr, sig] = parts;
  const payload = `${role}.${expStr}`;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  } catch {
    return false;
  }
  if (role !== 'admin') return false;
  const exp = parseInt(expStr, 10);
  if (!exp || exp < Math.floor(Date.now() / 1000)) return false; // muddati tugagan
  return true;
}

export const ADMIN_COOKIE = 'admin_session';
export const ADMIN_COOKIE_MAX_AGE = MAX_AGE_SEC;
