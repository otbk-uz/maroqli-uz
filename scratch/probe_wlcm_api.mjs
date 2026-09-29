const apiKey = "wlcm_47f3077b9b09a992349c6b3e8fb574d2";
const apiSecret = "ca09112799c6af68674a3eb83ebfe964a27a1625543d632f";
const baseUrl = "https://sandbox.wlcm.uz";

const routes = [
  "/api/v1/checkout",
  "/api/v1/checkout/",
  "/api/v1/checkout/create",
  "/api/v1/checkout/session",
  "/api/v1/checkout/sessions",
  "/api/v1/partners/me",
  "/api/v1/partners/profile",
  "/api/v1/providers",
  "/api/v1/providers/",
  "/api/v1/orders",
  "/api/v1/orders/",
  "/api/v1/webhooks",
  "/api/v1/webhooks/"
];

async function testRoute(route) {
  const url = `${baseUrl}${route}`;
  
  // Try with X-Api-Key and X-Api-Secret headers
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-Api-Key": apiKey,
        "X-Api-Secret": apiSecret,
        "X-Partner-Key": apiKey
      }
    });
    const text = await res.text();
    console.log(`[${res.status}] GET ${route} => ${text.substring(0, 150)}`);
  } catch (e) {
    console.log(`[ERR] GET ${route} => ${e.message}`);
  }
}

async function run() {
  for (const r of routes) {
    await testRoute(r);
  }
}

run();
