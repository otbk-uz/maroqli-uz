async function testReleaseLink() {
  const url = 'https://github.com/otbk-uz/maroqli-uz/releases/download/v1.0.0/maroqli-setup.exe';
  console.log("Testing fetch of release link:", url);
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log("HEAD status:", res.status, res.headers.get('location'));
  } catch (e) {
    console.error("Fetch error:", e.message);
  }
}

testReleaseLink();
