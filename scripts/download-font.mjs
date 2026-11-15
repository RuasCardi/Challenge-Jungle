import { writeFile } from "node:fs/promises";
const css = await (
  await fetch(
    "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      },
    },
  )
).text();
const rules = css.split("@font-face");
const rule = rules.at(-1);
const url = rule.match(/url\(([^)]+)\)/)?.[1];
if (!url || !rule.includes("100 900"))
  throw Error("Fonte variável indisponível: " + rule);
const response = await fetch(url);
if (!response.ok) throw Error("Download de fonte falhou");
await writeFile(
  "public/assets/inter.woff2",
  Buffer.from(await response.arrayBuffer()),
);
console.log(rule);
