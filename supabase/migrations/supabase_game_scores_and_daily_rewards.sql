-- Migration: Game High Scores & Daily Play Coin Rewards

-- 1. Add coins column to profiles table if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;

-- 2. Create game_scores table
CREATE TABLE IF NOT EXISTS public.game_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_slug TEXT NOT NULL,
    score BIGINT NOT NULL DEFAULT 0,
    play_time_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick leaderboard lookups per game
CREATE INDEX IF NOT EXISTS idx_game_scores_slug_score ON public.game_scores(game_slug, score DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_user ON public.game_scores(user_id);

-- 3. Create user_daily_rewards table
CREATE TABLE IF NOT EXISTS public.user_daily_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reward_date DATE NOT NULL DEFAULT CURRENT_DATE,
    coins_earned INTEGER NOT NULL DEFAULT 50,
    streak_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_daily_reward UNIQUE (user_id, reward_date)
);

-- Index for daily reward checks
CREATE INDEX IF NOT EXISTS idx_user_daily_rewards_user_date ON public.user_daily_rewards(user_id, reward_date);

-- Enable RLS
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_rewards ENABLE ROW LEVEL SECURITY;

-- Policies for game_scores
DROP POLICY IF EXISTS "Allow public read access to game_scores" ON public.game_scores;
CREATE POLICY "Allow public read access to game_scores" ON public.game_scores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated user insert game_scores" ON public.game_scores;
CREATE POLICY "Allow authenticated user insert game_scores" ON public.game_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for user_daily_rewards
DROP POLICY IF EXISTS "Allow user read own daily_rewards" ON public.user_daily_rewards;
CREATE POLICY "Allow user read own daily_rewards" ON public.user_daily_rewards FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow user insert own daily_rewards" ON public.user_daily_rewards;
CREATE POLICY "Allow user insert own daily_rewards" ON public.user_daily_rewards FOR INSERT WITH CHECK (auth.uid() = user_id);
