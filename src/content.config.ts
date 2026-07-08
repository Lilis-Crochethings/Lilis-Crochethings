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

// A second (or third) pattern credit — e.g. the main amigurumi pattern plus
// a separate pattern used just for the eyes, each by a different designer.
const additionalPattern = z.object({
  creator: z.string().optional(),
  creatorLink: z.string().optional(),
  patternName: z.string().optional(),
  patternLink: z.string().optional(),
});

const creations = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/creations" }),
  schema: z.object({
    title: z.string(),
    images: z.array(z.string()).min(1),
    description: z.string(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    date: z.date().optional(),
    instagramLink: z.string().optional(),
    facebookLink: z.string().optional(),
    pinterestLink: z.string().optional(),
    hoursSpent: z.number().optional(),
    hookSize: z.string().optional(),
    yarn: z.array(z.union([z.string(), inlineYarn])).optional(),
    creator: z.string().optional(),
    creatorLink: z.string().optional(),
    patternName: z.string().optional(),
    patternLink: z.string().optional(),
    additionalPatterns: z.array(additionalPattern).optional(),
    tags: z.array(tagId).optional(),
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
  general
};