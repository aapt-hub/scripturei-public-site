import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "index.html",
  "assets/background.webp",
  "styles/site.css",
  "scripts/site.js",
  "public/_headers",
  "README.md",
  "package.json",
];

for (const path of requiredFiles) await access(resolve(projectRoot, path), constants.R_OK);

const [html, css, js, headers, backgroundStats] = await Promise.all([
  readFile(resolve(projectRoot, "index.html"), "utf8"),
  readFile(resolve(projectRoot, "styles/site.css"), "utf8"),
  readFile(resolve(projectRoot, "scripts/site.js"), "utf8"),
  readFile(resolve(projectRoot, "public", "_headers"), "utf8"),
  stat(resolve(projectRoot, "assets", "background.webp")),
]);

const exactAuthority = [
  "Bible",
  "Kindom Principles",
  "PROMiXi",
  "EEOS, AI, automation, and technology",
];
let previousIndex = -1;
for (const term of exactAuthority) {
  const index = html.indexOf(`<span>${term}</span>`);
  assert.ok(index > previousIndex, `Missing or out-of-order authority term: ${term}`);
  previousIndex = index;
}

for (const forbidden of [
  "Kingdom Principles",
  "Pentecostal Theology",
  "google-analytics.com",
  "googletagmanager.com",
  "facebook.net",
  "api.bible",
  "<form",
  "localStorage",
  "sessionStorage",
]) {
  assert.equal((html + css + js).toLowerCase().includes(forbidden.toLowerCase()), false, `Forbidden content: ${forbidden}`);
}

for (const required of [
  "Bibles for the world.",
  "Scripture reader available",
  "Read Scripture",
  'id="reader-edition"',
  'id="reader-book"',
  'id="reader-chapter"',
  'id="reader-passage"',
  "Vision",
  "Mission",
  "apauneto@gmail.com",
  "PROMiXi LLC",
]) assert.ok(html.includes(required), `Required content missing: ${required}`);

assert.ok(html.includes('href="mailto:apauneto@gmail.com"'), "Contact must use the approved mailto link");

for (const endpoint of [
  "/v1/reader/editions",
  "/v1/reader/books",
  "/v1/reader/chapters",
  "/v1/reader/passage",
]) {
  assert.ok(js.includes(endpoint), `Reader endpoint missing: ${endpoint}`);
}

assert.ok(
  js.includes('window.location.hostname === "127.0.0.1"') &&
  js.includes('window.location.hostname === "localhost"'),
  "Local Reader development binding is missing"
);
assert.ok(html.includes('class="page-background" aria-hidden="true"'), "Fixed background layer is missing");
assert.ok(css.includes(".page-background"), "Fixed background CSS is missing");
assert.ok(css.includes("position: fixed"), "Background must be fixed to the viewport");
assert.ok(css.includes('background-image: url("../assets/background.webp")'), "Approved background asset is not bound to the fixed layer");
assert.ok(backgroundStats.size > 100_000, "Background image is unexpectedly small");
assert.ok(headers.includes("Content-Security-Policy"), "Security headers are missing CSP");
assert.ok(headers.includes("Referrer-Policy: no-referrer"), "Security headers are missing Referrer-Policy");
const absoluteUrls = (html + css + js).match(/https?:\/\/[^\s"'`<>]+/gi) ?? [];

for (const url of absoluteUrls) {
  assert.ok(
    url.startsWith("http://127.0.0.1:8777"),
    `Unapproved external network reference detected: ${url}`
  );
}

console.log("STRUCTURAL_MATERIALIZATION_CHECK=PASS");
console.log(`BACKGROUND_BYTES=${backgroundStats.size}`);
console.log("BACKGROUND_BEHAVIOR=FIXED_VIEWPORT");
console.log("FOREGROUND_BEHAVIOR=DOCUMENT_SCROLL");
console.log("READER_NETWORK_POLICY=SAME_ORIGIN_PRODUCTION_LOCALHOST_DEV_ONLY");
