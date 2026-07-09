import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // Verify token with Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Check if user is ADMIN from their profile or metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const { title } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const libraryId = process.env.BUNNY_LIBRARY_ID;
    const apiKey = process.env.BUNNY_API_KEY;

    if (!libraryId || !apiKey) {
      return NextResponse.json({ error: "Bunny API credentials missing on server" }, { status: 500 });
    }

    // 1. Create Video object in Bunny Stream
    const createRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
      method: "POST",
      headers: {
        "AccessKey": apiKey,
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ title })
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error("Bunny API Error:", errorText);
      return NextResponse.json({ error: "Failed to create video in Bunny" }, { status: 500 });
    }

    const bunnyData = await createRes.json();

    // 2. Return the Video ID, Library ID, and API Key to the admin client
    // Note: The API key is sent ONLY to the verified Admin user to allow direct TUS upload from the browser.
    return NextResponse.json({
      success: true,
      videoId: bunnyData.guid,
      libraryId,
      apiKey
    });

  } catch (err: any) {
    console.error("API Error in Bunny create:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
