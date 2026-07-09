import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface CacheEntry {
  url: string;
  expires: number;
}

// In-memory cache to store resolved public stream URLs
const streamCache = new Map<string, CacheEntry>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing file ID" }, { status: 400 });
  }

  try {
    let finalDownloadUrl = "";
    const now = Date.now();

    const cached = streamCache.get(id);
    if (cached && cached.expires > now) {
      finalDownloadUrl = cached.url;
    } else {
      const url = `https://docs.google.com/uc?export=download&id=${id}`;
      
      // Step 1: Request initial download link
      const res1 = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        redirect: "manual",
      });

      let targetUrl = url;
      const status1 = res1.status;
      if (status1 >= 300 && status1 < 400) {
        const loc1 = res1.headers.get("location");
        if (loc1) targetUrl = loc1;
      }

      // Step 2: Request the target URL to check for virus warning page
      const res2 = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        redirect: "manual",
      });

      const status2 = res2.status;
      finalDownloadUrl = targetUrl;

      if (status2 === 200) {
        const text2 = await res2.text();
        
        // Parse confirm and uuid values from the form inputs
        const confirmMatch = text2.match(/name="confirm"\s+value="([^"]+)"/) || text2.match(/value="([^"]+)"\s+name="confirm"/);
        const uuidMatch = text2.match(/name="uuid"\s+value="([^"]+)"/) || text2.match(/value="([^"]+)"\s+name="uuid"/);

        if (confirmMatch) {
          const confirmVal = confirmMatch[1];
          const uuidVal = uuidMatch ? uuidMatch[1] : "";
          finalDownloadUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=${confirmVal}`;
          if (uuidVal) {
            finalDownloadUrl += `&uuid=${uuidVal}`;
          }
        }
      } else if (status2 >= 300 && status2 < 400) {
        const loc2 = res2.headers.get("location");
        if (loc2) finalDownloadUrl = loc2;
      }

      // Cache for 10 minutes (short cache to ensure tokens don't expire for late seeking, but fast for buffer range bursts)
      streamCache.set(id, {
        url: finalDownloadUrl,
        expires: now + 10 * 60 * 1000,
      });
    }

    // Redirect the browser directly to Google User Content CDN
    // This allows the browser to connect to Google directly, streaming at maximum speed
    // and utilizing full native Range request seeking without proxy delays.
    return NextResponse.redirect(finalDownloadUrl);
  } catch (error) {
    console.error("Error resolving video stream:", error);
    return NextResponse.json({ error: "Failed to resolve stream" }, { status: 500 });
  }
}
