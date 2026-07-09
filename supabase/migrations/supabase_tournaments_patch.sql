-- Supabase tournaments jadvaliga premium turnir sozlamasini qo'shish
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

-- Mavjud turnirlarni xavfsiz holda premium: false qilish
UPDATE tournaments 
SET is_premium = FALSE 
WHERE is_premium IS NULL;
