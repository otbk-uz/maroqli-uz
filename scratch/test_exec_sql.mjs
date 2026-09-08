import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testExecSql() {
  const sql = `
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;
    CREATE TABLE IF NOT EXISTS public.game_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        game_slug TEXT NOT NULL,
        score BIGINT NOT NULL DEFAULT 0,
        play_time_seconds INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS public.user_daily_rewards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        reward_date DATE NOT NULL DEFAULT CURRENT_DATE,
        coins_earned INTEGER NOT NULL DEFAULT 50,
        streak_count INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_user_daily_reward UNIQUE (user_id, reward_date)
    );
  `;

  try {
    const res = await supabase.rpc('exec_sql', { query: sql });
    console.log("RPC exec_sql result:", res);
  } catch (e) {
    console.error("RPC exec_sql error:", e);
  }
}

testExecSql();
