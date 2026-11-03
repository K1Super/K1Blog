import { defineConfig, devices } from '@playwright/test';

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm build && pnpm start',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      APP_ENV: 'test',
      SITE_URL: baseURL,
      PORT: String(port),
      DATABASE_PATH: './data/test.db',
      BETTER_AUTH_SECRET: 'k1-e2e-secret-value-that-is-long-enough',
      COMMENT_IP_PEPPER: 'k1-e2e-comment-ip-pepper-value',
    },
  },
  projects: [
    {
      name: 'desktop-edge',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'msedge',
      },
    },
    {
      name: 'mobile-edge',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'msedge',
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      },
    },
  ],
});
