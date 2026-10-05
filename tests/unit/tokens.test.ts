import { describe, expect, it } from 'vitest';
// @ts-expect-error plain ESM helper without types
import { contrast, diffTokens, diffMarkdown, flattenSource } from '../../scripts/lib/tokens.mjs';

type Tok = { path: string; value: string; tier: string; deprecated?: string };
const tok = (path: string, value: string, tier = 'semantic', deprecated?: string): Tok => ({
  path,
  value,
  tier,
  deprecated,
});

describe('contrast', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    // #767676 on white is the classic 4.54:1 grey
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });
  it('is symmetric', () => {
    expect(contrast('#2563eb', '#ffffff')).toBeCloseTo(contrast('#ffffff', '#2563eb'), 10);
  });
});

describe('flattenSource', () => {
  it('collects DTCG leaves and skips $ keys', () => {
    const flat = flattenSource({ color: { $description: 'x', a: { b: { $value: '#fff', $type: 'color' } } } });
    expect(Object.keys(flat)).toEqual(['color.a.b']);
  });
});

describe('diffTokens release policy', () => {
  const base = { 'tf-a': tok('a', '#111'), 'tf-old': tok('old', '#222', 'deprecated', 'use a') };

  it('no change -> none', () => {
    expect(diffTokens(base, base).bump).toBe('none');
  });
  it('value change -> patch', () => {
    const d = diffTokens(base, { ...base, 'tf-a': tok('a', '#333') });
    expect(d.bump).toBe('patch');
    expect(d.changes[0]).toMatchObject({ kind: 'value', from: '#111', to: '#333' });
  });
  it('added token -> minor', () => {
    expect(diffTokens(base, { ...base, 'tf-b': tok('b', '#444') }).bump).toBe('minor');
  });
  it('new deprecation -> minor', () => {
    const d = diffTokens(base, { ...base, 'tf-a': tok('a', '#111', 'semantic', 'renamed') });
    expect(d.bump).toBe('minor');
  });
  it('removing a deprecated token -> major, allowed', () => {
    const { 'tf-old': _removed, ...head } = base;
    void _removed;
    const d = diffTokens(base, head);
    expect(d.bump).toBe('major');
    expect(d.violations).toEqual([]);
  });
  it('removing a live semantic token without deprecation is a violation', () => {
    const { 'tf-a': _removed, ...head } = base;
    void _removed;
    const d = diffTokens(base, head);
    expect(d.bump).toBe('major');
    expect(d.violations[0]).toContain('without a deprecation period');
  });
  it('markdown takes the highest bump across themes', () => {
    const light = diffTokens(base, { ...base, 'tf-a': tok('a', '#333') });
    const dark = diffTokens(base, { ...base, 'tf-b': tok('b', '#444') });
    expect(diffMarkdown({ light, dark }).bump).toBe('minor');
  });
});
