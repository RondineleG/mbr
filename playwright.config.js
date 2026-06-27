import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90000,
  expect: { timeout: 20000 },
  workers: 1,
  // Retries só no CI (IP limpo, roda 1×/PR). Localmente 0 evita martelar o
  // Firebase Auth com re-logins e estourar o throttle (auth/too-many-requests).
  retries: process.env.CI ? 2 : 0,
  // Localmente, aborta cedo se muita coisa falhar (não desperdiça ~50min num
  // run já degradado por throttle). No CI, roda tudo.
  maxFailures: process.env.CI ? 0 : 6,
  reporter: [['list'], ['html', { open: 'never' }]],
  // Sobe o servidor estático automaticamente (a menos que E2E_BASE aponte p/ outro).
  webServer: process.env.E2E_BASE ? undefined : {
    command: 'python3 -m http.server 5050 --directory public',
    url: 'http://localhost:5050/index.html',
    reuseExistingServer: true,
    timeout: 30000,
  },
  use: {
    baseURL: process.env.E2E_BASE || 'http://localhost:5050',
    headless: true,
    actionTimeout: 20000,
    navigationTimeout: 40000,
    viewport: { width: 1280, height: 900 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
