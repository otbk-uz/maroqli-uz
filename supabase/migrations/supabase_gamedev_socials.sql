-- Gamedev profiles uchun ijtimoiy tarmoq ssilkalari
ALTER TABLE gamedev_profiles
ADD COLUMN IF NOT EXISTS telegram_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_url TEXT;
