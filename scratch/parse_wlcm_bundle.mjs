async function parseBundle() {
  console.log("Fetching JS bundle /assets/index-BsED82Mt.js...");
  const res = await fetch("https://sandbox.wlcm.uz/assets/index-BsED82Mt.js");
  const js = await res.text();
  console.log("JS Bundle length:", js.length);

  // Search for API routes (/api/v1/...)
  const routes = [...js.matchAll(/\/api\/v1\/[a-zA-Z0-9_\-\/]+/g)].map(m => m[0]);
  console.log("Discovered API Routes:\n", [...new Set(routes)].sort());

  // Search for headers and authentication strings
  const headers = [...js.matchAll(/x-[a-zA-Z0-9_\-]+/gi)].map(m => m[0]);
  console.log("\nDiscovered Custom Headers:\n", [...new Set(headers)]);

  // Search for keywords like checkout, sign, signature, token, order, payload
  const keywords = ["checkout", "onboarding", "secret", "signature", "hmac", "provider", "webhook"];
  for (const kw of keywords) {
    const snippets = [...js.matchAll(new RegExp(`.{0,50}${kw}.{0,50}`, "gi"))].map(m => m[0].trim());
    console.log(`\n--- Keyword: ${kw} (Found ${snippets.length}) ---`);
    console.log(snippets.slice(0, 10).join("\n"));
  }
}

parseBundle();
