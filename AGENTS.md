# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A static Astro site for Lili's Crochethings (a crochet hobby/business showcase), built with Astro 7 in static output mode and deployed to GitHub Pages.

## Commands

- `npm run dev` — start the dev server (localhost:4321)
- `npm run build` — build the production site to `./dist/`
- `npm run preview` — preview the production build locally
- `npm run astro -- check` — type-check `.astro` files against the strict Astro tsconfig
- `npm run astro -- <cmd>` — run any other Astro CLI command (e.g. `astro add`)

When starting the dev server, use background mode: `astro dev --background`. Manage it with `astro dev stop`, `astro dev status`, and `astro dev logs`.

There is no test suite or linter configured in this repo.

## Architecture

### Content collections

Content lives in `src/content/` and is defined/typed in `src/content.config.ts` using Astro's `glob` loader with Zod schemas:

- **`general`** — a singleton doc (`src/content/general.md`) with site-wide metadata (currently just `name`). Read by `Navbar.astro` for the logo/site name.
- **`creations`** — one Markdown file per finished project (`src/content/creations/*.md`), schema: `title`, `image`, `description`, `date?`. Listed at `/creations` and rendered individually at `/creations/[slug]` via `getStaticPaths`.
- **`patterns`** — schema exists (`title`, `difficulty`, `image`, `yarn?`, `hookSize?`, `tags?`) but `src/content/patterns/` has no content files yet, and `src/pages/patterns.astro` is still a static placeholder — it does not query the collection yet.

### Pages and layout

Routing is file-based under `src/pages/`. Every page wraps its content in `src/layouts/BaseLayout.astro`, which renders the shared `<html>` shell, imports `src/styles/global.css`, and includes `Navbar.astro`.

### Components

- `src/components/main/` — home page cards (`AboutCard`, `CreationsCard`, `PatternsCard`) that link out to `/about`, `/creations`, `/patterns`.
- `src/components/creations/CreationCard.astro` — a detail-card component whose props (`difficulty`, `creation.slug`) match the *patterns* schema rather than the current *creations* schema, and it isn't referenced from any page yet. Reconcile this against whichever collection it's meant for before using it.
- `Navbar.astro` includes its own mobile hamburger toggle script and scoped styles.

### Styling

Plain CSS, no framework. Global theme variables (`--primary`, `--background`, `--text`, `--accent`) live in `src/styles/global.css`; individual components use Astro scoped `<style>` blocks.

## Deployment

`.github/workflows/deploy.yml` builds on every push to `main` and deploys `dist/` to GitHub Pages via `actions/deploy-pages`. The `site` URL in `astro.config.mjs` must stay in sync with the GitHub Pages URL.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
