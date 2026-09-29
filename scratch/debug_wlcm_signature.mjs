import crypto from 'crypto';

const API_KEY    = 'wlcm_47f3077b9b09a992349c6b3e8fb574d2';
const API_SECRET = 'ca09112799c6af68674a3eb83ebfe964a27a1625543d632f';
const BASE_URL   = 'https://sandbox.wlcm.uz';

function sign(method, fullPathOrSearch, timestampMs, bodyStr = '') {
  const bodyHash  = crypto.createHash('sha256').update(bodyStr).digest('hex');
  const payload   = `${method.toUpperCase()}\n${fullPathOrSearch}\n${timestampMs}\n${bodyHash}`;
  return crypto.createHmac('sha256', API_SECRET).update(payload).digest('hex');
}

async function debugSignature() {
  const method = "GET";
  const path = "/api/v1/partners/me";
  const tsMs = Date.now().toString();
  const tsSec = Math.floor(Date.now() / 1000).toString();

  const variations = [
    { label: "ms + /api/v1/partners/me", path: "/api/v1/partners/me", ts: tsMs },
    { label: "ms + /api/v1/partners/me/", path: "/api/v1/partners/me/", ts: tsMs },
    { label: "sec + /api/v1/partners/me", path: "/api/v1/partners/me", ts: tsSec },
    { label: "sec + /api/v1/partners/me/", path: "/api/v1/partners/me/", ts: tsSec },
  ];

  for (const v of variations) {
    const sig = sign(method, v.path, v.ts);
    const headers = {
      "X-API-Key": API_KEY,
      "X-Timestamp": v.ts,
      "X-Signature": sig,
      "Accept": "application/json"
    };

    try {
      const res = await fetch(BASE_URL + v.path, { headers });
      const text = await res.text();
      console.log(`[${res.status}] ${v.label} => ${text}`);
    } catch (e) {
      console.log(`[ERR] ${v.label} => ${e.message}`);
    }
  }
}

debugSignature();
