import { build, preview } from "vite";
import { fileURLToPath } from "node:url";
// Test the optimized artifact, avoiding Vite's first-visit dependency re-optimization.
// Keep the HTTP server in this process so forced Windows teardown cannot orphan it.
const config = {
  root: fileURLToPath(new URL("../", import.meta.url)),
  configLoader: "runner",
  clearScreen: false,
};
let server;
let closing = false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    if (closing) return;
    closing = true;
    try {
      await server?.close();
    } finally {
      process.exit();
    }
  });
await build(config);
server = await preview({
  ...config,
  preview: { host: "127.0.0.1", port: 5174, strictPort: true },
});
server.printUrls();
