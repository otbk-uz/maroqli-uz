import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const tables = [
  'profiles',
  'developed_games',
  'bought_games',
  'game_wishlist',
  'game_reviews',
  'game_scores',
  'user_daily_rewards',
  'tournaments',
  'tournament_participants',
  'news',
  'payment_requests',
  'streamers',
  'gamedev_lessons',
  'forum_topics',
  'forum_comments'
];

async function exportAllData() {
  console.log("Starting full Supabase data backup...");

  const backupDir = 'd:/project/maroqli-uz/supabase/backup_data';
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const fullBackup = {};

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(5000);
      if (error) {
        console.warn(`Table ${table} export notice:`, error.message);
        fullBackup[table] = [];
      } else {
        fullBackup[table] = data || [];
        console.log(`Exported ${table}: ${data?.length || 0} records.`);
      }
    } catch (e) {
      console.warn(`Table ${table} fetch exception:`, e.message);
      fullBackup[table] = [];
    }
  }

  const backupFilePath = path.join(backupDir, `supabase_full_backup_${Date.now()}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(fullBackup, null, 2), 'utf8');

  console.log(`\n🎉 FULL BACKUP COMPLETED SUCCESSFULY! Saved to: ${backupFilePath}`);
}

exportAllData();
