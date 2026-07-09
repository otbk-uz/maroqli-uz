process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const id = "1W-4f8yQgIkTDTbHat3VrWEGV81uNB6hQ";

async function testNoCookie() {
  try {
    const url1 = `https://docs.google.com/uc?export=download&id=${id}`;
    const res1 = await fetch(url1, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      redirect: "manual",
    });

    let targetUrl = url1;
    const status1 = res1.status;
    if (status1 >= 300 && status1 < 400) {
      const loc1 = res1.headers.get("location");
      if (loc1) targetUrl = loc1;
    }

    const res2 = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      redirect: "manual",
    });

    const status2 = res2.status;
    let finalDownloadUrl = targetUrl;

    if (status2 === 200) {
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
    }

    console.log("Resolved Final Download URL:", finalDownloadUrl);

    // Fetch the final confirmed URL WITHOUT any Cookie header!
    console.log("\nFetching confirmed URL WITHOUT Cookie header...");
    const res3 = await fetch(finalDownloadUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      redirect: "manual",
    });

    console.log("Res 3 Status:", res3.status);
    console.log("Res 3 Content-Type:", res3.headers.get("content-type"));
    console.log("Res 3 Content-Length:", res3.headers.get("content-length"));
  } catch (e) {
    console.error(e);
  }
}

testNoCookie();
