const fs = require('fs');
const content = fs.readFileSync('src/lib/formats.ts', 'utf8');

// Extract ext entries
const extMatches = [...content.matchAll(/ext:\s*"([^"]+)"/g)];
console.log('Total format entries:', extMatches.length);

// Rough count of targetFormats items via counting quoted strings in targetFormats arrays
// We look for targetFormats: [...] blocks
const tfBlocks = [...content.matchAll(/targetFormats:\s*\[([^\]]*)\]/g)];
let totalPairs = 0;
tfBlocks.forEach(m => {
  const items = [...m[1].matchAll(/"([^"]+)"/g)];
  totalPairs += items.length;
});
console.log('Total valid from->to pairs (approx, static arrays only):', totalPairs);
// Note: dynamic arrays like imgNoSelf() are not counted here
// Each image format gets ~12 pairs, document ~22, video ~18, audio ~5, etc.
// Let's estimate: ~100 formats × avg 10 targets = ~1000 pairs total
