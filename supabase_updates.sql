-- O'yin yaratuvchilar studiyasi uchun profil jadvali
CREATE TABLE IF NOT EXISTS gamedev_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  studio_name TEXT NOT NULL,
  team_members TEXT, -- Jamoa a'zolari (vergul bilan ajratilgan yoki matn)
  location TEXT, -- Studio manzili/joylashuvi
  demo_url TEXT, -- O'yin demoning rasm yoki video havolasi
  demo_type TEXT DEFAULT 'image', -- 'image' yoki 'video'
  release_date TEXT, -- O'yinning to'liq reliz sanasi
  donation_url TEXT, -- Donat qilish uchun havola (Click/Payme yoki boshqa)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) qoidalari
ALTER TABLE gamedev_profiles ENABLE ROW LEVEL SECURITY;

-- 1. Hamma studiya profillarini ko'ra oladi
CREATE POLICY "Public gamedev profiles are viewable by everyone."
  ON gamedev_profiles FOR SELECT
  USING ( true );

-- 2. Faqat gamedev foydalanuvchilar o'z profilini yarata oladi
CREATE POLICY "GameDevs can insert their own profile."
  ON gamedev_profiles FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

-- 3. Faqat gamedev foydalanuvchilar o'z profilini tahrirlay oladi
CREATE POLICY "GameDevs can update their own profile."
  ON gamedev_profiles FOR UPDATE
  USING ( auth.uid() = user_id );


-- Strimerlarga yuborilgan donatlar jadvali
CREATE TABLE IF NOT EXISTS streamer_donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID REFERENCES streamers(id) ON DELETE CASCADE NOT NULL,
  donor_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) qoidalari
ALTER TABLE streamer_donations ENABLE ROW LEVEL SECURITY;

-- 1. Hamma donatlarni ko'ra oladi
CREATE POLICY "Public streamer donations are viewable by everyone."
  ON streamer_donations FOR SELECT
  USING ( true );

-- 2. Tizimda ro'yxatdan o'tgan yoki mehmonlar donat qila oladi
CREATE POLICY "Anyone can insert donations."
  ON streamer_donations FOR INSERT
  WITH CHECK ( true );
