import fs from 'fs';

try {
  const content = fs.readFileSync('dist/assets/index-B-dv-d8A.js', 'utf8');
  console.log('Local bundle check:');
  console.log('  Contains "handleDragOver":', content.includes('handleDragOver'));
  console.log('  Contains "isDragging":', content.includes('isDragging'));
} catch (err) {
  console.error('Failed to read local bundle:', err);
}
