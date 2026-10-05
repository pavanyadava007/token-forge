import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Design-system rule: components may only use semantic tokens, never raw values,
// primitive palette tokens or deprecated names. This is the rule the migration agent enforces in consumer code.
const light = JSON.parse(readFileSync('dist/json/light.json', 'utf8')) as Record<string, { tier: string }>;
const allowed = new Set(Object.keys(light));
const semanticColour = new Set(
  Object.entries(light)
    .filter(([n, t]) => t.tier === 'semantic' && n.startsWith('tf-color-'))
    .map(([n]) => n),
);
const files = readdirSync('src/components').map((f) => `src/components/${f}`);

describe.each(files)('%s', (file) => {
  const src = readFileSync(file, 'utf8');
  const css = src.slice(src.indexOf('css`'), src.indexOf('`;', src.indexOf('css`')));

  it('has no hard-coded colours', () => {
    expect(css.match(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/gi) ?? []).toEqual([]);
  });
  it('references only existing, non-deprecated tokens and only semantic colours', () => {
    const refs = [...css.matchAll(/var\(--(tf-[a-z0-9-]+)\)/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) {
      expect(allowed.has(r), `${r} is not a token`).toBe(true);
      expect(light[r].tier, `${r} is deprecated`).not.toBe('deprecated');
      if (r.startsWith('tf-color-')) expect(semanticColour.has(r), `${r} is a primitive colour`).toBe(true);
    }
  });
});
