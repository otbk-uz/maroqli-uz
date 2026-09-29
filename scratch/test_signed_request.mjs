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
    "X-API-Key":    API_KEY,
    "X-Timestamp":  timestamp,
    "X-Signature":  signature,
    "Content-Type": "application/json",
    "Accept":       "application/json"
  };
}

async function testSignedRequests() {
  console.log("1. Testing GET /api/v1/partners/me ...");
  const path1 = "/api/v1/partners/me";
  const headers1 = signRequest("GET", path1);
  const res1 = await fetch(BASE_URL + path1, { headers: headers1 });
  console.log(`Status ${res1.status}:`, await res1.json());

  console.log("\n2. Testing POST /api/v1/integrations/checkout ...");
  const path2 = "/api/v1/integrations/checkout";
  const body2 = {
    external_id: "order_test_1001",
    amount: 9900,
    currency: "UZS",
    description: "Death Mine - Maroqli.uz O'yini",
    return_url: "https://maroqli.uz/premium"
  };
  const headers2 = signRequest("POST", path2, body2);
  const res2 = await fetch(BASE_URL + path2, {
    method: "POST",
    headers: headers2,
    body: JSON.stringify(body2)
  });
  console.log(`Status ${res2.status}:`, await res2.json());
}

testSignedRequests();
