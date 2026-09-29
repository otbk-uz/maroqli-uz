import crypto from 'crypto';

const API_KEY    = 'wlcm_47f3077b9b09a992349c6b3e8fb574d2';
const API_SECRET = 'ca09112799c6af68674a3eb83ebfe964a27a1625543d632f';

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
    "Accept":       "application/json",
    ...(body ? { "Content-Type": "application/json" } : {})
  };
}

async function testWlcm() {
  const hosts = ["https://sandbox.wlcm.uz", "https://apidev.wlcm.uz"];
  const path = "/api/v1/partners/me";

  for (const host of hosts) {
    try {
      const headers = signRequest("GET", path);
      const res = await fetch(host + path, { headers });
      const data = await res.text();
      console.log(`[${res.status}] ${host}${path} => ${data}`);
    } catch (e) {
      console.log(`[ERR] ${host}: ${e.message}`);
    }
  }

  // Now test Checkout session creation
  const checkoutPath = "/api/v1/integrations/checkout";
  const checkoutBody = {
    external_id: "order_maroqli_1001",
    amount: 9900,
    currency: "UZS",
    description: "Death Mine Game Purchase",
    return_url: "https://maroqli.uz/premium"
  };

  for (const host of hosts) {
    try {
      const headers = signRequest("POST", checkoutPath, checkoutBody);
      const res = await fetch(host + checkoutPath, {
        method: "POST",
        headers,
        body: JSON.stringify(checkoutBody)
      });
      const data = await res.text();
      console.log(`\n[${res.status}] POST ${host}${checkoutPath} => ${data}`);
    } catch (e) {
      console.log(`[ERR] POST ${host}: ${e.message}`);
    }
  }
}

testWlcm();
