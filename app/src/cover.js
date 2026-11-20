// Neon Coast Cover Studio — cover renderer.
// Draws a GTA-style multi-panel cover onto any 2D canvas from a plain
// state object: layout, grade, title, tagline, per-panel crop and effects.
// Rendering is fully deterministic: the grain tile is built once from a
// fixed seed, so re-rendering the same state yields identical pixels
// (that is what makes undo/redo restore a cover pixel-perfectly).

export const SAMPLES = [
  'mafia', 'bikini', 'lambo', 'convertible', 'skater', 'lifeguard',
  'rider', 'gator', 'bartrio', 'carwoman', 'diner', 'yacht',
];

// Default photo for each of the 8 panel slots, in collage reading order.
export const DEFAULT_SLOTS = [
  'mafia', 'lambo', 'carwoman', 'bikini', 'lifeguard', 'rider', 'gator', 'bartrio',
];

// Five gradient-map grades: [stop, r, g, b] stops from shadow to highlight.
export const GRADES = {
  sunset: [
    [0.0, 26, 8, 54], [0.25, 96, 24, 96], [0.5, 214, 48, 108],
    [0.75, 255, 122, 64], [1.0, 255, 214, 120],
  ],
  neon: [
    [0.0, 6, 8, 40], [0.3, 52, 16, 110], [0.55, 214, 32, 160],
    [0.8, 44, 220, 220], [1.0, 190, 255, 250],
  ],
  tealgold: [
    [0.0, 4, 34, 38], [0.3, 10, 96, 104], [0.6, 40, 160, 140],
    [0.85, 232, 178, 80], [1.0, 255, 240, 200],
  ],
  ink: [
    [0.0, 8, 8, 12], [0.35, 70, 70, 80], [0.7, 165, 165, 175], [1.0, 248, 248, 252],
  ],
  dusk: [
    [0.0, 16, 10, 48], [0.3, 74, 28, 110], [0.6, 168, 52, 128],
    [0.85, 244, 110, 110], [1.0, 255, 196, 160],
  ],
};

export const GRADE_NAMES = {
  sunset: 'Sunset', neon: 'Neon', tealgold: 'Teal Gold', ink: 'Ink', dusk: 'Dusk',
};

// ---------------------------------------------------------------------------
// Layouts. Each returns { panels: [{x,y,w,h,rot}], title: {...} } in pixels
// for a canvas of W x H. Panels are unit fractions of the canvas.
// ---------------------------------------------------------------------------
function grid(w, h, cols, rows, gap) {
  const cw = (w - gap * (cols + 1)) / cols;
  const ch = (h - gap * (rows + 1)) / rows;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ x: gap + c * (cw + gap), y: gap + r * (ch + gap), w: cw, h: ch, rot: 0 });
    }
  }
  return cells;
}

