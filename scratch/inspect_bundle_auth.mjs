async function inspectBundleAuth() {
  const res = await fetch("https://sandbox.wlcm.uz/assets/index-BsED82Mt.js");
  const js = await res.text();

  // Find all header keys used with fetch or axios
  const headerMatches = [...js.matchAll(/["']([Xx]-[a-zA-Z0-9_\-]+)["']/g)].map(m => m[1]);
  console.log("Found X- Headers:", [...new Set(headerMatches)]);

  // Find mentions of invalid_api_key or partners/me or checkout
  const meIdx = js.indexOf("/partners/me");
  if (meIdx !== -1) {
    console.log("\n--- /partners/me context ---");
    console.log(js.substring(meIdx - 200, meIdx + 300));
  }

  const checkoutIdx = js.indexOf("/integrations/checkout");
  if (checkoutIdx !== -1) {
    console.log("\n--- /integrations/checkout context ---");
    console.log(js.substring(checkoutIdx - 200, checkoutIdx + 300));
  }
}

inspectBundleAuth();
