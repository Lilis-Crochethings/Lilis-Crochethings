# Lili's Crochethings

The source for [lilis-crochethings.github.io](https://lilis-crochethings.github.io) — a static showcase site for Lili's Crochethings, built with [Astro](https://astro.build) and deployed to GitHub Pages.

## Setup

Requires Node.js 22.12 or newer.

```sh
npm install
```

## Development

| Command                     | Action                                                     |
| :--------------------------- | :---------------------------------------------------------- |
| `npm run dev`                | Start the dev server at `localhost:4321`                    |
| `npm run build`              | Build the production site to `./dist/`                      |
| `npm run preview`            | Preview the production build locally                        |
| `npm run astro -- check`     | Type-check `.astro` files                                    |
| `npm run astro -- <command>` | Run any other Astro CLI command (e.g. `astro add`)           |

The dev server can also be run in background mode (used by Claude Code, but works for anyone): `npx astro dev --background`, then `npx astro dev stop` / `status` / `logs`.

## Project structure

```
/
├── public/              static assets served as-is (images, fonts, favicon)
├── src/
│   ├── content/         YAML/Markdown content (creations, patterns, general site info)
│   ├── content.config.ts  content collection schemas
│   ├── components/      Astro components
│   ├── layouts/         page layout(s)
│   └── pages/           file-based routes
├── images-to-convert/   drop raw photos here to be converted (gitignored, local only)
└── scripts/             standalone maintenance scripts, see below
```

All user-facing text lives in `src/content/**` YAML files, not hardcoded in `.astro` files — edit content there.

## Maintenance scripts

These scripts are standalone and don't require any AI assistance to run — just Node.js (already installed for the site itself) or Python for the font scripts.

### Converting images to WebP

Every image on the site is served as `.webp`. To add a new image:

1. Drop the source file (`.png`, `.jpg`, `.jpeg`, `.gif`, `.tif`/`.tiff`, `.avif`, `.bmp`) into `images-to-convert/`, in the subfolder matching where it belongs (`creations/`, `patterns/`, `socials/`, ...) — this mirrors the layout of `public/images/`.
2. Run:

   ```sh
   npm run images:convert
   ```

This converts each file to `.webp` (quality 82, capped at 1600px, auto-rotated using EXIF orientation) and writes it to the matching path under `public/images/`. It's safe to rerun any time — already-converted files are skipped (compared by modified time). Pass `--force` to reconvert everything:

```sh
node scripts/convert-images.mjs --force
```

### Generating thumbnails

Creation cover images also need a small thumbnail variant (for grid/list tiles and the homepage marquee) so the full-size 1600px image isn't served at a 140–400px display size. Run this after converting new creation images:

```sh
npm run images:thumbnails
```

This reads every `.webp` in `public/images/creations/` and writes a ≤450px, quality-78 copy to `public/images/creations/thumbs/`. Also safe to rerun; use `--force` to regenerate everything:

```sh
node scripts/generate-thumbnails.mjs --force
```

**After adding new files to `public/`**, restart the dev server if it's already running — Astro/Vite caches the `public/` directory listing at startup:

```sh
npx astro dev stop
npx astro dev --background
```

### Font scripts

The handwriting fonts (the "Lili ..." families in `public/fonts/`) are hand-traced and exported from [Calligraphr](https://www.calligraphr.com/). Two Python scripts support that workflow. They only need to be run occasionally, when a font is updated or a new bold weight is needed.

**One-time setup:**

```sh
pip install -r scripts/requirements.txt
```

#### 1. Merging a split font export

Calligraphr caps uploads at 75 characters, so a font with more glyphs than that has to be drawn and exported in separate passes (e.g. letters in one pass, digits in another). To merge two exports into one font:

```sh
python scripts/merge-font-parts.py <base.otf> <extra.otf> <dst.otf>
```

- `base.otf` is kept as-is; `extra.otf` supplies any codepoints `base.otf` is missing (matched by Unicode codepoint).
- Both fonts must share the same `unitsPerEm`.
- Only simple (non-composite) glyphs are supported — fine for hand-traced fonts.
- After merging, move `dst.otf` over the real `public/fonts/<name>.otf` file and delete the now-redundant extra export from `public/fonts/`.
- If a bold weight already exists for the font, regenerate it (step 2) from the newly merged regular so it covers the same characters.

#### 2. Generating a bold weight

Calligraphr only exports the weight you drew (usually regular). To synthesize a bold weight instead of hand-drawing a second font:

```sh
python scripts/embolden-font.py <regular.otf> <bold-dst.otf> <width>
```

- `width` is in font units (these fonts use 1000 units/em); `55` reads as a natural bold without pinching the counters (the holes in letters like "o").
- Requires `pip install -r scripts/requirements.txt` (see above).

#### Verifying a font before wiring it up

Before adding a new/regenerated font file to `global.css`, sanity-check it:

```sh
python -c "
from fontTools.ttLib import TTFont
f = TTFont('public/fonts/<file>.otf')
print('chars:', len(f.getBestCmap()))
glyf = f['glyf']
bad = sum(1 for n in glyf.keys() if glyf[n].numberOfContours and glyf[n].numberOfContours>0 for fl in glyf[n].flags if fl & 0x80)
print('bad flag bits:', bad)
"
```

`bad flag bits` must be `0` — a nonzero count means browsers will silently reject the font (console shows `OTS parsing error: ... reserved bit 7 must be set to zero`) and fall back to the next font in the CSS stack.

Also check the actual file format, since Calligraphr sometimes exports TrueType data with a `.otf` extension:

```sh
file public/fonts/<name>.otf
```

The `@font-face` `format(...)` hint in `global.css` (`format("truetype")` vs `format("opentype")`) must match reality or some browsers refuse to load the file.

Restart the dev server after touching `public/fonts/` (same reason as above — Vite caches `public/` at startup).

## Deployment

`.github/workflows/deploy.yml` builds the site on every push to `main` and deploys `dist/` to GitHub Pages via `actions/deploy-pages`. Keep the `site` URL in `astro.config.mjs` in sync with the GitHub Pages URL.

## Learn more

- [Astro documentation](https://docs.astro.build)
- [Content collections guide](https://docs.astro.build/en/guides/content-collections/)
