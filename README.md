# Neon Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/skykc/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/skykc/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns your photo and a caption into GTA-style cover art: a nine-panel Vice City collage with a big V title block, five sunset/neon colour grades, and PNG exports in the common post sizes.

## What it does

- **7 layouts** — V collage, Grid 9, Hero + 3, Full bleed, Tilted snapshots, Sleeve 6, Poster.
- **5 colour grades** — Sunset, Neon, Teal gold, Ink, Dusk — plus grain, vignette and halftone print effects.
- **Any photo** — upload your own, drop it into any of the nine panels, drag to pan, zoom to crop. Or start from the 12 built-in GTA-style illustrations (mafia, lambo, bike stunt, bar trio, gator and more).
- **Words** — edit the big Anton title and the Pacifico tagline; the V block, bands and poster all follow.
- **Undo / redo** — every step is kept and restores the exact same pixels.
- **Export PNG** — 1080 × 1080, 1080 × 1350 and 1920 × 1080, one click each.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: every script, font and picture is a file under `app/`. Fonts are Anton and Pacifico under the SIL Open Font License (`app/fonts/OFL.txt`). The sample illustrations were made with an image model for this entry.

## Screenshots

- `screenshots/1-cover.jpg` — the V collage cover
- `screenshots/2-editor.jpg` — the editor with photos loaded
- `screenshots/3-cover.jpg` — the Tilted layout, Neon grade
- `screenshots/4-cover.jpg` — the Poster layout, Dusk grade

Made for [make.fun](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01&ref=6en97dxm) — bounty `gta6-cover-art-01`.
