/** Decode a saved CDP Page.captureScreenshot response into a viewable PNG. */
import { readFileSync, writeFileSync } from "node:fs";

const [source, target] = process.argv.slice(2);
const payload = JSON.parse(readFileSync(source, "utf8"));
const data = payload.data ?? payload.result?.data;
writeFileSync(target, Buffer.from(data, "base64"));
console.log(target);
