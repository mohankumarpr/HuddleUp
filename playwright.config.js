// Playwright config for the e2e suite. Runs the CRA dev server against the Firebase emulator --
// never against a real Firebase project. Dummy, non-secret config values are injected directly
// here so this works identically locally and in CI without touching .env.local.
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx react-scripts start",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      BROWSER: "none",
      PORT: "3001",
      REACT_APP_USE_EMULATOR: "true",
      REACT_APP_FIREBASE_API_KEY: "demo-key",
      REACT_APP_FIREBASE_AUTH_DOMAIN: "demo-test.firebaseapp.com",
      REACT_APP_FIREBASE_PROJECT_ID: "demo-test",
      REACT_APP_FIREBASE_STORAGE_BUCKET: "demo-test.appspot.com",
      REACT_APP_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
      REACT_APP_FIREBASE_APP_ID: "1:000000000000:web:0000000000000000000000",
    },
  },
});
