import { createClient } from '@supabase/supabase-js';

const url = 'https://gxbiznuvinnfitppovsd.supabase.co';
const anonKey = 'sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ';

const supabase = createClient(url, anonKey);

async function testInsertNullItemId() {
  console.log("Testing insert with null item_id...");
  const { data, error } = await supabase
    .from('payment_requests')
    .insert({
      user_id: '86812852-5a21-4f10-9b0d-b4b321ed25eb', // real user id from profiles
      item_type: 'GAME',
      item_id: null,
      amount: 9900,
      status: 'PENDING',
      receipt_url: 'https://sandbox.wlcm.uz/receipt'
    })
    .select();

  console.log("Null item_id Result:", { data, error });
}

testInsertNullItemId();
