import { wlcmClient } from '../src/lib/wlcm.ts';

async function test() {
  const result = await wlcmClient.createCheckoutSession({
    externalId: `order_wlcm_${Date.now()}`,
    amount: 9900,
    currency: "UZS",
    description: "Maroqli Premium Obuna",
    returnUrl: "https://maroqli.uz/premium"
  });

  console.log("Official WLCM Checkout Redirect Result:");
  console.log(result);
}

test();
