import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "@/lib/authServer";

/**
 * Turnir jonli efiri uchun Cloudflare Stream "live input" yaratadi.
 * FAQAT ADMIN chaqira oladi (rol foydalanuvchining o'z tokeni bilan tekshiriladi).
 *
 * Admin qaytgan RTMP manzili + stream kalitini PRISM Live Studio (yoki OBS) ga
 * kiritib efirga chiqadi; tomoshabinlar Cloudflare pleyerida ko'radi.
 */
export async function POST(req: Request) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!accountId || !token) {
    return NextResponse.json(
      { error: "Cloudflare Stream sozlanmagan (.env.local: CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_STREAM_API_TOKEN)" },
      { status: 503 }
    );
  }

  // 1) Foydalanuvchini token orqali aniqlash
  const authed = await getUserFromRequest(req);
  if (!authed) {
    return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }

  // 2) FAQAT ADMIN — rolni foydalanuvchining o'z sessiyasi bilan o'qiymiz (RLS: o'z profilini ko'radi)
  const authHeader = req.headers.get("authorization") || "";
  const userToken = authHeader.slice(7).trim();
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const userClient = createClient(supaUrl, anon, {
    global: { headers: { Authorization: `Bearer ${userToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: prof } = await userClient.from("profiles").select("role").eq("id", authed.id).single();
  if (prof?.role !== "ADMIN") {
    return NextResponse.json({ error: "Faqat administrator jonli efir qila oladi" }, { status: 403 });
  }

  // 3) Cloudflare live input yaratamiz
  try {
    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          meta: { name: "MAROQLI turnir jonli efiri" },
          recording: { mode: "automatic" },
        }),
      }
    );
    const cfJson = await cfRes.json();
    if (!cfRes.ok || !cfJson.success) {
      console.error("Cloudflare Stream xatosi:", cfJson.errors || cfJson);
      return NextResponse.json({ error: "Cloudflare efir yaratishda xatolik" }, { status: 502 });
    }
    const r = cfJson.result;
    return NextResponse.json({
      uid: r.uid,
      rtmpUrl: r.rtmps?.url || "rtmps://live.cloudflare.com:443/live/",
      streamKey: r.rtmps?.streamKey || "",
      playbackIframe: `https://iframe.videodelivery.net/${r.uid}`,
    });
  } catch (e: any) {
    console.error("Live input yaratish xatosi:", e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
