"""Merge glyphs from a supplementary Calligraphr export into a base font.

Calligraphr caps uploads at 75 characters, so a font with more glyphs than
that has to be drawn and exported in separate passes (e.g. letters in one
pass, digits in another). Each pass re-exports the whole template, so most
glyphs are duplicated across exports with identical outlines - only the
newly-drawn characters differ. This script copies the glyphs that exist in
`extra.otf` but not in `base.otf` (matched by Unicode codepoint) into
`base.otf`, producing a single font with the union of both exports.

Requires: pip install fonttools

Usage:
    python scripts/merge-font-parts.py <base.otf> <extra.otf> <dst.otf>

  Both fonts must share the same unitsPerEm. Only simple (non-composite)
  glyphs are supported, which covers hand-traced Calligraphr fonts.
"""
import sys
from fontTools.ttLib import TTFont


def glyph_name_for(cp, existing_names):
    name = f"uni{cp:04X}"
    if name not in existing_names:
        return name
    i = 1
    while f"{name}.alt{i}" in existing_names:
        i += 1
    return f"{name}.alt{i}"


def merge_fonts(base_path, extra_path, dst_path):
    base = TTFont(base_path)
    extra = TTFont(extra_path)

    if base["head"].unitsPerEm != extra["head"].unitsPerEm:
        raise SystemExit(
            f"unitsPerEm mismatch: {base_path} = {base['head'].unitsPerEm}, "
            f"{extra_path} = {extra['head'].unitsPerEm}"
        )

    base_cmap = base.getBestCmap()
    extra_cmap = extra.getBestCmap()
    missing = sorted(set(extra_cmap) - set(base_cmap))
    if not missing:
        print("Nothing to merge: base already covers every codepoint in extra.")
        return

    existing_names = set(base.getGlyphOrder())
    glyf_base = base["glyf"]
    glyf_extra = extra["glyf"]
    hmtx_base = base["hmtx"]
    hmtx_extra = extra["hmtx"]

    added = []
    for cp in missing:
        src_name = extra_cmap[cp]
        src_glyph = glyf_extra[src_name]
        if src_glyph.isComposite():
            raise SystemExit(
                f"glyph {src_name!r} (U+{cp:04X}) is composite; this script "
                "only supports simple glyphs"
            )

        new_name = glyph_name_for(cp, existing_names)
        existing_names.add(new_name)

        # __setitem__ appends new_name to glyf_base's own glyphOrder list,
        # so the glyph order stays consistent without touching it directly.
        glyf_base[new_name] = src_glyph
        hmtx_base[new_name] = hmtx_extra[src_name]
        added.append((cp, new_name))

    base.setGlyphOrder(glyf_base.glyphOrder)
    base["maxp"].numGlyphs = len(glyf_base.glyphOrder)

    for cp, new_name in added:
        for subtable in base["cmap"].tables:
            if subtable.isUnicode():
                subtable.cmap[cp] = new_name

    for cp, new_name in added:
        glyf_base[new_name].recalcBounds(glyf_base)

    base.save(dst_path)
    chars = "".join(chr(cp) for cp, _ in added)
    print(f"Merged {len(added)} glyph(s) from {extra_path} -> {dst_path}: {chars!r}")


if __name__ == "__main__":
    base_path, extra_path, dst_path = sys.argv[1], sys.argv[2], sys.argv[3]
    merge_fonts(base_path, extra_path, dst_path)
