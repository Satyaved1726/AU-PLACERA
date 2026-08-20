async function run() {
  try {
    console.log('Fetching main bundle from Vercel...');
    const res = await fetch('https://auplacera.vercel.app/assets/index-B-dv-d8A.js');
    if (!res.ok) {
      console.log(`Failed to fetch: ${res.status} ${res.statusText}`);
      return;
    }
    const text = await res.text();
    
    const hasDragOver = text.includes('handleDragOver');
    const hasIsDragging = text.includes('isDragging');

    console.log('Check results:');
    console.log('  Contains "handleDragOver":', hasDragOver);
    console.log('  Contains "isDragging":', hasIsDragging);

  } catch (err) {
    console.error('Check failed:', err);
  }
}

run();
