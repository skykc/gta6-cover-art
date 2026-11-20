// Neon Coast Cover Studio — page wiring.
// Owns the editor state, the undo/redo history, uploads, panel dragging
// and zooming, exports, and the ?shot= fixed scenes for screenshots.
// The canvas preview is always a pure render of `state` (see cover.js),
// so undo restores the exact pixels: rendering is deterministic.

import {
  SAMPLES, LAYOUTS, LAYOUT_NAMES, GRADE_NAMES, panelCount,
  drawCover, renderExport, panelAt, defaultState,
} from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusEl = $('status');

const EXPORT_SIZES = [
  { label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
];

// ---------------------------------------------------------------------------
// State + history. Every committed change pushes a JSON snapshot; undo/redo
// swap the whole state object, so the re-render is byte-identical.
// ---------------------------------------------------------------------------
let state = defaultState();
let undoStack = [];
let redoStack = [];
let selected = 0;          // selected panel index in the current layout
let trayPick = null;       // sample/upload chosen from the tray, awaiting a panel
const images = {};         // sample name -> HTMLImageElement
const uploads = [];        // { name, url, img }

function snapshot() { return JSON.stringify(state); }

function commit(label) {
  undoStack.push(snapshot());
  if (undoStack.length > 80) undoStack.shift();
  redoStack = [];
  refreshHistoryButtons();
  if (label) setStatus(label);
}

function restore(json) {
  state = JSON.parse(json);
  syncControls();
  redraw();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  refreshHistoryButtons();
  setStatus('Undid — cover restored');
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  refreshHistoryButtons();
  setStatus('Redid');
}

function refreshHistoryButtons() {
  $('undo').disabled = undoStack.length === 0;
  $('redo').disabled = redoStack.length === 0;
}

// ---------------------------------------------------------------------------
// Rendering + controls sync.
// ---------------------------------------------------------------------------
function redraw() {
  drawCover(canvas, state, images);
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function syncControls() {
  $('title').value = state.title;
  $('tagline').value = state.tagline;
  $('grain').checked = state.grain;
  $('vignette').checked = state.vignette;
  $('halftone').checked = state.halftone;
  document.querySelectorAll('#layouts button').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#grades button').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  const slot = state.panels[selected];
  $('zoom').value = slot ? slot.zoom : 1;
  $('zoomVal').textContent = `${Math.round((slot ? slot.zoom : 1) * 100)}%`;
  $('panelLabel').textContent = `Panel ${selected + 1} of ${panelCount(state.layout)} — ${slot ? slot.src : '—'}`;
  document.querySelectorAll('#tray .thumb').forEach((t) => {
    t.classList.toggle('picked', t.dataset.src === trayPick);
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function preloadSamples() {
  await Promise.all(SAMPLES.map(async (name) => {
    try { images[name] = await loadImage(`samples/${name}.jpg`); } catch { /* keep missing */ }
  }));
}

// ---------------------------------------------------------------------------
// Tray: the 12 samples plus user uploads. Click a thumb to pick it, then
// click a panel on the canvas to place it there.
// ---------------------------------------------------------------------------
function buildTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  const addThumb = (src, label, url) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.dataset.src = src;
    b.title = label;
    const img = document.createElement('img');
    img.src = url;
    img.alt = label;
    b.appendChild(img);
    b.addEventListener('click', () => {
      trayPick = src;
      setStatus(`Picked ${label} — click a panel to place it`);
      syncControls();
    });
    tray.appendChild(b);
  };
  SAMPLES.forEach((name) => addThumb(name, name, `samples/${name}.jpg`));
  uploads.forEach((u) => addThumb(u.name, u.name, u.url));
}

$('upload').addEventListener('change', async (e) => {
  const files = [...e.target.files].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  for (const file of files) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const name = `upload:${file.name}`;
      images[name] = img;
      uploads.push({ name, url, img });
    } catch { URL.revokeObjectURL(url); }
  }
  buildTray();
  trayPick = uploads.length ? uploads[uploads.length - 1].name : trayPick;
  setStatus(`${files.length} photo(s) added — pick one, then click a panel`);
  syncControls();
  e.target.value = '';
});

// ---------------------------------------------------------------------------
// Layout / grade / text / effect controls.
// ---------------------------------------------------------------------------
function buildPickers() {
  const layouts = $('layouts');
  Object.keys(LAYOUTS).forEach((key) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = key;
    b.textContent = LAYOUT_NAMES[key];
    b.addEventListener('click', () => {
      if (state.layout === key) return;
      commit();
      state.layout = key;
      selected = 0;
      syncControls();
      redraw();
      setStatus(`Layout: ${LAYOUT_NAMES[key]}`);
    });
    layouts.appendChild(b);
  });
  const grades = $('grades');
  Object.keys(GRADE_NAMES).forEach((key) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = key;
    b.textContent = GRADE_NAMES[key];
    b.addEventListener('click', () => {
      if (state.grade === key) return;
      commit();
      state.grade = key;
      syncControls();
      redraw();
      setStatus(`Grade: ${GRADE_NAMES[key]}`);
    });
    grades.appendChild(b);
  });
}

