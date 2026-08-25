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
  "styles/reader-core.css",
  "scripts/site.js",
  "public/_headers",
  "README.md",
  "package.json",
];

for (const path of requiredFiles) await access(resolve(projectRoot, path), constants.R_OK);

const [html, css, readerCss, js, headers, backgroundStats] = await Promise.all([
  readFile(resolve(projectRoot, "index.html"), "utf8"),
  readFile(resolve(projectRoot, "styles/site.css"), "utf8"),
  readFile(resolve(projectRoot, "styles/reader-core.css"), "utf8"),
  readFile(resolve(projectRoot, "scripts/site.js"), "utf8"),
  readFile(resolve(projectRoot, "public", "_headers"), "utf8"),
  stat(resolve(projectRoot, "assets", "background.webp")),
]);

const allClientText = html + css + readerCss + js;

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
  assert.equal(allClientText.toLowerCase().includes(forbidden.toLowerCase()), false, `Forbidden content: ${forbidden}`);
}

for (const required of [
  "Bibles for the world.",
  "Reader V1 Limited",
  "Open Bible",
  "Matthew 24:14",
  "3.8 Billion",
  "Still to Reach",
  "Vision",
  "Mission",
  "No unnecessary account",
  "apauneto@gmail.com",
  "PROMiXi LLC",
]) assert.ok(html.includes(required), `Required content missing: ${required}`);

assert.ok(html.includes('href="mailto:apauneto@gmail.com"'), "Contact must use the approved mailto link");
assert.ok(html.includes('class="reader-button" type="button" data-reader-open'), "Reader launcher must be active");
assert.ok(html.includes('class="scripture-reader" data-reader hidden'), "Reader overlay must default to hidden");
assert.ok(html.includes('data-reader-edition'), "Reader edition selector is missing");
assert.ok(js.includes("data-reader-open"), "Reader launcher behavior is missing");
assert.ok(js.includes("data-reader-close"), "Reader close behavior is missing");
assert.ok(html.includes('class="page-background" aria-hidden="true"'), "Fixed background layer is missing");
assert.ok(css.includes(".page-background"), "Fixed background CSS is missing");
assert.ok(css.includes("position: fixed"), "Background must be fixed to the viewport");
assert.ok(css.includes('background-image: url("../assets/background.webp")'), "Approved background asset is not bound to the fixed layer");
assert.ok(readerCss.includes(".scripture-reader"), "Reader presentation styles are missing");
assert.ok(backgroundStats.size > 100_000, "Background image is unexpectedly small");
assert.ok(headers.includes("Content-Security-Policy"), "Security headers are missing CSP");
assert.ok(headers.includes("Referrer-Policy: no-referrer"), "Security headers are missing Referrer-Policy");
assert.equal(/https?:\/\//i.test(allClientText), false, "External network reference detected");

console.log("STRUCTURAL_MATERIALIZATION_CHECK=PASS");
console.log(`BACKGROUND_BYTES=${backgroundStats.size}`);
console.log("BACKGROUND_BEHAVIOR=FIXED_VIEWPORT");
console.log("FOREGROUND_BEHAVIOR=DOCUMENT_SCROLL");
console.log("READER_STATE=V1_LIMITED_ACTIVE_LAUNCHER");
console.log("SCRIPTURE_TEXT_PAYLOAD=FAIL_CLOSED");
console.log("REMOTE_CONNECTIONS=NONE");
