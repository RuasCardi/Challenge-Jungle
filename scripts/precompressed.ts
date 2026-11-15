import type { Plugin } from "vite";
import { brotliCompressSync, constants } from "node:zlib";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve, join, sep } from "node:path";

export function precompressed(): Plugin {
  let output: string;
  let building = false;
  return {
    name: "precompressed-static-assets",
    configResolved(config) {
      output = resolve(config.root, config.build.outDir);
      building = config.command === "build";
    },
    async closeBundle() {
      if (!building) return;
      const files = await readdir(join(output, "assets"));
      await Promise.all(
        files
          .filter((file) => /\.(js|css)$/.test(file))
          .map(async (file) => {
            const path = join(output, "assets", file);
            const data = await readFile(path);
            await writeFile(
              path + ".br",
              brotliCompressSync(data, {
                params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
              }),
            );
          }),
      );
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (
          !request.headers["accept-encoding"]?.includes("br") ||
          !["GET", "HEAD"].includes(request.method || "")
        )
          return next();
        try {
          const path = resolve(
            output,
            "." + new URL(request.url || "/", "http://localhost").pathname,
          );
          if (!path.startsWith(output + sep) || !/\.(js|css)$/.test(path))
            return next();
          const data = await readFile(path + ".br");
          response.setHeader("Content-Encoding", "br");
          response.setHeader(
            "Content-Type",
            path.endsWith(".css") ? "text/css" : "application/javascript",
          );
          response.setHeader("Vary", "Accept-Encoding");
          response.setHeader("Content-Length", data.length);
          response.end(request.method === "HEAD" ? undefined : data);
        } catch {
          next();
        }
      });
    },
  };
}