$('title').addEventListener('input', () => { state.title = $('title').value; redraw(); });
$('title').addEventListener('change', () => commit('Title updated'));
$('tagline').addEventListener('input', () => { state.tagline = $('tagline').value; redraw(); });
$('tagline').addEventListener('change', () => commit('Tagline updated'));

for (const key of ['grain', 'vignette', 'halftone']) {
  $(key).addEventListener('change', () => {
    commit();
    state[key] = $(key).checked;
    redraw();
    setStatus(`${key} ${state[key] ? 'on' : 'off'}`);
  });
}

$('zoom').addEventListener('input', () => {
  const slot = state.panels[selected];
  if (!slot) return;
  slot.zoom = Number($('zoom').value);
  $('zoomVal').textContent = `${Math.round(slot.zoom * 100)}%`;
  redraw();
});
$('zoom').addEventListener('change', () => commit('Zoom changed'));

$('shuffle').addEventListener('click', () => {
  commit();
  const pool = [...SAMPLES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  state.panels.forEach((slot, i) => { slot.src = pool[i % pool.length]; slot.ox = 0; slot.oy = 0; });
  syncControls();
  redraw();
  setStatus('Shuffled the photos');
});

$('undo').addEventListener('click', undo);
$('redo').addEventListener('click', redo);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
    e.preventDefault(); redo();
  }
});

// ---------------------------------------------------------------------------
// Canvas interaction: click to select / place, drag to pan the crop.
// ---------------------------------------------------------------------------
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}

let drag = null;

canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const idx = panelAt(state, canvas.width, canvas.height, p.x, p.y);
  if (idx < 0) return;
  selected = idx;
  if (trayPick) {
    commit();
    const slot = state.panels[selected];
    slot.src = trayPick;
    slot.ox = 0; slot.oy = 0; slot.zoom = 1;
    trayPick = null;
    syncControls();
    redraw();
    setStatus(`Placed ${slot.src} in panel ${selected + 1}`);
    return;
  }
  const slot = state.panels[selected];
  drag = { idx, startX: p.x, startY: p.y, ox: slot.ox, oy: slot.oy, moved: false };
  canvas.setPointerCapture(e.pointerId);
  syncControls();
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const slot = state.panels[drag.idx];
  const { panels } = (LAYOUTS[state.layout])(canvas.width, canvas.height);
  const panel = panels[drag.idx];
  const dx = (p.x - drag.startX) / (panel.w / 2);
  const dy = (p.y - drag.startY) / (panel.h / 2);
  if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) drag.moved = true;
  slot.ox = Math.max(-1, Math.min(1, drag.ox + dx));
  slot.oy = Math.max(-1, Math.min(1, drag.oy + dy));
  redraw();
});

canvas.addEventListener('pointerup', () => {
  if (drag && drag.moved) commit('Crop moved');
  drag = null;
});

// ---------------------------------------------------------------------------
// Export: exact-size PNG downloads.
// ---------------------------------------------------------------------------
function buildExportButtons() {
  const box = $('exports');
  EXPORT_SIZES.forEach(({ label, w, h }) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', () => {
      const out = renderExport(state, images, w, h);
      out.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `neon-coast-${w}x${h}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        setStatus(`Saved neon-coast-${w}x${h}.png`);
      }, 'image/png');
    });
    box.appendChild(b);
  });
}

// ---------------------------------------------------------------------------
// Deterministic test hooks (used by the puppeteer check, not by the UI).
// window.__studio exposes the state so a script can change it, undo, and
// compare the rendered pixels before and after.
// ---------------------------------------------------------------------------
window.__studio = {
  get state() { return state; },
  setState(json) { state = JSON.parse(json); syncControls(); redraw(); },
  snapshot,
  commit,
  undo,
  redo,
  renderDataURL() { return canvas.toDataURL('image/png'); },
  exportSize(w, h) {
    const out = renderExport(state, images, w, h);
    return { w: out.width, h: out.height, dataUrl: out.toDataURL('image/png') };
  },
};

// ---------------------------------------------------------------------------
// Boot.
// ---------------------------------------------------------------------------
async function boot() {
  buildPickers();
  buildExportButtons();
  buildTray();
  syncControls();
  refreshHistoryButtons();

  const params = new URLSearchParams(location.search);
  await preloadSamples();
  // Fonts must be usable BEFORE the first paint: request them now (the
  // stylesheet is certainly parsed by now) and wait until the browser
  // reports them ready. Otherwise the first canvas paint can fall back
  // to a system face and nothing repaints it afterwards.
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.load('40px Pacifico');
    await document.fonts.ready;
  } catch { /* fall back to system faces */ }
  if (params.get('shot')) {
    await runShot(params.get('shot'), params, {
      setState: (patch) => { Object.assign(state, patch); syncControls(); },
      loadSamples: () => images,
      redraw,
    });
    redraw();
    return;
  }
  redraw();
  // Paint once more on the next frame: the very first canvas paint after
  // a page load can settle a hair differently (image decode warming up),
  // and the cover the user sees — and any undo comparison — should be the
  // settled paint, not the first one.
  requestAnimationFrame(() => redraw());
  setStatus('Pick a photo from the tray, click a panel to place it.');
}

boot();
