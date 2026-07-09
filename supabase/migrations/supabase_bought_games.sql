-- O'yinlar xaridi va kutubxonasi uchun jadval
CREATE TABLE bought_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  game_id UUID REFERENCES developed_games(id) ON DELETE CASCADE,
  cd_key VARCHAR(100) NOT NULL,
  bought_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, game_id)
);

-- RLS qoidalari (Row Level Security)
ALTER TABLE bought_games ENABLE ROW LEVEL SECURITY;

-- 1. Foydalanuvchilar o'z xaridlarini ko'ra olishi
CREATE POLICY "Users can view their own purchases."
  ON bought_games FOR SELECT
  USING ( auth.uid() = user_id );

-- 2. Ro'yxatdan o'tganlar o'yin sotib ola olishi
CREATE POLICY "Authenticated users can buy games."
  ON bought_games FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' AND auth.uid() = user_id );
