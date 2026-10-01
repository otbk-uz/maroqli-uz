const token = "yACJatvvTMROaEQPHY-7SR_JKbhsJfKYugGtrXASFVeF_SgYFg8ADtf1uCecnB-3";
const partnerId = 67;

const hosts = [
  "https://sandbox.wlcm.uz",
  "https://api.wlcm.uz",
  "https://paylov.uz",
  "https://api.paylov.uz"
];

const paths = [
  "/api/v1/partners/me",
  "/api/v1/integrations/checkout",
  "/api/v1/partners/onboarding/",
  "/api/v1/partners/onboarding/verify"
];

async function test67() {
  for (const host of hosts) {
    for (const path of paths) {
      try {
        const res = await fetch(`${host}${path}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "X-Partner-ID": String(partnerId),
            "X-API-Key": token,
            "Accept": "application/json"
          }
        });
        const text = await res.text();
        console.log(`[Status ${res.status}] ${host}${path} => ${text.substring(0, 150)}`);
      } catch (e) {
        console.log(`[ERR] ${host}${path} => ${e.message}`);
      }
    }
  }
}

test67();
