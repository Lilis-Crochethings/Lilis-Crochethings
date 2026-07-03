"""Generate a bold variant of a handwriting font by expanding stroke width.

Technique: for each glyph outline, stroke the boundary curve with a given
width and union it with the original filled shape. Since the stroke band
extends half the width to both sides of the boundary, unioning it with the
existing fill grows ("dilates") the glyph outward by width/2 on every edge,
which is the vector equivalent of a thicker brush stroke.

Requires: pip install fonttools skia-pathops

Usage:
    python scripts/embolden-font.py <src.otf> <dst.otf> <width>

  width is in font units (these fonts use 1000 units/em). ~55 reads as a
  natural bold for these handwriting fonts without pinching the counters
  (the holes in letters like 'o' and 'a').
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.qu2cuPen import Qu2CuPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
import pathops


def to_cubic_path(draw_source, max_err=1.0):
    path = pathops.Path()
    pen = path.getPen()
    q2c = Qu2CuPen(pen, max_err=max_err)
    draw_source(q2c)
    return path


def embolden_glyph(glyph, width):
    path = to_cubic_path(glyph.draw)
    if not list(path.contours):
        return None

    stroke_path = pathops.Path(path)
    stroke_path.stroke(
        width,
        pathops.LineCap.ROUND_CAP,
        pathops.LineJoin.ROUND_JOIN,
        4.0,
    )
    stroke_path.convertConicsToQuads()
    stroke_cubic = to_cubic_path(stroke_path.draw)

    result = pathops.op(path, stroke_cubic, pathops.PathOp.UNION)
    result.simplify()
    return result


def embolden_font(src_path, dst_path, width, subfamily="Bold"):
    font = TTFont(src_path)
    glyph_order = font.getGlyphOrder()
    glyf_table = font["glyf"]
    glyph_set = font.getGlyphSet()

    changed = 0
    for name in glyph_order:
        result = embolden_glyph(glyph_set[name], width)
        if result is None:
            continue

        ttpen = TTGlyphPen(glyph_set)
        # pathops returns cubic outlines; glyf only stores quadratic curves,
        # so convert on the way in. Feeding cubics to TTGlyphPen directly
        # leaves its internal flagCubic bookkeeping bit (0x80) in the
        # compiled glyf flags, which browsers' OTS sanitizer rejects as an
        # invalid reserved bit.
        cu2qu_pen = Cu2QuPen(ttpen, max_err=1.0, all_quadratic=True)
        result.draw(cu2qu_pen)
        glyf_table[name] = ttpen.glyph()
        changed += 1

    glyf_table.compile(font)
    font["maxp"].numGlyphs = len(glyph_order)
    for name in glyph_order:
        glyf_table[name].recalcBounds(glyf_table)

    # bump OS/2 + head + name metadata so the browser treats this file as
    # the bold weight of the same font family (lets `font-weight: bold`
    # pick it up automatically via a matching @font-face rule)
    os2 = font["OS/2"]
    os2.usWeightClass = 700
    os2.fsSelection = (os2.fsSelection & ~0x40) | 0x20  # clear REGULAR, set BOLD
    font["head"].macStyle |= 0x1  # bold bit

    name_table = font["name"]
    family = name_table.getDebugName(1) or "Font"
    for rec in name_table.names:
        if rec.nameID == 2:
            rec.string = subfamily.encode(rec.getEncoding())
        elif rec.nameID == 4:
            rec.string = f"{family} {subfamily}".encode(rec.getEncoding())
        elif rec.nameID == 6:
            rec.string = f"{family.replace(' ', '')}-{subfamily}".encode(rec.getEncoding())

    font.save(dst_path)
    print(f"Emboldened {changed}/{len(glyph_order)} glyphs -> {dst_path}")


if __name__ == "__main__":
    src, dst, width = sys.argv[1], sys.argv[2], float(sys.argv[3])
    embolden_font(src, dst, width)
