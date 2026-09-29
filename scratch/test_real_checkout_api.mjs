import crypto from 'crypto';

const apiKey = "wlcm_47f3077b9b09a992349c6b3e8fb574d2";
const apiSecret = "ca09112799c6af68674a3eb83ebfe964a27a1625543d632f";
const baseUrl = "https://sandbox.wlcm.uz";

async function testCheckout() {
  const path = "/api/v1/integrations/checkout";
  const body = {
    external_id: `order_test_${Date.now()}`,
    amount: 9900,
    currency: "UZS",
    description: "Death Mine Game Purchase",
    return_url: "https://maroqli.uz/premium/pay-simulate"
  };

  const timestamp = Date.now().toString();
  const bodyStr = JSON.stringify(body);
  const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
  const payload = `POST\n${path}\n${timestamp}\n${bodyHash}`;
  const signature = crypto.createHmac('sha256', apiSecret).update(payload).digest('hex');

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "X-API-Key": apiKey,
    "X-Timestamp": timestamp,
    "X-Signature": signature,
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  console.log("Calling WLCM checkout API...");
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers,
      body: bodyStr
    });

    console.log("Response status:", res.status, res.statusText);
    const text = await res.text();
    console.log("Response body:", text);
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

testCheckout();
