const token = "yACJatvvTMROaEQPHY-7SR_JKbhsJfKYugGtrXASFVeF_SgYFg8ADtf1uCecnB-3";
const baseUrl = "https://sandbox.wlcm.uz";

async function onboard67() {
  console.log("1. Verifying Token for Partner 67...");
  const verifyUrl = `${baseUrl}/api/v1/partners/onboarding/?token=${token}`;
  const vRes = await fetch(verifyUrl);
  const vData = await vRes.json();
  console.log("Verify Response (Status " + vRes.status + "):", vData);

  console.log("\n2. Requesting Partner 67 API Credentials...");
  const partnerUsername = "maroqli_official_67";
  const partnerPassword = "MaroqliPartner67!SecurePass";

  const pRes = await fetch(verifyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      username: partnerUsername,
      password: partnerPassword
    })
  });

  const pData = await pRes.json();
  console.log("Credentials Response (Status " + pRes.status + "):", pData);
}

onboard67();
