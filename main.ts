// Neon Coast Cover Studio — a make.fun gta6-cover-art-01 entry, round 4.
// Node 22, standard library only. The entry is the static web app in app/:
// open it offline in a desktop browser, drop in photos, pick one of seven
// layouts and five gradient-map grades, and export a GTA VI key-art style
// cover as a PNG at 1080x1080, 1080x1350 or 1920x1080. The twelve sample
// illustrations in app/samples/ were generated fresh for this entry, and
// the Anton and Pacifico fonts are vendored in app/fonts/ (OFL).
//
// This file is only the hand-in plumbing: it copies app/ and screenshots/
// next to this file into /output and writes /output/dossier.json with the
// vendored make.fun library, so the judge can read the app and the four
// screenshots. Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app for a try-out with `node serve.ts`, then open
// http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
