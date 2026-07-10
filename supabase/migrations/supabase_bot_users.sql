-- Telegram bot foydalanuvchilari uchun jadval
CREATE TABLE IF NOT EXISTS bot_users (
  telegram_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  dob TEXT NOT NULL,
  region TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Telegram bot holatlari (states) jadvali (Serverless mosligi uchun)
CREATE TABLE IF NOT EXISTS bot_states (
  telegram_id TEXT PRIMARY KEY,
  step TEXT NOT NULL,
  full_name TEXT NULL,
  dob TEXT NULL,
  region TEXT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS faollashtirish
ALTER TABLE bot_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_states ENABLE ROW LEVEL SECURITY;

-- Anonim va autentifikatsiyadan o'tgan foydalanuvchilar o'qishi/yozishi uchun ruxsatlar
CREATE POLICY "Enable all access for service role" ON bot_users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for service role" ON bot_states
  FOR ALL USING (true) WITH CHECK (true);
