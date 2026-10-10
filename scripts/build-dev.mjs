import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.length !== 3) {
  throw new Error("HOLD=OUTPUT_DIRECTORY_REQUIRED");
}

const output = resolve(process.argv[2]);

if (output === root || !output.startsWith("/root/")) {
  throw new Error("HOLD=UNSAFE_OUTPUT_PATH");
}

const dist = resolve(output, "dist");
const dev = resolve(dist, "dev");

await mkdir(dev, { recursive: true });

for (const item of ["index.html", "assets", "styles", "scripts/site.js"]) {
  await cp(resolve(root, item), resolve(dist, item), {
    recursive: true
  });
}

await cp(resolve(root, "public/_headers"), resolve(dist, "_headers"));

await cp(resolve(root, "assets"), resolve(dev, "assets"), {
  recursive: true
});
await cp(resolve(root, "styles"), resolve(dev, "styles"), {
  recursive: true
});

await mkdir(resolve(dev, "scripts"), { recursive: true });

let html = await readFile(resolve(root, "index.html"), "utf8");

const oldLink = 'href="/?edition=';
if (!html.includes(oldLink)) {
  throw new Error("HOLD=EDITION_LINK_PATTERN_MISSING");
}
html = html.replaceAll(oldLink, 'href="/dev/?edition=');

await writeFile(resolve(dev, "index.html"), html, "utf8");

let js = await readFile(resolve(root, "scripts/site.js"), "utf8");

const changes = [
  [
    'const readerApiPrefix = () => `${readerApiBase}/v1`;',
    'const readerApiPrefix = () => `${window.location.origin}/dev/v1`;'
  ],
  [
    'return `${window.location.origin}/${query ? `?${query}` : ""}`;',
    'return `${window.location.origin}/dev/${query ? `?${query}` : ""}`;'
  ]
];

for (const [before, after] of changes) {
  if (js.split(before).length !== 2) {
    throw new Error("HOLD=UNEXPECTED_DEV_JS_PATTERN");
  }
  js = js.replace(before, after);
}

await writeFile(resolve(dev, "scripts/site.js"), js, "utf8");

console.log("DEV_SOURCE_BUILD=PASS");
