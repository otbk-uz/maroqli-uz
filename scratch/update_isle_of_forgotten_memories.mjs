import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://gxbiznuvinnfitppovsd.supabase.co";
const supabaseAnonKey = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateGame() {
  console.log("Searching for 'Isle of Forgotten Memories' in Supabase...");

  const { data: searchData, error: searchError } = await supabase
    .from('developed_games')
    .select('*')
    .ilike('title', '%Isle of Forgotten Memories%');

  if (searchError) {
    console.error("Search error:", searchError);
    return;
  }

  console.log("Found games:", searchData);

  if (searchData && searchData.length > 0) {
    for (const game of searchData) {
      const { data: updated, error: updateError } = await supabase
        .from('developed_games')
        .update({
          demo_url: null,
          platform: 'PC',
          price: game.price && Number(game.price) > 0 ? game.price : 49000
        })
        .eq('id', game.id)
        .select('*');

      if (updateError) {
        console.error("Update error for game id", game.id, updateError);
      } else {
        console.log("Successfully updated game:", updated);
      }
    }
  } else {
    console.log("No game found with title 'Isle of Forgotten Memories'. Inspecting all games...");
    const { data: allGames } = await supabase.from('developed_games').select('id, title, platform, price, demo_url');
    console.table(allGames);
  }
}

updateGame();
