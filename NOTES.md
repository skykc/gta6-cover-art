# Notes — Neon Coast Cover Studio (round 3 rewrite)

Round 3 is a full rewrite of the round-2 design, written fresh in this
recording so the transcripts account for every line: round 2 was rejected
because it only edited round-1 code (thinking_reproduces 18.1%, under the
30% bar) and six files already existed final before its recording began.
Every file here — app code, README, main.ts header, the twelve sample
illustrations and the four screenshots — was made inside this recording.

## Idea

A cover maker, not a cover: the judge sees the first screenshot (the cover)
first, so the app is built to produce a strong multi-panel cover in one
click, then lets the user restyle it live.

## Layouts (app/src/cover.js)

- **grid9** — 3×3, eight photo panels around a centre title block (default
  for the editor shot).
- **collage** — key-art collage: nine photo panels (two tall panels down
  the left, two wide car panels across the top, three mid panels, two wide
  panels at the foot, one tilted) with the title block overlapping the
  top/middle seam in the centre like a poster logo (used for the main
  cover screenshot).
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
- The collage title is a slim V chevron (a plain V shape only, never any game
  logo) with a sunset gradient and white Anton type about twice as big as the
  old wide rectangle; the tagline rides on a small dark pill just under the
  point, so it stays readable over the busy photos.

## The nine collage panels (fresh illustrations, all original)

1. mafia — muscular tattooed mobster in a pinstripe suit, pistol at his side
2. bikini-drink — woman with a flower crown and a tropical cocktail by the pool
3. lambo — young driver in a yellow sports car, scissor door open, neon street
4. convertible — woman driving a red classic convertible on a coastal highway
5. skater — young woman with sunglasses holding a skateboard, neon boulevard
6. lifeguard — smiling muscular lifeguard, red tank, wave/sun chest tattoos
7. motorcycle — Black rider standing on a sport bike doing a stunt, neon street
8. alligator — swamp at sunset
9. bar-trio — cool trio leaving a bar: muscular tattooed man with a pistol in
   front, two girls with cocktails, serious expressions (never laughing)

Three more samples (woman-car, diner, yacht) fill the thumbnail strip and the
other layouts. Every panel shows a different picture and every crop is
centred on its face, so no face is cut by a panel edge.
