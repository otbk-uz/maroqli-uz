-- O'yinlar do'koni uchun jadval (GameDev)
CREATE TABLE developed_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  developer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price NUMERIC DEFAULT 0,
  platform TEXT DEFAULT 'PC',
  description TEXT NOT NULL,
  language TEXT,
  sys_requirements TEXT,
  sales_count INTEGER DEFAULT 0,
  rating NUMERIC DEFAULT 5.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS qoidalari
ALTER TABLE developed_games ENABLE ROW LEVEL SECURITY;

-- 1. Hamma o'yinlarni ko'ra oladi
CREATE POLICY "Public games are viewable by everyone."
  ON developed_games FOR SELECT
  USING ( true );

-- 2. Dasturchilar (GAMEDEV) o'yin yuklay oladi
CREATE POLICY "Developers can insert their own games."
  ON developed_games FOR INSERT
  WITH CHECK ( auth.uid() = developer_id );

-- 3. Dasturchilar o'z o'yinlarini tahrirlay oladi
CREATE POLICY "Developers can update their own games."
  ON developed_games FOR UPDATE
  USING ( auth.uid() = developer_id );

-- 4. Dasturchilar o'z o'yinlarini o'chira oladi
CREATE POLICY "Developers can delete their own games."
  ON developed_games FOR DELETE
  USING ( auth.uid() = developer_id );
