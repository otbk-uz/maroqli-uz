import crypto from 'crypto';

const token = "yACJatvvTMROaEQPHY-7SR_JKbhsJfKYugGtrXASFVeF_SgYFg8ADtf1uCecnB-3";

const secretsToTest = [
  token,
  "ca09112799c6af68674a3eb83ebfe964a27a1625543d632f",
  "67",
  ""
];

async function testSecret(secret) {
  const method = "GET";
  const canonicalPath = "/api/v1/partners/me";
  const timestamp = Date.now().toString();
  const bodyHash = crypto.createHash('sha256').update("").digest('hex');
  const payload = `${method}\n${canonicalPath}\n${timestamp}\n${bodyHash}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  const headers = {
    "X-API-Key": token,
    "X-Timestamp": timestamp,
    "X-Signature": signature,
    "Authorization": `Bearer ${token}`
  };

  try {
    const res = await fetch("https://apidev.wlcm.uz/api/v1/partners/me", { method, headers });
    const text = await res.text();
    console.log(`Secret [${secret.substring(0, 10)}...]: Status ${res.status} -> ${text.substring(0, 150)}`);
  } catch (err) {
    console.log(`Secret [${secret.substring(0, 10)}...]: Error -> ${err.message}`);
  }
}

async function run() {
  for (const s of secretsToTest) {
    await testSecret(s);
  }
}

run();
