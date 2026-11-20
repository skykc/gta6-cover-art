// Neon Coast Cover Studio — cover renderer.
//
// Draws a GTA-style multi-panel cover onto any canvas: the panel layouts,
// the sunset/neon colour grades, the big V title block and the print
// effects (grain, vignette, halftone). Every render is deterministic:
// the grain comes from a seeded generator, so the same state always
// draws the same pixels — undo/redo and the two grader runs agree.

export const SAMPLES = [
  { id: 'mafia', file: 'samples/mafia.jpg', label: 'Mafia' },
  { id: 'lambo', file: 'samples/lambo.jpg', label: 'Lambo' },
  { id: 'driver', file: 'samples/driver.jpg', label: 'Driver' },
  { id: 'bikini', file: 'samples/bikini.jpg', label: 'Bikini' },
  { id: 'lifeguard', file: 'samples/lifeguard.jpg', label: 'Lifeguard' },
  { id: 'rider', file: 'samples/rider.jpg', label: 'Bike stunt' },
  { id: 'gator', file: 'samples/gator.jpg', label: 'Gator' },
  { id: 'bartrio', file: 'samples/bartrio.jpg', label: 'Bar trio' },
  { id: 'skater', file: 'samples/skater.jpg', label: 'Skater' },
  { id: 'cardame', file: 'samples/cardame.jpg', label: 'Car dame' },
  { id: 'diner', file: 'samples/diner.jpg', label: 'Diner' },
  { id: 'yacht', file: 'samples/yacht.jpg', label: 'Yacht' },
  { id: 'boulevard', file: 'samples/boulevard.jpg', label: 'Boulevard' },
  { id: 'pier', file: 'samples/pier.jpg', label: 'Pier' },
];

export const LAYOUTS = [
  { id: 'vcollage', name: 'V collage', hint: '9 panels, V title' },
  { id: 'grid9', name: 'Grid 9', hint: '9 panels, banner title' },
  { id: 'hero3', name: 'Hero + 3', hint: 'big hero, three stacked' },
  { id: 'fullbleed', name: 'Full bleed', hint: 'one photo, full frame' },
  { id: 'tilted', name: 'Tilted', hint: 'slanted snapshots' },
  { id: 'sleeve6', name: 'Sleeve 6', hint: '6 panels, title band' },
  { id: 'poster', name: 'Poster', hint: 'hero photo, big title' },
];

export const GRADES = [
  { id: 'sunset', name: 'Sunset', hint: 'warm pink-orange' },
  { id: 'neon', name: 'Neon', hint: 'magenta over teal' },
  { id: 'teal-gold', name: 'Teal gold', hint: 'teal shadows, gold light' },
  { id: 'ink', name: 'Ink', hint: 'black and white' },
  { id: 'dusk', name: 'Dusk', hint: 'deep purple night' },
];

export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
];

// The nine cells of the 3x3 grid, in reading order. Panels that a layout
// does not show simply stay unused; the editor always edits these nine.
export function defaultPanels() {
  const order = ['mafia', 'lambo', 'driver', 'bikini', 'lifeguard', 'rider', 'gator', 'bartrio', 'skater'];
  return order.map((id) => ({ img: `samples/${id}.jpg`, zoom: 1, ox: 0, oy: 0 }));
}

export function defaultState() {
  return {
    layout: 'vcollage',
    grade: 'sunset',
    title: 'NEON COAST',
    tagline: 'chase the sunset',
    effects: { grain: true, vignette: true, halftone: false },
    panels: defaultPanels(),
  };
}

