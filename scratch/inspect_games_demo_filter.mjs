import { supabase } from '../src/lib/supabase.ts';

async function checkGames() {
  const { data, error } = await supabase.from('developed_games').select('id, title, platform, price, demo_url, download_url');
  if (error) {
    console.error("Error fetching games:", error);
    return;
  }
  console.log("All games in database:");
  console.table(data);
}

checkGames();
