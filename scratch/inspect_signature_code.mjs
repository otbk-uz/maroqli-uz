async function inspectSignatureCode() {
  const res = await fetch("https://sandbox.wlcm.uz/assets/index-BsED82Mt.js");
  const js = await res.text();

  // Find signing code snippets (Python, Node.js, JS crypto)
  const hmacIdx = js.indexOf("import hmac, hashlib");
  if (hmacIdx !== -1) {
    console.log("--- Python / Node code snippets in bundle ---");
    console.log(js.substring(hmacIdx - 100, hmacIdx + 1500));
  } else {
    console.log("Python snippet not found, searching for HMAC sign calls...");
    const matches = [...js.matchAll(/crypto\.subtle\.sign[\s\S]{0,300}/g)];
    for (const m of matches) {
      console.log("FOUND SIGN:", m[0]);
    }
  }
}

inspectSignatureCode();
