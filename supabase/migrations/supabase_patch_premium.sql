-- Supabase profiles jadvaliga premium ma'lumotlarini qo'shish
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP WITH TIME ZONE;

-- Mavjud ma'lumotlarni xavfsiz holatga keltirish
UPDATE profiles 
SET is_premium = FALSE 
WHERE is_premium IS NULL;
