-- Migration: Analytics, Visit Tracking, GameDev Social Links, and Game Session Stats

-- 1. Profiles table enhancements for visit tracking & social media links
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS telegram_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_url TEXT,
ADD COLUMN IF NOT EXISTS github_url TEXT;

-- 2. Developed games table enhancements for game-specific social links & play count
ALTER TABLE public.developed_games
ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS telegram_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_url TEXT,
ADD COLUMN IF NOT EXISTS github_url TEXT;

-- 3. Table for tracking game play activity (for admin analytics)
CREATE TABLE IF NOT EXISTS public.game_play_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_id UUID REFERENCES public.developed_games(id) ON DELETE CASCADE,
    game_slug TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for game_play_sessions
ALTER TABLE public.game_play_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anyone to insert game play sessions" ON public.game_play_sessions;
CREATE POLICY "Allow anyone to insert game play sessions"
    ON public.game_play_sessions FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users and admins to view game play sessions" ON public.game_play_sessions;
CREATE POLICY "Allow users and admins to view game play sessions"
    ON public.game_play_sessions FOR SELECT
    USING (true);

-- 4. Function to increment game play count atomically
CREATE OR REPLACE FUNCTION increment_game_play_count(target_game_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.developed_games
    SET play_count = COALESCE(play_count, 0) + 1
    WHERE id = target_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to increment user visit count atomically
CREATE OR REPLACE FUNCTION increment_user_visit_count(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET visit_count = COALESCE(visit_count, 0) + 1,
        last_seen = NOW()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
