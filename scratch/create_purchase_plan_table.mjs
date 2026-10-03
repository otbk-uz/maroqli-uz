import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.game_purchase_plan (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        game_id UUID REFERENCES public.developed_games(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_user_game_purchase_plan UNIQUE (user_id, game_id)
    );

    CREATE INDEX IF NOT EXISTS idx_game_purchase_plan_user ON public.game_purchase_plan(user_id);
    CREATE INDEX IF NOT EXISTS idx_game_purchase_plan_game ON public.game_purchase_plan(game_id);

    ALTER TABLE public.game_purchase_plan ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow read purchase_plan" ON public.game_purchase_plan;
    CREATE POLICY "Allow read purchase_plan" ON public.game_purchase_plan FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow insert purchase_plan" ON public.game_purchase_plan;
    CREATE POLICY "Allow insert purchase_plan" ON public.game_purchase_plan FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow delete purchase_plan" ON public.game_purchase_plan;
    CREATE POLICY "Allow delete purchase_plan" ON public.game_purchase_plan FOR DELETE USING (true);
  `;

  console.log("Creating game_purchase_plan table in Supabase via exec_sql RPC...");
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error("RPC exec_sql error:", error);
  } else {
    console.log("exec_sql result:", data);
  }

  // Verify table check
  const { data: testData, error: testErr } = await supabase.from('game_purchase_plan').select('*').limit(5);
  console.log("Test query game_purchase_plan:", testData, testErr);
}

createTable();
