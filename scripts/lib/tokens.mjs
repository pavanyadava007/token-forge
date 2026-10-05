// Pure helpers shared by the validator, the release diff and the tests.

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

// WCAG 2.x relative luminance and contrast ratio.
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export const cssName = (path) => `tf-${path.replaceAll('.', '-')}`;

// Walks a DTCG tree and returns { 'a.b.c': token }.
export function flattenSource(tree, prefix = []) {
  const out = {};
  for (const [key, node] of Object.entries(tree)) {
    if (key.startsWith('$')) continue;
    const path = [...prefix, key];
    if (node && typeof node === 'object' && '$value' in node) out[path.join('.')] = node;
    else if (node && typeof node === 'object') Object.assign(out, flattenSource(node, path));
  }
  return out;
}

const SEMVER_RANK = { none: 0, patch: 1, minor: 2, major: 3 };
const maxBump = (a, b) => (SEMVER_RANK[a] >= SEMVER_RANK[b] ? a : b);

// Compares two flat tooling maps (dist/json/<theme>.json) and decides the release.
// Policy: removing a token is a major change and is only allowed if the base already marked it deprecated.
export function diffTokens(base, head) {
  const changes = [];
  const violations = [];
  let bump = 'none';
  for (const [name, b] of Object.entries(base)) {
    const h = head[name];
    if (!h) {
      bump = maxBump(bump, 'major');
      changes.push({ kind: 'removed', name, from: b.value });
      if (b.tier !== 'deprecated' && b.tier !== 'primitive') {
        violations.push(`${b.path} was removed without a deprecation period; add it to tokens/deprecated.json first`);
      }
      continue;
    }
    if (String(b.value) !== String(h.value)) {
      bump = maxBump(bump, 'patch');
      changes.push({ kind: 'value', name, from: b.value, to: h.value });
    }
    if (!b.deprecated && h.deprecated) {
      bump = maxBump(bump, 'minor');
      changes.push({ kind: 'deprecated', name, note: h.deprecated });
    }
  }
  for (const [name, h] of Object.entries(head)) {
    if (!base[name]) {
      bump = maxBump(bump, 'minor');
      changes.push({ kind: 'added', name, to: h.value });
    }
  }
  return { bump, changes, violations };
}

export function diffMarkdown(perTheme) {
  const lines = ['## Token release plan', ''];
  const bump = Object.values(perTheme).reduce((acc, d) => maxBump(acc, d.bump), 'none');
  lines.push(`Suggested version bump: **${bump}**`, '');
  for (const [theme, d] of Object.entries(perTheme)) {
    lines.push(`### ${theme} (${d.changes.length} changes)`);
    if (!d.changes.length) lines.push('No changes.');
    for (const c of d.changes) {
      const detail = c.kind === 'value' ? `${c.from} -> ${c.to}` : c.kind === 'deprecated' ? c.note : (c.to ?? c.from);
      lines.push(`- \`--${c.name}\` ${c.kind}: ${detail}`);
    }
    for (const v of d.violations) lines.push(`- VIOLATION: ${v}`);
    lines.push('');
  }
  return { bump, markdown: lines.join('\n') };
}
