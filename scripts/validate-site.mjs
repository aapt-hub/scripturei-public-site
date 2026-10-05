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
  "worker.js",
  "public/_headers",
  "README.md",
  "package.json",
];

for (const path of requiredFiles) {
  await access(resolve(projectRoot, path), constants.R_OK);
}

const [html, css, readerCss, js, worker, headers, backgroundStats] =
  await Promise.all([
    readFile(resolve(projectRoot, "index.html"), "utf8"),
    readFile(resolve(projectRoot, "styles/site.css"), "utf8"),
    readFile(resolve(projectRoot, "styles", "reader-core.css"), "utf8"),
    readFile(resolve(projectRoot, "scripts", "site.js"), "utf8"),
    readFile(resolve(projectRoot, "worker.js"), "utf8"),
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
  assert.ok(
    index > previousIndex,
    `Missing or out-of-order authority term: ${term}`
  );
  previousIndex = index;
}

for (const forbidden of [
  "Kingdom Principles",
  "Pentecostal Theology",
  "google-analytics.com",
  "googletagmanager.com",
  "facebook.net",
  "api.bible",
  "Base66 canonical navigation uses the validated Reader data path.",
  "<form",
  "localStorage",
  "sessionStorage",
  "data-reader-open",
  "data-reader-close",
  'aria-modal="true"',
]) {
  assert.equal(
    allClientText.toLowerCase().includes(forbidden.toLowerCase()),
    false,
    `Forbidden content: ${forbidden}`
  );
}

for (const required of [
  "Bibles for the world.",
  "Reader V1 Limited",
  "Open the Bible",
  "Matthew 24:14",
  "3.8 Billion",
  "Still to Reach",
  "Bible / Translation",
  "Read Scripture",
  'id="reader-edition"',
  'id="reader-book"',
  'id="reader-chapter"',
  'id="reader-passage"',
  "Vision",
  "Mission",
  "apauneto@gmail.com",
  "PROMiXi LLC",
]) {
  assert.ok(
    html.includes(required),
    `Required content missing: ${required}`
  );
}

assert.ok(
  html.includes('href="mailto:apauneto@gmail.com"'),
  "Contact must use the approved mailto link"
);

assert.ok(
  html.includes('class="inline-reader"'),
  "Inline Reader must be present"
);

assert.ok(
  html.includes("data-reader-edition"),
  "Reader edition selector is missing"
);

assert.ok(
  html.includes("data-reader-edition-name"),
  "Reader edition display binding is missing"
);

for (const endpoint of [
  "/v1/reader/editions",
  "/v1/reader/books",
  "/v1/reader/chapters",
  "/v1/reader/passage",
]) {
  assert.ok(
    worker.includes(endpoint),
    `Reader endpoint missing from Worker: ${endpoint}`
  );
}



assert.ok(
  js.includes('base66: "Base66 governed editions and reference sources."'),
  "Base66 mode description is missing"
);

assert.ok(
  js.includes("base66EditionIDs") &&
    js.includes('readerMode?.value === "base66"') &&
    [
      "deu-deu1912",
      "eng-eng-asv",
      "hat-hatbsa",
      "grcbyz-ebible",
      "grclxx-ebible",
      "grcmt-ebible",
      "grctcgnt-ebible",
      "grctr-ebible",
      "hebwlc-ebible",
    ].every((editionID) => js.includes(editionID)),
  "Base66 mode must use the governed Base66 Reader data path"
);

assert.ok(
  js.includes('passageQuery.set("layered", "base66")') &&
    js.includes("OriginalText") &&
    js.includes("Lexical") &&
    js.includes("reader-base66-translation") &&
    js.includes("reader-base66-original") &&
    js.includes("reader-base66-strong") &&
    js.includes("Strong:"),
  "Base66 Reader must render translation, original-language, and Strong layers"
);

assert.equal(
  worker.includes("/v1/base66"),
  false,
  "Public Worker must not expose a separate Base66 API route"
);

assert.ok(
  js.includes('window.location.hostname === "127.0.0.1"') &&
    js.includes('window.location.hostname === "localhost"'),
  "Local Reader development binding is missing"
);

assert.equal(
  js.includes("editionNames"),
  false,
  "Static Reader edition mapping must not be present"
);

assert.ok(
  html.includes('class="page-background" aria-hidden="true"'),
  "Fixed background layer is missing"
);

assert.ok(
  css.includes(".page-background"),
  "Fixed background CSS is missing"
);

assert.ok(
  css.includes("position: fixed"),
  "Background must be fixed to the viewport"
);

assert.ok(
  css.includes('background-image: url("../assets/background.webp")'),
  "Approved background asset is not bound to the fixed layer"
);

assert.ok(
  readerCss.includes(".inline-reader"),
  "Inline Reader presentation styles are missing"
);

assert.ok(
  readerCss.includes(".hero-mission"),
  "Hero mission presentation styles are missing"
);

assert.ok(
  backgroundStats.size > 100_000,
  "Background image is unexpectedly small"
);

assert.ok(
  headers.includes("Content-Security-Policy"),
  "Security headers are missing CSP"
);

assert.ok(
  headers.includes("Referrer-Policy: no-referrer"),
  "Security headers are missing Referrer-Policy"
);

/*
 * Runtime/client network references remain fail-closed.
 * Production Reader traffic remains same-origin.
 * Only the two existing localhost Reader development bindings
 * remain permitted.
 */
const runtimeAbsoluteUrls =
  (css + readerCss + js).match(/https?:\/\/[^\s"'`<>]+/gi) ?? [];

for (const url of runtimeAbsoluteUrls) {
  assert.ok(
    url.startsWith("http://127.0.0.1:8777") ||
      url.startsWith("http://127.0.0.1:8666"),
    `Unapproved runtime network reference detected: ${url}`
  );
}

/*
 * Absolute URLs in HTML are navigation links, not Reader/runtime
 * dependencies. Permit only the three exact PROMiXi ecosystem roots.
 */
const approvedHtmlNavigationUrls = new Set([
  "https://gdisciple.org/",
  "https://promixi.org/",
  "https://scripturei.org/",
]);

const htmlAbsoluteUrls =
  html.match(/https?:\/\/[^\s"'`<>]+/gi) ?? [];

for (const url of htmlAbsoluteUrls) {
  assert.ok(
    approvedHtmlNavigationUrls.has(url),
    `Unapproved HTML navigation reference detected: ${url}`
  );
}

if (!html.includes('href="#bible-index"')) {
  throw new Error("Primary navigation must expose the Languages index");
}

if (!html.includes('id="bible-search"')) {
  throw new Error("Bible language search input is missing");
}

if (!html.includes("data-bible-search-status")) {
  throw new Error("Bible search status binding is missing");
}

if (!css.includes("SCRIPTUREI_TEMPLATE_CANDIDATE_R1")) {
  throw new Error("Template candidate CSS binding is missing");
}

if (!js.includes("SCRIPTUREI_BIBLE_INDEX_FILTER_R1")) {
  throw new Error("Bible index filter implementation is missing");
}

if (!html.includes("data-scripturei-world-bibles")) {
  throw new Error("Static World Bibles materialization is missing");
}


if (!html.includes('class="scripturei-gdisciple-family-r2"')) {
  throw new Error("GDisciple visual-family body binding is missing");
}

if (!html.includes('class="scripturei-ecosystem-bar"')) {
  throw new Error("PROMiXi ecosystem bar is missing");
}

if (!html.includes('aria-current="site">SCRIPTUREi</a>')) {
  throw new Error("SCRIPTUREi ecosystem current-site binding is missing");
}

if (!css.includes("SCRIPTUREI_GDISCIPLE_VISUAL_FAMILY_R2")) {
  throw new Error("GDisciple visual-family CSS binding is missing");
}

for (const forbidden of [
  "The AI-Powered Management Console for the Local Church",
  "Track 1 Agentic Intelligence",
  "The Private Operational Suite",
]) {
  if (html.includes(forbidden)) {
    throw new Error(
      `GDisciple product content must not be copied into SCRIPTUREi: ${forbidden}`
    );
  }
}

console.log("STRUCTURAL_MATERIALIZATION_CHECK=PASS");
console.log(`BACKGROUND_BYTES=${backgroundStats.size}`);
console.log("BACKGROUND_BEHAVIOR=FIXED_VIEWPORT");
console.log("FOREGROUND_BEHAVIOR=DOCUMENT_SCROLL");
console.log("READER_STATE=DYNAMIC_INLINE");
console.log(
  "READER_NAVIGATION=EDITION_BOOK_CHAPTER_DYNAMIC"
);
console.log(
  "READER_NETWORK_POLICY=SAME_ORIGIN_PRODUCTION_LOCALHOST_DEV_ONLY"
);
