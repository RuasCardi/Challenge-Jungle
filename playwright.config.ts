import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const localBrowser =
  ".audit/browsers/chromium_headless_shell-1254/chrome-headless-shell-win64/chrome-headless-shell.exe";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  timeout: 45000,
  expect: { timeout: 10000, toHaveScreenshot: { maxDiffPixelRatio: 0.015 } },
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  snapshotPathTemplate: "{testDir}/baselines/{projectName}/{arg}{ext}",
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:5174",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    colorScheme: "dark",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: existsSync(localBrowser)
      ? { executablePath: localBrowser }
      : {},
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "tablet",
      testMatch: /(responsive|visual)\.spec\.ts/,
      use: { viewport: { width: 768, height: 1024 } },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "node scripts/test-server.mjs",
        url: "http://127.0.0.1:5174",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
