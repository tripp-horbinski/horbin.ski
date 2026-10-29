# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tripp Horbinski's personal site (https://tripp.horbin.ski; `SITE_URL` in `src/lib/site.ts`): one page, an interactive canvas scene of the Flatirons from Chautauqua Meadow with his career walked down its trail over it. Built with Next.js 16, React 19 and Tailwind CSS 3. It's written for the people hiring him: it says what he does in his own words first, gets them to his resume in one click, and is memorable after that.

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Build static export (outputs to `out/`)
- `npm run lint` — Run ESLint
- `npm run resume:pdf` — Print the homepage, which on paper is just his resume, to `public/tripp-horbinski-resume.pdf` (needs the dev server running); run it whenever `src/content/career.ts` changes
- `npm run meadow:og` — Retake the link-preview image (see SEO)
- The meadow's and the figures' build scripts (see Meadow and Figures)

No test framework is configured.

## Deployment

Static export deployed to GitHub Pages via GitHub Actions (`.github/workflows/nextjs.yml`). Pushes to `main` trigger automatic deployment. The site uses `output: 'export'` with `trailingSlash: true` and unoptimized images (required for static hosting).

## Architecture

### One page

`/` (`src/app/page.tsx`) is the whole site: `Meadow` (`src/components/Meadow.tsx`, the scene and the page over it), `Resume` (`src/components/Resume.tsx`, print only) and his structured data. Besides it there's only the 404 (`src/app/not-found.tsx`, a way back to the meadow), `robots.ts` and `sitemap.ts`. The site used to have more pages (Career, Projects, Backpacking with an Arctic Circle Trail trip map, Stack, About, Writing, and contour maps of real places heading them); they were taken out to keep it one page, and they're in git history at commit `5848bad` if they're ever wanted back.

### Content

