#!/usr/bin/env node
// Downloads every external (http/https) `image:` URL in
// src/content/yarns.yaml, shrinks it to icon size, and rewrites the yaml to
// point at the self-hosted copy instead — those URLs are hotlinked straight
// from Hobbii's Shopify storefront CDN, which offers no permanence
// guarantee (a merchant re-cropping/replacing/reordering a product photo
// silently breaks the link on our end, with nothing we can react to). An
// entry already pointing at a local /images/... path is left untouched, so
// this is safe to re-run whenever new colorways are added to the catalog.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";
import sharp from "sharp";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const yarnsYamlPath = join(rootDir, "src", "content", "yarns.yaml");
const destDir = join(rootDir, "public", "images", "yarns");

// Only ever shown as a ~48px swatch tile (patterns/[slug].astro,
// creations/[slug].astro) — 128px covers up to ~2.5x that for retina
// displays without hoarding full product-photo resolution nobody sees.
const MAX_DIMENSION = 128;
const WEBP_QUALITY = 78;
const CONCURRENCY = 8;

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip accents (Bohème -> boheme)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function processColor(lineSlug, color, stats) {
  const url = color.get("image");
  if (typeof url !== "string" || !/^https?:\/\//.test(url)) return;

  const colorName = color.get("name") ?? color.get("number") ?? "color";
  const fileName = `${slugify(String(colorName))}.webp`;
  const destPath = join(destDir, lineSlug, fileName);
  const publicPath = `/images/yarns/${lineSlug}/${fileName}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());

    await mkdir(dirname(destPath), { recursive: true });
    await sharp(buffer)
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(destPath);

    color.set("image", publicPath);
    stats.localized.push(`${lineSlug}/${fileName}`);
  } catch (err) {
    stats.failed.push({ url, reason: err.message.split("\n")[0] });
  }
}

// Simple fixed-size worker pool — 232 sequential fetches against the same
// CDN would take minutes; unbounded Promise.all would hammer it with them
// all at once. Neither is necessary here.
async function runPool(tasks, concurrency) {
  const queue = [...tasks];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      let task;
      while ((task = queue.shift())) await task();
    })
  );
}

async function main() {
  const raw = await readFile(yarnsYamlPath, "utf-8");
  const doc = parseDocument(raw);
  const lines = doc.get("yarns");

  const stats = { localized: [], failed: [], skipped: 0 };
  const tasks = [];

  for (const line of lines.items) {
    const lineSlug = slugify(String(line.get("id") ?? line.get("name")));
    const colors = line.get("colors");
    if (!colors) continue;
    for (const color of colors.items) {
      const url = color.get("image");
      if (typeof url !== "string") continue;
      if (!/^https?:\/\//.test(url)) {
        stats.skipped++;
        continue;
      }
      tasks.push(() => processColor(lineSlug, color, stats));
    }
  }

  console.log(`Found ${tasks.length} external image(s) to localize (${stats.skipped} already local)...`);
  await runPool(tasks, CONCURRENCY);

  // lineWidth: 0 disables yaml's default 80-column folding of long scalars
  // (e.g. every `link:` URL) — without it, re-serializing the document
  // rewraps every long line in the file, not just the `image:` fields this
  // script actually touches, turning a small diff into a wall of unrelated
  // noise.
  await writeFile(yarnsYamlPath, doc.toString({ lineWidth: 0 }));

  console.log(`\nDone. ${stats.localized.length} localized, ${stats.failed.length} failed.`);
  if (stats.failed.length > 0) {
    console.log(`\nFailed (left as external URLs, needs a manual look):`);
    for (const { url, reason } of stats.failed) console.log(`  - ${reason}: ${url}`);
  }
}

main();
