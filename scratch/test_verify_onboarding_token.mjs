const token = "yACJatvvTMROaEQPHY-7SR_JKbhsJfKYugGtrXASFVeF_SgYFg8ADtf1uCecnB-3";

async function verifyToken() {
  const url = `https://apidev.wlcm.uz/api/v1/partners/onboarding/?token=${encodeURIComponent(token)}`;
  console.log("Verifying token on:", url);
  try {
    const res = await fetch(url, { method: "GET" });
    console.log("Status:", res.status, res.statusText);
    const data = await res.text();
    console.log("Response:", data);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

verifyToken();
