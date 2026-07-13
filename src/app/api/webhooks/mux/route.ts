import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/** Mux imzosini HMAC-SHA256 orqali haqiqiy tekshiradi (t=...,v1=...). */
function verifyMuxSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => kv.split("=") as [string, string])
  );
  const timestamp = parts["t"];
  const expectedSig = parts["v1"];
  if (!timestamp || !expectedSig) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const computed = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const body = await req.text();
    const signature = req.headers.get("mux-signature");
    const MUX_WEBHOOK_SECRET = process.env.MUX_WEBHOOK_SECRET;

    // XAVFSIZLIK: secret sozlangan bo'lsa, imzo MAJBURIY va haqiqiy tekshiriladi.
    // Aks holda soxta stream hodisalarini yuborib bo'lardi.
    if (MUX_WEBHOOK_SECRET) {
      if (!verifyMuxSignature(body, signature, MUX_WEBHOOK_SECRET)) {
        console.warn("Mux webhook: imzo noto'g'ri — rad etildi");
        return NextResponse.json({ error: "invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(body);
    const eventType = payload.type;
    const muxStreamId = payload.data?.id;

    if (!muxStreamId) {
      return NextResponse.json({ message: "No stream ID in payload" }, { status: 400 });
    }

    // Usually payload.data.playback_ids[0].id is what we store as stream_url
    const playbackId = payload.data?.playback_ids?.[0]?.id;

    if (eventType === "video.live_stream.connected") {
      // Stream has started sending video
      if (playbackId) {
        await supabaseAdmin
          .from("live_streams")
          .update({ is_live: true })
          .eq("stream_url", playbackId);
          
        // Fetch stream details to create a notification
        const { data: streamInfo } = await supabaseAdmin
          .from("live_streams")
          .select("title, game_name, user:user_id(username)")
          .eq("stream_url", playbackId)
          .single();

        if (streamInfo && (streamInfo as any).user) {
          const username = (streamInfo as any).user.username;
          await supabaseAdmin.from("global_notifications").insert({
            title: `${username} efirni boshladi! 🔴`,
            message: `Hozir efirda: ${streamInfo.title} (${streamInfo.game_name || "Just Chatting"})`,
            url: `/streamers/${username}` // we use streamers page or /streamers directly
          });
        }
      }
      console.log("Stream connected:", playbackId);
    } 
    else if (eventType === "video.live_stream.disconnected") {
      // Stream has stopped
      if (playbackId) {
        await supabaseAdmin
          .from("live_streams")
          .update({ is_live: false })
          .eq("stream_url", playbackId);
      }
      console.log("Stream disconnected:", playbackId);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Mux webhook error:", error);
    return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
  }
}
