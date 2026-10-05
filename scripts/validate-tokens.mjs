// Fails the build when the token set breaks a rule: theme parity, semantic tokens pointing at
// raw values, deprecated aliases pointing nowhere, or a WCAG contrast pair below its minimum.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { contrast, cssName, flattenSource } from './lib/tokens.mjs';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const errors = [];
const themes = ['light', 'dark'];
const semantic = Object.fromEntries(themes.map((t) => [t, flattenSource(read(`tokens/semantic/${t}.json`))]));
const deprecated = flattenSource(read('tokens/deprecated.json'));
const built = Object.fromEntries(themes.map((t) => [t, read(`dist/json/${t}.json`)]));

const [l, d] = themes.map((t) => new Set(Object.keys(semantic[t])));
for (const n of l) if (!d.has(n)) errors.push(`${n} exists in light but not in dark`);
for (const n of d) if (!l.has(n)) errors.push(`${n} exists in dark but not in light`);

for (const t of themes) {
  for (const [path, tok] of Object.entries(semantic[t])) {
    if (!/^\{color\.[a-z]+\.[0-9]+\}$/.test(tok.$value))
      errors.push(`${t}: ${path} must reference a primitive, got ${tok.$value}`);
    if (!tok.$description) errors.push(`${t}: ${path} has no $description`);
  }
}
for (const [path, tok] of Object.entries(deprecated)) {
  const target = tok.$value.slice(1, -1);
  if (!semantic.light[target]) errors.push(`deprecated ${path} points to missing ${target}`);
  if (!tok.$deprecated) errors.push(`deprecated ${path} has no $deprecated note`);
}

const report = [];
const { pairs } = read('tokens/contrast-pairs.json');
for (const t of themes) {
  for (const [fg, bg, min] of pairs) {
    const a = built[t][cssName(fg)]?.value;
    const b = built[t][cssName(bg)]?.value;
    if (!a || !b) {
      errors.push(`${t}: contrast pair ${fg} / ${bg} not found`);
      continue;
    }
    const ratio = Math.round(contrast(a, b) * 100) / 100;
    report.push({ theme: t, fg, bg, ratio, min, pass: ratio >= min });
    if (ratio < min) errors.push(`${t}: ${fg} on ${bg} is ${ratio}:1, needs ${min}:1`);
  }
}
mkdirSync('reports', { recursive: true });
writeFileSync('reports/contrast.json', JSON.stringify(report, null, 2) + '\n');
const worst = report.reduce((a, r) => (r.ratio / r.min < a.ratio / a.min ? r : a));
console.log(
  `${report.length} contrast checks, lowest margin: ${worst.theme} ${worst.fg} on ${worst.bg} ${worst.ratio}:1 (min ${worst.min})`,
);
if (errors.length) {
  console.error(errors.map((e) => `  x ${e}`).join('\n'));
  process.exit(1);
}
console.log(`tokens OK: ${l.size} semantic tokens x 2 themes, ${Object.keys(deprecated).length} deprecated aliases`);
