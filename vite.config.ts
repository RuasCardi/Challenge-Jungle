import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { precompressed } from "./scripts/precompressed";
export default defineConfig({
  plugins: [react(), precompressed()],
  server: { port: 5173 },
  build: {
    minify: "terser",
    terserOptions: { compress: { passes: 3 }, format: { comments: false } },
  },
});
