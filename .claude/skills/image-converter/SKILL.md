---
name: image-converter
description: Use when the user has added new images to images-to-convert/ (or asks to convert/optimize images for the site) and wants them turned into .webp files in the matching public/images/ subfolder. Wraps scripts/convert-images.mjs.
---

# Image converter

`.webp` is smaller than `.jpg`/`.png` at equivalent quality, which is why every
existing image under `public/images/` is already webp. Rather than convert
images by hand, drop originals in `images-to-convert/` and run the script.

## Folder layout

`images-to-convert/` mirrors the structure of `public/images/`:

```
images-to-convert/
  creations/   -> public/images/creations/
  patterns/    -> public/images/patterns/
  socials/     -> public/images/socials/
```

Drop a source image (`.png`, `.jpg`, `.jpeg`, `.gif`, `.tif`/`.tiff`, `.avif`,
`.bmp`) into the subfolder matching where it belongs on the site. Adding a new
top-level subfolder under `images-to-convert/` works too — the script mirrors
whatever relative path it finds onto `public/images/`.

## Running the conversion

```
npm run images:convert
```

(equivalent to `node scripts/convert-images.mjs`)

- Recursively walks `images-to-convert/`, converts each supported image to
  `.webp` (quality 82), and writes it into the same relative path under
  `public/images/`, e.g. `images-to-convert/creations/blanket.jpg` ->
  `public/images/creations/blanket.webp`.
- Skips files that are already converted and unchanged (compares source vs.
  destination mtimes) — safe to rerun any time, it only processes new or
  modified sources. Pass `--force` to reconvert everything regardless of
  mtimes.
- If a source file is already `.webp`, it's copied over as-is (no
  re-encoding) so it still lands in the right `public/images/` subfolder.
- Auto-rotates based on the EXIF `Orientation` tag (via sharp's `.rotate()`
  with no args) before encoding. Phone photos usually store rotation as an
  EXIF flag rather than actually rotating the pixels, and webp doesn't
  reliably preserve/honor that tag — without this the converted image can
  come out sideways/upside-down even though the original `.jpg` looked fine.
  This only applies to the conversion path, not the already-`.webp` copy
  path — if a source is already `.webp` with a stale orientation flag,
  re-export it as e.g. `.jpg` first so the rotation gets baked in.
- Requires the `sharp` package (already a devDependency — `npm install` if
  it's missing from `node_modules`).

## After converting

- `images-to-convert/` is gitignored — it's a local staging folder, not part
  of the repo. Only the generated `.webp` output under `public/images/` gets
  committed. The source files stay on disk locally so they can be
  re-converted later (e.g. after tuning quality), but won't show up in
  `git status`.
- Reference the new image from content/components using its `public/images/...`
  path, same as existing images (see `src/content/creations/*.md`'s `image`
  field or the `socials`/`patterns` usages).
- Astro/Vite caches the `public/` directory listing at dev-server startup —
  if the dev server is already running, restart it after adding new files:
  `astro dev stop && astro dev --background`.
