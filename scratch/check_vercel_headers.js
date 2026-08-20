async function run() {
  try {
    const timestamp = Date.now();
    const res = await fetch(`https://auplacera.vercel.app/login?t=${timestamp}`);
    console.log('--- Vercel Response Headers (Bypassed Cache) ---');
    for (const [key, value] of res.headers.entries()) {
      if (key.toLowerCase().startsWith('x-vercel-')) {
        console.log(`  ${key}: ${value}`);
      }
    }
    const html = await res.text();
    const scriptRegex = /\/assets\/index-[a-zA-Z0-9_\-]+\.js/g;
    const matches = html.match(scriptRegex);
    console.log('Bundle matches:', matches);
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

run();
