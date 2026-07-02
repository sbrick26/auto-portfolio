import { defineConfig, devices } from "@playwright/test";

// Visual snapshot tests are tagged @visual and run only where baselines exist
// (the Mac the pipeline lives on). CI (linux) runs the functional suite:
//   npx playwright test --grep-invert @visual
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      // tight enough that a card-sized region changing FAILS (2% let a full
      // card redesign pass silently), loose enough for antialiasing drift
      maxDiffPixelRatio: 0.005,
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
