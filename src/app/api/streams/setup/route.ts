import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cloudflare Stream Configuration
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CF_API_TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN || "";
const isCFConfigured = !!(CF_ACCOUNT_ID && CF_API_TOKEN);

// Cloudflare Stream API base URL
const CF_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/live_inputs`;

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      token ? {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      } : undefined
    );

    const { userId, forceRegenerate } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Foydalanuvchi ID si (userId) taqdim etilmadi" }, { status: 400 });
    }

    // 0. CHECK ROLE / PERMISSION
    let isAllowed = false;

    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileData && (profileData.role === "GAMEDEV" || profileData.role === "ADMIN" || profileData.role === "STREAMER" || profileData.role === "ORGANIZER" || profileData.role === "MODERATOR")) {
      isAllowed = true;
    } else {
      const { data: participantData } = await supabaseAdmin
        .from("tournament_participants")
        .select("id")
        .eq("user_id", userId)
        .limit(1);

      if (participantData && participantData.length > 0) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Faqatgina turnir ishtirokchilari yoki admin/streamerlar jonli efir qila oladi." },
        { status: 403 }
      );
    }

    // Delete existing stream record if forceRegenerate
    if (forceRegenerate) {
      // First get existing stream to delete from Cloudflare too
      const { data: oldStream } = await supabaseAdmin
        .from("live_streams")
        .select("cf_live_input_id")
        .eq("user_id", userId)
        .single();

      // Delete from Cloudflare if we have the live input ID
      if (oldStream?.cf_live_input_id && isCFConfigured) {
        try {
          await fetch(`${CF_API_BASE}/${oldStream.cf_live_input_id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${CF_API_TOKEN}`,
            },
          });
        } catch (e) {
          console.warn("Cloudflare live input delete failed:", e);
        }
      }

      await supabaseAdmin
        .from("live_streams")
        .delete()
        .eq("user_id", userId);
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

    // 2. No stream found — create via Cloudflare Stream
    let streamKey = "";
    let rtmpUrl = "rtmps://live.cloudflare.com:443/live/";
    let playbackId = "";
    let cfLiveInputId = "";
    let cfError = null;

    if (isCFConfigured) {
      try {
        const cfRes = await fetch(CF_API_BASE, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${CF_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            meta: { name: `maroqli-stream-${userId}` },
            recording: { mode: "automatic" },
          }),
        });

        const cfData = await cfRes.json();

        if (!cfRes.ok || !cfData.success) {
          throw new Error(cfData.errors?.[0]?.message || "Cloudflare xatoligi");
        }

        const liveInput = cfData.result;
        streamKey = liveInput.rtmps?.streamKey || "";
        rtmpUrl = liveInput.rtmps?.url || rtmpUrl;
        playbackId = liveInput.uid || "";
        cfLiveInputId = liveInput.uid || "";
      } catch (err: any) {
        console.warn("Cloudflare Stream creation failed:", err.message);
        cfError = err.message;
        // Fallback to random keys
        streamKey = "cf_live_" + Math.random().toString(36).substring(2, 15);
        playbackId = "dummy_" + Math.random().toString(36).substring(2, 15);
      }
    } else {
      // Cloudflare not configured — use dummy keys
      streamKey = "cf_live_" + Math.random().toString(36).substring(2, 15);
      playbackId = "dummy_" + Math.random().toString(36).substring(2, 15);
    }

    // 3. Save to Supabase — only use columns that definitely exist
    const insertData: any = {
      user_id: userId,
      stream_key: streamKey,
      stream_url: playbackId,
      title: "Maroqli.uz da yangi efir",
      is_live: false,
    };

    // Try to add new columns only if migration has been run
    // We detect this by attempting the insert and catching column errors

    const { data: newStream, error: insertError } = await supabaseAdmin
      .from("live_streams")
      .insert(insertData)
      .select()
      .single();

    if (insertError) throw insertError;

    // Attach Cloudflare-specific fields to response even if not stored in DB yet
    const streamWithCf = {
      ...newStream,
      cf_live_input_id: cfLiveInputId || null,
      rtmp_url: rtmpUrl,
    };

    return NextResponse.json({ stream: streamWithCf, cfError });
  } catch (error: any) {
    console.error("Stream setup error:", error);
    return NextResponse.json({ error: error.message || "Efir kalitini yaratishda xatolik" }, { status: 500 });
  }
}
