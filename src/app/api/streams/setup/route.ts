import { NextResponse } from "next/server";
import Mux from "@mux/mux-node";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromRequest } from "@/lib/authServer";

// MUX SDK Configuration
// We expect MUX_TOKEN_ID and MUX_TOKEN_SECRET in environment variables.
// If they are missing, the endpoint will return dummy credentials so the UI still works.
const isMuxConfigured = !!(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);

const mux = isMuxConfigured 
  ? new Mux({
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET,
    }) 
  : null;

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // XAVFSIZLIK: userId'ni so'rov tanasidan OLMAYMIZ — tokendan olamiz.
    // Aks holda har kim boshqa odam nomidan efir ochishi mumkin edi.
    const authedUser = await getUserFromRequest(req);
    if (!authedUser) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
    }
    const userId = authedUser.id;

    // 0. CHECK ROLE / PERMISSION: Only tournament participants, GameDevs, and Admins can stream
    let isAllowed = false;

    // First check user role from profiles
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileData && (profileData.role === "GAMEDEV" || profileData.role === "ADMIN" || profileData.role === "STREAMER")) {
      isAllowed = true;
    } else {
      // If not gamedev/admin, check if they are in a team registered for a tournament
      const { data: memberData } = await supabaseAdmin
        .from("team_members")
        .select("team_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (memberData?.team_id) {
        const { data: participantData } = await supabaseAdmin
          .from("tournament_participants")
          .select("id")
          .eq("team_id", memberData.team_id)
          .limit(1);
          
        if (participantData && participantData.length > 0) {
          isAllowed = true;
        }
      }
    }

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Faqatgina turnir ishtirokchilari yoki GameDev (dasturchilar) jonli efir qila oladi." },
        { status: 403 }
      );
    }

    // 1. Check if user already has a stream in the DB
    const { data: existingStream, error: fetchError } = await supabaseAdmin
      .from("live_streams")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    // If stream already exists, just return it.
    if (existingStream && existingStream.stream_key) {
      return NextResponse.json({ stream: existingStream });
    }

    // 2. No stream found, create one.
    let streamKey = "";
    let playbackId = "";
    let muxStreamId = "";

    if (isMuxConfigured && mux) {
      // Create actual Mux Live Stream
      const liveStream = await mux.video.liveStreams.create({
        playback_policy: ["public"],
        new_asset_settings: { playback_policy: ["public"] },
      });
      streamKey = liveStream.stream_key;
      playbackId = liveStream.playback_ids?.[0]?.id || "";
      muxStreamId = liveStream.id;
    } else {
      // Fallback: Create dummy keys for testing if Mux is not configured
      streamKey = "live_" + Math.random().toString(36).substring(2, 15);
      playbackId = "dummy_playback_" + Math.random().toString(36).substring(2, 15);
      muxStreamId = "dummy_mux_id";
    }

    // 3. Save to Supabase
    const { data: newStream, error: insertError } = await supabaseAdmin
      .from("live_streams")
      .insert({
        user_id: userId,
        stream_key: streamKey,
        stream_url: playbackId, // Store MUX Playback ID here
        title: "Maroqli.uz da yangi efir",
        is_live: false,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ stream: newStream, muxStreamId });
  } catch (error: any) {
    console.error("Stream setup error:", error);
    return NextResponse.json({ error: error.message || "Efir kalitini yaratishda xatolik" }, { status: 500 });
  }
}
