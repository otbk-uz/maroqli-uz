async function getProviders() {
  const res = await fetch("https://sandbox.wlcm.uz/api/v1/payments/providers");
  const data = await res.json();
  console.log("Supported Providers:", data);
}
getProviders();