// Small deterministic generator: the same seed always yields the same
// sequence, so grain never flickers between renders.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// Where each image panel sits for a layout, in canvas pixels. A slot is
// { x, y, w, h, panel, rot } — panel is the index into state.panels, rot
// an optional tilt in degrees.
export function layoutSlots(layout, W, H) {
  const g = Math.max(4, Math.round(Math.min(W, H) * 0.008));
  const cw = (W - g * 4) / 3;
  const ch = (H - g * 4) / 3;
  const cell = (i) => ({
    x: g + (i % 3) * (cw + g),
    y: g + Math.floor(i / 3) * (ch + g),
    w: cw,
    h: ch,
  });
  const img = (i, extra = {}) => ({ kind: 'img', panel: i, ...cell(i), ...extra });
  switch (layout) {
    case 'grid9':
      return [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => img(i));
    case 'hero3':
      return [
        { kind: 'img', panel: 0, x: g, y: g, w: W * 0.64 - g * 1.5, h: H - g * 2 },
        { kind: 'img', panel: 1, x: W * 0.64 + g * 0.5, y: g, w: W * 0.36 - g * 1.5, h: (H - g * 4) / 3 },
        { kind: 'img', panel: 3, x: W * 0.64 + g * 0.5, y: g * 2 + (H - g * 4) / 3, w: W * 0.36 - g * 1.5, h: (H - g * 4) / 3 },
        { kind: 'img', panel: 5, x: W * 0.64 + g * 0.5, y: g * 3 + ((H - g * 4) / 3) * 2, w: W * 0.36 - g * 1.5, h: (H - g * 4) / 3 },
      ];
    case 'fullbleed':
      return [{ kind: 'img', panel: 0, x: 0, y: 0, w: W, h: H }];
    case 'tilted': {
      const pw = W * 0.44;
      const ph = H * 0.50;
      return [
        { kind: 'img', panel: 1, x: W * 0.05, y: H * 0.13, w: pw, h: ph, rot: -6 },
        { kind: 'img', panel: 0, x: W * 0.50, y: H * 0.09, w: pw, h: ph, rot: 3 },
        { kind: 'img', panel: 5, x: W * 0.27, y: H * 0.45, w: pw, h: ph, rot: -2 },
      ];
    }
    case 'sleeve6': {
      // Two rows across the top 76% of the cover; the title band owns the rest.
      const topH = H * 0.76;
      const rh = (topH - g * 3) / 2;
      return [0, 1, 2, 3, 4, 5].map((i) => ({
        kind: 'img',
        panel: i,
        x: g + (i % 3) * (cw + g),
        y: g + Math.floor(i / 3) * (rh + g),
        w: cw,
        h: rh,
      }));
    }
    case 'poster':
      return [{ kind: 'img', panel: 0, x: 0, y: 0, w: W, h: H * 0.74 }];
    case 'vcollage':
    default: {
      // Eight panels around the centre cell, which the V title block owns:
      // panels 0..7 land on cells 0,1,2,3,5,6,7,8 (cell 4 is the centre).
      const cells = [0, 1, 2, 3, 5, 6, 7, 8];
      return cells.map((c, k) => ({ kind: 'img', panel: k, ...cell(c) }));
    }
  }
}

