-- SQL Trigger: Avtomatik Google Profil Yaratish
-- Google orqali kirganda auth.users jadvalida yangi user paydo bo'ladi.
-- Ushbu trigger uni public.profiles jadvaliga saqlaydi.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_username TEXT;
BEGIN
  -- Email qismidan username yasash (masalan sherzod@gmail.com -> sherzod)
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
    visit_count,
    created_at
  )
  VALUES (
    NEW.id,
    raw_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', raw_username),
    NEW.raw_user_meta_data->>'avatar_url',
    'GAMER',
    1,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ni yaratish (agar mavjud bo'lmasa)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
