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

const inlineYarn = z.object({
  hex: z.string(),
  name: z.string(),
  type: z.string().optional(),
  description: z.string().optional(),
});

const creations = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/creations" }),
  schema: z.object({
    title: z.string(),
    type: z.enum(["crochet", "embroidery"]),
    images: z.array(z.string()).min(1),
    description: z.string(),
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
  general
};