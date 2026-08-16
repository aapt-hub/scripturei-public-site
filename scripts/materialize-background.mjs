import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(projectRoot, "..", "prior-evidence", "SCRIPTUREi-local-review.html");
const outputPath = resolve(projectRoot, "assets", "background.webp");
const source = await readFile(sourcePath, "utf8");
const match = source.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/);

assert.ok(match, "Approved embedded WebP background was not found in the preserved R1 review artifact");
const bytes = Buffer.from(match[1], "base64");
assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", "Background is not a RIFF WebP file");
assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", "Background is not WebP");

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, bytes);
console.log(`Materialized approved background: ${bytes.length} bytes`);
