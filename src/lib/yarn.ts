import type { CollectionEntry } from "astro:content";

type YarnLine = CollectionEntry<"yarns">["data"]["yarns"][number];

type CreationYarn = CollectionEntry<"creations">["data"]["yarn"] extends (infer T)[] | undefined ? T : never;
type InlineYarn = Exclude<CreationYarn, string>;

export type ResolvedYarn = {
  colorName: string;
  lineName: string;
  type?: string;
  image?: string;
  hex?: string;
  link?: string;
  description?: string;
};

function isInlineYarn(yarn: CreationYarn): yarn is InlineYarn {
  return typeof yarn !== "string";
}

function parseColorRef(ref: string): { name: string; number?: string } {
  const m = ref.match(/^(.*) \((\w+)\)$/);
  if (m) return { name: m[1], number: m[2] };
  return { name: ref };
}

export function resolveYarn(yarn: CreationYarn, lines: YarnLine[]): ResolvedYarn | null {
  if (isInlineYarn(yarn)) {
    return {
      colorName: yarn.name,
      lineName: "Unknown",
      type: yarn.type,
      hex: yarn.hex,
      description: yarn.description,
    };
  }

  const [linePart, colorPart] = yarn.split(" - ").map((s) => s.trim());

  if (colorPart) {
    // "id" is an internal lookup key used only to disambiguate lines that
    // share the same displayed "name" (e.g. several "Alison and Mae" lines).
    const line = lines.find((l) => (l.id ?? l.name) === linePart);
    if (!line) return null;

    const color = line.colors?.find((c) => c.name === colorPart);
    if (!color) return null;
    return {
      colorName: color.name,
      lineName: line.name,
      type: line.type,
      image: color.image,
      hex: color.hex,
      link: color.link ?? line.link,
    };
  }

  // Bare reference (no "Line - Color" separator): search every line's colors
  // for a match by name (+ optional trailing "(number)").
  const { name, number } = parseColorRef(linePart);
  for (const line of lines) {
    const color = line.colors?.find((c) => c.name === name && c.number === number);
    if (color) {
      return {
        colorName: number ? `${color.name} (${number})` : color.name,
        lineName: line.name,
        type: line.type,
        image: color.image,
        hex: color.hex,
        link: color.link ?? line.link,
      };
    }
  }

  // Fallback: a line with no colors at all, referenced directly by its own name.
  const line = lines.find((l) => (!l.colors || l.colors.length === 0) && (l.id ?? l.name) === linePart);
  if (line) {
    return { colorName: line.name, lineName: line.name, type: line.type, link: line.link };
  }

  return null;
}
