async function inspectOnboarding() {
  const res = await fetch("https://sandbox.wlcm.uz/assets/index-BsED82Mt.js");
  const js = await res.text();
  
  const idx = js.indexOf("onboarding");
  console.log("Onboarding snippets:");
  const matches = js.match(/.{0,100}onboarding.{0,100}/g);
  if (matches) {
    matches.slice(0, 15).forEach(m => console.log(m));
  }
}

inspectOnboarding();
