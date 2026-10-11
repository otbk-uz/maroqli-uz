import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

export interface LocalUser {
  id: string;
  email: string;
  username: string;
  full_name: string;
  age?: number;
  region?: string;
  phone_number?: string;
  role: string;
  avatar_url?: string;
  password_hash: string;
  salt: string;
  created_at: string;
  is_premium?: boolean;
  coins?: number;
}

// Global in-memory cache across requests within the same process
const globalRef = global as unknown as { __memoryUsers?: Map<string, LocalUser> };
if (!globalRef.__memoryUsers) {
  globalRef.__memoryUsers = new Map<string, LocalUser>();
}
const memoryCache = globalRef.__memoryUsers;

// Safe filesystem helpers (never throws EROFS on Vercel/serverless)
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'users_db.json');

function tryReadLocalDisk(): LocalUser[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(raw) as LocalUser[];
    }
  } catch {
    // EROFS or filesystem error in serverless environment — safely ignore
  }
  return [];
}

function tryWriteLocalDisk(users: LocalUser[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch {
    // EROFS (Read-only file system on Vercel/AWS Lambda) — safely ignore
  }
}

// Initialise memory cache from disk if available
try {
  const diskUsers = tryReadLocalDisk();
  for (const u of diskUsers) {
    if (u && u.id) memoryCache.set(u.id, u);
  }
} catch {
  // Ignore
}

export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

/**
 * Fetch all users from memory cache, local disk, and Supabase cloud store.
 */
export async function getAllLocalUsers(): Promise<LocalUser[]> {
  try {
    const { data: cloudRows } = await supabase
      .from('bot_users')
      .select('telegram_id, full_name, dob, region, phone_number, has_bronze_ticket')
      .like('telegram_id', 'user:%');

    if (cloudRows && cloudRows.length > 0) {
      for (const row of cloudRows) {
        try {
          if (row.dob) {
            const user = JSON.parse(row.dob) as LocalUser;
            if (user && user.id) {
              memoryCache.set(user.id, user);
            }
          }
        } catch {
          // ignore corrupted JSON in dob
        }
      }
    }
  } catch (err) {
    console.warn("Could not query cloud users from Supabase:", err);
  }

  return Array.from(memoryCache.values());
}

/**
 * Find user by email, username, or phone number.
 * Searches in-memory cache first, then Supabase cloud database.
 */
export async function findLocalUser(identifier: string): Promise<LocalUser | undefined> {
  const clean = identifier.trim().toLowerCase().replace(/^@/, '');
  const cleanDigits = identifier.replace(/\D/g, '');

  const matchesUser = (u: LocalUser) => {
    if (u.email && u.email.toLowerCase() === clean) return true;
    if (u.username && u.username.toLowerCase() === clean) return true;
    if (u.phone_number) {
      const uDigits = u.phone_number.replace(/\D/g, '');
      if (u.phone_number === identifier.trim()) return true;
      if (cleanDigits.length >= 7 && (uDigits.endsWith(cleanDigits) || cleanDigits.endsWith(uDigits))) return true;
    }
    return false;
  };

  // 1. Check in-memory cache first
  for (const user of Array.from(memoryCache.values())) {
    if (matchesUser(user)) return user;
  }

  // 2. Query Supabase cloud database
  try {
    const { data: cloudRows } = await supabase
      .from('bot_users')
      .select('telegram_id, full_name, dob, region, phone_number, has_bronze_ticket')
      .like('telegram_id', 'user:%');

    if (cloudRows && cloudRows.length > 0) {
      for (const row of cloudRows) {
        try {
          if (row.dob) {
            const u = JSON.parse(row.dob) as LocalUser;
            if (u && u.id) {
              memoryCache.set(u.id, u);
              if (matchesUser(u)) return u;
            }
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (cloudErr) {
    console.warn("Cloud lookup warning:", cloudErr);
  }

  return undefined;
}

/**
 * Create a new user and persist both to Supabase cloud database and in-memory cache.
 */
export async function createLocalUser(params: {
  email: string;
  username: string;
  full_name: string;
  password: string;
  age?: number;
  region?: string;
  phone_number?: string;
  role?: string;
  avatar_url?: string;
}): Promise<LocalUser> {
  const salt = crypto.randomBytes(16).toString('hex');
  const password_hash = hashPassword(params.password, salt);
  const userId = crypto.randomUUID();

  const newUser: LocalUser = {
    id: userId,
    email: params.email.trim().toLowerCase(),
    username: params.username.trim(),
    full_name: params.full_name.trim(),
    age: params.age,
    region: params.region,
    phone_number: params.phone_number?.trim(),
    role: params.role || 'GAMER',
    avatar_url: params.avatar_url,
    password_hash,
    salt,
    created_at: new Date().toISOString(),
    is_premium: false,
    coins: 50,
  };

  // 1. Save in-memory cache
  memoryCache.set(newUser.id, newUser);

  // 2. Save to Supabase cloud database
  try {
    await supabase.from('bot_users').upsert({
      telegram_id: 'user:' + newUser.id,
      full_name: newUser.full_name,
      dob: JSON.stringify(newUser),
      region: newUser.region || null,
      phone_number: newUser.phone_number || null,
      has_bronze_ticket: false,
    });
  } catch (cloudErr) {
    console.warn("Warning: Could not save user to Supabase cloud:", cloudErr);
  }

  // 3. Optional local disk write (silently ignores EROFS in serverless)
  tryWriteLocalDisk(Array.from(memoryCache.values()));

  return newUser;
}

/**
 * Upsert an existing or synced user into memory and Supabase cloud database.
 */
export async function upsertLocalUser(user: LocalUser): Promise<void> {
  memoryCache.set(user.id, user);

  try {
    await supabase.from('bot_users').upsert({
      telegram_id: 'user:' + user.id,
      full_name: user.full_name,
      dob: JSON.stringify(user),
      region: user.region || null,
      phone_number: user.phone_number || null,
      has_bronze_ticket: user.is_premium || false,
    });
  } catch (cloudErr) {
    console.warn("Warning: Cloud upsert user failed:", cloudErr);
  }

  tryWriteLocalDisk(Array.from(memoryCache.values()));
}

export function verifyLocalPassword(user: LocalUser, password: string): boolean {
  if (!user.password_hash || !user.salt) return false;
  try {
    const computed = hashPassword(password, user.salt);
    const a = Buffer.from(computed);
    const b = Buffer.from(user.password_hash);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    console.error("verifyLocalPassword error:", err);
    return false;
  }
}

export function createSessionToken(user: { id: string; email: string; username: string; role: string }): string {
  const payload = {
    sub: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 kun
  };
  const secret = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'maroqli-secret-jwt-key-2026';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}