- `src/content/career.ts` — The one source for the homepage's walk and its resume, and so the PDF, written with Tripp from his resume and an interview about his GoFundMe work: his recent years get the detail and his earlier roles their best one or two lines. `impact` is the numbers pulled from a role's bullets to lead its card, so change both together. A role can be told in `phases` (GoFundMe: cloud and platform 2023–24, then full stack 2025–26), each with its own dates, bullets and numbers, walked as separate stops. `PROFILE.tagline` (his line, first on the page) and `intro` (the walk's summary card) are in his voice; `summary` is the resume's
- `src/content/projects.ts` — What he builds on his own time, for the walk's evening stretch
- `src/lib/site.ts` — `SITE_URL`, where to reach him (`EMAIL`, `LINKEDIN`, `GITHUB`, `CREDLY`), `RESUME_PDF` and `OG_IMAGE`

### Layout and styling

`RootLayout` (`src/app/layout.tsx`) gives a centered column (`max-w-xl mx-auto px-4`) that only the 404 uses; the homepage runs full width (`main:has(.home)`). An inline `<script>` in `<head>` sets the `dark` class on `<html>` from a stored `theme` or the system preference before paint, for the 404's colors; `<html>` uses `suppressHydrationWarning`. The meadow ignores the theme.

Tailwind CSS 3, configured with `darkMode: 'class'`. Design tokens are CSS custom properties (`--bg`, `--text-primary`, `--text-nav`, `--border`, `--accent`) with light and dark values in `globals.css`. Fonts: Josefin Sans (headings and labels), Lora (body) and JetBrains Mono, loaded via Google Fonts. Component styles are in `globals.css` `@layer components`; Tailwind drops any class there it can't find written out in the source, so components name such classes in full instead of building them from variables.

### Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

### Meadow (`/`)

The scene is an interactive canvas of the Flatirons from Chautauqua Meadow (engine in `src/lib/meadow/`). The mountain is generated, not hand-drawn: `src/lib/meadow/terrain.ts` comes from USGS 3DEP lidar and NAIP imagery via the build-time scripts in `scripts/meadow/` (`npm run meadow:fetch` once to download into the gitignored `.cache`, then `npm run meadow:render`). Each rock/forest area carries its surface normal, so the engine lights it from the real sun position (`suncalc`) for any hour. The rolling meadow hills, the line where the near grass begins, and every tree between the meadow and the mountain come from the same data: trees are placed where the aerial imagery shows canopy, sized by how dense it is, and cast shadows from the real sun. `npm run meadow:trace -- photo.jpg` traces a photo into the same format, and `npm run meadow:calibrate` fits the lidar camera to a photo's skyline. Only trace photos you have rights to.

The page is one page over the scene. The meadow is a fixed backdrop (`.meadow`, behind), and the page scrolls over it (`.home`, which lets the pointer through to the canvas wherever it's empty). His name, line (`PROFILE.tagline`), role, and the Resume and Get in touch buttons stay fixed over the sky (`.home-head`) while everything else scrolls. Under them is his career as a walk down the trail: Resume slides to its first stop, a summary card with his resume as a PDF to view or download; then a stop for his degree, each role or phase of one (in the order they happened, leading with their `impact` numbers) and the Golden Jacket (with its Credly link), and Today with the calls to action. Past Today, the evening comes on over what he builds on his own time (`#projects`): a heading and a card each for the projects in `src/content/projects.ts`. Last, under the stars, getting in touch (`#contact`): a little about him off the keyboard, then his email, LinkedIn, GitHub and Credly, each with its icon (`CONTACT`), and the PDF. The Get in touch button and clicking him in the meadow land there.

The cards live on the grass: each stop is a screen and a bit of scrolling with its card held just below the meadow's far edge (`position: sticky` at `--grass`, set from the engine's `horizon()`), and the page's parts past the first screen fade out where they'd scroll up into the trees and the mountain (a mask `Meadow.tsx` redraws as they scroll), so nothing passes over the mountain or his name. The page scrolls normally; where it is drives the scene (`Meadow.tsx` measures the stops against the middle of the grass into progress, in stops, and calls `setHour`). The hour runs from the opening 2:45 PM back to dawn for his first step, up through the years to 2:45 PM at Today, on into the evening, after the sun's left the meadow, over his projects, and to night for getting in touch (`HOURS`). Past the first screen the time-of-day Options go, since the scroll sets the hour from there. On a phone each stop's card sits at its end and holds at the bottom of the screen, over the grass (`position: sticky; bottom`), leaving the sky, the mountain and Tripp on the trail in view above it; the cards and the head are tighter there, and the projects are swiped through sideways.

Following the trail slides to the walk. Tripp is a feature too: the engine picks him out by his traced outline (`onRunner`), and clicking him slides to getting in touch, with a keyboard-focusable link laid over him. A soft white glow pulses round him (`GLOW`, `GLOW_PERIOD` in `engine.ts`) so he reads as something to click: his silhouette blurred once per resize, drawn under him each frame at a breathing opacity, brightest while he's pointed at, steady for reduced motion and dimmer at night.

### Resume

`src/components/Resume.tsx` renders `career.ts` as his resume, hidden on screen (`.resume`). On paper the scene and the page over it drop out and it's all that prints, on Letter (the print styles in `globals.css`), so printing the homepage prints his resume, and `npm run resume:pdf` prints it to the PDF the page offers (`RESUME_PDF`), which leaves off the phone number his own PDF carries.

### Figures

The runner in the meadow is a screen print of Tripp traced from his 2024 Lakefront Marathon finish photo, drawn by `src/lib/meadow/runner.ts`: `npm run meadow:runner -- finish.jpg` cuts him out with Apple's Vision framework (`scripts/meadow/segment.swift`, macOS only), repairs what the photo hides (his friend's hand, his arm behind his friend, his feet below the frame, the top of his cap, his watch face), poses that free arm in a shaka (upper arm at his side, forearm opened out and down) as thick as his other arm, matches his shaded legs to his arms, and takes off the bib, medal and lanyard and reprints his La Sportiva singlet's design whole beneath them, all placed in that photo's pixels, then separates flat inks and traces them with potrace into the generated `src/lib/meadow/runner-art.ts`. His shoes are Hoka Clifton 11s, a simple 3D model projected onto his ankles. They print in tan (ATPS) with their inks tagged, and `drawRunner` takes the colorway: white in the meadow. He stands on the trail at `RUNNER_SPOT` (`scene.ts`), sized so his eyes sit on the horizon, with the grass in front of him drawn over him the way it is over the trail post.

