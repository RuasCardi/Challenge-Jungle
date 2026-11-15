import { spawn } from "node:child_process";
// Test the optimized artifact, avoiding Vite's first-visit dependency re-optimization.
const build = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "build"],
  { stdio: "inherit", windowsHide: true },
);
const exitCode = await new Promise((resolve) => build.on("exit", resolve));
if (exitCode !== 0) process.exit(exitCode || 1);
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "5174",
    "--strictPort",
  ],
  { stdio: "inherit", windowsHide: true },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.kill();
    process.exit();
  });
await new Promise((resolve) => server.on("exit", resolve));
