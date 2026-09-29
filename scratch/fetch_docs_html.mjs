async function getDocs() {
  const res = await fetch("https://sandbox.wlcm.uz/docs");
  const html = await res.text();
  console.log("HTML length:", html.length);

  // Extract swagger or redoc spec object if embedded in script tag
  const match = html.match(/spec\s*:\s*({[\s\S]*?})\s*,\s*dom_id/i) ||
                html.match(/spec-url=["'](.*?)["']/i) ||
                html.match(/(https?:\/\/[^\s"']+\.json)/i);

  console.log("Match:", match ? match[1] || match[0] : "No match found");
  
  // Find all endpoints mentioned in HTML or JS
  const endpoints = [...html.matchAll(/\/api\/v1\/[a-zA-Z0-9_\-\/]+/g)].map(m => m[0]);
  console.log("Found endpoints:", [...new Set(endpoints)]);
}

getDocs();
