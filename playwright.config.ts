import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run build && rm -f data/plat-gym-test.db data/plat-gym-test.db-shm data/plat-gym-test.db-wal && npm run start -- --port 3100",
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      SQLITE_PATH: "./data/plat-gym-test.db",
      SEED_DEMO_DATA: "true",
      SESSION_SECRET: "playwright-only-secret-plat-gym-2026",
      SESSION_COOKIE_SECURE: "false",
    },
  },
})
