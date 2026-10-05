// Usage: node scripts/token-diff.mjs <base-dist-json-dir> <head-dist-json-dir> [out.md]
// Prints the release plan (semver bump + change list) and exits 1 on a policy violation.
import { readFileSync, writeFileSync } from 'node:fs';
import { diffTokens, diffMarkdown } from './lib/tokens.mjs';

const [baseDir, headDir, out] = process.argv.slice(2);
if (!baseDir || !headDir) {
  console.error('usage: token-diff <base-dir> <head-dir> [out.md]');
  process.exit(2);
}
const read = (dir, t) => JSON.parse(readFileSync(`${dir}/${t}.json`, 'utf8'));
const perTheme = Object.fromEntries(['light', 'dark'].map((t) => [t, diffTokens(read(baseDir, t), read(headDir, t))]));
const { bump, markdown } = diffMarkdown(perTheme);
if (out) writeFileSync(out, markdown + '\n');
console.log(markdown);
console.log(`BUMP=${bump}`);
if (Object.values(perTheme).some((d) => d.violations.length)) process.exit(1);