export const LAYOUTS = {
  // 3x3 collage; the centre cell is the V title block, not a photo. The
  // block overflows the centre cell so the V can straddle its neighbours,
  // like the classic key-art cover.
  grid9(W, H) {
    const cells = grid(W, H, 3, 3, W * 0.008);
    const c = cells[4];
    const panels = cells.filter((_, i) => i !== 4);
    return {
      panels,
      title: {
        kind: 'vblock',
        x: c.x - c.w * 0.35, y: c.y - c.h * 0.10,
        w: c.w * 1.70, h: c.h * 1.20,
      },
    };
  },
  // One big hero on top, three panels along the bottom.
  hero3(W, H) {
    const g = W * 0.008;
    const hero = { x: g, y: g, w: W - 2 * g, h: H * 0.60 - g, rot: 0 };
    const bw = (W - 4 * g) / 3;
    const by = H * 0.60 + g;
    const bh = H - by - g;
    const panels = [hero];
    for (let i = 0; i < 3; i++) panels.push({ x: g + i * (bw + g), y: by, w: bw, h: bh, rot: 0 });
    return { panels, title: { kind: 'band', x: 0, y: H * 0.60, w: W, h: H * 0.10 } };
  },
  // A single photo edge to edge, title band across the foot.
  fullbleed(W, H) {
    return {
      panels: [{ x: 0, y: 0, w: W, h: H, rot: 0 }],
      title: { kind: 'band', x: 0, y: H * 0.78, w: W, h: H * 0.22 },
    };
  },
  // Three snapshots tossed on a gradient table, slightly rotated.
  tilted(W, H) {
    const panels = [
      { x: W * 0.03, y: H * 0.06, w: W * 0.56, h: H * 0.58, rot: -0.07 },
      { x: W * 0.42, y: H * 0.04, w: W * 0.55, h: H * 0.60, rot: 0.05 },
      { x: W * 0.20, y: H * 0.42, w: W * 0.60, h: H * 0.54, rot: -0.03 },
    ];
    return { panels, title: { kind: 'vblock', x: W * 0.30, y: H * 0.30, w: W * 0.40, h: H * 0.30 } };
  },
  // Six panels, two columns by three rows, title strip along the foot.
  sleeve6(W, H) {
    const cells = grid(W, H * 0.86, 2, 3, W * 0.008);
    return { panels: cells, title: { kind: 'band', x: 0, y: H * 0.86, w: W, h: H * 0.14 } };
  },
  // Poster: big photo up top, dark title field underneath.
  poster(W, H) {
    return {
      panels: [{ x: 0, y: 0, w: W, h: H * 0.66, rot: 0 }],
      title: { kind: 'poster', x: 0, y: H * 0.66, w: W, h: H * 0.34 },
    };
  },
  // Two tall panels split down the middle, V block straddling the seam.
  duo(W, H) {
    const g = W * 0.008;
    const panels = [
      { x: g, y: g, w: W / 2 - 1.5 * g, h: H - 2 * g, rot: 0 },
      { x: W / 2 + 0.5 * g, y: g, w: W / 2 - 1.5 * g, h: H - 2 * g, rot: 0 },
    ];
    return { panels, title: { kind: 'vblock', x: W * 0.28, y: H * 0.34, w: W * 0.44, h: H * 0.30 } };
  },
};

export const LAYOUT_NAMES = {
  grid9: 'Grid 9', hero3: 'Hero 3', fullbleed: 'Full Bleed', tilted: 'Tilted',
  sleeve6: 'Sleeve 6', poster: 'Poster', duo: 'Duo',
};

export function panelCount(layout) {
  return LAYOUTS[layout](100, 100).panels.length;
}

// ---------------------------------------------------------------------------
// Gradient-map LUTs and the deterministic effect tiles.
// ---------------------------------------------------------------------------
const lutCache = new Map();

function buildLut(grade) {
  if (lutCache.has(grade)) return lutCache.get(grade);
  const stops = GRADES[grade] ?? GRADES.sunset;
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
    lut[i * 3] = a[1] + (b[1] - a[1]) * f;
    lut[i * 3 + 1] = a[2] + (b[2] - a[2]) * f;
    lut[i * 3 + 2] = a[3] + (b[3] - a[3]) * f;
  }
  lutCache.set(grade, lut);
  return lut;
}

// Fixed-seed PRNG so the grain tile is identical on every load.
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const rnd = mulberry32(20261120);
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

let halftoneTile = null;
function getHalftoneTile() {
  if (halftoneTile) return halftoneTile;
  const c = document.createElement('canvas');
  c.width = 12; c.height = 12;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(6, 6, 2.6, 0, Math.PI * 2); ctx.fill();
  halftoneTile = c;
  return c;
}

