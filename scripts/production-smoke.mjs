import { chromium, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const origin = new URL(
  process.env.PRODUCTION_URL || "https://challengejungle.vercel.app",
).origin;
const evidence = new URL("../.audit/evidence/", import.meta.url);
const reportFile = new URL("../reports/production-smoke.json", import.meta.url);
const browsers = [
  process.env.CHROME_PATH,
  fileURLToPath(
    new URL(
      "../.audit/browsers/chromium_headless_shell-1254/chrome-headless-shell-win64/chrome-headless-shell.exe",
      import.meta.url,
    ),
  ),
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
];
const executablePath = browsers.find((path) => path && existsSync(path));
const report = {
  timestamp: new Date().toISOString(),
  url: origin,
  localCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  }).trim(),
  deploymentCommit: process.env.PRODUCTION_COMMIT || null,
  deploymentCommitSource: process.env.PRODUCTION_COMMIT
    ? "PRODUCTION_COMMIT supplied by deployment verification"
    : "not supplied; browser checks do not establish commit identity",
  checks: [],
  pageErrors: [],
  assetErrors: [],
  passed: false,
};
await mkdir(evidence, { recursive: true });
await mkdir(new URL("../reports/", import.meta.url), { recursive: true });
let browser;
try {
  expect(new URL(origin).protocol).toBe("https:");
  browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
  });
  for (const [profile, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({
      baseURL: origin,
      viewport,
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      reducedMotion: "reduce",
      ...(profile === "mobile" ? { isMobile: true, hasTouch: true } : {}),
    });
    try {
      const page = await context.newPage();
      const mockedApiResponses = new Set();
      page.on("pageerror", (error) =>
        report.pageErrors.push({ profile, message: error.message }),
      );
      page.on("response", (response) => {
        const url = new URL(response.url());
        if (url.origin === origin && url.pathname.startsWith("/api/")) {
          if (response.fromServiceWorker())
            mockedApiResponses.add(url.pathname);
        } else if (response.status() >= 400)
          report.assetErrors.push({
            profile,
            url: response.url(),
            status: response.status(),
          });
      });
      page.on("requestfailed", (request) => {
        if (
          ["script", "stylesheet", "image", "font"].includes(
            request.resourceType(),
          )
        )
          report.assetErrors.push({
            profile,
            url: request.url(),
            error: request.failure()?.errorText,
          });
      });
      const home = await page.goto("/");
      expect(home.status()).toBe(200);
      await expect(page.locator(".nftcard")).toHaveCount(9, { timeout: 30000 });
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Atualizações em tempo real" }),
      ).toBeVisible({ timeout: 30000 });
      const serviceWorker = await page.evaluate(async () => ({
        controller: navigator.serviceWorker.controller?.scriptURL,
        state: (await navigator.serviceWorker.ready).active?.state,
      }));
      expect(serviceWorker.controller).toBe(`${origin}/mockServiceWorker.js`);
      expect(serviceWorker.state).toBe("activated");
      await page.screenshot({
        path: fileURLToPath(
          new URL(`production-${profile}-home.png`, evidence),
        ),
        fullPage: true,
      });
      const detail = await page.goto("/nft/cyber-ape");
      expect(detail.status()).toBe(200);
      await expect(
        page.getByRole("heading", { name: "Emerald Ape #042" }),
      ).toBeVisible({ timeout: 30000 });
      const reloaded = await page.reload();
      expect(reloaded.status()).toBe(200);
      await expect(
        page.getByRole("heading", { name: "Emerald Ape #042" }),
      ).toBeVisible({ timeout: 30000 });
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Atualizações em tempo real" }),
      ).toBeVisible({ timeout: 30000 });
      const transport = await page.evaluate(async () => {
        const response = await fetch("/api/testing");
        return response.json();
      });
      expect(transport.socketClients).toBeGreaterThan(0);
      expect(mockedApiResponses.has("/api/nfts")).toBe(true);
      expect(mockedApiResponses.has("/api/nfts/cyber-ape")).toBe(true);
      await page.screenshot({
        path: fileURLToPath(
          new URL(`production-${profile}-detail.png`, evidence),
        ),
        fullPage: true,
      });
      report.checks.push({
        profile,
        viewport,
        documentStatuses: [home.status(), detail.status(), reloaded.status()],
        serviceWorker,
        mockedApiPaths: [...mockedApiResponses].sort(),
        socketClients: transport.socketClients,
        passed: true,
      });
    } finally {
      await context.close();
    }
  }
  expect(report.pageErrors).toEqual([]);
  expect(report.assetErrors).toEqual([]);
  report.passed = true;
} catch (error) {
  report.failure = error.stack || String(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(
  JSON.stringify({
    passed: report.passed,
    url: origin,
    report: fileURLToPath(reportFile),
    profiles: report.checks.map((check) => check.profile),
  }),
);
