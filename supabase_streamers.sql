-- Strimerlar uchun jadval
CREATE TABLE streamers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  stream_url TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'Twitch',
  game TEXT,
  title TEXT,
  is_live BOOLEAN DEFAULT false,
  viewers_count INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Strimerlarni kuzatuvchilar jadvali
CREATE TABLE streamer_followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID REFERENCES streamers(id) ON DELETE CASCADE,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(streamer_id, follower_id)
);

-- RLS Qoidalari
ALTER TABLE streamers ENABLE ROW LEVEL SECURITY;
ALTER TABLE streamer_followers ENABLE ROW LEVEL SECURITY;

-- 1. Hamma strimerlarni ko'ra oladi
CREATE POLICY "Public streamers are viewable by everyone."
  ON streamers FOR SELECT USING ( true );

-- 2. Faqat ro'yxatdan o'tganlar strimer profilini yaratishi mumkin
CREATE POLICY "Authenticated users can insert streamers."
  ON streamers FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' AND auth.uid() = user_id );

-- 3. Faqat strimerni o'zi yoki Admin o'zgartirishi mumkin
CREATE POLICY "Users can update their own streamer profile."
  ON streamers FOR UPDATE
  USING ( auth.uid() = user_id );

-- 4. Hamma followerlarni ko'ra oladi
CREATE POLICY "Public followers are viewable by everyone."
  ON streamer_followers FOR SELECT USING ( true );

-- 5. Foydalanuvchilar follow qila oladi
CREATE POLICY "Authenticated users can follow."
  ON streamer_followers FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' AND auth.uid() = follower_id );

-- 6. Foydalanuvchilar unfollow qila oladi
CREATE POLICY "Users can unfollow."
  ON streamer_followers FOR DELETE
  USING ( auth.uid() = follower_id );

-- Funksiya: Kuzatuvchilar sonini avtomatik hisoblash
CREATE OR REPLACE FUNCTION update_streamer_followers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE streamers SET followers_count = followers_count + 1 WHERE id = NEW.streamer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE streamers SET followers_count = followers_count - 1 WHERE id = OLD.streamer_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_followers_count
AFTER INSERT OR DELETE ON streamer_followers
FOR EACH ROW EXECUTE FUNCTION update_streamer_followers_count();
