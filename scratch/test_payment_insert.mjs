import { createClient } from '@supabase/supabase-js';

const url = 'https://gxbiznuvinnfitppovsd.supabase.co';
const anonKey = 'sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ';

const supabase = createClient(url, anonKey);

async function testInsert() {
  console.log("Testing insert with anon key...");
  const { data, error } = await supabase
    .from('payment_requests')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      item_type: 'GAME',
      item_id: '1',
      amount: 9900,
      status: 'PENDING',
      receipt_url: 'https://sandbox.wlcm.uz/receipt'
    })
    .select();

  console.log("Result:", { data, error });
}

testInsert();
