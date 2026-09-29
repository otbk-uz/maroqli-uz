import crypto from 'crypto';

async function testKeys() {
  const baseUrl = "https://sandbox.wlcm.uz";
  
  // Try fetching onboarding token / session
  const res1 = await fetch(`${baseUrl}/api/v1/payments/providers`);
  console.log("Public Providers status:", res1.status);
  
  // Try creating onboarding token
  const res2 = await fetch(`${baseUrl}/api/v1/partners/onboarding/token`, { method: "POST" });
  console.log("Onboarding token status:", res2.status);
  const text2 = await res2.text();
  console.log("Onboarding token response:", text2);
}

testKeys();
