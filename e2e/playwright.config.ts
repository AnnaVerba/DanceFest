import { defineConfig, devices } from '@playwright/test';
import {
  DEFAULT_ACTION_TIMEOUT_MS,
  DEFAULT_NAVIGATION_TIMEOUT_MS,
  FRONTEND_BASE_URL,
} from './src/constants/env.constants';

/**
 * Assumes the app is already running (docker compose: frontend on :5173, backend on :4000).
 * This suite does not start those services itself — see e2e/README.md.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: FRONTEND_BASE_URL,
    actionTimeout: DEFAULT_ACTION_TIMEOUT_MS,
    navigationTimeout: DEFAULT_NAVIGATION_TIMEOUT_MS,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
