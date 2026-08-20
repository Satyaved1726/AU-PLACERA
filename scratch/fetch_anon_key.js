async function run() {
  try {
    console.log('Fetching main bundle content...');
    const bundleRes = await fetch('https://auplacera.vercel.app/assets/index-B-dv-d8A.js');
    const bundleText = await bundleRes.text();

    // The anon key usually starts with eyJhbGciOi
    const anonKeyRegex = /eyJhbGciOi[a-zA-Z0-9_\-\.]+/g;
    const keysFound = bundleText.match(anonKeyRegex);

    console.log('Anon keys found in bundle:', keysFound);

  } catch (err) {
    console.error('Extraction failed:', err);
  }
}

run();
