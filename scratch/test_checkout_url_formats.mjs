async function testWebCheckoutUrls() {
  const token = "yACJatvvTMROaEQPHY-7SR_JKbhsJfKYugGtrXASFVeF_SgYFg8ADtf1uCecnB-3";
  const partnerId = "67";
  const externalId = `order_wlcm_${Date.now()}`;
  const amount = 9900;

  const testUrls = [
    `https://sandbox.wlcm.uz/checkout/${externalId}`,
    `https://sandbox.wlcm.uz/checkout?partner_id=${partnerId}&token=${token}&amount=${amount}&external_id=${externalId}`,
    `https://apidev.wlcm.uz/checkout/${externalId}`,
    `https://apidev.wlcm.uz/checkout?partner_id=${partnerId}&token=${token}&amount=${amount}&external_id=${externalId}`,
    `https://checkout.wlcm.uz/pay?partner_id=${partnerId}&token=${token}&amount=${amount}`
  ];

  for (const url of testUrls) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      console.log(`URL: ${url} -> Status ${res.status}`);
    } catch (e) {
      console.log(`URL: ${url} -> Error: ${e.message}`);
    }
  }
}

testWebCheckoutUrls();
