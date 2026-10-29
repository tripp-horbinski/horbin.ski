# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal blog and portfolio site for Tripp Horbinski (https://tripp.horbin.ski; `SITE_URL` in `src/lib/site.ts`). Built with Next.js 16, React 19, and Tailwind CSS. Minimal, text-forward design — single-column centered layout with dark mode support. Covers two content categories: **tech** and **running**.

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Build static export (outputs to `out/`)
- `npm run lint` — Run ESLint
- `npm run resume:pdf` — Print `/resume/` to `public/tripp-horbinski-resume.pdf` (needs the dev server running); run it whenever `src/content/career.ts` changes

No test framework is configured.

## Deployment

Static export deployed to GitHub Pages via GitHub Actions (`.github/workflows/nextjs.yml`). Pushes to `main` trigger automatic deployment. The site uses `output: 'export'` with `trailingSlash: true` and unoptimized images (required for static hosting).

## Architecture

### Blog Content System

Writing is off the site for now: its routes (the post list, the posts and the RSS feed) are in `src/app/_writing/`, a private folder Next doesn't serve, and nothing links to them. Move them back up into `src/app/` (`writing/` and `feed.xml/`) and restore the nav, sitemap and meadow trail links to bring them back.

Blog posts are Markdown files in `src/content/posts/`. The `src/lib/posts.ts` module reads them at build time using `gray-matter` for frontmatter parsing and `remark`/`remark-html` for rendering. Posts have two categories: `'tech'` or `'running'`.

Post frontmatter format:
```yaml
title: "Post Title"
date: "2024-11-20"
excerpt: "Short description"
category: "tech"       # or "running"
tags: ["Tag1", "Tag2"]
featured: true         # optional
map: "parnell"         # optional: a place from src/lib/maps.ts to head the post
draft: true            # optional: shows on the dev server only, left out of builds
```

A post's images go in `public/posts/<slug>/`.

### Routing

- `/` — The meadow (see Meadow below)
- `/career/` — Tripp's resume under a timeline of his career (see Career below); the meadow's trail leads here. `/resume/` redirects here
- `/projects/` — Portfolio: this site (the meadow, the maps and the prints), Esker and puppe.rs, under the Parnell segment map
- `/resume/` — Redirects to `/career/`. `src/content/career.ts` is the one source for the Career page and its PDF, from his own resume: each role's `highlights` are its bullets as he wrote them, and `impact` the numbers pulled from them, so change both together. The page prints to Letter (the print styles in `globals.css`), and its Download PDF link is that print, `RESUME_PDF` in `src/lib/site.ts`, which leaves off the phone number his own PDF carries
- `/writing/` and `/writing/[slug]/` — off the site for now (see Blog Content System): all posts as waypoints beside the whole Ice Age Trail, and each post
- `/stack/` — What Tripp carries at the desk and on the trail, as a backpacker's pack list (`src/content/stack.ts`), under Green Mountain's map. It's unlisted until its gear list is real: out of the nav and sitemap, marked noindex, and not linked from Backpacking; put it back in all three when it's ready. `/stack/tripp.svg` is a route handler that serves his finish-line print as a static SVG for its numbered callouts
- `/backpacking/` — Tripp on the trail with his pack, linked from About: the Ice Age Trail at home, and the Arctic Circle Trail as he walked it (see below). It has no page map; it opens on his figure, served by `/backpacking/tripp.svg`, framed with its shadow by `src/lib/meadow/hiker-print.ts`
- `/about/` — Tripp in his gold AWS Certified jacket, what he builds, his certifications, and how to reach him (email, LinkedIn, GitHub: `EMAIL`, `LINKEDIN`, `GITHUB` in `src/lib/site.ts`), under the Milwaukee lakefront map, where he lives; clicking him in the meadow goes here. It carries his `Person` structured data. `/about/tripp.svg` serves his figure, framed by `src/lib/meadow/jacket-print.ts`, the same way `/stack/tripp.svg` serves the runner
- `/meadow/` — Redirects to `/`
- 404 (`not-found.tsx`) — Off the map, in the Driftless Area

### Layout Architecture

`RootLayout` (`src/app/layout.tsx`) provides a centered single-column layout (`max-w-xl mx-auto px-4`), the `ThemeToggle` fixed at the bottom right, and the footer, `ElevationProfile`: the climb from Chautauqua Meadow to Green Mountain's summit. The meadow covers all of it on `/`. Every other page starts with `SheetNav` (site name, then About, Career and Projects; Backpacking is linked from About) and, mostly, a `MapSheet` (see Page maps below).

### Dark Mode

