const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, '../public/app_icon.png');
const svgPath = path.join(__dirname, '../public/favicon.svg');

try {
  const pngData = fs.readFileSync(pngPath);
  const base64 = pngData.toString('base64');
  const dataUrl = `data:image/png;base64,${base64}`;

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image href="${dataUrl}" width="512" height="512" />
</svg>`;

  fs.writeFileSync(svgPath, svgContent, 'utf8');
  console.log('Successfully replaced public/favicon.svg with self-contained base64 PNG wrapper!');
} catch (err) {
  console.error('Failed to convert icon:', err);
}
