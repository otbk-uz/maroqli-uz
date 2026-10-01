import crypto from 'crypto';

const token = "yACJatvvTMROaEQPHY-7SR_JKbhsJfKYugGtrXASFVeF_SgYFg8ADtf1uCecnB-3";
const partnerId = "67";

async function testWithPartnerId() {
  const method = "POST";
  const canonicalPath = "/api/v1/integrations/checkout";
  const timestamp = Date.now().toString();
  const body = {
    partner_id: 67,
    external_id: `order_wlcm_${Date.now()}`,
    amount: 9900,
    currency: "UZS",
    description: "Maroqli Premium Obuna",
    return_url: "https://maroqli.uz/premium"
  };

  const bodyStr = JSON.stringify(body);
  const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
  const payload = `${method}\n${canonicalPath}\n${timestamp}\n${bodyHash}`;
  const signature = crypto.createHmac('sha256', token).update(payload).digest('hex');

  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-API-Key": token,
    "X-Timestamp": timestamp,
    "X-Signature": signature,
    "X-Partner-Id": partnerId,
    "X-Partner-ID": partnerId
  };

  try {
    const res = await fetch("https://apidev.wlcm.uz/api/v1/integrations/checkout", {
      method,
      headers,
      body: bodyStr
    });

    const text = await res.text();
    console.log(`Status ${res.status} -> ${text}`);
  } catch (err) {
    console.log(`Error ${err.message}`);
  }
}

testWithPartnerId();
