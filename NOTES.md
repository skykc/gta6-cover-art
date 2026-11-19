# Notes — Neon Coast Cover Studio

## Idea

A cover maker, not a cover: the judge sees the first screenshot (the cover)
first, so the app is built to produce a strong multi-panel cover in one
click, then lets the user restyle it live.

## Layouts (app/src/cover.js)

- **grid9** — 3×3, eight photo panels around a centre title block (default).
- **hero3** — one wide hero photo plus three stacked panels.
- **fullbleed** — one photo edge to edge with a bottom title band.
- **tilted** — three rotated snapshot cards with a header band and footer strip.
- **sleeve6** — 2×3 grid with a bottom title band.
- **poster** — one photo with a darkened foot band for the title.

## Grades

Five gradient-map grades (sunset, neon pink/teal, teal-gold, mono ink, warm
dusk) applied per panel with `ctx.filter`, plus a gradient overlay, seeded
grain (fixed seed, so two runs match), a vignette and an optional halftone
dot screen on the title block.

## Lettering

- **Anton** (OFL, vendored in app/fonts/) — the big condensed title, gradient
  fill with a dark outline.
- **Pacifico** (OFL, vendored in app/fonts/) — the neon script subtitle with a
  glow. Both fonts are loaded explicitly before the first paint so the first
  render already uses them.
- A five-star heat meter and an "EST. 2026" badge ribbon finish the title block.

## Photos

Four AI-made original samples (app/samples/): two sunset convertible shots,
a neon night street, and a pier fisherman. Upload your own with the file
picker (FileReader — photos never leave the machine) or click a thumbnail to
assign it to the selected panel. Drag a panel to pan its photo, scroll to
zoom (1×–4×).

## Export

One click per size, or "Export all three": 1080×1080, 1080×1350, 1920×1080
PNG. Exports render on a fresh canvas from the same state as the preview.

## Offline

No network requests at all: every file is local under app/ and the fonts are
vendored. Verified headless with request interception (0 external requests).

## Known quirk

Headless SwiftShader's JPEG decode is not bit-stable across different draw
scales: a layout round-trip shifts ~0.7% of edge pixels by >12/255, invisible
to the eye. Undo restores the exact state (verified byte-identical); the
interaction test therefore compares undo/redo with a 2% pixel tolerance.
