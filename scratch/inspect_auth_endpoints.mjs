async function inspectAuthEndpoints() {
  const res = await fetch("https://sandbox.wlcm.uz/assets/index-BsED82Mt.js");
  const js = await res.text();

  // Find all matches for login, token, auth
  const authRoutes = [...js.matchAll(/\/api\/v1\/[a-zA-Z0-9_\-\/]*auth[a-zA-Z0-9_\-\/]*/gi)].map(m => m[0]);
  console.log("Auth Routes:", [...new Set(authRoutes)]);

  const loginRoutes = [...js.matchAll(/\/api\/v1\/[a-zA-Z0-9_\-\/]*login[a-zA-Z0-9_\-\/]*/gi)].map(m => m[0]);
  console.log("Login Routes:", [...new Set(loginRoutes)]);

  const tokenRoutes = [...js.matchAll(/\/api\/v1\/[a-zA-Z0-9_\-\/]*token[a-zA-Z0-9_\-\/]*/gi)].map(m => m[0]);
  console.log("Token Routes:", [...new Set(tokenRoutes)]);
}

inspectAuthEndpoints();
