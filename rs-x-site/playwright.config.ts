import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './a11y',
  timeout: 30_000,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'a11y-report', open: 'never' }],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },

  projects: [
    {
      name: 'chromium-light',
      use: { ...devices['Desktop Chrome'], colorScheme: 'light' },
    },
    {
      name: 'chromium-dark',
      use: { ...devices['Desktop Chrome'], colorScheme: 'dark' },
    },
  ],

  webServer: {
    command: 'next start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
