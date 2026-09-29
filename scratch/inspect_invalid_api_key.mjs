async function inspectInvalidApiKey() {
  const res = await fetch("https://sandbox.wlcm.uz/assets/index-BsED82Mt.js");
  const js = await res.text();

  const idx = js.indexOf("invalid_api_key");
  if (idx !== -1) {
    console.log("--- Context around invalid_api_key ---");
    console.log(js.substring(idx - 300, idx + 400));
  } else {
    console.log("invalid_api_key not found in frontend bundle (returned by backend DB lookup).");
  }
}

inspectInvalidApiKey();
