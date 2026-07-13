import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

// Read every creation's images directly (astro:content isn't available yet
// at config-eval time) so the sitemap can list each creation page's photos
// explicitly for Google Images, rather than relying on it finding <img>
// tags while rendering the page. Keyed by slug (filename minus extension —
// same id astro:content's glob loader derives, and what /creations/<slug>
// pages already use).
const creationsDir = fileURLToPath(new URL('./src/content/creations/', import.meta.url));
const creationImages = new Map();
for (const file of readdirSync(creationsDir)) {
  if (!file.endsWith('.yaml')) continue;
  const slug = file.replace(/\.yaml$/, '');
  const data = parseYaml(readFileSync(new URL(file, `file://${creationsDir}`), 'utf-8'));
  if (Array.isArray(data.images)) creationImages.set(slug, data.images);
}

export default defineConfig({
  site: 'https://lilis-crochethings.github.io',
  output: 'static',
  integrations: [
    sitemap({
      serialize(item) {
        const match = item.url.match(/\/creations\/([^/]+)\/?$/);
        const images = match && creationImages.get(match[1]);
        if (!images?.length) return item;
        return { ...item, img: images.map((src) => ({ url: new URL(src, item.url).toString() })) };
      },
    }),
  ],
  build: {
    // The per-page CSS bundles are only 1-2KB — inlining them into <head>
    // avoids two extra render-blocking network round-trips per page.
    inlineStylesheets: 'always',
  },
});