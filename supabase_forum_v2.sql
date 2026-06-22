-- 1. Forum izohlari (Muhokama/Replies) jadvali
CREATE TABLE forum_replies (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES forum_topics(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS qoidalari (Replies)
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Replies are viewable by everyone" ON forum_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert replies" ON forum_replies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own replies" ON forum_replies FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete their own replies" ON forum_replies FOR DELETE USING (auth.uid() = author_id);

-- 2. Jonli Ochiq Chat jadvali (Global Chat)
CREATE TABLE global_chat (
  id SERIAL PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS qoidalari (Global Chat)
ALTER TABLE global_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Global chat is viewable by everyone" ON global_chat FOR SELECT USING (true);
CREATE POLICY "Authenticated users can send messages" ON global_chat FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own messages" ON global_chat FOR DELETE USING (auth.uid() = author_id);

-- Real-time uchun global_chat jadvalini ruxsat etilganlar ro'yxatiga qo'shish (Majburiy)
-- Eslatma: Supabase Dashboard'da Database -> Replication -> "global_chat" ga ruxsat berish tavsiya qilinadi, lekin bu ham ishlaydi.
alter publication supabase_realtime add table global_chat;
