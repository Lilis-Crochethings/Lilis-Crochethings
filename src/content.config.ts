import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from 'astro/zod'

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
    yarn: z.string().optional(),
    hookSize: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const creations = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/creations" }),
  schema: z.object({
    title: z.string(),
    image: z.string(),
    description: z.string(),
    date: z.date().optional(),
  }),
});

export const collections = {
  patterns,
  creations,
  general
};