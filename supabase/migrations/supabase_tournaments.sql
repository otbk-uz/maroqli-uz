-- Jamoalar jadvali
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  captain_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Jamoa a'zolari jadvali
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  in_game_id TEXT NOT NULL,
  role TEXT DEFAULT 'PLAYER', -- CAPTAIN, PLAYER
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(team_id, user_id)
);

-- Turnirlar jadvali
CREATE TABLE tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  game TEXT NOT NULL, -- e.g., CS2, Dota 2, PUBG
  format TEXT NOT NULL, -- e.g., 5v5, 1v1
  prize_pool TEXT NOT NULL,
  max_teams INTEGER NOT NULL DEFAULT 16,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'UPCOMING', -- UPCOMING, ONGOING, COMPLETED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turnir ishtirokchilari (jamoalar)
CREATE TABLE tournament_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(tournament_id, team_id)
);

-- Turnir o'yinlari (Matchlar)
CREATE TABLE tournament_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL, -- 1 = Final, 2 = Semi, 3 = Quarter, etc. (Or 1/16, 1/8)
  match_order INTEGER NOT NULL, -- Position in the bracket
  team1_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team2_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  screenshot_url TEXT,
  status TEXT DEFAULT 'PENDING', -- PENDING, COMPLETED, DISPUTED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) qoidalari
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

-- Barchaga ruxsat (Select)
CREATE POLICY "Public teams are viewable by everyone." ON teams FOR SELECT USING (true);
CREATE POLICY "Public members viewable." ON team_members FOR SELECT USING (true);
CREATE POLICY "Public tournaments viewable." ON tournaments FOR SELECT USING (true);
CREATE POLICY "Public participants viewable." ON tournament_participants FOR SELECT USING (true);
CREATE POLICY "Public matches viewable." ON tournament_matches FOR SELECT USING (true);

-- Insert/Update qoidalari (Jamoalar uchun faqat avtorizatsiyadan o'tganlar, sardorlar)
CREATE POLICY "Auth users can create teams." ON teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Captains can update teams." ON teams FOR UPDATE USING (auth.uid() = captain_id);

CREATE POLICY "Auth users can join teams." ON team_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can leave teams." ON team_members FOR DELETE USING (auth.uid() = user_id);

-- Turnir ma'lumotlarini o'zgartirish (faqat adminlar uchun, yoki hozircha hamma authentikatsiya bo'lganlarga, keyin tuzatamiz)
-- Hozircha oddiy ro'yxatdan o'tish siyosati: Jamoa sardori ro'yxatdan o'tkaza oladi.
CREATE POLICY "Authenticated can register for tournaments." ON tournament_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Natija yuklash (Matchlar)
CREATE POLICY "Authenticated users can update match results." ON tournament_matches FOR UPDATE USING (auth.role() = 'authenticated');
