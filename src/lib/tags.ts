import type { CollectionEntry } from "astro:content";
import type { TagChipData } from "./chips";

export type TagCategory = CollectionEntry<"tags">["data"]["tags"][number];

export function getEffectiveTags(tags: string[] | undefined, taxonomy: TagCategory[]): string[] {
  const effective: string[] = [];
  const seen = new Set<string>();
  const addTag = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    effective.push(id);
  };

  for (const tag of tags ?? []) {
    const parent = taxonomy.find((category) => category.children?.some((child) => child.id === tag));
    if (parent) addTag(parent.id);
    addTag(tag);
  }
  return effective;
}

export function findTag(id: string, taxonomy: TagCategory[]) {
  for (const category of taxonomy) {
    if (category.id === id) return category;
    const child = category.children?.find((c) => c.id === id);
    if (child) return child;
  }
  return undefined;
}

export function getTagLabel(id: string, taxonomy: TagCategory[]): string {
  return findTag(id, taxonomy)?.label ?? id;
}

// Resolves a tag/type id to everything its chip needs to render (label plus
// icon/color, when the taxonomy entry has them) — the same lookup TagChip.astro
// does, exposed here so anywhere that builds chip data ahead of render time
// (e.g. the search index, gallery item data) uses the identical resolution.
export function getTagChipData(id: string, taxonomy: TagCategory[]): TagChipData {
  const tag = findTag(id, taxonomy);
  return { label: tag?.label ?? id, icon: tag?.image, color: tag?.color };
}

// Builds descriptive image alt text like "Cross-stitched Bloom" or "Amigurumi
// Espeon" instead of a bare title — prefers the most specific subtype's
// adjective (e.g. "Amigurumi" over its parent "Crocheted"), falling back to
// the top-level type.
export function getCreationAlt(
  title: string,
  type: string | undefined,
  subtypes: string[] | undefined,
  typesTaxonomy: TagCategory[],
): string {
  const id = subtypes?.[0] ?? type;
  const adjective = id ? findTag(id, typesTaxonomy)?.adjective : undefined;
  return adjective ? `${adjective} ${title}` : title;
}
