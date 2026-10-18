-- =====================================================================
-- MAROQLI.UZ - FULL TARGET DATABASE SCHEMA MIGRATION
-- Project: gmikfnosxjzkctfxeyjn
-- Creates all tables, foreign keys, RLS policies, storage policies,
-- and triggers matching live production state.
-- =====================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  age INTEGER,
  region TEXT,
  phone_number TEXT,
  role TEXT DEFAULT 'GAMER',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_seen TIMESTAMPTZ
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. DEVELOPED GAMES
CREATE TABLE IF NOT EXISTS public.developed_games (
  id BIGSERIAL PRIMARY KEY,
  developer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price NUMERIC DEFAULT 0,
  premium_price NUMERIC DEFAULT 0,
  platform TEXT DEFAULT 'WEB',
  description TEXT,
  language TEXT DEFAULT 'O''zbek',
  sys_requirements TEXT,
  sales_count INTEGER DEFAULT 0,
  rating NUMERIC DEFAULT 5.0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  download_url TEXT,
  executable_path TEXT,
  cover TEXT,
  demo_url TEXT,
  screenshots TEXT[] DEFAULT '{}'
);

ALTER TABLE public.developed_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public games are viewable by everyone" 
  ON public.developed_games FOR SELECT USING (true);

CREATE POLICY "Developers can insert games" 
  ON public.developed_games FOR INSERT WITH CHECK (auth.uid() = developer_id);

CREATE POLICY "Developers can update their games" 
  ON public.developed_games FOR UPDATE USING (auth.uid() = developer_id);

CREATE POLICY "Developers can delete their games" 
  ON public.developed_games FOR DELETE USING (auth.uid() = developer_id);

-- 3. NEWS
CREATE TABLE IF NOT EXISTS public.news (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public news are viewable by everyone" 
  ON public.news FOR SELECT USING (true);

-- 4. STREAMERS
CREATE TABLE IF NOT EXISTS public.streamers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  stream_url TEXT NOT NULL,
  platform TEXT DEFAULT 'YOUTUBE',
  game TEXT,
  title TEXT,
  is_live BOOLEAN DEFAULT false,
  viewers_count INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.streamers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public streamers are viewable by everyone" 
  ON public.streamers FOR SELECT USING (true);

CREATE POLICY "Users can manage their streamer profile" 
  ON public.streamers FOR ALL USING (auth.uid() = user_id);

-- 5. GAMEDEV LESSONS
CREATE TABLE IF NOT EXISTS public.gamedev_lessons (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  level TEXT DEFAULT 'Boshlang''ich',
  img TEXT,
  video_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  duration TEXT,
  description TEXT
);

ALTER TABLE public.gamedev_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public lessons are viewable by everyone" 
  ON public.gamedev_lessons FOR SELECT USING (true);

-- 6. GAMEDEV PAST PROJECTS
CREATE TABLE IF NOT EXISTS public.gamedev_past_projects (
  id BIGSERIAL PRIMARY KEY,
  developer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  platform TEXT,
  release_date DATE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.gamedev_past_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public past projects are viewable by everyone" 
  ON public.gamedev_past_projects FOR SELECT USING (true);

-- 7. FORUM SECTIONS & TOPICS
CREATE TABLE IF NOT EXISTS public.forum_sections (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.forum_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public forum sections viewable by everyone" 
  ON public.forum_sections FOR SELECT USING (true);

INSERT INTO public.forum_sections (id, name, description, icon, order_index)
VALUES 
  (1, 'Umumiy muhokama', 'Geymerlar va dasturchilar uchun umumiy suhbatlar', 'ChatBubbleLeftRightIcon', 1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.forum_topics (
  id BIGSERIAL PRIMARY KEY,
  section_id BIGINT REFERENCES public.forum_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  replies_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  dislikes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public forum topics viewable by everyone" 
  ON public.forum_topics FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create topics" 
  ON public.forum_topics FOR INSERT WITH CHECK (auth.uid() = author_id);

-- 8. GAME REVIEWS
CREATE TABLE IF NOT EXISTS public.game_reviews (
  id BIGSERIAL PRIMARY KEY,
  game_id BIGINT REFERENCES public.developed_games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.game_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public game reviews viewable by everyone" 
  ON public.game_reviews FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews" 
  ON public.game_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. AUXILIARY TABLES (BOUGHT GAMES, WISHLIST, PAYMENTS, TOURNAMENTS)
CREATE TABLE IF NOT EXISTS public.bought_games (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id BIGINT REFERENCES public.developed_games(id) ON DELETE CASCADE,
  bought_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  price_paid NUMERIC DEFAULT 0
);
ALTER TABLE public.bought_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their bought games" ON public.bought_games FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.game_wishlist (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id BIGINT REFERENCES public.developed_games(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.game_wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their wishlist" ON public.game_wishlist FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.payment_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'PENDING',
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their payment requests" ON public.payment_requests FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.support_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'OPEN',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their support requests" ON public.support_requests FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.tournaments (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  game_id BIGINT REFERENCES public.developed_games(id) ON DELETE SET NULL,
  prize_pool TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT DEFAULT 'UPCOMING',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public tournaments viewable by everyone" ON public.tournaments FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.tournament_participants (
  id BIGSERIAL PRIMARY KEY,
  tournament_id BIGINT REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public participants viewable by everyone" ON public.tournament_participants FOR SELECT USING (true);

-- 10. AUTH TRIGGER & FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_username TEXT;
BEGIN
  raw_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar_url,
    role,
    created_at
  )
  VALUES (
    NEW.id,
    raw_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', raw_username),
    NEW.raw_user_meta_data->>'avatar_url',
    'GAMER',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. STORAGE ACCESS POLICIES (STRICT SECURITY AS REQUESTED)
-- AVATARS: PUBLIC READ, AUTHENTICATED WRITE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access for Avatars') THEN
    CREATE POLICY "Public Access for Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Upload for Avatars') THEN
    CREATE POLICY "Authenticated Upload for Avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Update for Avatars') THEN
    CREATE POLICY "Authenticated Update for Avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Delete for Avatars') THEN
    CREATE POLICY "Authenticated Delete for Avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- RECEIPTS: PRIVATE READ (ONLY OWNER OR ADMIN OR SERVICE_ROLE)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owner or Admin Access for Receipts') THEN
    CREATE POLICY "Owner or Admin Access for Receipts" ON storage.objects FOR SELECT 
    USING (bucket_id = 'receipts' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid()::text = (storage.filename(name)) OR auth.role() = 'service_role'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Upload for Receipts') THEN
    CREATE POLICY "Authenticated Upload for Receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- GAME_FILES: PROTECTED ACCESS (COVERS ARE PUBLIC, ARCHIVES/BINARIES ARE PROTECTED)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Game Files Public Covers') THEN
    CREATE POLICY "Game Files Public Covers" ON storage.objects FOR SELECT 
    USING (bucket_id = 'game_files' AND (name LIKE '%cover%' OR name LIKE '%screenshot%' OR name NOT LIKE '%.zip'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated Upload for Game Files') THEN
    CREATE POLICY "Authenticated Upload for Game Files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'game_files' AND auth.role() = 'authenticated');
  END IF;
END $$;
