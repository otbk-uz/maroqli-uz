-- Ushbu kodni Supabase proyektidagi SQL Editor bo'limiga kiritib "Run" (ishga tushirish) ni bosing:

-- 1. Forum bo'limlari jadvali
CREATE TABLE forum_sections (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  topics_count INTEGER DEFAULT 0
);

-- Boshlang'ich (default) bo'limlarni qo'shish
INSERT INTO forum_sections (name, description) VALUES
('Umumiy Suhbat', 'Gaming haqida erkin suhbatlar va muhokamalar'),
('O''yin Yangiliklari', 'O''yinlar olamidagi eng so''nggi xabarlar va relizlar'),
('Xatolar va Yordam', 'O''yinlarda yoki platformada uchragan xatolar va yordam so''rash'),
('Kiber-sport', 'Turnirlar, jamoalar va kiber-sport musobaqalari haqida');

-- 2. Forum mavzulari jadvali
CREATE TABLE forum_topics (
  id SERIAL PRIMARY KEY,
  section_id INTEGER REFERENCES forum_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  replies_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  dislikes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Xavfsizlik) sozlamalari
ALTER TABLE forum_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;

-- Bo'limlarni hamma ko'rishi mumkin
CREATE POLICY "Sections are viewable by everyone" ON forum_sections FOR SELECT USING (true);

-- Mavzularni hamma ko'rishi mumkin
CREATE POLICY "Topics are viewable by everyone" ON forum_topics FOR SELECT USING (true);

-- Faqat ro'yxatdan o'tganlar mavzu yoza oladi
CREATE POLICY "Authenticated users can insert topics" ON forum_topics FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Faqat mavzu egasi o'z mavzusini o'zgartira oladi
CREATE POLICY "Users can update their own topics" ON forum_topics FOR UPDATE USING (auth.uid() = author_id);
