import { defineConfig, devices } from "@playwright/test";

// Visual snapshot tests are tagged @visual and run only where baselines exist
// (the Mac the pipeline lives on). CI (linux) runs the functional suite:
//   npx playwright test --grep-invert @visual
//
// PW_PORT lets a caller point the whole suite at a server it already owns, so a
// stray dev server on the default port can't decide whether the run happens.
const port = Number(process.env.PW_PORT) || 3100;
const baseURL = `http://localhost:${port}`;

// Reusing an already-running server is a local convenience, not a property of CI.
// Keying it on CI meant the QA sweep - which sets CI=1 for the retry behaviour -
// refused the very server it was pointed at and reported e2e AND visual red with
// nothing wrong on the site (2026-08-07). PW_REUSE_SERVER now decides explicitly;
// unset, it falls back to the old behaviour for CI and plain local runs.
const reuseExistingServer = process.env.PW_REUSE_SERVER
  ? process.env.PW_REUSE_SERVER !== "0"
  : !process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
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
    // Baselines must come from a production build - `next dev` paints a dev-tools
    // overlay over the page, so reusing one silently poisons the snapshots.
    command: `npm run build && npx next start -p ${port}`,
    url: baseURL,
    reuseExistingServer,
    timeout: 180_000,
  },
});
