import { defineConfig, devices } from '@playwright/test';

const frontendUrl = process.env.DOLPHIN_FRONTEND_BASE_URL || 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: frontendUrl,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: frontendUrl,
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
