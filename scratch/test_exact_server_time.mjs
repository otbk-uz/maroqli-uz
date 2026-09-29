import crypto from 'crypto';

const API_KEY    = 'wlcm_47f3077b9b09a992349c6b3e8fb574d2';
const API_SECRET = 'ca09112799c6af68674a3eb83ebfe964a27a1625543d632f';
const BASE_URL   = 'https://sandbox.wlcm.uz';

async function testExactServerTime() {
  const currentSec = Math.floor(Date.now() / 1000);
  const offset = 1790692135;
  const exactServerSec = currentSec - offset;

  console.log("Calculated exact server epoch second:", exactServerSec);

  const method = "GET";
  const path = "/api/v1/partners/me";

  for (let delta = -5; delta <= 5; delta++) {
    const ts = (exactServerSec + delta).toString();
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
      console.log(`Delta ${delta} (ts=${ts}) [Status ${res.status}] => ${text}`);
      if (res.ok) {
        console.log("🎉 SUCCESS! Response:", text);
        break;
      }
    } catch (e) {
      console.log(`Delta ${delta} Error: ${e.message}`);
    }
  }
}

testExactServerTime();
