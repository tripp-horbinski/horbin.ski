---
title: "Building a meadow from lidar"
date: "2026-10-29"
excerpt: "The homepage is the Flatirons from Chautauqua Meadow, and none of it is drawn by hand. How USGS elevation data and aerial imagery become a scene lit by the real sun, and how I built it with Claude Code."
category: "tech"
tags: ["Lidar", "Canvas", "Claude Code", "Next.js"]
map: "chautauqua"
draft: true
---

The homepage of this site is the view of Boulder's Flatirons from the trail through Chautauqua Meadow. Nothing in it is drawn by hand. The shape of the mountain, the rolling meadow hills, about 4,000 trees, where the sun is at any hour and when it drops behind the ridge all come from public government data, turned into code by a handful of build scripts. The browser just draws it.

I built it over two days in October with Claude Code. Here's how it works, and at the end, how the work split between us.

## The data

Two public-domain sources from the USGS National Map:

- **3DEP lidar**: bare-earth elevation at 1.5 m across a 4.8 × 4.7 km box around Green Mountain, about 10 million samples, plus a coarser 13 m grid across 26 km for the far skyline.
- **NAIP aerial imagery**: red, green, blue and near-infrared. The infrared is what tells trees from grass from rock.

Both are served by ArcGIS image servers that refuse big requests and drop some under load, so the fetch script pulls 1,000-pixel tiles with retries and stitches them into raw arrays in a local cache. Everything after that runs offline.

![Hillshade of the lidar around Green Mountain](/posts/building-the-meadow/hillshade.jpg)
*The fine lidar grid as a hillshade. The Flatirons are the dark ribs right of center, and Chautauqua Meadow is at the top right, just below Boulder's street grid.*

## Finding where to stand

I wanted the real view from a real spot on the trail, so the first problem is the camera: where it stands, which way it faces, how it's tilted, and its focal length. I didn't have a survey, but I had a reference photo of the view. Trace the photo's skyline, and the lidar can tell you where you'd have to stand to see it.

The calibration script tries 192 spots on a 60 m grid across the meadow. At each one it computes the horizon from the lidar, then brute-forces heading and focal length against the photo's skyline. The three best spots seed a Nelder–Mead search over all six parameters: east, north, heading, pitch, roll and focal length. The misfit is a Huber loss in pixels, so a few pines poking above the ridge in the photo can't drag the fit.

It settles at the north end of the meadow, 39.99968° N, 105.28315° W, facing 219°, with the lidar skyline matching the photo's to within the height of the pines on the ridge. That one camera is used for everything after, the sun and moon included.

## Rendering the mountain

The terrain renderer is the old voxel-space trick: for each column of the image, march outward along that column's bearing and fill rows front to back as the terrain rises into view. It accounts for the curve of the earth and for atmospheric refraction, which both matter for ridges 20 km out, and fades the distant ones into haze.

Each pixel remembers the spot on the map it hit, and the aerial imagery classifies it. NDVI, the normalized difference of near-infrared and red, separates living plants from everything else. Fountain sandstone reads pale and nearly neutral from the air, while late-summer grass is just as bare but distinctly yellow. The slabs' steep north sides sit in shadow in the imagery, so dark near-cliffs count as rock too. Broadleaf trees reflect more infrared than pines, so they're told apart as well.

![The lidar rendered from the meadow and classified into rock, forest and open ground](/posts/building-the-meadow/classified.jpg)
*The render from the calibrated camera, colored by what the imagery says is there: rock, pines, broadleaf trees and open ground.*

## Light for any hour

A rendered image is lit for one moment, and I wanted the scene to follow the time of day. So instead of baking the light in, the pipeline keeps which way the ground faces. Surface normals from the lidar are grouped with k-means, five groups for the forested mountain and four for the rock. Rock keeps its crisp lidar normals; forest is smoothed over about 10 m so it's lit by the broad shape of ridges and gullies. Each group is traced with potrace into SVG paths, so the mountain becomes a few flat areas, like the inks of a screen print, each facing its own direction.

