import { expect, test } from '@playwright/test';
import { openStory, stories, themes } from './stories';

// Baselines are created and compared inside mcr.microsoft.com/playwright (see CI), never on a laptop.
for (const story of stories.filter((s) => s.title.startsWith('Components') || s.title.startsWith('Theming'))) {
  for (const theme of themes) {
    test(`visual: ${story.id} (${theme})`, async ({ page }) => {
      await openStory(page, story.id, theme);
      await expect(page.locator('#storybook-root')).toHaveScreenshot(`${story.id}-${theme}.png`, {
        animations: 'disabled',
      });
    });
  }
}
