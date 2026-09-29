import crypto from 'crypto';

const API_KEY    = 'wlcm_47f3077b9b09a992349c6b3e8fb574d2';
const API_SECRET = 'ca09112799c6af68674a3eb83ebfe964a27a1625543d632f';
const BASE_URL   = 'https://sandbox.wlcm.uz';

function sign(method, path, tsMs, bodyObj = null) {
  const bodyStr   = bodyObj ? JSON.stringify(bodyObj) : '';
  const bodyHash  = crypto.createHash('sha256').update(bodyStr).digest('hex');
  const payload   = `${method.toUpperCase()}\n${path}\n${tsMs}\n${bodyHash}`;
  return crypto.createHmac('sha256', API_SECRET).update(payload).digest('hex');
}

async function testCheckout() {
  const method = "POST";
  const path = "/api/v1/integrations/checkout";
  const tsMs = Date.now().toString();

  const body = {
    external_id: `order_maroqli_${Date.now()}`,
    amount: 9900,
    currency: "UZS",
    description: "Death Mine - Maroqli.uz O'yini",
    return_url: "https://maroqli.uz/premium"
  };

  const sig = sign(method, path, tsMs, body);

  const headers = {
    'X-API-Key': API_KEY,
    'X-Timestamp': tsMs,
    'X-Signature': sig,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  console.log("Sending POST checkout with headers:", headers);
  console.log("Body:", body);

  const res = await fetch(BASE_URL + path, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  console.log(`\n[Status ${res.status}] Response:`);
  console.log(await res.text());
}

testCheckout();
