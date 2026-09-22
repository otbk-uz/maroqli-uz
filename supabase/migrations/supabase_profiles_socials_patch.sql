-- profiles jadvaliga GameDev ijtimoiy tarmoq ssilkalari
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS telegram_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_url TEXT,
ADD COLUMN IF NOT EXISTS github_url TEXT;

-- Existing gamedev_profiles dan ham qo'shilgan bo'lsa, izoh:
-- gamedev_profiles allaqachon telegram_url, instagram_url, youtube_url mavjud
-- Bu profiles jadvalidagi qo'shimcha ustunlar
