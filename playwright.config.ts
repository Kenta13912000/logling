import { defineConfig, devices } from "@playwright/test";

const port = 3000;
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
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      },
});
