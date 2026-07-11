import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from 'astro/zod'
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

// Read the tag taxonomy synchronously so its ids can back a Zod enum below —
// this is what turns a typo'd tag in a creation/pattern file into a build error
// instead of a silently-ignored filter.
const tagsYamlPath = fileURLToPath(new URL("./content/tags.yaml", import.meta.url));
const tagsYaml = parseYaml(readFileSync(tagsYamlPath, "utf-8")) as {
  tags: { id: string; children?: { id: string }[] }[];
};
const TAG_IDS = tagsYaml.tags.flatMap((category) => [
  category.id,
  ...(category.children?.map((child) => child.id) ?? []),
]);
if (TAG_IDS.length === 0) {
  throw new Error("src/content/tags.yaml must define at least one tag");
}
const tagId = z.enum(TAG_IDS as [string, ...string[]]);

// Same idea as tags.yaml above, but for the crochet/embroidery type taxonomy —
// kept as a separate file so "type" (crochet vs. embroidery) stays distinct
// from subject-matter tags (animal, pokemon, ...) rather than living
// alongside them.
const typesYamlPath = fileURLToPath(new URL("./content/types.yaml", import.meta.url));
const typesYaml = parseYaml(readFileSync(typesYamlPath, "utf-8")) as {
  types: { id: string; children?: { id: string }[] }[];
};
const TYPE_IDS = typesYaml.types.map((type) => type.id);
if (TYPE_IDS.length === 0) {
  throw new Error("src/content/types.yaml must define at least one type");
}
const typeId = z.enum(TYPE_IDS as [string, ...string[]]);

const SUBTYPE_IDS = typesYaml.types.flatMap((type) => type.children?.map((child) => child.id) ?? []);
const subtypeId = z.enum(SUBTYPE_IDS as [string, ...string[]]);

// Which type a subtype belongs to, so a creation can't pair e.g. a
// "cross-stitch" subtype with the "crochet" type.
const SUBTYPE_PARENT = new Map<string, string>(
  typesYaml.types.flatMap((type) => (type.children ?? []).map((child) => [child.id, type.id] as const))
);

// General color categories a creation is made in (white/black/red/...) — a
// separate field from tags entirely (not shown as chips, just filterable
// data), so it's read the same way as tags/types above but backs its own
// enum rather than feeding into tagId.
const colorsYamlPath = fileURLToPath(new URL("./content/colors.yaml", import.meta.url));
const colorsYaml = parseYaml(readFileSync(colorsYamlPath, "utf-8")) as {
  colors: { id: string }[];
};
const COLOR_IDS = colorsYaml.colors.map((color) => color.id);
if (COLOR_IDS.length === 0) {
  throw new Error("src/content/colors.yaml must define at least one color");
}
const colorId = z.enum(COLOR_IDS as [string, ...string[]]);

// Which yarn material a creation was made with (chenille/cotton/acrylic/...) —
// filter-only data like colors above: read the same way, but never rendered
// as a chip on cards.
const yarnTypesYamlPath = fileURLToPath(new URL("./content/yarn-types.yaml", import.meta.url));
const yarnTypesYaml = parseYaml(readFileSync(yarnTypesYamlPath, "utf-8")) as {
  yarnTypes: { id: string }[];
};
const YARN_TYPE_IDS = yarnTypesYaml.yarnTypes.map((yarnType) => yarnType.id);
if (YARN_TYPE_IDS.length === 0) {
  throw new Error("src/content/yarn-types.yaml must define at least one yarn type");
}
const yarnTypeId = z.enum(YARN_TYPE_IDS as [string, ...string[]]);

const general = defineCollection({
  loader: glob({ pattern: "general.md", base: "./src/content" }),
  schema: z.object({
    name: z.string()
  }),
});

const patterns = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/patterns" }),
  schema: z.object({
    title: z.string(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    image: z.string(),
    description: z.string().optional(),
    yarn: z.string().optional(),
    hookSize: z.string().optional(),
    tags: z.array(tagId).optional(),
  }),
});

const inlineYarn = z.object({
  hex: z.string(),
  name: z.string(),
  type: z.string().optional(),
  description: z.string().optional(),
});