// Draw one photo into a rectangle, cover-fit, with the panel's zoom and
// pan. The image is drawn through the grade's filter first.
function drawPhoto(ctx, rect, image, panel, grade) {
  if (!image || !image.naturalWidth) return;
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih) * (panel.zoom || 1);
  const dw = iw * base;
  const dh = ih * base;
  const dx = rect.x + (rect.w - dw) / 2 + (panel.ox || 0) * ((dw - rect.w) / 2);
  const dy = rect.y + (rect.h - dh) / 2 + (panel.oy || 0) * ((dh - rect.h) / 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (grade === 'ink') ctx.filter = 'grayscale(1) contrast(1.12) brightness(1.06)';
  else if (grade === 'dusk') ctx.filter = 'saturate(1.1) brightness(0.94)';
  else ctx.filter = 'saturate(1.18) contrast(1.05)';
  ctx.drawImage(image, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

// The colour grade wash laid over a photo once it is drawn.
function gradeWash(ctx, rect, grade) {
  if (grade === 'ink') return;
  let grad;
  if (grade === 'neon') {
    grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    grad.addColorStop(0, 'rgba(255,45,150,0.20)');
    grad.addColorStop(1, 'rgba(0,220,200,0.18)');
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  } else if (grade === 'teal-gold') {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(0,120,110,0.22)';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'screen';
    grad = ctx.createLinearGradient(rect.x, rect.y + rect.h, rect.x, rect.y);
    grad.addColorStop(0, 'rgba(255,190,60,0.20)');
    grad.addColorStop(1, 'rgba(255,190,60,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  } else if (grade === 'dusk') {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(70,40,140,0.30)';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(40,80,220,0.18)';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  } else { // sunset
    grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    grad.addColorStop(0, 'rgba(255,150,50,0.10)');
    grad.addColorStop(0.55, 'rgba(255,90,60,0.10)');
    grad.addColorStop(1, 'rgba(255,40,130,0.20)');
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }
}

function framePanel(ctx, rect, W) {
  ctx.save();
  ctx.strokeStyle = 'rgba(16,6,22,0.92)';
  ctx.lineWidth = Math.max(2, W * 0.004);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
  ctx.restore();
}

// Fit a line of Anton capitals inside a width, shrinking until it fits.
function fitAnton(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size *= 0.92;
    ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
  }
  return size;
}

// The V title block: a sunset-gradient chevron with the big two-line
// title in white Anton with a dark outline, and the tagline in a dark
// pill in Pacifico script.
export function drawTitleBlock(ctx, W, H, title, tagline) {
  const cx = W / 2;
  const top = H * 0.295;
  const tip = H * 0.725;
  const half = W * 0.315;
  const grad = ctx.createLinearGradient(0, top, 0, tip);
  grad.addColorStop(0, '#ff2e88');
  grad.addColorStop(0.55, '#ff5a3c');
  grad.addColorStop(1, '#ff8a1e');
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - half, top);
  ctx.lineTo(cx + half, top);
  ctx.lineTo(cx, tip);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,6,24,0.85)';
  ctx.lineWidth = Math.max(2, W * 0.004);
  ctx.stroke();
  ctx.restore();

  const words = (title || 'NEON COAST').split(/\s+/);
  const line1 = words[0] || 'NEON';
  const line2 = words.slice(1).join(' ') || 'COAST';
  const maxW = half * 2 * 0.82;
  const longer = line2.length > line1.length ? line2 : line1;
  const size = fitAnton(ctx, longer, maxW, H * 0.155);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#170a1c';
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.lineJoin = 'round';
  const y1 = top + H * 0.115;
  const y2 = top + H * 0.265;
  ctx.strokeText(line1, cx, y1);
  ctx.fillText(line1, cx, y1);
  ctx.strokeText(line2, cx, y2);
  ctx.fillText(line2, cx, y2);
  ctx.restore();

  // Tagline pill, overlapping the lower half of the V.
  const pillW = Math.min(W * 0.36, maxW * 1.15);
  const pillH = H * 0.052;
  const pillX = cx - pillW / 2;
  const pillY = top + H * 0.335;
  const r = pillH / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pillX + r, pillY);
  ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + pillH, r);
  ctx.arcTo(pillX + pillW, pillY + pillH, pillX, pillY + pillH, r);
  ctx.arcTo(pillX, pillY + pillH, pillX, pillY, r);
  ctx.arcTo(pillX, pillY, pillX + pillW, pillY, r);
  ctx.closePath();
  ctx.fillStyle = '#160818';
  ctx.fill();
  ctx.strokeStyle = '#ff2e88';
  ctx.lineWidth = Math.max(2, W * 0.003);
  ctx.stroke();
  ctx.fillStyle = '#ff8fd0';
  ctx.font = `${Math.round(pillH * 0.52)}px Pacifico, cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagline || 'chase the sunset', cx, pillY + pillH / 2 + 1);
  ctx.restore();
}

// A title band laid over the bottom of a photo (hero, full bleed, poster).
function drawTitleBand(ctx, W, H, state, bandH) {
  const bandY = H - bandH;
  const grad = ctx.createLinearGradient(0, bandY - bandH * 0.6, 0, H);
  grad.addColorStop(0, 'rgba(14,5,20,0)');
  grad.addColorStop(1, 'rgba(14,5,20,0.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, bandY - bandH * 0.6, W, bandH * 1.6);
  const title = state.title || 'NEON COAST';
  const size = fitAnton(ctx, title, W * 0.86, bandH * 0.52);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#170a1c';
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.lineJoin = 'round';
  const ty = bandY + bandH * 0.34;
  ctx.strokeText(title, W / 2, ty);
  ctx.fillText(title, W / 2, ty);
  ctx.fillStyle = '#ff8fd0';
  ctx.font = `${Math.round(bandH * 0.20)}px Pacifico, cursive`;
  ctx.fillText(state.tagline || 'chase the sunset', W / 2, bandY + bandH * 0.76);
  ctx.restore();
}

function drawTiltedBackdrop(ctx, W, H, grade) {
  const grad = ctx.createLinearGradient(0, 0, W, H);
  if (grade === 'neon') {
    grad.addColorStop(0, '#2b0a4d');
    grad.addColorStop(0.5, '#7a1048');
    grad.addColorStop(1, '#0a3a4d');
  } else if (grade === 'ink') {
    grad.addColorStop(0, '#2a2a2e');
    grad.addColorStop(1, '#0c0c0e');
  } else if (grade === 'dusk') {
    grad.addColorStop(0, '#1c0f3d');
    grad.addColorStop(1, '#0a0a24');
  } else {
    grad.addColorStop(0, '#ff7a3c');
    grad.addColorStop(0.55, '#e83e7a');
    grad.addColorStop(1, '#5b1a5e');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function drawSnapshot(ctx, slot, image, panel, grade, W) {
  ctx.save();
  ctx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
  ctx.rotate(((slot.rot || 0) * Math.PI) / 180);
  const pad = Math.max(8, W * 0.012);
  const bw = slot.w + pad * 2;
  const bh = slot.h + pad * 2.2;
  ctx.fillStyle = '#fdf6ec';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = W * 0.02;
  ctx.shadowOffsetY = W * 0.008;
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  ctx.shadowColor = 'transparent';
  const inner = { x: -slot.w / 2, y: -bh / 2 + pad, w: slot.w, h: slot.h };
  drawPhoto(ctx, inner, image, panel, grade);
  gradeWash(ctx, inner, grade);
  ctx.restore();
}

function applyGrain(ctx, W, H, seed) {
  const rnd = mulberry32(seed);
  const count = Math.floor((W * H) / 420);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.restore();
}

function applyVignette(ctx, W, H) {
  const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
  grad.addColorStop(0, 'rgba(10,4,16,0)');
  grad.addColorStop(1, 'rgba(10,4,16,0.42)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function applyHalftone(ctx, W, H) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  const step = Math.max(8, Math.round(W * 0.008));
  for (let y = step / 2; y < H; y += step) {
    for (let x = step / 2; x < W; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, step * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// The main entry: draw the whole cover for a state onto a 2d context.
export function renderCover(ctx, W, H, state, images) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#14081c';
  ctx.fillRect(0, 0, W, H);
  const slots = layoutSlots(state.layout, W, H);
  if (state.layout === 'tilted') drawTiltedBackdrop(ctx, W, H, state.grade);
  for (const slot of slots) {
    if (slot.kind !== 'img') continue;
    const panel = state.panels[slot.panel] || { img: '', zoom: 1, ox: 0, oy: 0 };
    const image = images.get(panel.img);
    if (slot.rot) {
      drawSnapshot(ctx, slot, image, panel, state.grade, W);
    } else {
      drawPhoto(ctx, slot, image, panel, state.grade);
      gradeWash(ctx, slot, state.grade);
      framePanel(ctx, slot, W);
    }
  }
  if (state.layout === 'vcollage') {
    drawTitleBlock(ctx, W, H, state.title, state.tagline);
  } else if (state.layout === 'grid9') {
    drawTitleBand(ctx, W, H, state, H * 0.17);
  } else if (state.layout === 'hero3' || state.layout === 'fullbleed') {
    drawTitleBand(ctx, W, H, state, H * 0.20);
  } else if (state.layout === 'tilted') {
    const size = fitAnton(ctx, state.title || 'NEON COAST', W * 0.8, H * 0.075);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#170a1c';
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.lineJoin = 'round';
    ctx.strokeText(state.title || 'NEON COAST', W / 2, H * 0.055);
    ctx.fillText(state.title || 'NEON COAST', W / 2, H * 0.055);
    ctx.restore();
  } else if (state.layout === 'sleeve6') {
    drawTitleBand(ctx, W, H, state, H * 0.20);
  } else if (state.layout === 'poster') {
    const bandY = H * 0.74;
    ctx.fillStyle = '#14081c';
    ctx.fillRect(0, bandY, W, H - bandY);
    const title = state.title || 'NEON COAST';
    const size = fitAnton(ctx, title, W * 0.86, H * 0.085);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#170a1c';
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.lineJoin = 'round';
    ctx.strokeText(title, W / 2, bandY + H * 0.055);
    ctx.fillText(title, W / 2, bandY + H * 0.055);
    ctx.fillStyle = '#ff8fd0';
    ctx.font = `${Math.round(H * 0.028)}px Pacifico, cursive`;
    ctx.fillText(state.tagline || 'chase the sunset', W / 2, bandY + H * 0.115);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `${Math.round(H * 0.016)}px Arial, sans-serif`;
    ctx.fillText('A NEON COAST ORIGINAL  •  MADE WITH NEON COAST COVER STUDIO', W / 2, bandY + H * 0.185);
    ctx.restore();
  }
  if (state.effects.grain) applyGrain(ctx, W, H, 1337);
  if (state.effects.vignette) applyVignette(ctx, W, H);
  if (state.effects.halftone) applyHalftone(ctx, W, H);
}

// Load every sample image once; returns a Map from file path to element.
export async function loadImages(list) {
  const out = new Map();
  await Promise.all(list.map((s) => new Promise((resolve) => {
    const el = new Image();
    el.onload = () => { out.set(s.file, el); resolve(); };
    el.onerror = () => resolve();
    el.src = s.file;
  })));
  return out;
}