In the browser, every area takes its color from how squarely it faces the sun, with the sun's position from suncalc for August 28, 2025, at the camera. In the morning the sun comes up behind you and the east-facing slabs light up first. The same lidar horizon tells the scene when the sun actually reaches the meadow (6:20 a.m., once it clears the plains) and when the ridge cuts it off (6:35 p.m.), and the color palettes follow those times, blended in OKLab so dusk doesn't go muddy. The moon is the real one for that evening: a waxing crescent in its true phase, bright side toward the set sun, going down behind the First Flatiron around 8 p.m. After dark, climbers' headlamps creep up the First and Third Flatirons.

![The meadow at 7 a.m., 2:45 p.m., 6:54 p.m. and 10 p.m.](/posts/building-the-meadow/hours.jpg)
*The same scene at 7 a.m., 2:45 p.m., 6:54 p.m. and 10 p.m.*

## Trees

Bare-earth lidar has the trees stripped out, so they come from the imagery. Every forest pixel in range is a candidate, and how much of its neighborhood is canopy decides what grows there: a lone dark speck is a shrub, solid cover is mature forest. Trees are placed on the map rather than on the screen, so the real gaps in the open ponderosa woodland survive, and perspective does the sizing and spacing. Broadleaf trees grow in thickets along the drainages. Any tree hidden behind a rise, or behind the trees in front of it, is dropped.

That leaves about 760 trees in front of the mountain and 3,200 more over its slopes. Each tree in front casts a shadow from the real sun, found by putting the tree back on the map.

## What ships

All of that compiles into one generated TypeScript module: the skyline, the traced areas and the way each one faces, the five named Flatirons, the trees and the camera. It's 584 KB, 180 KB gzipped, with no images and no backend. The site is a Next.js static export on GitHub Pages.

The browser draws it on a canvas every frame, in parallax layers by depth, with a few thousand grass blades in front that bend in rolling gusts and part under your pointer. Point at a Flatiron and it outlines and names itself; click it for a field note. The sound is generated with the Web Audio API, no audio files: wind that follows the gusts, a rustle when you brush the grass, and snowy tree crickets after dark. With reduced motion turned on, it all holds still.

## Me, in the meadow

The figure on the trail is me, a screen print traced from my 2024 Milwaukee Lakefront Marathon finish photo. A small Swift script cuts me out with Apple's Vision framework. The build repairs what the photo hides, like my friend's hand and my feet below the frame, separates flat inks with k-means in Lab color, and traces them with potrace. My shoes are a simple 3D model of Hoka Clifton 11s, projected onto my ankles.

Sizing me was the easy part. The camera is at eye height, so anyone standing on level ground has their eyes on the horizon, however far off they are. Click me and you get my About page.

## Building it with Claude Code

The git history shows how it went. The first version, on October 27, was a hand-drawn poster of the Flatirons. By that evening it was an interactive canvas scene, and then the same scene regenerated from lidar. The next day it became the homepage.

> **TODO(tripp):** Only you can write this section, and a reader at an AI company will read it hardest. Say plainly how the work split. Some prompts:
>
> - What did you decide, and what did you leave to Claude? Whose idea was it to build the mountain from lidar instead of drawing it?
> - What did you catch that Claude got wrong? The history has candidates: keeping the trail post and me in frame on phones, cutting the grasshoppers, dropping the shrubs and the broadleaf blobs.
> - How did you check the work: the calibration overlay, preview renders, screenshots at different hours?
> - What would you do differently next time?

## Source

The scripts are in the scripts/meadow folder of [the site's repository](https://github.com/tripp-horbinski/horbin.ski). The lidar and imagery are public domain, from USGS 3DEP and NAIP. The sun and moon come from suncalc, and the tracing from potrace.