// Which brand icon to show next to a pattern link; falls back to a generic
// globe icon (via the "website" value) for designers' own sites.
const patternPlatform = z.enum(["etsy", "youtube", "instagram", "pinterest", "facebook", "website", "tiktok"]);

// A single named pattern (e.g. "Part 1", "Part 2", or a separate pattern
// used just for the eyes) belonging to one designer credit below.
const patternItem = z.object({
  name: z.string(),
  link: z.string().optional(),
  platform: patternPlatform.optional(),
});

// One designer credit, grouping every pattern/part sourced from them so the
// same creator never has to be repeated (e.g. a multi-part tutorial from a
// single designer, plus a separate designer credited for just the eyes).
const patternGroup = z.object({
  creator: z.string().optional(),
  creatorLink: z.string().optional(),
  items: z.array(patternItem).min(1),
});

const creations = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/creations" }),
  schema: z.object({
    title: z.string(),
    images: z.array(z.string()).min(1),
    description: z.string(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    type: typeId,
    subtypes: z.array(subtypeId).optional(),
    colors: z.array(colorId).optional(),
    yarnTypes: z.array(yarnTypeId).optional(),
    date: z.date().optional(),
    instagramLink: z.string().optional(),
    facebookLink: z.string().optional(),
    pinterestLink: z.string().optional(),
    hoursSpent: z.number().optional(),
    hookSize: z.string().optional(),
    yarn: z.array(z.union([z.string(), inlineYarn])).optional(),
    patterns: z.array(patternGroup).optional(),
    tags: z.array(tagId).optional(),
  }).superRefine((data, ctx) => {
    for (const subtype of data.subtypes ?? []) {
      if (SUBTYPE_PARENT.get(subtype) !== data.type) {
        ctx.addIssue({
          code: "custom",
          path: ["subtypes"],
          message: `Subtype "${subtype}" belongs to type "${SUBTYPE_PARENT.get(subtype)}", not "${data.type}"`,
        });
      }
    }
  }),
});

const tagNode = z.object({
  id: z.string(),
  label: z.string(),
  image: z.string().optional(),
  color: z.string().optional(),
});

const tagCategory = z.object({
  id: z.string(),
  label: z.string(),
  image: z.string().optional(),
  color: z.string().optional(),
  children: z.array(tagNode).optional(),
});

const tags = defineCollection({
  loader: glob({ pattern: "tags.yaml", base: "./src/content" }),
  schema: z.object({
    tags: z.array(tagCategory),
  }),
});

// Same shape as tags.yaml (category + children) — reused here so the
// crochet/embroidery type taxonomy renders through the same TagChip/filter
// UI as regular tags, while staying data-separate from src/content/tags.yaml.
const types = defineCollection({
  loader: glob({ pattern: "types.yaml", base: "./src/content" }),
  schema: z.object({
    types: z.array(tagCategory),
  }),
});

const colorNode = z.object({
  id: z.string(),
  label: z.string(),
  hex: z.string(),
});

const colors = defineCollection({
  loader: glob({ pattern: "colors.yaml", base: "./src/content" }),
  schema: z.object({
    colors: z.array(colorNode),
  }),
});

const yarnTypeNode = z.object({
  id: z.string(),
  label: z.string(),
});

const yarnTypesCollection = defineCollection({
  loader: glob({ pattern: "yarn-types.yaml", base: "./src/content" }),
  schema: z.object({
    yarnTypes: z.array(yarnTypeNode),
  }),
});

const yarnLine = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.string().optional(),
  link: z.string().optional(),
  hookSize: z.string().optional(),
  colors: z.array(z.object({
    number: z.string().optional(),
    name: z.string(),
    link: z.string().optional(),
    image: z.string().optional(),
    hex: z.string().optional(),
  })).optional(),
});

const yarns = defineCollection({
  loader: glob({ pattern: "yarns.yaml", base: "./src/content" }),
  schema: z.object({
    yarns: z.array(yarnLine),
  }),
});

export const collections = {
  patterns,
  creations,
  yarns,
  tags,
  types,
  colors,
  yarnTypes: yarnTypesCollection,
  general
};