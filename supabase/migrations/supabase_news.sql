-- Yangiliklar jadvali
CREATE TABLE news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) qoidalari
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Barchaga o'qish uchun ruxsat (Select)
CREATE POLICY "Public news are viewable by everyone." ON news FOR SELECT USING (true);

-- Faqat ADMIN rolli foydalanuvchilar yoza oladi (Insert, Update, Delete)
CREATE POLICY "Only admins can insert news" ON news FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);
CREATE POLICY "Only admins can update news" ON news FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);
CREATE POLICY "Only admins can delete news" ON news FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);

-- Storage bucket yaratish (Fayl yuklash uchun)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('news', 'news', true)
ON CONFLICT (id) DO NOTHING;

-- Storage uchun RLS qoidalari
CREATE POLICY "Public Access for News Images" ON storage.objects FOR SELECT USING (bucket_id = 'news');

CREATE POLICY "Admin Upload Access for News Images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'news' AND
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN')
);
