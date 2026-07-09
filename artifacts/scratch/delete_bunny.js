require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function deleteBunnyLessons() {
  console.log("Deleting Bunny lessons...");
  const { data, error } = await supabase
    .from('gamedev_lessons')
    .delete()
    .like('video_url', 'bunny://%');

  if (error) {
    console.error("Error deleting:", error);
  } else {
    console.log("Success! Deleted.", data);
  }
}

deleteBunnyLessons();
