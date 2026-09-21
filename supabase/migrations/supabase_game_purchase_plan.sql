-- Migration: Game Purchase Plan (Sotib olish rejasi)

CREATE TABLE IF NOT EXISTS public.game_purchase_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    game_id UUID REFERENCES public.developed_games(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_game_purchase_plan UNIQUE (user_id, game_id)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_game_purchase_plan_user ON public.game_purchase_plan(user_id);

-- RLS Security
ALTER TABLE public.game_purchase_plan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow user read own purchase_plan" ON public.game_purchase_plan;
CREATE POLICY "Allow user read own purchase_plan" ON public.game_purchase_plan FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow user insert own purchase_plan" ON public.game_purchase_plan;
CREATE POLICY "Allow user insert own purchase_plan" ON public.game_purchase_plan FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow user delete own purchase_plan" ON public.game_purchase_plan;
CREATE POLICY "Allow user delete own purchase_plan" ON public.game_purchase_plan FOR DELETE USING (auth.uid() = user_id);
