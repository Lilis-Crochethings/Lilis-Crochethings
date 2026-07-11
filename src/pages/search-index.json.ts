import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getTagLabel } from "../lib/tags";
import type { SearchDoc } from "../lib/search";

export const prerender = true;

export const GET: APIRoute = async () => {
  const [patterns, creations, taxonomyEntry, typesEntry] = await Promise.all([
    getCollection("patterns"),
    getCollection("creations"),
    getCollection("tags"),
    getCollection("types"),
  ]);
  const taxonomy = taxonomyEntry[0].data.tags;
  const typesTaxonomy = typesEntry[0].data.types;

  const patternDocs: SearchDoc[] = patterns.map((pattern) => ({
    type: "pattern",
    href: `/patterns/${pattern.id}`,
    title: pattern.data.title,
    description: pattern.data.description,
    tags: (pattern.data.tags ?? []).map((id) => getTagLabel(id, taxonomy)),
    image: pattern.data.image,
    difficulty: pattern.data.difficulty,
  }));

  const creationDocs: SearchDoc[] = creations.map((creation) => {
    const patternGroups = creation.data.patterns ?? [];
    const typeLabels = [creation.data.type, ...(creation.data.subtypes ?? [])].map((id) => getTagLabel(id, typesTaxonomy));
    return {
      type: "creation",
      href: `/creations/${creation.id}`,
      title: creation.data.title,
      description: creation.data.description,
      tags: [...typeLabels, ...(creation.data.tags ?? []).map((id) => getTagLabel(id, taxonomy))],
      designer: patternGroups.map((g) => g.creator).filter((c) => c).join(", ") || undefined,
      patternName: patternGroups.flatMap((g) => g.items.map((i) => i.name)).join(", ") || undefined,
      image: creation.data.images[0],
      difficulty: creation.data.difficulty,
    };
  });

  const docs: SearchDoc[] = [...patternDocs, ...creationDocs];

  return new Response(JSON.stringify(docs), {
    headers: { "Content-Type": "application/json" },
  });
};
