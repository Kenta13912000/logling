import { defineConfig, devices } from "@playwright/test";

// A dedicated port, so the developer's own `npm run dev` on 3000 is never
// reused: that server does not have the test-only login turned on.
const port = 3100;
// Set BASE_URL to run the same tests against a deployed site, e.g.
// $env:BASE_URL = "https://logling-xxxx.vercel.app"; npm run test:e2e
const remoteURL = process.env.BASE_URL;
const baseURL = remoteURL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Start a local dev server only when not testing a deployed site.
  webServer: remoteURL
    ? undefined
    : {
        command: `npm run dev -- --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        // ADR-0006: the test-only email/password login, for this server only.
        // The database and secrets come from .env.local (the Neon dev branch).
        env: { LOGLING_E2E_AUTH: "1", BETTER_AUTH_URL: baseURL },
      },
});
