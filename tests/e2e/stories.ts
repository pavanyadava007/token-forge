import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

type Entry = { id: string; type: string; title: string; name: string };
const index = JSON.parse(readFileSync('storybook-static/index.json', 'utf8')) as { entries: Record<string, Entry> };
export const stories = Object.values(index.entries).filter((e) => e.type === 'story');
export const themes = ['light', 'dark'] as const;

export async function openStory(page: Page, id: string, theme: string) {
  await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`);
  await page.waitForFunction(
    () => customElements.get('tf-button') && document.querySelector('#storybook-root')?.children.length,
  );
  await page.evaluate(() => document.fonts.ready);
}
