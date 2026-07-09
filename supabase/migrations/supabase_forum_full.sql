-- 1. Forum bo'limlari jadvali
CREATE TABLE IF NOT EXISTS forum_sections (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  topics_count INTEGER DEFAULT 0
);

-- Boshlang'ich (default) bo'limlarni qo'shish (agar bo'sh bo'lsa)
INSERT INTO forum_sections (name, description)
SELECT 'Umumiy Suhbat', 'Gaming haqida erkin suhbatlar va muhokamalar'
WHERE NOT EXISTS (SELECT 1 FROM forum_sections WHERE id = 1);

INSERT INTO forum_sections (name, description)
SELECT 'O''yin Yangiliklari', 'O''yinlar olamidagi eng so''nggi xabarlar va relizlar'
WHERE NOT EXISTS (SELECT 1 FROM forum_sections WHERE id = 2);

INSERT INTO forum_sections (name, description)
SELECT 'Xatolar va Yordam', 'O''yinlarda yoki platformada uchragan xatolar va yordam so''rash'
WHERE NOT EXISTS (SELECT 1 FROM forum_sections WHERE id = 3);

INSERT INTO forum_sections (name, description)
SELECT 'Kiber-sport', 'Turnirlar, jamoalar va kiber-sport musobaqalari haqida'
WHERE NOT EXISTS (SELECT 1 FROM forum_sections WHERE id = 4);


-- 2. Forum mavzulari jadvali
CREATE TABLE IF NOT EXISTS forum_topics (
  id SERIAL PRIMARY KEY,
  section_id INTEGER REFERENCES forum_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  replies_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  dislikes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Xavfsizlik) sozlamalari (Mavzular)
ALTER TABLE forum_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sections are viewable by everyone" ON forum_sections;
CREATE POLICY "Sections are viewable by everyone" ON forum_sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Topics are viewable by everyone" ON forum_topics;
CREATE POLICY "Topics are viewable by everyone" ON forum_topics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert topics" ON forum_topics;
CREATE POLICY "Authenticated users can insert topics" ON forum_topics FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own topics" ON forum_topics;
CREATE POLICY "Users can update their own topics" ON forum_topics FOR UPDATE USING (auth.uid() = author_id);


-- 3. Forum izohlari (Muhokama/Replies) jadvali
CREATE TABLE IF NOT EXISTS forum_replies (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES forum_topics(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS qoidalari (Replies)
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Replies are viewable by everyone" ON forum_replies;
CREATE POLICY "Replies are viewable by everyone" ON forum_replies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert replies" ON forum_replies;
CREATE POLICY "Authenticated users can insert replies" ON forum_replies FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own replies" ON forum_replies;
CREATE POLICY "Users can update their own replies" ON forum_replies FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete their own replies" ON forum_replies;
CREATE POLICY "Users can delete their own replies" ON forum_replies FOR DELETE USING (auth.uid() = author_id);


-- 4. Jonli Ochiq Chat jadvali (Global Chat)
CREATE TABLE IF NOT EXISTS global_chat (
  id SERIAL PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS qoidalari (Global Chat)
ALTER TABLE global_chat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Global chat is viewable by everyone" ON global_chat;
CREATE POLICY "Global chat is viewable by everyone" ON global_chat FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can send messages" ON global_chat;
CREATE POLICY "Authenticated users can send messages" ON global_chat FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete their own messages" ON global_chat;
CREATE POLICY "Users can delete their own messages" ON global_chat FOR DELETE USING (auth.uid() = author_id);

-- Real-time uchun global_chat jadvalini ruxsat etilganlar ro'yxatiga qo'shish
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'global_chat'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE global_chat;
  END IF;
END
$$;
