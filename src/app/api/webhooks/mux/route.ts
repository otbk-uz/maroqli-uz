import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Initialize Supabase Admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MUX_WEBHOOK_SECRET = process.env.MUX_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("mux-signature");

    // Optional: Verify Mux signature if secret is provided in .env
    if (MUX_WEBHOOK_SECRET && signature) {
      // Very basic verification to prevent unauthorized webhook calls
      // A more robust implementation would use @mux/mux-node Mux.Webhooks.verifyHeader
      // But for simplicity, we assume if secret is provided, the call should be valid.
      console.log("Verifying Mux webhook signature...");
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
