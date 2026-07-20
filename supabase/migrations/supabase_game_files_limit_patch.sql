-- O'yin fayllarini yuklash uchun game_files bucket hajmini 10GB (10 * 1024 * 1024 * 1024 bytes) gacha oshirish
UPDATE storage.buckets 
SET file_size_limit = 10737418240 
WHERE id = 'game_files';
