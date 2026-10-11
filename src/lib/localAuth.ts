import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'users_db.json');

function ensureDbFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

export function getAllLocalUsers(): LocalUser[] {
  ensureDbFile();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw) as LocalUser[];
  } catch (err) {
    console.error("Error reading users_db.json:", err);
    return [];
  }
}

export function saveAllLocalUsers(users: LocalUser[]): void {
  ensureDbFile();
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), 'utf8');
}

export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function findLocalUser(identifier: string): LocalUser | undefined {
  const users = getAllLocalUsers();
  const clean = identifier.trim().toLowerCase().replace(/^@/, '');
  const cleanDigits = identifier.replace(/\D/g, '');

  return users.find((u) => {
    if (u.email && u.email.toLowerCase() === clean) return true;
    if (u.username && u.username.toLowerCase() === clean) return true;
    if (u.phone_number) {
      const uDigits = u.phone_number.replace(/\D/g, '');
      if (u.phone_number === identifier.trim()) return true;
      if (cleanDigits.length >= 7 && (uDigits.endsWith(cleanDigits) || cleanDigits.endsWith(uDigits))) return true;
    }
    return false;
  });
}

export function createLocalUser(params: {
  email: string;
  username: string;
  full_name: string;
  password: string;
  age?: number;
  region?: string;
  phone_number?: string;
  role?: string;
  avatar_url?: string;
}): LocalUser {
  const users = getAllLocalUsers();
  const salt = crypto.randomBytes(16).toString('hex');
  const password_hash = hashPassword(params.password, salt);

  const newUser: LocalUser = {
    id: crypto.randomUUID(),
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

  users.push(newUser);
  saveAllLocalUsers(users);
  return newUser;
}

export function upsertLocalUser(user: LocalUser): void {
  const users = getAllLocalUsers();
  const idx = users.findIndex(u => u.id === user.id || u.email === user.email || u.username.toLowerCase() === user.username.toLowerCase());
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...user };
  } else {
    users.push(user);
  }
  saveAllLocalUsers(users);
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
