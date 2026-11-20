// Fixed scenes for screenshots: ?shot=cover shows the cover alone,
// ?shot=editor shows the full editor with the cover inside.
// Query params: layout, grade, caption (title), tagline, photos (comma
// list of sample names, in panel order). window.__shotReady is set once
// the cover has been painted with fonts loaded.

const LAYOUTS = ['grid9', 'hero3', 'fullbleed', 'tilted', 'sleeve6', 'poster', 'duo'];
const GRADES = ['sunset', 'neon', 'tealgold', 'ink', 'dusk'];

export async function runShot(shot, params, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const layout = params.get('layout');
  const grade = params.get('grade');
  const caption = params.get('caption');
  const tagline = params.get('tagline');
  const photos = params.get('photos');

  const patch = {};
  if (layout && LAYOUTS.includes(layout)) patch.layout = layout;
  if (grade && GRADES.includes(grade)) patch.grade = grade;
  if (caption) patch.title = caption;
  if (tagline !== null) patch.tagline = tagline;
  if (photos) {
    const names = photos.split(',').map((s) => s.trim()).filter(Boolean);
    patch.panels = names.map((src) => ({ src, ox: 0, oy: 0, zoom: 1 }));
  }
  api.setState(patch);
  api.redraw();
  // Never signal ready while a font is still swapping in: a screenshot
  // taken a moment too early would bake in a fallback face.
  try { await document.fonts.ready; } catch { /* fall back */ }
  api.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
