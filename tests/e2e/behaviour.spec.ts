import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { openStory } from './stories';

const tokens = (theme: string) =>
  JSON.parse(readFileSync(`dist/json/${theme}.json`, 'utf8')) as Record<string, { value: string }>;
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

test('theme switch changes token values inside shadow DOM without a rebuild', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await openStory(page, 'components-card-and-alert--card', theme);
    const bg = await page
      .locator('tf-card')
      .evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.base')!).backgroundColor);
    expect(bg).toBe(rgb(tokens(theme)['tf-color-surface-raised'].value));
  }
});

test('keyboard focus shows the focus-token ring on the button', async ({ page }) => {
  await openStory(page, 'components-button--primary', 'light');
  await page.keyboard.press('Tab');
  const ring = await page.locator('tf-button').evaluate((el) => {
    const b = el.shadowRoot!.querySelector('button')!;
    return { focused: el.shadowRoot!.activeElement === b, outline: getComputedStyle(b).outlineColor };
  });
  expect(ring.focused).toBe(true);
  expect(ring.outline).toBe(rgb(tokens('light')['tf-color-border-focus'].value));
});

test('disabled button cannot be activated', async ({ page }) => {
  await openStory(page, 'components-button--disabled', 'light');
  const disabled = await page.locator('tf-button').evaluate((el) => el.shadowRoot!.querySelector('button')!.disabled);
  expect(disabled).toBe(true);
});

test('tf-input is form-associated and submits its value', async ({ page }) => {
  await openStory(page, 'components-input--with-help', 'light');
  const value = await page.evaluate(async () => {
    const form = document.createElement('form');
    form.innerHTML = '<tf-input name="fleet" label="Fleet"></tf-input>';
    document.body.append(form);
    const input = form.querySelector('tf-input')!;
    await (input as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    const field = input.shadowRoot!.querySelector('input')!;
    field.value = 'Fleet 7';
    field.dispatchEvent(new Event('input'));
    await (input as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    return new FormData(form).get('fleet');
  });
  expect(value).toBe('Fleet 7');
});

test('error text is linked to the field and announced as invalid', async ({ page }) => {
  await openStory(page, 'components-input--with-error', 'light');
  const a = await page.locator('tf-input').evaluate((el) => {
    const f = el.shadowRoot!.querySelector('input')!;
    return {
      invalid: f.getAttribute('aria-invalid'),
      describedBy: f.getAttribute('aria-describedby'),
      host: el.hasAttribute('invalid'),
    };
  });
  expect(a).toEqual({ invalid: 'true', describedBy: 'error', host: true });
});

test('alerts use role=alert for errors and role=status otherwise', async ({ page }) => {
  await openStory(page, 'components-card-and-alert--alerts', 'light');
  const roles = await page
    .locator('tf-alert')
    .evaluateAll((els) => els.map((e) => [e.getAttribute('tone'), e.getAttribute('role')]));
  expect(roles).toEqual([
    ['info', 'status'],
    ['success', 'status'],
    ['warning', 'status'],
    ['error', 'alert'],
  ]);
});

test('page-level CSS resets (Tailwind preflight) do not strip component padding or borders', async ({ page }) => {
  await openStory(page, 'components-card-and-alert--alerts', 'light');
  const box = await page
    .locator('tf-alert')
    .first()
    .evaluate((el) => {
      const s = getComputedStyle(el.shadowRoot!.querySelector('.base')!);
      return { padding: s.paddingLeft, border: s.borderLeftWidth };
    });
  expect(box).toEqual({ padding: '16px', border: '1px' });
});

test('Tailwind utilities resolve to token values in both themes', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await openStory(page, 'theming-tailwind-consumer--page', theme);
    const bg = await page.locator('main').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe(rgb(tokens(theme)['tf-color-surface-subtle'].value));
  }
});
