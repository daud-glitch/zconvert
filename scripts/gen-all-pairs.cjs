// Generate ALL valid conversion pairs from the formats registry
const { formats } = require('../src/lib/formats.ts');

const seen = new Set();
const pairs = [];

for (const f of formats) {
  for (const t of f.targetFormats) {
    const key = `${f.ext}-to-${t}`;
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push({ from: f.ext, to: t });
    }
  }
}

console.log(`Total unique conversion pairs: ${pairs.length}`);
console.log(`\nBreakdown by category:`);

const byCat = {};
for (const f of formats) {
  if (!byCat[f.category]) byCat[f.category] = 0;
  byCat[f.category] += f.targetFormats.length;
}
for (const [cat, count] of Object.entries(byCat)) {
  console.log(`  ${cat}: ${count} pairs`);
}