// Draws one image into a panel rect with cover-fit + pan/zoom crop, then
// applies the grade's gradient map. Returns an offscreen canvas.
function gradedPanel(img, grade, w, h, ox, oy, zoom) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  const ctx = c.getContext('2d');
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(w / iw, h / ih) * Math.max(1, zoom);
  const dw = iw * scale;
  const dh = ih * scale;
  const maxX = Math.max(0, (dw - w) / 2);
  const maxY = Math.max(0, (dh - h) / 2);
  const dx = (w - dw) / 2 + (ox || 0) * maxX;
  const dy = (h - dh) / 2 + (oy || 0) * maxY;
  ctx.drawImage(img, dx, dy, dw, dh);
  const lut = buildLut(grade);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    // Luminance drives the gradient map; keep a little of the photo's hue.
    const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    const k = lum * 3;
    d[i] = lut[k] * 0.72 + d[i] * 0.28;
    d[i + 1] = lut[k + 1] * 0.72 + d[i + 1] * 0.28;
    d[i + 2] = lut[k + 2] * 0.72 + d[i + 2] * 0.28;
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

function fitFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

// The V title block: an inverted triangle in sunset gradient, the title in
// big white Anton with a dark outline, tagline in Pacifico on a dark pill.
function drawVBlock(ctx, t, title, tagline) {
  const { x, y, w, h } = t;
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#ff2e88');
  grad.addColorStop(0.45, '#ff5e62');
  grad.addColorStop(1, '#ff9a3d');
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(2, w * 0.012);
  ctx.strokeStyle = 'rgba(20, 4, 24, 0.9)';
  ctx.stroke();
  const lines = title.trim().toUpperCase().split(/\s+/);
  const mid = Math.ceil(lines.length / 2);
  const line1 = lines.slice(0, mid).join(' ');
  const line2 = lines.slice(mid).join(' ') || line1;
  const twoLines = lines.length > 1;
  // Each line sits at its own height inside the triangle, so each line is
  // fitted to the triangle's width at that height (the triangle narrows
  // toward its point). Both lines share the smaller of the two fits, so
  // they read as one even block.
  const f1 = 0.16;
  const f2 = 0.38;
  const wAt = (f) => w * (1 - f) * 0.92;
  let size = fitFont(ctx, line1, wAt(f1), h * 0.40, 'Anton, sans-serif');
  if (twoLines) size = Math.min(size, fitFont(ctx, line2, wAt(f2), h * 0.40, 'Anton, sans-serif'));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.strokeStyle = '#160418';
  ctx.fillStyle = '#ffffff';
  const gap = size * 1.04;
  const cy = twoLines ? y + h * 0.27 : y + h * 0.30;
  if (twoLines) {
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.strokeText(line1, x + w / 2, cy - gap / 2);
    ctx.fillText(line1, x + w / 2, cy - gap / 2);
    ctx.strokeText(line2, x + w / 2, cy + gap / 2);
    ctx.fillText(line2, x + w / 2, cy + gap / 2);
  } else {
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.strokeText(line1, x + w / 2, cy);
    ctx.fillText(line1, x + w / 2, cy);
  }
  if (tagline && tagline.trim()) {
    const pillH = h * 0.13;
    const pillY = y + h * 0.70;
    const tag = tagline.trim();
    const tSize = fitFont(ctx, tag, w * 0.7, pillH * 0.66, 'Pacifico, cursive');
    const pillW = Math.min(w * 0.86, ctx.measureText(tag).width + pillH * 1.5);
    ctx.fillStyle = 'rgba(18, 2, 20, 0.94)';
    ctx.beginPath();
    ctx.roundRect(x + (w - pillW) / 2, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.lineWidth = Math.max(2, pillH * 0.06);
    ctx.strokeStyle = '#ff2e88';
    ctx.stroke();
    ctx.fillStyle = '#ff8fd0';
    ctx.font = `${tSize}px Pacifico, cursive`;
    ctx.fillText(tag, x + w / 2, pillY + pillH / 2 + tSize * 0.05);
  }
  ctx.restore();
}

// A title band across the foot (fullbleed / hero3 / sleeve6) or a poster
// field: dark gradient rising from the bottom, big title + tagline.
function drawBand(ctx, t, title, tagline, W, H, posterStyle) {
  const { x, y, w, h } = t;
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, 'rgba(12, 2, 18, 0)');
  grad.addColorStop(0.45, 'rgba(12, 2, 18, 0.82)');
  grad.addColorStop(1, 'rgba(12, 2, 18, 0.96)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  const text = title.trim().toUpperCase();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const size = fitFont(ctx, text, w * 0.92, posterStyle ? h * 0.42 : h * 0.62, 'Anton, sans-serif');
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.lineWidth = Math.max(2, size * 0.12);
  ctx.strokeStyle = '#160418';
  ctx.fillStyle = '#ffffff';
  const cy = posterStyle ? y + h * 0.34 : y + h * 0.46;
  ctx.strokeText(text, x + w / 2, cy);
  ctx.fillText(text, x + w / 2, cy);
  if (tagline && tagline.trim()) {
    const tSize = fitFont(ctx, tagline.trim(), w * 0.7, posterStyle ? h * 0.16 : h * 0.24, 'Pacifico, cursive');
    ctx.fillStyle = '#ff8fd0';
    ctx.font = `${tSize}px Pacifico, cursive`;
    ctx.fillText(tagline.trim(), x + w / 2, cy + size * 0.62 + tSize * 0.4);
  }
}

// ---------------------------------------------------------------------------
// Main entry: draws the whole cover onto `canvas` (any size).
// `images` maps sample name -> HTMLImageElement (or null while loading).
// ---------------------------------------------------------------------------
export function drawCover(canvas, state, images) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  // Deep purple table under everything (visible between tilted panels).
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#2a0a3e');
  bg.addColorStop(0.5, '#12041f');
  bg.addColorStop(1, '#3d0a2e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const layout = LAYOUTS[state.layout] ?? LAYOUTS.grid9;
  const { panels, title } = layout(W, H);
  const gap = Math.max(2, W * 0.006);

  panels.forEach((p, i) => {
    const slot = state.panels[i];
    const img = slot ? images[slot.src] : null;
    if (!img) return;
    const graded = gradedPanel(img, state.grade, p.w, p.h, slot.ox, slot.oy, slot.zoom);
    ctx.save();
    if (p.rot) {
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.rot);
      ctx.translate(-p.w / 2, -p.h / 2);
      ctx.drawImage(graded, 0, 0, p.w, p.h);
      ctx.restore();
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.rot);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = gap;
      ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    } else {
      ctx.drawImage(graded, p.x, p.y, p.w, p.h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = gap * 0.7;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }
    ctx.restore();
  });

  if (title.kind === 'vblock') drawVBlock(ctx, title, state.title, state.tagline);
  else if (title.kind === 'band') drawBand(ctx, title, state.title, state.tagline, W, H, false);
  else if (title.kind === 'poster') drawBand(ctx, title, state.title, state.tagline, W, H, true);

  if (state.vignette) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(8, 0, 16, 0)');
    vg.addColorStop(1, 'rgba(8, 0, 16, 0.38)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  if (state.halftone) {
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = ctx.createPattern(getHalftoneTile(), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // Thin neon frame, the cover's outer edge.
  ctx.strokeStyle = 'rgba(255, 46, 136, 0.5)';
  ctx.lineWidth = Math.max(2, W * 0.004);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
}

// Renders the state to a fresh canvas of the exact export size.
export function renderExport(state, images, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  drawCover(c, state, images);
  return c;
}

// Panel hit-test in canvas pixel coordinates (for click-to-select).
export function panelAt(state, W, H, px, py) {
  const { panels } = (LAYOUTS[state.layout] ?? LAYOUTS.grid9)(W, H);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) return i;
  }
  return -1;
}

export function defaultState() {
  return {
    layout: 'grid9',
    grade: 'sunset',
    title: 'NEON COAST',
    tagline: 'chase the sunset',
    grain: true,
    vignette: true,
    halftone: false,
    panels: DEFAULT_SLOTS.map((src) => ({ src, ox: 0, oy: 0, zoom: 1 })),
  };
}