`ThemeToggle` (`src/components/ThemeToggle.tsx`) is a client component that toggles the `dark` class on `<html>` and persists to `localStorage`. An inline `<script>` in `<head>` prevents FOUC by reading `localStorage` / system preference before paint. `<html>` uses `suppressHydrationWarning`.

Design tokens are CSS custom properties (`:root` / `.dark`) in `globals.css`. Tailwind is configured with `darkMode: 'class'`.

### Styling

Tailwind CSS 3 with `@tailwindcss/typography` plugin. Design tokens are CSS custom properties (`--bg`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border`, `--code-bg`, `--accent`, and the map inks `--contour`, `--lake`, `--neatline`) with light/dark variants in `globals.css`. Fonts: Josefin Sans (headings and labels), Lora (body) and JetBrains Mono (figures and map collars), loaded via Google Fonts. Prose and component styles are in `globals.css` `@layer components`; Tailwind drops any class there it can't find written out in the source, so components name such classes in full (see the `INK` maps in `MapSheet` and the Stack page) instead of building them from variables.

### Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

### Meadow (`/`)

The homepage is an interactive canvas scene of the Flatirons from Chautauqua Meadow (`src/components/Meadow.tsx`, engine in `src/lib/meadow/`). The mountain is generated, not hand-drawn: `src/lib/meadow/terrain.ts` comes from USGS 3DEP lidar and NAIP imagery via the build-time scripts in `scripts/meadow/` (`npm run meadow:fetch` once to download into the gitignored `.cache`, then `npm run meadow:render`). Each rock/forest area carries its surface normal, so the engine lights it from the real sun position (`suncalc`) for any hour. The rolling meadow hills, the line where the near grass begins, and every tree between the meadow and the mountain come from the same data: trees are placed where the aerial imagery shows canopy, sized by how dense it is, and cast shadows from the real sun. `npm run meadow:trace -- photo.jpg` traces a photo into the same format, and `npm run meadow:calibrate` fits the lidar camera to a photo's skyline. Only trace photos you have rights to.

Following the trail opens `/career/`. Tripp is a feature too: the engine picks him out by his traced outline (`onRunner`), and clicking him opens `/about/`, with a keyboard-focusable link laid over him. A soft white glow pulses round him (`GLOW`, `GLOW_PERIOD` in `engine.ts`) so he reads as something to click: his silhouette blurred once per resize, drawn under him each frame at a breathing opacity, brightest while he's pointed at, steady for reduced motion and dimmer at night.

### Career (`/career/`)

Tripp's resume, with his career on one line over it. `src/app/career/page.tsx` renders `src/content/career.ts`: his name and contact, the summary, then `CareerTimeline` (`src/components/CareerTimeline.tsx`), a line across 2014–2026 with a bar for school and each role at its real length (`start` and `end` months) and a gold diamond for the Golden Jacket, pinned at the top of the screen while the page scrolls normally under it. The role being read lights up on it (the last section whose top has passed two fifths of the way down the screen), and each bar scrolls to its section. Below it, each role leads with its color, how long he was there, and its `impact`: the numbers from its bullets, set large. Then the bullets as he wrote them, certifications, skills and education. On paper the timeline, the impact figures and the nav drop out and it's his resume, which `npm run resume:pdf` prints to the Download PDF. `/resume/` redirects here.

### Arctic Circle Trail (on `/backpacking/`)

The Backpacking page's trip report: the 167 km Tripp walked across West Greenland from Kangerlussuaq to Sisimiut in August 2025, from his watch's GPS track. `src/components/TripMap.tsx` is a map of it with a tab for the start and each of his eight days, Prev/Next and the left and right keys, the camps on the map, and the ground's height along the whole trail, which can be dragged along to walk anywhere. Picking a day walks a hiker along the real track to that night's camp, the map closing in on him; the start and the last day, into Sisimiut, pull back out on the whole trail. Under it, the day: from where to where, its distance, climb and hours from his watch, and where he spent the night. The masks are drawn once at the close scale and zoomed by transform; the route, labels and camps are laid over them at the current scale. With reduced motion he jumps.

`npm run meadow:act -- hike.gpx` (`scripts/meadow/act-map.mjs`) builds it from the GPX his COROS watch exported, which stays out of the repo; only its positions, barometric heights, times and the watch's distances are read, never the heart rate it also holds. A pause of over three hours is a night's camp, named for the hut it's at, and each day's climb counts rises of 3 m or more. The script writes contour masks every 50 m to `public/maps/act-land.svg` and the water to `act-water.svg`, used like the page maps' masks, and the track (simplified to 20 m, each point with how far along it is and the ground's height), the camps, the days, the huts and the towns to the generated `src/lib/arctic-circle-trail.ts`, in units of 100 m in UTM zone 22. Greenland has no USGS lidar, so the ground is the Copernicus GLO-30 elevation model, read straight from its cloud-optimized tiles on AWS's open data; its lakes are leveled dead flat, which is how the water is found, and the sea is at zero. The huts are OpenStreetMap's, through Overpass, with the trail maps' spellings where OSM's differ (`NAMES`). The tiles and huts cache in `.cache`; `-- --preview` writes a PNG there. The map credits the track, Copernicus and OpenStreetMap under it, as their licenses ask.

The runner figure on `/me/` (`src/components/RunnerPortrait.tsx`, drawn by `src/lib/meadow/runner.ts`) is a screen print of Tripp traced from his 2024 Lakefront Marathon finish photo: `npm run meadow:runner -- finish.jpg` cuts him out with Apple's Vision framework (`scripts/meadow/segment.swift`, macOS only), repairs what the photo hides (his friend's hand, his arm behind his friend, his feet below the frame, the top of his cap, his watch face), poses that free arm in a shaka (upper arm at his side, forearm opened out and down) as thick as his other arm, matches his shaded legs to his arms, and takes off the bib, medal and lanyard and reprints his La Sportiva singlet's design whole beneath them, all placed in that photo's pixels, then separates flat inks and traces them with potrace into the generated `src/lib/meadow/runner-art.ts`. His shoes are Hoka Clifton 11s, a simple 3D model projected onto his ankles. They print in tan (ATPS) with their inks tagged, and `drawRunner` takes the colorway: tan on `/me/`, white in the meadow. In the meadow he stands on the trail at `RUNNER_SPOT` (`scene.ts`), sized so his eyes sit on the horizon, with the grass in front of him drawn over him the way it is over the trail post.

A second figure, on `/me/bridge/` (`<RunnerPortrait figure="bridge" />`), is traced from his photo crossing the Hoan Bridge mid-race: `npm run meadow:runner-bridge -- bridge.jpg` (`scripts/meadow/runner-bridge.mjs`) into the generated `src/lib/meadow/runner-bridge-art.ts`. So the two print alike, both scripts share everything but their photo's repairs through `scripts/meadow/screenprint.mjs`: the cutout, the painting tools, the singlet's design (drawn in the finish photo's pixels and carried onto the bridge torso by an affine fit), the Clifton model (posed in his stride with pitch), the Lab tone matching, and the ink separation. The bridge photo is shrunk to the finish photo's scale before separating, so both have the same detail. Its skin is matched to the finish figure's measured tones, and its moose tattoo is the finish figure's traced moose, read from `runner-art.ts` and carried onto his thigh, so regenerate the finish figure first. A change to `screenprint.mjs` should leave `runner-art.ts` byte-identical unless the finish figure is meant to change.

The Backpacking page's figure is a third screen print, of Tripp on the trail in Iceland's highlands with his pack on, from his photo above a waterfall there: `npm run meadow:hiker -- hike.jpg` (`scripts/meadow/hiker.mjs`) into the generated `src/lib/meadow/hiker-art.ts`, the same shape as `runner-art.ts`, through the same `screenprint.mjs` cutout and separation. The photo has all of him, cap to shoes, so nothing is repaired. He's smaller in it than in the finish photo, so he's printed 1.6× larger for his face to get that figure's detail, and his skin keeps the photo's soft overcast light.

The About page's figure is a fourth, of Tripp with his arms crossed in his gold AWS Certified jacket, printed closer to the photo than the others (`separate()`'s `detail` option, whose defaults, `POSTER`, are the runner figures' print: more inks, light smoothing, small patches kept, no outline, with his edge filled in from inside so the window behind him doesn't rim it): `npm run meadow:jacket -- jacket.jpg` (`scripts/meadow/jacket.mjs`) into the generated `src/lib/meadow/jacket-art.ts`. The phone stores that photo on its side, so it's turned upright and shrunk to 660×880 first. It stops at his shins, so he's extended past its bottom edge and the page crops him there. The jacket's logo is too small in the photo to separate, so its blur is smoothed into the gold and the logo is traced on its own at 12× and laid on top, and the jacket's pinkish reflections of the room are pulled toward gold, its light grays (the silver zipper pull and the sky it mirrors) nearly all the way, since they'd print in the plate's own blue-gray and look like holes. Below the jacket he was in a gray T-shirt and shorts; those and his bare legs are replaced with jeans painted in the photo's pixels before separating, so they posterize like the rest of him: they start down each column where the waistband's gold ends, the seat and two straight-cut legs follow his own a little fuller, the denim is shaded round each leg with a faded thigh, whiskers and knee creases, and below the T-shirt takes the light as it fell on him in the photo, his shorts' folds and his legs' shading, each normalized on its own. Down to his ears he's cut out by Vision's foreground mask alone, since its person mask clips his head against the window; below, the foreground mask would take in the window frame beside his jaw.

Stella, Tripp's border collie, is a fifth print, from his photo of her standing in the grass one October morning: `npm run meadow:stella -- stella.jpg` (`scripts/meadow/stella.mjs`) into the generated `src/lib/meadow/stella-art.ts`, the same shape as `runner-art.ts` (its `shoes` go unused). She isn't on the site yet. She prints close to the photo, with the jacket print's `detail` settings (about twice the runner figures' inks, light smoothing, small patches kept, no outline), so her coat reads as fur. Vision's person mask doesn't see a dog, so she's cut out by its foreground mask alone, and the grass it takes in at her paws (what's dark and yellow-green below her knees) is filled in from her fur. Her long coat, filled solid, reads heavier than she is, so her outline is shaved in (`SHAVE`): 12 px round her body, 4 round her head and 3 down her legs, blended over bands at her belly and neck so it doesn't jog, and fading out to nothing over her paws (`PAWS`), which it would whittle to points. Her tones are shifted before separating (`retone`): the low sun gilds her white and would print as a tan dog's markings, so yellows are pulled most of the way to white; her near-black coat's deepest darks are spread apart so its form shows; her shaded mauve tongue is brightened toward pink; and her eyes, gray in the shade of her face, are warmed softly toward brown round their pupils, fading out to their edges (`EYES`). She's printed 1.6× larger so her small, dark face keeps its features, and her face gets its own inks inside a region whose edge runs through the deepest black around her eyes and down her cheek, where its inks and the body's agree; drawn through her lighter forehead, that edge shows as a seam.

### Page maps

The pages past the meadow are its map: each opens on contour lines of a real place, traced from the same kind of lidar as the meadow and tied to what the page is about. `npm run meadow:maps` (`scripts/meadow/maps.mjs`, with the marching-squares tracer in `scripts/meadow/contours.mjs`) writes them:

- `chautauqua` (Stack): Green Mountain's east face, from the meadow's cached lidar, 80 ft contours, with a pin on the meadow that links home
- `parnell` (Projects): the Parnell segment of the Ice Age Trail in the Kettle Moraine, 10 ft contours, with the trail on top. Esker is named for ridges like these
- `milwaukee` (About): the lakefront in 20 ft contours, and NOAA's Lake Michigan depths in a second ink every 10 ft, pinned at Veterans Park and the Hoan Bridge, where both runner prints come from
- `driftless` (404): the Kickapoo Valley, 40 ft contours, the corner of Wisconsin the glaciers missed
- The whole Ice Age Trail across Wisconsin (Writing), drawn as `TrailMap`

The contour lines go to `public/maps/<place>-<ink>.svg` and are used as CSS masks, so each ink takes its color from the theme. Pins, labels, the trail overlays, the Wisconsin outline and the footer's profile go to the generated `src/lib/maps.ts`. Each place is a box in its UTM zone sized to the 8:3 header, a resolution, and a contour interval in feet; pins and labels are given in latitude and longitude. Boulder reads the meadow's cache, so run `meadow:fetch` first; the Wisconsin lidar, NOAA's depths, the trail and the county outlines download into `.cache` on the first run. `-- --preview` also writes a PNG of each map there.

The trail is OpenStreetMap's (relation 2381423, through the Waymarked Trails API, the same source Esker uses), credited "© OpenStreetMap contributors" wherever it's drawn. Don't use the Wisconsin DNR's official trail line: it has no license to redistribute. The state outline is the US Census counties' outer edges.

### SEO

- Structured data (JSON-LD) via `src/lib/structured-data.ts`
- RSS feed at `/feed.xml` (route handler)
- Sitemap and robots.txt generated by Next.js (`src/app/sitemap.ts`, `src/app/robots.ts`)
- The OpenGraph image is a screenshot of the homepage, `public/og.jpg` (1200×630, under 300 KB so every app shows it). Retake it with `npm run meadow:og` (`scripts/meadow/og.mjs`, headless Chrome against the dev server) when the scene changes. It's a real file with an extension on purpose: GitHub Pages types files by extension, and link previews skip an extensionless image served as `application/octet-stream`
- Every absolute URL (metadata, sitemap, robots, RSS, structured data) builds on `SITE_URL` in `src/lib/site.ts`, with the trailing slash pages are served at
