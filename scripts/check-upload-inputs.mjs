// Every upload in WINO goes through <DmsUpload> (src/dms/upload.tsx). A raw file input anywhere else fails the build.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../src/", import.meta.url));
const ALLOWED = "dms/upload.tsx";
const hits = [];

function scan(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) scan(path);
    else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name)) {
      const rel = relative(ROOT, path);
      if (rel === ALLOWED) continue;
      readFileSync(path, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (/type=["'{]+file["'}]/.test(line)) hits.push(`src/${rel}:${i + 1}`);
        });
    }
  }
}

scan(ROOT);
if (hits.length) {
  console.error(`File input outside src/${ALLOWED}. Use <DmsUpload context={…}> instead:\n  ${hits.join("\n  ")}`);
  process.exit(1);
}

// Every upload point in the app is listed as a Quelle in Ordner Zuordnung (src/lib/dms/sources.ts):
// partnerUpload("source", id, "slot") calls and literal contexts { source: "…", …, slot: "…" }.
const catalog = readFileSync(join(ROOT, "lib/dms/sources.ts"), "utf8");
const listed = (source, slot) =>
  new RegExp(`source: "${source.replace(/\./g, "\\.")}", slot: ${slot === null ? "null" : `"${slot}"`}`).test(catalog);
const missing = [];
function scanUses(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!path.includes(`${join(ROOT, "mocks")}`) && !path.endsWith("lib/dms")) scanUses(path);
      continue;
    }
    if (!/\.tsx?$/.test(name) || /\.test\./.test(name)) continue;
    const text = readFileSync(path, "utf8");
    for (const m of text.matchAll(/partnerUpload\("([a-z.]+)",[^,]+,\s*"([^"]*)"\)/g)) {
      if (!listed(m[1], m[2])) missing.push(`src/${relative(ROOT, path)}: ${m[1]} / ${m[2]}`);
    }
    for (const m of text.matchAll(/source: "([a-z.]+)",\s*entityType: "[A-Za-z]+",\s*entityId: [^,]+,\s*slot: "([^"]*)"/g)) {
      if (!listed(m[1], m[2])) missing.push(`src/${relative(ROOT, path)}: ${m[1]} / ${m[2]}`);
    }
  }
}
scanUses(ROOT);
if (missing.length) {
  console.error(`Upload point missing in the Quellen list (src/lib/dms/sources.ts):\n  ${missing.join("\n  ")}`);
  process.exit(1);
}
console.log("check-upload-inputs: ok");
