import crypto from 'crypto';

const API_KEY    = 'wlcm_47f3077b9b09a992349c6b3e8fb574d2';
const API_SECRET = 'ca09112799c6af68674a3eb83ebfe964a27a1625543d632f';
const BASE_URL   = 'https://sandbox.wlcm.uz';

async function testSyncedTimestamp() {
  const headRes = await fetch(BASE_URL + '/api/v1/payments/providers');
  const dateStr = headRes.headers.get('date');
  const serverTimeSec = dateStr ? Math.floor(new Date(dateStr).getTime() / 1000) : Math.floor(Date.now() / 1000);
  console.log("Server Date Header:", dateStr);
  console.log("Calculated Server Timestamp (sec):", serverTimeSec);

  const method = "GET";
  const path = "/api/v1/partners/me";
  const timestamp = serverTimeSec.toString();
  const bodyHash = crypto.createHash('sha256').update('').digest('hex');
  const payload = `${method}\n${path}\n${timestamp}\n${bodyHash}`;
  const signature = crypto.createHmac('sha256', API_SECRET).update(payload).digest('hex');

  const headers = {
    'X-API-Key': API_KEY,
    'X-Timestamp': timestamp,
    'X-Signature': signature,
    'Accept': 'application/json'
  };

  console.log("Sending GET /api/v1/partners/me with headers:", headers);
  const res = await fetch(BASE_URL + path, { headers });
  console.log(`\nResponse Status ${res.status}:`);
  const data = await res.text();
  console.log(data);
}

testSyncedTimestamp();
