import crypto from 'crypto';

const API_KEY    = 'wlcm_47f3077b9b09a992349c6b3e8fb574d2';
const API_SECRET = 'ca09112799c6af68674a3eb83ebfe964a27a1625543d632f';

const baseUrls = [
  "https://sandbox.wlcm.uz",
  "https://apidev.wlcm.uz",
  "https://api.wlcm.uz",
  "https://api.sandbox.wlcm.uz"
];

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

async function testBaseUrls() {
  const path = "/api/v1/partners/me";

  for (const base of baseUrls) {
    try {
      const headers = signRequest("GET", path);
      const url = base + path;
      const res = await fetch(url, { headers });
      const text = await res.text();
      console.log(`[${res.status}] ${url} => ${text.substring(0, 150)}`);
    } catch (e) {
      console.log(`[ERR] ${base} => ${e.message}`);
    }
  }
}

testBaseUrls();
