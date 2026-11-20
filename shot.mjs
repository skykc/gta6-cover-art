// Screenshot runner for Neon Coast Cover Studio (repo tooling, not a
// deliverable). Serves app/ on localhost, opens each scene from shots.json
// in headless Chromium and saves it as a JPEG under screenshots/.
// Usage: node shot.mjs [--port 8080]
// Blocks every non-localhost request to prove the app is fully offline.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer';

const shots = JSON.parse(readFileSync(new URL('./shots.json', import.meta.url), 'utf8'));
const portArg = process.argv.indexOf('--port');
const port = portArg === -1 ? 8080 : Number(process.argv[portArg + 1]);

const server = spawn(process.execPath, ['serve.ts', '--port', String(port)], {
  cwd: new URL('.', import.meta.url).pathname,
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 1500));

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
try {
  for (const shot of shots) {
    const page = await browser.newPage();
    await page.setViewport({ width: shot.w, height: shot.h });
    const external = [];
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const u = req.url();
      if (u.startsWith('http://localhost') || u.startsWith('data:') || u.startsWith('blob:')) req.continue();
      else { external.push(u); req.abort(); }
    });
    page.on('pageerror', (e) => console.log(`[${shot.name} pageerror]`, String(e).slice(0, 200)));
    await page.goto(`http://localhost:${port}/index.html${shot.query}`, { waitUntil: 'networkidle0', timeout: 30000 });
    try {
      await page.waitForFunction('window.__shotReady === true', { timeout: 20000 });
    } catch {
      console.log(`[${shot.name}] SHOT NOT READY`);
    }
    await new Promise((r) => setTimeout(r, 300));
    const out = new URL(`./screenshots/${shot.name}`, import.meta.url).pathname;
    await page.screenshot({ path: out, type: 'jpeg', quality: 68 });
    console.log(`saved ${shot.name} (${shot.w}x${shot.h}) external-requests: ${external.length}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
