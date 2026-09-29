import { createClient } from '@supabase/supabase-js';

const url = 'https://gxbiznuvinnfitppovsd.supabase.co';
const anonKey = 'sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ';

const supabase = createClient(url, anonKey);

async function checkTableInfo() {
  const { data, error } = await supabase.from('payment_requests').select('*').limit(1);
  console.log("Select payment_requests:", { data, error });
}

checkTableInfo();
