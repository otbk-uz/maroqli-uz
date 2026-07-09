-- O'yinlar uchun izohlar va sharhlar jadvali
CREATE TABLE game_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES developed_games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS qoidalari
ALTER TABLE game_reviews ENABLE ROW LEVEL SECURITY;

-- 1. Hamma izohlarni ko'ra oladi
CREATE POLICY "Public reviews are viewable by everyone."
  ON game_reviews FOR SELECT
  USING ( true );

-- 2. Faqat ro'yxatdan o'tganlar izoh yoza oladi
CREATE POLICY "Authenticated users can insert reviews."
  ON game_reviews FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' AND auth.uid() = user_id );

-- 3. Foydalanuvchi o'z izohini o'chira oladi
CREATE POLICY "Users can delete their own reviews."
  ON game_reviews FOR DELETE
  USING ( auth.uid() = user_id );

-- 4. Foydalanuvchi o'z izohini tahrirlay oladi
CREATE POLICY "Users can update their own reviews."
  ON game_reviews FOR UPDATE
  USING ( auth.uid() = user_id );
