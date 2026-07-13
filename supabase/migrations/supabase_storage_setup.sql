-- Storage buckets yaratish
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('game_files', 'game_files', true)
ON CONFLICT (id) DO NOTHING;

-- Avatars storage policies
CREATE POLICY "Public Access for Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated Upload Access for Avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update Access for Avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete Access for Avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Receipts storage policies
CREATE POLICY "Public Access for Receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Authenticated Upload Access for Receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- Game files storage policies
CREATE POLICY "Public Access for Game Files" ON storage.objects FOR SELECT USING (bucket_id = 'game_files');
CREATE POLICY "Authenticated Upload Access for Game Files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'game_files' AND auth.role() = 'authenticated');
