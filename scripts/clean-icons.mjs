/**
 * Figma instance exports carry the page backdrop and any ancestor pill/panel
 * behind the glyph. Drop every rect that is bigger than the icon box itself.
 */
import { readFileSync, writeFileSync } from "node:fs";

const files = process.argv.slice(2);

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const root = source.match(/<svg[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"/);
  if (!root) {
    console.log(`skip ${file}: no root size`);
    continue;
  }
  const boxWidth = Number(root[1]);
  const boxHeight = Number(root[2]);
  let removed = 0;

  let cleaned = source.replace(/^<rect\b[^>]*\/>\n/gm, (tag) => {
    if (/fill="#1E1E1E"/i.test(tag)) {
      removed += 1;
      return "";
    }
    const width = Number(tag.match(/\bwidth="([\d.]+)"/)?.[1] ?? 0);
    const height = Number(tag.match(/\bheight="([\d.]+)"/)?.[1] ?? 0);
    if (width > boxWidth || height > boxHeight) {
      removed += 1;
      return "";
    }
    return tag;
  });

  /* A clip path whose shape we just dropped would clip the whole glyph away. */
  for (const [, id] of cleaned.matchAll(/<clipPath id="([^"]+)">\s*<\/clipPath>/g)) {
    cleaned = cleaned
      .replaceAll(` clip-path="url(#${id})"`, "")
      .replace(new RegExp(`<clipPath id="${id}">\\s*</clipPath>\\s*`), "");
    removed += 1;
  }
  cleaned = cleaned.replace(/<defs>\s*<\/defs>\s*/g, "");

  writeFileSync(file, cleaned);
  console.log(`${file}: removed ${removed}`);
}
