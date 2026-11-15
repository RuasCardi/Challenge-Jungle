import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, platform, release, totalmem } from "node:os";
import { spawn } from "node:child_process";
import desktop from "lighthouse/core/config/desktop-config.js";
const origin = process.env.AUDIT_URL || "http://127.0.0.1:4175";
const output = new URL("../reports/lighthouse/", import.meta.url);
await mkdir(output, { recursive: true });
const preview = process.env.AUDIT_URL
  ? null
  : spawn(
      process.execPath,
      [
        "node_modules/vite/bin/vite.js",
        "preview",
        "--configLoader",
        "runner",
        "--host",
        "127.0.0.1",
        "--port",
        "4175",
        "--strictPort",
      ],
      { stdio: "ignore", windowsHide: true },
    );
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(origin)).ok) break;
  } catch {
    // Aguarda a prévia local terminar de iniciar.
  }
  await new Promise((r) => setTimeout(r, 500));
}
const chrome = await chromeLauncher.launch({
  ...(process.env.CHROME_PATH
    ? { chromePath: process.env.CHROME_PATH }
    : process.platform === "win32"
      ? { chromePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" }
      : {}),
  chromeFlags: ["--headless=new", "--disable-gpu"],
  logLevel: "silent",
});
const summary = {
  environment: {
    node: process.version,
    platform: platform(),
    os: release(),
    cpu: cpus()[0]?.model,
    memoryGiB: Math.round(totalmem() / 1024 ** 3),
    origin,
    build: "npm run build",
    conditions:
      "Build otimizado; cenário padrão MSW; imagens e fonte locais da entrega; cache limpo em cada navegação; throttling simulado padrão mobile/desktop. Execuções sequenciais sem testes concorrentes.",
  },
  runs: [],
  medians: [],
};
try {
  for (const [page, path] of [
    ["home", "/"],
    ["detail", "/nft/cyber-ape"],
  ])
    for (const profile of ["mobile", "desktop"]) {
      for (let run = 1; run <= 3; run++) {
        const result = await lighthouse(
          origin + path,
          { port: chrome.port, logLevel: "error" },
          {
            extends: "lighthouse:default",
            settings: {
              ...(profile === "desktop" ? desktop.settings : {}),
              onlyCategories: [
                "performance",
                "accessibility",
                "best-practices",
                "seo",
              ],
              output: ["html", "json"],
            },
          },
        );
        if (!result) throw Error("Lighthouse não retornou resultado");
        const name = `${page}-${profile}-${run}`;
        await writeFile(new URL(`${name}.html`, output), result.report[0]);
        await writeFile(new URL(`${name}.json`, output), result.report[1]);
        const { lhr } = result;
        const record = {
          page,
          profile,
          run,
          timestamp: lhr.fetchTime,
          lighthouse: lhr.lighthouseVersion,
          userAgent: lhr.userAgent,
          scores: Object.fromEntries(
            Object.entries(lhr.categories).map(([k, v]) => [
              k,
              Math.round(v.score * 100),
            ]),
          ),
          metrics: {
            LCP: lhr.audits["largest-contentful-paint"].numericValue,
            CLS: lhr.audits["cumulative-layout-shift"].numericValue,
            TBT: lhr.audits["total-blocking-time"].numericValue,
          },
          runtimeError: lhr.runtimeError,
          issues: Object.entries(lhr.audits)
            .filter(([, v]) => typeof v.score === "number" && v.score < 0.9)
            .map(([id, v]) => ({ id, title: v.title, value: v.displayValue })),
        };
        summary.runs.push(record);
        console.log(
          JSON.stringify({
            page,
            profile,
            run,
            scores: record.scores,
            metrics: record.metrics,
          }),
        );
        await writeFile(
          new URL("summary.json", output),
          JSON.stringify(summary, null, 2),
        );
      }
      const group = summary.runs.filter(
        (r) => r.page === page && r.profile === profile,
      );
      const median = (values) => values.sort((a, b) => a - b)[1];
      summary.medians.push({
        page,
        profile,
        scores: Object.fromEntries(
          Object.keys(group[0].scores).map((k) => [
            k,
            median(group.map((r) => r.scores[k])),
          ]),
        ),
        metrics: Object.fromEntries(
          Object.keys(group[0].metrics).map((k) => [
            k,
            median(group.map((r) => r.metrics[k])),
          ]),
        ),
      });
    }
} finally {
  await writeFile(
    new URL("summary.json", output),
    JSON.stringify(summary, null, 2),
  );
  await chrome.kill();
  preview?.kill();
}
