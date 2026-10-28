# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal blog and portfolio site for Tripp Horbinski (https://horbin.ski). Built with Next.js 16, React 19, and Tailwind CSS. Minimal, text-forward design — single-column centered layout with dark mode support. Covers two content categories: **tech** and **running**.

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Build static export (outputs to `out/`)
- `npm run lint` — Run ESLint

No test framework is configured.

## Deployment

Static export deployed to GitHub Pages via GitHub Actions (`.github/workflows/nextjs.yml`). Pushes to `main` trigger automatic deployment. The site uses `output: 'export'` with `trailingSlash: true` and unoptimized images (required for static hosting).

## Architecture

### Blog Content System

Blog posts are Markdown files in `src/content/posts/`. The `src/lib/posts.ts` module reads them at build time using `gray-matter` for frontmatter parsing and `remark`/`remark-html` for rendering. Posts have two categories: `'tech'` or `'running'`.

Post frontmatter format:
```yaml
title: "Post Title"
date: "2024-11-20"
excerpt: "Short description"
category: "tech"       # or "running"
tags: ["Tag1", "Tag2"]
featured: true         # optional
```

### Routing

- `/` — The meadow (see Meadow below)
- `/projects/` — Portfolio: Esker and puppe.rs
- `/writing/` — All posts as a title-only list
- `/writing/[slug]/` — Individual post (uses `generateStaticParams`)
- `/about/` — Tripp's portrait and bio; clicking him in the meadow goes here
- `/meadow/` — Redirects to `/`

### Layout Architecture

`RootLayout` (`src/app/layout.tsx`) provides a centered single-column layout (`max-w-2xl mx-auto px-6`). Inline nav at top: site name (left), "writing" link + `ThemeToggle` (right). Footer at bottom.

### Dark Mode

`ThemeToggle` (`src/components/ThemeToggle.tsx`) is a client component that toggles the `dark` class on `<html>` and persists to `localStorage`. An inline `<script>` in `<head>` prevents FOUC by reading `localStorage` / system preference before paint. `<html>` uses `suppressHydrationWarning`.

Design tokens are CSS custom properties (`:root` / `.dark`) in `globals.css`. Tailwind is configured with `darkMode: 'class'`.

### Styling

Tailwind CSS 3 with `@tailwindcss/typography` plugin. Design tokens are CSS custom properties (`--bg`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border`, `--code-bg`, `--accent`) with light/dark variants in `globals.css`. Fonts: Inter (sans) and JetBrains Mono (mono), loaded via Google Fonts. Prose styles defined in `globals.css` `@layer components`.

### Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

### Meadow (`/`)

The homepage is an interactive canvas scene of the Flatirons from Chautauqua Meadow (`src/components/Meadow.tsx`, engine in `src/lib/meadow/`). The mountain is generated, not hand-drawn: `src/lib/meadow/terrain.ts` comes from USGS 3DEP lidar and NAIP imagery via the build-time scripts in `scripts/meadow/` (`npm run meadow:fetch` once to download into the gitignored `.cache`, then `npm run meadow:render`). Each rock/forest area carries its surface normal, so the engine lights it from the real sun position (`suncalc`) for any hour. The rolling meadow hills, the line where the near grass begins, and every tree between the meadow and the mountain come from the same data: trees are placed where the aerial imagery shows canopy, sized by how dense it is, and cast shadows from the real sun. `npm run meadow:trace -- photo.jpg` traces a photo into the same format, and `npm run meadow:calibrate` fits the lidar camera to a photo's skyline. Only trace photos you have rights to.

Tripp is a feature too: the engine picks him out by his traced outline (`onRunner`), and clicking him opens `/about/`, with a keyboard-focusable link laid over him.

The runner figure on `/me/` (`src/components/RunnerPortrait.tsx`, drawn by `src/lib/meadow/runner.ts`) is a screen print of Tripp traced from his 2024 Lakefront Marathon finish photo: `npm run meadow:runner -- finish.jpg` cuts him out with Apple's Vision framework (`scripts/meadow/segment.swift`, macOS only), repairs what the photo hides (his friend's hand, his arm behind his friend, his feet below the frame, the top of his cap, his watch face), poses that free arm in a shaka (upper arm at his side, forearm opened out and down) as thick as his other arm, matches his shaded legs to his arms, and takes off the bib, medal and lanyard and reprints his La Sportiva singlet's design whole beneath them, all placed in that photo's pixels, then separates flat inks and traces them with potrace into the generated `src/lib/meadow/runner-art.ts`. His shoes are Hoka Clifton 11s, a simple 3D model projected onto his ankles. They print in tan (ATPS) with their inks tagged, and `drawRunner` takes the colorway: tan on `/me/`, white in the meadow. In the meadow he stands on the trail at `RUNNER_SPOT` (`scene.ts`), sized so his eyes sit on the horizon, with the grass in front of him drawn over him the way it is over the trail post.

### SEO

- Structured data (JSON-LD) via `src/lib/structured-data.ts`
- RSS feed at `/feed.xml` (route handler)
- Sitemap and robots.txt generated by Next.js (`src/app/sitemap.ts`, `src/app/robots.ts`)
- OpenGraph image generation (`src/app/opengraph-image.tsx`)
