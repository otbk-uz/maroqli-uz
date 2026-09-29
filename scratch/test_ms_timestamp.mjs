import crypto from 'crypto';

const API_KEY    = 'wlcm_47f3077b9b09a992349c6b3e8fb574d2';
const API_SECRET = 'ca09112799c6af68674a3eb83ebfe964a27a1625543d632f';
const BASE_URL   = 'https://sandbox.wlcm.uz';

async function testMsTimestamp() {
  const tsMs = Date.now().toString(); // e.g. 1790695868123 (13 digits)
  console.log("Testing with 13-digit MS timestamp:", tsMs);

  const method = "GET";
  const path = "/api/v1/partners/me";
  const bodyHash = crypto.createHash('sha256').update('').digest('hex');
  const payload = `${method}\n${path}\n${tsMs}\n${bodyHash}`;
  const signature = crypto.createHmac('sha256', API_SECRET).update(payload).digest('hex');

  const headers = {
    'X-API-Key': API_KEY,
    'X-Timestamp': tsMs,
    'X-Signature': signature,
    'Accept': 'application/json'
  };

  const res = await fetch(BASE_URL + path, { headers });
  console.log(`\nResponse Status ${res.status}:`);
  const data = await res.text();
  console.log(data);
}

testMsTimestamp();
