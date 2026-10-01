const token = "yACJatvvTMROaEQPHY-7SR_JKbhsJfKYugGtrXASFVeF_SgYFg8ADtf1uCecnB-3";
const partnerId = "67";

const endpoints = [
  "/onboarding",
  "/onboarding/start",
  "/partners/onboarding",
  "/auth/token",
  "/auth/partner",
  "/integrations/checkout",
  "/checkout"
];

async function testEndpoint(path) {
  const url = `https://apidev.wlcm.uz/api/v1${path}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "X-API-Key": token,
        "X-Partner-ID": partnerId
      }
    });
    const text = await res.text();
    console.log(`${path}: Status ${res.status} -> ${text.substring(0, 150)}`);
  } catch (e) {
    console.log(`${path}: Error ${e.message}`);
  }
}

async function run() {
  for (const ep of endpoints) {
    await testEndpoint(ep);
  }
}

run();
