---
name: font-handler
description: Use when handling handwriting-font assets in this repo (public/fonts/*.otf) - specifically when the user provides two Calligraphr exports of the same font to combine, or asks for a bold weight of an existing regular-only font. Wraps scripts/merge-font-parts.py and scripts/embolden-font.py.
---

# Font handler

This project's handwriting fonts (the "Lili ..." families in `public/fonts/`)
are hand-traced and exported from Calligraphr. Two recurring jobs come up:

## 1. Merging a split export

Calligraphr caps uploads at 75 characters, so a font with more glyphs than
that gets drawn and exported in multiple passes (e.g. letters in one pass,
digits in another). When the user hands you two export files for what is
meant to be a single font:

```
python scripts/merge-font-parts.py <base.otf> <extra.otf> <dst.otf>
```

- `base.otf` is the export to keep as-is; `extra.otf` supplies any codepoints
  `base.otf` is missing (matched by Unicode codepoint, not glyph name).
- Both fonts must share the same `unitsPerEm` (the script checks and errors
  if not).
- Only simple (non-composite) glyphs are supported - fine for hand-traced
  fonts, but the script raises if it hits a composite glyph.
- After merging: move `dst.otf` over the real `public/fonts/<name>.otf` path,
  and delete the now-redundant second export from `public/fonts/` - anything
  left in `public/` ships to production, so don't leave stray export files
  around.
- If a bold weight was already generated from the old (unmerged) regular,
  regenerate it from the new merged regular (step 2) so the bold weight
  covers the same characters.

## 2. Generating a bold weight

Calligraphr only exports the weight that was drawn (usually regular). To
synthesize a bold weight instead of hand-drawing a whole second font:

```
python scripts/embolden-font.py <regular.otf> <bold-dst.otf> <width>
```

- `width` is in font units (1000 units/em for these fonts); ~55 reads as a
  natural bold without pinching counters (the holes in letters like 'o').
- Requires `pip install fonttools skia-pathops`.
- The script already handles the cubic-to-quadratic conversion needed to
  keep the output a valid TrueType `glyf` table - don't bypass it by writing
  glyph data into `TTGlyphPen` any other way, and don't hand-patch the
  output afterward; if the compiled font is ever rejected by the browser,
  fix the pen/conversion step in the script rather than the binary.

## Verifying output before wiring it up

Before adding a new/regenerated font file to `global.css`, check it's
actually valid:

```
python -c "
from fontTools.ttLib import TTFont
f = TTFont('public/fonts/<file>.otf')
print('chars:', len(f.getBestCmap()))
glyf = f['glyf']
bad = sum(1 for n in glyf.keys() if glyf[n].numberOfContours and glyf[n].numberOfContours>0 for fl in glyf[n].flags if fl & 0x80)
print('bad flag bits:', bad)
"
```

`bad flag bits` must be 0 - a nonzero count means Chrome/Firefox's OTS
sanitizer will silently reject the font (console shows `OTS parsing error:
... reserved bit 7 must be set to zero`) and it'll fall back to the next
font in the CSS `font-family` list.

Also check the file's *actual* format with `file public/fonts/<name>.otf` -
Calligraphr sometimes exports plain TrueType data with a `.otf` extension.
The `@font-face` `src: url(...) format(...)` hint must match reality
(`format("truetype")` vs `format("opentype")`) or some browsers refuse to
load it even though the file itself is fine.

## After touching public/fonts/

The dev server does not pick up new or replaced files under `public/` once
it's already running (Astro/Vite caches the directory listing at startup).
Restart it after any add/replace:

```
astro dev stop
astro dev --background   # or: npm run astro -- dev --background
```
