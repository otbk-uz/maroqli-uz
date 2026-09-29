async function inspectAuthMe() {
  const res = await fetch("https://sandbox.wlcm.uz/assets/index-BsED82Mt.js");
  const js = await res.text();

  const idx = js.indexOf("/api/v1/auth/me");
  if (idx !== -1) {
    console.log("--- /api/v1/auth/me Context ---");
    console.log(js.substring(idx - 300, idx + 500));
  }

  const rIdx = js.indexOf("/api/v1/auth/refresh");
  if (rIdx !== -1) {
    console.log("\n--- /api/v1/auth/refresh Context ---");
    console.log(js.substring(rIdx - 300, rIdx + 500));
  }
}

inspectAuthMe();
