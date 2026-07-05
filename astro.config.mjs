import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://lilis-crochethings.github.io',
  output: 'static',
  integrations: [sitemap()],
});