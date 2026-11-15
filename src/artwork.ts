export function artworkSources(src: string) {
  if (!/^\/assets\/ape-(hero|sage|neon|golden)\.webp$/.test(src))
    return undefined;
  const stem = src.slice(0, -5);
  const width = src.includes("hero") ? 447 : src.includes("golden") ? 258 : 249;
  return `${stem}-200.webp 200w, ${width > 300 ? `${stem}-300.webp 300w, ` : ""}${src} ${width}w`;
}
