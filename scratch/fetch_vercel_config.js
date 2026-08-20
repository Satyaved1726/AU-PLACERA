async function run() {
  try {
    console.log('Fetching index.html from auplacera.vercel.app...');
    const htmlRes = await fetch('https://auplacera.vercel.app/login');
    const htmlText = await htmlRes.text();
    
    // Find script tags like <script type="module" crossorigin src="/assets/index-*.js">
    const scriptRegex = /\/assets\/index-[a-zA-Z0-9_\-]+\.js/g;
    const matches = htmlText.match(scriptRegex);
    
    if (!matches || matches.length === 0) {
      console.log('No index bundle script found in HTML.');
      // Print HTML to see if there is any other script or redirect
      console.log('HTML content preview:', htmlText.substring(0, 1000));
      return;
    }

    const bundlePath = matches[0];
    const bundleUrl = `https://auplacera.vercel.app${bundlePath}`;
    console.log(`Found main bundle URL: ${bundleUrl}`);

    console.log('Fetching main bundle content...');
    const bundleRes = await fetch(bundleUrl);
    const bundleText = await bundleRes.text();

    // Search for Supabase URL regex: https://[a-zA-Z0-9]+.supabase.co
    const supabaseUrlRegex = /https:\/\/[a-zA-Z0-9\-]+\.supabase\.(co|net)/g;
    const supabaseUrlsFound = bundleText.match(supabaseUrlRegex);

    console.log('Supabase URLs found in compilation bundle:', supabaseUrlsFound);

  } catch (err) {
    console.error('Extraction failed:', err);
  }
}

run();
