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
  "support@promixi.org",
  "PROMiXi LLC",
]) {
  assert.ok(
    html.includes(required),
    `Required content missing: ${required}`
  );
}

assert.ok(
  html.includes('href="mailto:support@promixi.org"'),
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

/*
 * Three distinct readers (superseding the single four-mode View dropdown):
 * (a) Bible (First), Century (First, other view), Base66 (Second) and
 *     EXBase66 (Third) are exposed as four segmented switcher buttons in the
 *     top ribbon, on the same row as ☰ SCRIPTUREi, with no duplicate
 *     Bible/Century button row;
 * (b) the Bible and Century choices share the first reader's governed path;
 * (c) EXBase66 keeps its own right-side panel (data-reader-exbase66-panel);
 * (d) language menus show "native name (English name)" and sort A–Z by the
 *     English language name, keeping distinct governed codes as own entries;
 * (e) EXBase66 requires a verse: no chapter-wide evidence path.
 * The hidden #reader-mode state holder retains the four governed values so
 * query-string state and legacy ?readerMode= URLs keep working.
 */
assert.ok(
  html.includes("reader-ribbon-switcher"),
  "Four-reader ribbon switcher control is missing"
);

assert.equal(
  html.includes("data-reader-bible-choice"),
  false,
  "The separate Bible/Century button row must be removed from the ribbon"
);

// The four ribbon choices must sit on the same row, inside the same
// .reader-peaceful-bar container as the ☰ SCRIPTUREi menu trigger.
const peacefulBarMatch = html.match(
  /<div class="reader-peaceful-bar">([\s\S]*?)<\/div>\s*<div class="reader-mode-status">/
);
assert.ok(
  peacefulBarMatch && peacefulBarMatch[1].includes("data-reader-site-menu"),
  "☰ SCRIPTUREi trigger must share the ribbon row"
);
assert.ok(
  peacefulBarMatch &&
    ["bible", "century", "base66", "exbase66"].every((key) =>
      peacefulBarMatch[1].includes(`data-reader-select="${key}"`)
    ),
  "All four reader choices must share the ☰ SCRIPTUREi ribbon row"
);

for (const [key, label] of [
  ["bible", "Bible"],
  ["century", "Century"],
  ["base66", "Base66"],
  ["exbase66", "EXBase66"],
]) {
  const buttonMatch = html.match(
    new RegExp(`data-reader-select="${key}"[^>]*>([^<]+)<`)
  );
  assert.ok(buttonMatch, `Reader switcher button missing: ${label}`);
  assert.equal(
    buttonMatch[1].trim(),
    label,
    `Reader switcher button label mismatch: ${label}`
  );
}

const readerModeSelectMatch = html.match(
  /<select id="reader-mode"[^>]*>([\s\S]*?)<\/select>/
);
assert.ok(readerModeSelectMatch, "Reader mode state holder is missing");
assert.ok(
  /id="reader-mode"[^<]*\bhidden\b/.test(readerModeSelectMatch[0]),
  "Reader mode state holder must stay hidden behind the switcher"
);

const readerModeValues = [
  ...readerModeSelectMatch[1].matchAll(/<option value="([^"]+)">/g),
].map((match) => match[1]);

assert.deepEqual(
  readerModeValues,
  ["reader", "century", "base66", "exbase66"],
  "Reader mode state holder must retain reader/century/base66/exbase66"
);

assert.ok(
  html.includes("data-reader-exbase66-panel"),
  "EXBase66 right-side panel is missing"
);

/*
 * Contextual Help: the ☰ SCRIPTUREi menu offers one topic per reader, each
 * rendering inside the Read Scripture content area (data-reader-help-panel
 * inside #reader-passage's article) with a Return to Scripture control that
 * restores state without a network, AI, or enrichment call.
 */
assert.ok(
  html.includes("data-reader-help-panel"),
  "Contextual Help content area is missing"
);

for (const [topic, label] of [
  ["bible", "Bible Help"],
  ["century", "Century Help"],
  ["base66", "Base66 Help"],
  ["exbase66", "EXBase66 Help"],
]) {
  assert.ok(
    html.includes(`data-reader-help="${topic}"`),
    `Help menu item missing: ${label}`
  );
  assert.ok(
    js.includes(`${topic}: {`) && js.includes(`title: "${label}"`),
    `Help topic content missing: ${label}`
  );
}

assert.ok(
  js.includes("const returnToScripture") &&
    js.includes("Return to Scripture") &&
    js.includes("data-reader-help-return"),
  "Return to Scripture control must restore the previous passage state"
);

const returnToScriptureBody = js.slice(
  js.indexOf("const returnToScripture"),
  js.indexOf("const setReaderSiteMenuOpen")
);
assert.ok(
  returnToScriptureBody.includes("readerPassage.hidden = false") &&
    returnToScriptureBody.includes("readerMode.value = snapshot.mode") &&
    returnToScriptureBody.includes("readerLanguage.value = snapshot.language") &&
    returnToScriptureBody.includes("readerEdition.value = snapshot.edition") &&
    returnToScriptureBody.includes("readerBook.value = snapshot.book") &&
    returnToScriptureBody.includes("readerChapter.value = snapshot.chapter"),
  "Return to Scripture must restore passage, reader/view and selections"
);
assert.equal(
  /\b(fetch|XMLHttpRequest|EventSource|WebSocket)\b/.test(returnToScriptureBody),
  false,
  "Opening or returning from Help must not trigger a network call"
);

assert.ok(
  js.includes("${nativeName} (${englishName})"),
  "Language menus must label entries as native name (English language name)"
);
assert.ok(
  js.includes("const getLanguageSortKey") &&
    js.includes("englishLanguageNames[code]") &&
    js.includes('getLanguageSortKey(a.code).localeCompare(') &&
    js.includes('getLanguageSortKey(b.code), "en"'),
  "Language menus must sort alphabetically by the English language name"
);

assert.ok(
  js.includes("EXBASE66_GOVERNED_EDITION_IDS") &&
    js.includes('EXBASE66_GOVERNED_EDITION_IDS = new Set(["eng-eng-asv"])'),
  "EXBase66 must offer only governed editions"
);

assert.ok(
  js.includes("EXBASE66_VERSE_REQUIRED") &&
    /if \(!verse \|\| readerExbase66Verse\?\.disabled\)/.test(js),
  "EXBase66 must require a verse before displaying evidence"
);

assert.equal(
  /whole chapter\./i.test(js),
  false,
  "EXBase66 must not offer a chapter-wide evidence path"
);

assert.equal(
  js.toLowerCase().includes("concordance"),
  false,
  "Concordance reader mode must be removed from site.js"
);

for (const removedNavigation of [
  "reader-base66-reference",
  "reader-base66-read",
  "data-reader-base66-toggle",
  "data-reader-exbase66-toggle",
  "data-reader-context-close",
]) {
  assert.equal(
    html.toLowerCase().includes(removedNavigation) ||
      js.toLowerCase().includes(removedNavigation),
    false,
    `Removed navigation control still present: ${removedNavigation}`
  );
}

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
