import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing file ID" }, { status: 400 });
  }

  try {
    const url = `https://docs.google.com/uc?export=download&id=${id}`;
    
    // Step 1: Request initial download link
    const res1 = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      redirect: "manual",
    });

    let targetUrl = url;
    let cookieHeader = "";

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
    let finalDownloadUrl = targetUrl;

    // Grab set-cookie headers from Step 2
    const setCookieHeaders = res2.headers.getSetCookie 
      ? res2.headers.getSetCookie() 
      : [res2.headers.get("set-cookie")].filter(Boolean) as string[];
    
    cookieHeader = setCookieHeaders.map(c => c.split(";")[0]).join("; ");

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

    // Step 3: Fetch the final video stream and proxy it back to client, forwarding range requests
    const clientRange = request.headers.get("range");
    const streamHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    };
    if (cookieHeader) {
      streamHeaders["Cookie"] = cookieHeader;
    }
    if (clientRange) {
      streamHeaders["Range"] = clientRange;
    }

    const streamResponse = await fetch(finalDownloadUrl, {
      headers: streamHeaders,
      redirect: "follow", // Follow redirects to the final googlevideo stream URL
    });

    // Return the stream directly to the client with range headers
    const headers = new Headers();
    headers.set("Content-Type", streamResponse.headers.get("content-type") || "video/mp4");
    headers.set("Accept-Ranges", "bytes");
    
    const contentRange = streamResponse.headers.get("content-range");
    if (contentRange) {
      headers.set("Content-Range", contentRange);
    }
    
    const contentLength = streamResponse.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    const contentDisposition = streamResponse.headers.get("content-disposition");
    if (contentDisposition) {
      headers.set("Content-Disposition", contentDisposition);
    }

    return new NextResponse(streamResponse.body, {
      status: streamResponse.status,
      headers: headers,
    });
  } catch (error) {
    console.error("Error resolving video stream:", error);
    return NextResponse.json({ error: "Failed to resolve stream" }, { status: 500 });
  }
}
