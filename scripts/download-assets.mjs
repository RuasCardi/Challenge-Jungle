import { mkdir, writeFile } from "node:fs/promises";
const photos = [
  "photo-1534447677768-be436bb09401",
  "photo-1573865526739-10659fec78a5",
  "photo-1462331940025-496dfbfc7564",
  "photo-1446776811953-b23d57bd21aa",
  "photo-1519681393784-d120267933ba",
  "photo-1518837695005-2083093ee35b",
  "photo-1441974231531-c6227db76b6e",
  "photo-1531366936337-7c912a4589a7",
];
await mkdir("public/assets", { recursive: true });
for (let i = 0; i < photos.length; i++) {
  const r = await fetch(
    `https://images.unsplash.com/${photos[i]}?fit=crop&w=700&q=75&fm=webp`,
  );
  if (!r.ok) throw Error(`${i}: ${r.status}`);
  await writeFile(
    `public/assets/${i}.webp`,
    Buffer.from(await r.arrayBuffer()),
  );
  console.log(`Saved artwork ${i}`);
}
await import("./download-font.mjs");
