import crypto from 'crypto';

const API_KEY    = 'wlcm_47f3077b9b09a992349c6b3e8fb574d2';
const API_SECRET = 'ca09112799c6af68674a3eb83ebfe964a27a1625543d632f';
const BASE_URL   = 'https://sandbox.wlcm.uz';

function getSignature(method, path, timestamp, bodyStr = '') {
  const bodyHash  = crypto.createHash('sha256').update(bodyStr).digest('hex');
  const payload   = `${method.toUpperCase()}\n${path}\n${timestamp}\n${bodyHash}`;
  return crypto.createHmac('sha256', API_SECRET).update(payload).digest('hex');
}

async function testHeaderVariations() {
  const method = "GET";
  const path = "/api/v1/payments/providers";
  const timestamp = Date.now().toString();
  const signature = getSignature(method, path, timestamp);

  const testCases = [
    {
      name: "Standard X-API-Key",
      headers: {
        "X-API-Key": API_KEY,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
        "Accept": "application/json"
      }
    },
    {
      name: "Bearer Token",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
        "Accept": "application/json"
      }
    },
    {
      name: "X-Partner-Id",
      headers: {
        "X-API-Key": API_KEY,
        "X-Partner-Id": "54",
        "X-Timestamp": timestamp,
        "X-Signature": signature,
        "Accept": "application/json"
      }
    },
    {
      name: "Seconds Timestamp",
      headers: {
        "X-API-Key": API_KEY,
        "X-Timestamp": Math.floor(Date.now() / 1000).toString(),
        "X-Signature": getSignature(method, path, Math.floor(Date.now() / 1000).toString()),
        "Accept": "application/json"
      }
    }
  ];

  for (const tc of testCases) {
    try {
      const res = await fetch(BASE_URL + path, { headers: tc.headers });
      const text = await res.text();
      console.log(`[${res.status}] ${tc.name} => ${text}`);
    } catch (e) {
      console.log(`[ERR] ${tc.name} => ${e.message}`);
    }
  }
}

testHeaderVariations();
