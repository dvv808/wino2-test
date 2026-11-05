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
console.log("check-upload-inputs: ok");
