import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(projectRoot, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of ["index.html", "assets", "styles", "scripts/site.js"]) {
  await cp(resolve(projectRoot, entry), resolve(dist, entry), { recursive: true });
}

await cp(resolve(projectRoot, "public", "_headers"), resolve(dist, "_headers"));

const [html, css, readerCss, js, background] = await Promise.all([
  readFile(resolve(projectRoot, "index.html"), "utf8"),
  readFile(resolve(projectRoot, "styles", "site.css"), "utf8"),
  readFile(resolve(projectRoot, "styles", "reader-core.css"), "utf8"),
  readFile(resolve(projectRoot, "scripts", "site.js"), "utf8"),
  readFile(resolve(projectRoot, "assets", "background.webp")),
]);

const reviewCss = css.replace(
  'url("../assets/background.webp")',
  `url("data:image/webp;base64,${background.toString("base64")}")`,
);

const review = html
  .replace('<link rel="preload" href="assets/background.webp" as="image" type="image/webp">', "")
  .replace('<link rel="stylesheet" href="styles/site.css">', `<style>\n${reviewCss}\n</style>`)
  .replace('<link rel="stylesheet" href="styles/reader-core.css">', `<style>\n${readerCss}\n</style>`)
  .replace('<script src="scripts/site.js" defer></script>', "")
  .replace("</body>", `<script>\n${js}\n</script>\n</body>`);

await writeFile(resolve(projectRoot, "SCRIPTUREi-public-site-local-review-R2.html"), review, "utf8");
console.log("Built dist/ and single-file local review R2");
