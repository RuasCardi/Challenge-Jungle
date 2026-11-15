import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

// Re-encode the supplied local artwork; no external image service is needed.
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({
  ...(existsSync(chrome) ? { executablePath: chrome } : {}),
  headless: true,
});
try {
  const page = await browser.newPage();
  for (const name of ["ape-hero", "ape-sage", "ape-neon", "ape-golden"]) {
    const source = await readFile(
      new URL(`../public/assets/${name}.png`, import.meta.url),
    );
    for (const width of [
      0,
      200,
      ...(source.readUInt32BE(16) > 300 ? [300] : []),
    ]) {
      const result = await page.evaluate(
        async ({ base64, width }) => {
          const image = new Image();
          image.src = `data:image/png;base64,${base64}`;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = width
            ? Math.min(width, image.naturalWidth)
            : image.naturalWidth;
          canvas.height = Math.round(
            (image.naturalHeight * canvas.width) / image.naturalWidth,
          );
          const context = canvas.getContext("2d");
          context.imageSmoothingQuality = "high";
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL("image/webp", 0.94).split(",")[1];
        },
        { base64: source.toString("base64"), width },
      );
      const file = `${name}${width ? `-${width}` : ""}.webp`;
      const data = Buffer.from(result, "base64");
      await writeFile(
        new URL(`../public/assets/${file}`, import.meta.url),
        data,
      );
      console.log(`${file}: ${data.length} bytes`);
    }
  }
} finally {
  await browser.close();
}
