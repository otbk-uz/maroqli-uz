async function registerFreshPartner() {
  const baseUrl = "https://sandbox.wlcm.uz";
  
  console.log("Creating new WLCM Sandbox Partner account...");
  const res = await fetch(`${baseUrl}/api/v1/partners/onboarding/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: `maroqli_${Date.now()}`,
      password: "MaroqliPass2026!"
    })
  });

  const data = await res.json();
  console.log("Registration Result (Status " + res.status + "):", data);
}

registerFreshPartner();
