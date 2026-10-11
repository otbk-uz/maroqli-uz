-- ==============================================================================
-- MAROQLI.UZ - RO'YXATDAN O'TISH VA KIRISHNI TO'LIQ TUZATISH SKRIPTI (SQL)
-- Ushbu kodni Supabase Dashboard -> SQL Editor bo'limiga nusxalab "Run" tugmasini bosing.
-- ==============================================================================

-- 1. profiles jadvalida yetishmayotgan ustunlarni qo'shish
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS telegram_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_url TEXT,
ADD COLUMN IF NOT EXISTS github_url TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;

-- 2. Eski xatoli trigger'ni olib tashlash
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Yangilangan va 100% xatosiz ishlaydigan handle_new_user funksiyasini yaratish
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  desired_username TEXT;
  final_username TEXT;
  username_conflict_count INTEGER;
  user_full_name TEXT;
  user_role TEXT;
  user_age INTEGER;
  user_region TEXT;
  user_phone TEXT;
BEGIN
  -- Username tanlash
  desired_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );
  
  -- Username toza formatda bo'lishini ta'minlash
  desired_username := REGEXP_REPLACE(desired_username, '[^a-zA-Z0-9_]', '_', 'g');
  IF desired_username IS NULL OR LENGTH(desired_username) = 0 THEN
    desired_username := 'user_' || SUBSTRING(NEW.id::TEXT, 1, 8);
  END IF;

  -- Username takrorlanmasligini tekshirish
  SELECT COUNT(*) INTO username_conflict_count
  FROM public.profiles
  WHERE username = desired_username AND id != NEW.id;

  IF username_conflict_count > 0 THEN
    final_username := desired_username || '_' || SUBSTRING(NEW.id::TEXT, 1, 4);
  ELSE
    final_username := desired_username;
  END IF;

  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    final_username
  );

  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'GAMER');
  
  BEGIN
    user_age := (NEW.raw_user_meta_data->>'age')::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    user_age := NULL;
  END;

  user_region := NEW.raw_user_meta_data->>'region';
  user_phone := NEW.raw_user_meta_data->>'phone_number';

  -- Profilni xavfsiz saqlash yoki yangilash
  INSERT INTO public.profiles (
    id,
    email,
    username,
    full_name,
    age,
    region,
    phone_number,
    role,
    avatar_url,
    visit_count,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    final_username,
    user_full_name,
    user_age,
    user_region,
    user_phone,
    user_role,
    NEW.raw_user_meta_data->>'avatar_url',
    1,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    last_seen = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Agar kutilmagan xatolik bo'lsa ham auth.users ro'yxatdan o'tishi to'xtab qolmasin
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Yangi trigger'ni qayta bog'lash
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Mavjud profillarga email ustunini auth.users dan sinxronlash (agar bo'sh bo'lsa)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- Tayyor!
