#!/usr/bin/env node
// Generates small thumbnail variants of each collection's cover photos
// (public/images/<collection>/**/*.webp, including per-item subfolders like
// public/images/patterns/chunky-ducky/) into a thumbs/ subdirectory alongside
// each image's own folder, for use anywhere a cover image is shown small
// (homepage marquee, grid/list tiles) instead of serving the full ~1600px
// detail-page image at a 140-400px display size.
import { readdir, mkdir, stat } from "node:fs/promises";
import { join, dirname, basename, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const imagesDir = join(rootDir, "public", "images");
const COLLECTIONS = ["creations", "patterns"];

// Largest real on-page display size is the creations grid tile
// (auto-fill, minmax(200px, 1fr) — can stretch a bit wider on wide screens),
// everything else (marquee, list view, patterns card) is smaller. 450px
// covers that comfortably even at 2x retina, well below the old 600px cap.
const MAX_DIMENSION = 450;
const WEBP_QUALITY = 78;

const force = process.argv.includes("--force");

async function needsConversion(srcPath, destPath) {
  if (force) return true;
  try {
    const [srcStat, destStat] = await Promise.all([stat(srcPath), stat(destPath)]);
    return srcStat.mtimeMs > destStat.mtimeMs;
  } catch {
    return true; // dest doesn't exist yet
  }
}

// Recursively finds .webp files under dir, skipping any "thumbs" subfolder
// (those are generated output, not source images) and any "color-preview"
// subfolder (a pattern's recolor-preview base photo + region masks —
// PatternSettingsCard.astro only ever draws these into a <canvas> at their
// own full resolution, so a small thumbs/ copy would be dead weight nothing
// on the site ever requests), while still descending into per-item
// subfolders like patterns/chunky-ducky/.
async function findWebpFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name === "thumbs" || entry.name === "color-preview") continue;
      files.push(...(await findWebpFiles(join(dir, entry.name))));
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === ".webp") {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

async function processCollection(name) {
  const srcDir = join(imagesDir, name);
  const files = await findWebpFiles(srcDir);

  if (files.length === 0) {
    console.log(`No .webp files found in ${srcDir}`);
    return;
  }

  let converted = 0;
  let skipped = 0;
  const madeDirs = new Set();

  for (const srcPath of files) {
    const destDir = join(dirname(srcPath), "thumbs");
    const destPath = join(destDir, basename(srcPath));

    if (!(await needsConversion(srcPath, destPath))) {
      skipped++;
      continue;
    }

    if (!madeDirs.has(destDir)) {
      await mkdir(destDir, { recursive: true });
      madeDirs.add(destDir);
    }

    await sharp(srcPath)
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(destPath);
    converted++;
    console.log(`Thumbnail: ${relative(imagesDir, srcPath)}`);
  }

  console.log(`${name}: ${converted} generated, ${skipped} already up to date.`);
}

async function main() {
  for (const collection of COLLECTIONS) {
    await processCollection(collection);
  }
}

main();
