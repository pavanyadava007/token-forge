import { defineConfig, devices } from '@playwright/test';

// Tests run against the static Storybook build, the same artefact that is published.
// Visual snapshots only run in the pinned Playwright container (fonts and AA must match the baselines).
export default defineConfig({
  testDir: 'tests/e2e',
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:6007', ...devices['Desktop Chrome'] },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002 } },
  projects: [
    { name: 'behaviour', testIgnore: /visual\.spec/ },
    { name: 'visual', testMatch: /visual\.spec/ },
  ],
  webServer: {
    command: 'npx vite preview --outDir storybook-static --port 6007 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:6007/iframe.html',
    reuseExistingServer: !process.env.CI,
  },
});
