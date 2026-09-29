const token = "yACJatvvTMROaEQPHY-7SR_JKbhsJfKYugGtrXASFVeF_SgYFg8ADtf1uCecnB-3";

const hosts = [
  "https://sandbox.wlcm.uz",
  "https://api.sandbox.wlcm.uz",
  "https://api.wlcm.uz",
  "https://wlcm.uz",
  "https://sandbox.wlcm.io",
  "https://api.wlcm.io",
  "https://wlcm.app",
  "https://api.wlcm.app",
  "https://sandbox.welcome.uz",
  "https://api.welcome.uz",
  "https://welcome.uz",
  "http://localhost:8000",
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:8080"
];

async function checkHost(host) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const url = `${host}/api/v1/partners/onboarding/?token=${token}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: controller.signal });
    clearTimeout(timeoutId);
    console.log(`[${res.status}] ${host}`);
    if (res.ok) {
      const body = await res.json();
      console.log('SUCCESS BODY:', body);
    }
  } catch (e) {
    console.log(`[ERR] ${host}: ${e.message}`);
  }
}

async function run() {
  for (const h of hosts) {
    await checkHost(h);
  }
}

run();
