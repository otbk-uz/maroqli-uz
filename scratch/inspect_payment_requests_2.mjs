import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gxbiznuvinnfitppovsd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_twgNdvLwFh1gbMpqCSp0UA_OrbLMIrQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkPaymentRequestsTable2() {
  const { data, error } = await supabase
    .from('payment_requests')
    .select('*, profiles(username, full_name, phone_number)')
    .limit(10);

  if (error) {
    console.error("Error querying payment_requests:", error);
  } else {
    console.log("payment_requests count:", data?.length || 0);
    console.log(JSON.stringify(data, null, 2));
  }
}

checkPaymentRequestsTable2();