A second figure, not on the site now, is traced from his photo crossing the Hoan Bridge mid-race: `npm run meadow:runner-bridge -- bridge.jpg` (`scripts/meadow/runner-bridge.mjs`) into the generated `src/lib/meadow/runner-bridge-art.ts` (`FIGURES` in `runner.ts` has both). So the two print alike, both scripts share everything but their photo's repairs through `scripts/meadow/screenprint.mjs`: the cutout, the painting tools, the singlet's design (drawn in the finish photo's pixels and carried onto the bridge torso by an affine fit), the Clifton model (posed in his stride with pitch), the Lab tone matching, and the ink separation, whose `detail` option sets how close to the photo a print comes (its defaults, `POSTER`, are the runner figures'). The bridge photo is shrunk to the finish photo's scale before separating, so both have the same detail. Its skin is matched to the finish figure's measured tones, and its moose tattoo is the finish figure's traced moose, read from `runner-art.ts` and carried onto his thigh, so regenerate the finish figure first. A change to `screenprint.mjs` should leave `runner-art.ts` byte-identical unless the finish figure is meant to change.

Stella, Tripp's border collie, is a third print, from his photo of her standing in the grass one October morning: `npm run meadow:stella -- stella.jpg` (`scripts/meadow/stella.mjs`) into the generated `src/lib/meadow/stella-art.ts`, the same shape as `runner-art.ts` (its `shoes` go unused). She isn't on the site yet. She prints close to the photo (about twice the runner figures' inks, light smoothing, small patches kept, no outline), so her coat reads as fur. Vision's person mask doesn't see a dog, so she's cut out by its foreground mask alone, and the grass it takes in at her paws (what's dark and yellow-green below her knees) is filled in from her fur. Her long coat, filled solid, reads heavier than she is, so her outline is shaved in (`SHAVE`): 12 px round her body, 4 round her head and 3 down her legs, blended over bands at her belly and neck so it doesn't jog, and fading out to nothing over her paws (`PAWS`), which it would whittle to points. Her tones are shifted before separating (`retone`): the low sun gilds her white and would print as a tan dog's markings, so yellows are pulled most of the way to white; her near-black coat's deepest darks are spread apart so its form shows; her shaded mauve tongue is brightened toward pink; and her eyes, gray in the shade of her face, are warmed softly toward brown round their pupils, fading out to their edges (`EYES`). She's printed 1.6× larger so her small, dark face keeps its features, and her face gets its own inks inside a region whose edge runs through the deepest black around her eyes and down her cheek, where its inks and the body's agree; drawn through her lighter forehead, that edge shows as a seam.

### SEO

- His `Person` structured data (JSON-LD) is on the homepage, from `src/lib/structured-data.ts`
- Sitemap (just `/`) and robots.txt generated by Next.js (`src/app/sitemap.ts`, `src/app/robots.ts`)
- The OpenGraph image is a screenshot of the homepage, `public/og.jpg` (1200×630, under 300 KB so every app shows it). Retake it with `npm run meadow:og` (`scripts/meadow/og.mjs`, headless Chrome against the dev server) when the scene changes. It's a real file with an extension on purpose: GitHub Pages types files by extension, and link previews skip an extensionless image served as `application/octet-stream`
- Every absolute URL (metadata, sitemap, robots, structured data) builds on `SITE_URL` in `src/lib/site.ts`, with the trailing slash pages are served at
