import { NextRequest, NextResponse } from "next/server";

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
      if (res1.status >= 300 && res1.status < 400) {
        const loc1 = res1.headers.get("location");
        if (loc1) targetUrl = loc1;
      }

      // Step 2: Check for virus warning page
      const res2 = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        redirect: "manual",
      });

      finalDownloadUrl = targetUrl;

      if (res2.status === 200) {
        const text2 = await res2.text();
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
      } else if (res2.status >= 300 && res2.status < 400) {
        const loc2 = res2.headers.get("location");
        if (loc2) finalDownloadUrl = loc2;
      }

      // Cache for 10 minutes
      streamCache.set(id, {
        url: finalDownloadUrl,
        expires: now + 10 * 60 * 1000,
      });
    }

    // Proxy the video stream, forwarding client Range headers for seeking
    const streamHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    };
    const clientRange = request.headers.get("range");
    if (clientRange) {
      streamHeaders["Range"] = clientRange;
    }

    const streamResponse = await fetch(finalDownloadUrl, {
      headers: streamHeaders,
      redirect: "follow",
    });

    // Forward the stream to the client
    const headers = new Headers();
    headers.set("Content-Type", streamResponse.headers.get("content-type") || "video/mp4");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=3600");

    const contentRange = streamResponse.headers.get("content-range");
    if (contentRange) headers.set("Content-Range", contentRange);

    const contentLength = streamResponse.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new NextResponse(streamResponse.body, {
      status: streamResponse.status,
      headers,
    });
  } catch (error) {
    console.error("Error resolving video stream:", error);
    return NextResponse.json({ error: "Failed to resolve stream" }, { status: 500 });
  }
}
