import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getTagLabel } from "../lib/tags";
import type { SearchDoc } from "../lib/search";

export const prerender = true;

export const GET: APIRoute = async () => {
  const [patterns, creations, taxonomyEntry] = await Promise.all([
    getCollection("patterns"),
    getCollection("creations"),
    getCollection("tags"),
  ]);
  const taxonomy = taxonomyEntry[0].data.tags;

  const patternDocs: SearchDoc[] = patterns.map((pattern) => ({
    type: "pattern",
    href: `/patterns/${pattern.id}`,
    title: pattern.data.title,
    description: pattern.data.description,
    tags: (pattern.data.tags ?? []).map((id) => getTagLabel(id, taxonomy)),
    image: pattern.data.image,
    difficulty: pattern.data.difficulty,
  }));

  const creationDocs: SearchDoc[] = creations.map((creation) => ({
    type: "creation",
    href: `/creations/${creation.id}`,
    title: creation.data.title,
    description: creation.data.description,
    tags: (creation.data.tags ?? []).map((id) => getTagLabel(id, taxonomy)),
    designer: creation.data.creator,
    patternName: creation.data.patternName,
    image: creation.data.images[0],
    difficulty: creation.data.difficulty,
  }));

  const docs: SearchDoc[] = [...patternDocs, ...creationDocs];

  return new Response(JSON.stringify(docs), {
    headers: { "Content-Type": "application/json" },
  });
};
