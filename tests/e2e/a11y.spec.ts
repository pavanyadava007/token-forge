import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openStory, stories, themes } from './stories';

for (const story of stories) {
  for (const theme of themes) {
    test(`axe WCAG 2.2 AA: ${story.title} / ${story.name} (${theme})`, async ({ page }) => {
      await openStory(page, story.id, theme);
      const result = await new AxeBuilder({ page })
        .include('#storybook-root')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(result.violations.map((v) => `${v.id}: ${v.nodes.length} nodes`)).toEqual([]);
    });
  }
}
