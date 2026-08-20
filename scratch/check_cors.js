async function run() {
  const url = 'https://yjcixgzqjcoinlfsqsoa.supabase.co/storage/v1/object/announcements/test.txt';
  try {
    console.log('Sending CORS preflight OPTIONS request to Supabase Storage...');
    const res = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://auplacera.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type'
      }
    });

    console.log('Response status:', res.status);
    console.log('Response headers:');
    for (const [key, value] of res.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }

  } catch (err) {
    console.error('CORS check failed:', err);
  }
}

run();
