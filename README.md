# Neon Coast Cover Studio

[![make.fun](https://img.shields.io/badge/make.fun-gta6--cover--art--01-ff2e88)](https://make.fun/competitions/gta6-cover-art-01)
[![Node](https://img.shields.io/badge/node-22-339933)](https://nodejs.org)
[![License: OFL](https://img.shields.io/badge/fonts-Anton%20%2B%20Pacifico%20(OFL)-7a5af8)](./app/fonts)

Turn your photos into a GTA VI key-art style cover. Pick a layout, pick a
grade, drag to crop, export a print-ready PNG.

## What it does

- **7 layouts** — Grid 9 (nine-panel collage with a V title block), Hero 3,
  Full Bleed, Tilted snapshots, Sleeve 6, Poster, and Duo.
- **5 gradient-map grades** — Sunset, Neon, Teal Gold, Ink, and Dusk — plus
  film grain, vignette, and halftone.
- **Your photos or the samples** — upload multiple photos, or use the 12
  built-in GTA-style illustrations (tattooed mafia, bikini by the pool,
  yellow Lambo in neon city, red convertible driver, skater, tattooed
  lifeguard, stunt rider, swamp alligator, bar trio, coastal driver, retro
  diner, yacht).
- **Crop per panel** — click a panel to select it, drag to pan, slide to
  zoom. Undo/redo restores the cover pixel-perfectly.
- **Export PNG** — 1080 × 1080, 1080 × 1350, or 1920 × 1080, exact size.
- **Fully offline** — static files, zero external requests. Fonts (Anton +
  Pacifico, OFL) are vendored in `app/fonts/`.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json`. Screenshots are defined in `shots.json` and taken
with a headless browser against `?shot=cover` / `?shot=editor`.

---

Built for the [gta6-cover-art-01](https://make.fun/competitions/gta6-cover-art-01)
bounty on [make.fun](https://make.fun/?ref=6en97dxm).
