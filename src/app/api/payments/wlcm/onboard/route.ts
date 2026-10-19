import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || 
                process.env.WLCM_PROD_TOKEN || 
                "tOUD4KbJivrqewkoqZF7TDU97Shm9EG5xydqqFCouzz7dwv-rt7twJz2MnOP648h";

  const partnerName = url.searchParams.get("name") || "Maroqli";

  // 1. Vercel serverining tashqi IP manzilini tekshiramiz
  let serverIp = "unknown";
  try {
    const ipRes = await fetch("https://api.ipify.org?format=json");
    const ipData = await ipRes.json();
    serverIp = ipData.ip;
  } catch (e: any) {
    serverIp = `Error fetching IP: ${e.message}`;
  }

  const results: any = {
    server_ip: serverIp,
    token_used: token.substring(0, 10) + "..." + token.substring(token.length - 6),
    timestamp: new Date().toISOString()
  };

  const wlcmOnboardUrl = `https://api.wlcm.uz/api/v1/partners/onboarding/?token=${encodeURIComponent(token)}`;

  // 2. GET so'rovi yuboramiz (tekshirish uchun)
  try {
    const getRes = await fetch(wlcmOnboardUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Maroqli-Uz/1.0"
      }
    });

    const getText = await getRes.text();
    let getJson;
    try { getJson = JSON.parse(getText); } catch { getJson = getText; }

    results.get_onboard = {
      status: getRes.status,
      statusText: getRes.statusText,
      data: getJson
    };
  } catch (e: any) {
    results.get_onboard = { error: e.message };
  }

  // 3. POST so'rovi yuboramiz (kalitlarni olish uchun)
  try {
    const postRes = await fetch(wlcmOnboardUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Maroqli-Uz/1.0"
      },
      body: JSON.stringify({
        name: partnerName
      })
    });

    const postText = await postRes.text();
    let postJson;
    try { postJson = JSON.parse(postText); } catch { postJson = postText; }

    results.post_onboard = {
      status: postRes.status,
      statusText: postRes.statusText,
      data: postJson
    };
  } catch (e: any) {
    results.post_onboard = { error: e.message };
  }

  return NextResponse.json(results, { status: 200 });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
