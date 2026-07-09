const id = "1W-4f8yQgIkTDTbHat3VrWEGV81uNB6hQ";

async function test() {
  try {
    const url1 = `https://docs.google.com/uc?export=download&id=${id}`;
    const res1 = await fetch(url1, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      redirect: "manual",
    });

    const loc1 = res1.headers.get("location");
    if (!loc1) {
      console.log("No location 1");
      return;
    }

    const res2 = await fetch(loc1, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      redirect: "manual",
    });

    const text2 = await res2.text();
    
    // Parse confirm and uuid values from the form inputs
    const confirmMatch = text2.match(/name="confirm"\s+value="([^"]+)"/) || text2.match(/value="([^"]+)"\s+name="confirm"/);
    const uuidMatch = text2.match(/name="uuid"\s+value="([^"]+)"/) || text2.match(/value="([^"]+)"\s+name="uuid"/);

    console.log("Parsed Confirm:", confirmMatch ? confirmMatch[1] : "not found");
    console.log("Parsed UUID:", uuidMatch ? uuidMatch[1] : "not found");

    if (confirmMatch) {
      const confirmVal = confirmMatch[1];
      const uuidVal = uuidMatch ? uuidMatch[1] : "";
      
      let confirmedUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=${confirmVal}`;
      if (uuidVal) {
        confirmedUrl += `&uuid=${uuidVal}`;
      }

      console.log("\nFetching Confirmed URL:", confirmedUrl);
      const res3 = await fetch(confirmedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          // Pass the cookies received from the warning page!
          "Cookie": res2.headers.get("set-cookie") || "",
        },
        redirect: "manual",
      });

      console.log("Res 3 Status:", res3.status);
      console.log("Res 3 Headers:", [...res3.headers.entries()]);
    }
  } catch (e) {
    console.error(e);
  }
}

test();
