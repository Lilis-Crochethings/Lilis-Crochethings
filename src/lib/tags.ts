import type { CollectionEntry } from "astro:content";

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
