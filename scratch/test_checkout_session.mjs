import crypto from 'crypto';

const API_KEY    = 'wlcm_47f3077b9b09a992349c6b3e8fb574d2';
const API_SECRET = 'ca09112799c6af68674a3eb83ebfe964a27a1625543d632f';
const BASE_URL   = 'https://sandbox.wlcm.uz';

function signRequest(method, path, body = null) {
  const timestamp = Date.now().toString();
  const bodyStr   = body ? JSON.stringify(body) : '';
  const bodyHash  = crypto.createHash('sha256').update(bodyStr).digest('hex');
  const payload   = `${method.toUpperCase()}\n${path}\n${timestamp}\n${bodyHash}`;
  const signature = crypto.createHmac('sha256', API_SECRET).update(payload).digest('hex');

  return {
    "Authorization": `Bearer ${API_KEY}`,
    "X-API-Key":    API_KEY,
    "X-Timestamp":  timestamp,
    "X-Signature":  signature,
    "Content-Type": "application/json",
    "Accept":       "application/json"
  };
}

async function createCheckoutSession() {
  const path = "/api/v1/integrations/checkout";
  const body = {
    external_id: `order_maroqli_${Date.now()}`,
    amount: 9900,
    currency: "UZS",
    description: "Death Mine Game Purchase — Maroqli.uz",
    return_url: "https://maroqli.uz/premium"
  };

  console.log("Sending POST to /api/v1/integrations/checkout ...");
  const headers = signRequest("POST", path, body);
  const res = await fetch(BASE_URL + path, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  console.log("Status:", res.status);
  const responseData = await res.json();
  console.log("Checkout Response Data:", JSON.stringify(responseData, null, 2));
}

createCheckoutSession();
