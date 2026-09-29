import crypto from 'crypto';

const API_KEY    = 'wlcm_47f3077b9b09a992349c6b3e8fb574d2';
const API_SECRET = 'ca09112799c6af68674a3eb83ebfe964a27a1625543d632f';
const BASE_URL   = 'https://sandbox.wlcm.uz';

async function probeExactTimestamp() {
  const headRes = await fetch(BASE_URL + '/api/v1/payments/providers');
  const dateStr = headRes.headers.get('date');
  const baseSec = dateStr ? Math.floor(new Date(dateStr).getTime() / 1000) : Math.floor(Date.now() / 1000);

  const method = "GET";
  const path = "/api/v1/partners/me";

  // Test timestamps around baseSec
  for (let offset of [0, -5, 5, -10, 10, -30, 30]) {
    const ts = (baseSec + offset).toString();
    const bodyHash = crypto.createHash('sha256').update('').digest('hex');
    const payload = `${method}\n${path}\n${ts}\n${bodyHash}`;
    const signature = crypto.createHmac('sha256', API_SECRET).update(payload).digest('hex');

    const headers = {
      'X-API-Key': API_KEY,
      'X-Timestamp': ts,
      'X-Signature': signature,
      'Accept': 'application/json'
    };

    try {
      const res = await fetch(BASE_URL + path, { headers });
      const text = await res.text();
      console.log(`Offset ${offset} (ts=${ts}) [Status ${res.status}] => ${text}`);
      if (res.ok) {
        console.log("SUCCESS WITH TIMESTAMP:", ts);
        break;
      }
    } catch (e) {
      console.log(`Offset ${offset} Error: ${e.message}`);
    }
  }
}

probeExactTimestamp();
