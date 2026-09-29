import crypto from 'crypto';

const API_KEY    = 'wlcm_47f3077b9b09a992349c6b3e8fb574d2';
const API_SECRET = 'ca09112799c6af68674a3eb83ebfe964a27a1625543d632f';

const hosts = [
  "https://sandbox.wlcm.uz",
  "https://apidev.wlcm.uz",
  "https://api.wlcm.uz",
  "https://wlcm.uz"
];

function sign(method, path, tsMs, bodyStr = '') {
  const bodyHash  = crypto.createHash('sha256').update(bodyStr).digest('hex');
  const payload   = `${method.toUpperCase()}\n${path}\n${tsMs}\n${bodyHash}`;
  return crypto.createHmac('sha256', API_SECRET).update(payload).digest('hex');
}

async function testHosts() {
  const method = "GET";
  const path = "/api/v1/partners/me";
  const tsMs = Date.now().toString();

  for (const host of hosts) {
    const sig = sign(method, path, tsMs);
    const headers = {
      'X-API-Key': API_KEY,
      'X-Timestamp': tsMs,
      'X-Signature': sig,
      'Accept': 'application/json'
    };

    try {
      const res = await fetch(host + path, { headers });
      const text = await res.text();
      console.log(`[Status ${res.status}] ${host}${path} => ${text}`);
    } catch (e) {
      console.log(`[ERR] ${host}: ${e.message}`);
    }
  }
}

testHosts();
