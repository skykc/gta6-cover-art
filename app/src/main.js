// Neon Coast Cover Studio — the editor.
//
// Owns the cover state (layout, grade, title, tagline, effects and the
// nine panels), the undo/redo history, photo uploads and the PNG export.
// The preview canvas is redrawn from state on every change, so undo and
// redo always restore the exact same pixels.

import {
  SAMPLES, LAYOUTS, GRADES, EXPORT_SIZES,
  defaultState, layoutSlots, renderCover, loadImages,
} from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const PREVIEW = 720;

let state = defaultState();
let images = new Map();
let uploads = []; // { file, url, label }
let selected = 0; // selected panel index (0..8)
let undoStack = [];
let redoStack = [];
let ready = false;

const clone = (s) => JSON.parse(JSON.stringify(s));
const snapshot = () => clone(state);

function setStatus(text) {
  statusEl.textContent = text;
  window.__coverStatus = text;
}

function render() {
  const size = EXPORT_SIZES.find((s) => s.id === state.size) || EXPORT_SIZES[0];
  canvas.width = size.w > size.h ? PREVIEW : PREVIEW;
  canvas.height = Math.round((PREVIEW * size.h) / size.w);
  renderCover(ctx, canvas.width, canvas.height, state, images);
  // In cover-only screenshot mode there is no editor, so no selection box.
  if (!document.body.classList.contains('shot-cover')) drawSelection();
  updateButtons();
}

// Outline the selected panel on the preview, in preview coordinates.
function drawSelection() {
  const slots = layoutSlots(state.layout, canvas.width, canvas.height);
  const slot = slots.find((s) => s.kind === 'img' && s.panel === selected);
  if (!slot || slot.rot) return;
  ctx.save();
  ctx.strokeStyle = '#ff2e88';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
  ctx.restore();
}

function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
}

function commit() {
  pushHistory();
  render();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  state = undoStack.pop();
  syncControls();
  render();
  setStatus('Undone — back one step.');
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  state = redoStack.pop();
  syncControls();
  render();
  setStatus('Redone.');
}

function updateButtons() {
  document.getElementById('undo').disabled = !undoStack.length;
  document.getElementById('redo').disabled = !redoStack.length;
  document.querySelectorAll('[data-layout]').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('[data-grade]').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('[data-size]').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === (state.size || '1080x1080'));
  });
  document.getElementById('zoom').value = String(state.panels[selected].zoom || 1);
  document.getElementById('zoomval').textContent = `${Math.round((state.panels[selected].zoom || 1) * 100)}%`;
  document.getElementById('panelname').textContent = `Panel ${selected + 1} of 9`;
}

function syncControls() {
  document.getElementById('title').value = state.title;
  document.getElementById('tagline').value = state.tagline;
  document.getElementById('grain').checked = state.effects.grain;
  document.getElementById('vignette').checked = state.effects.vignette;
  document.getElementById('halftone').checked = state.effects.halftone;
  document.getElementById('size').value = state.size || '1080x1080';
  buildTray();
}

// The sample tray: every sample plus every uploaded photo. Clicking one
// drops it into the selected panel.
function buildTray() {
  const tray = document.getElementById('tray');
  tray.innerHTML = '';
  const all = [
    ...SAMPLES.map((s) => ({ file: s.file, label: s.label })),
    ...uploads.map((u) => ({ file: u.url, label: u.label })),
  ];
  for (const item of all) {
    const el = document.createElement('img');
    el.src = item.file;
    el.alt = item.label;
    el.title = item.label;
    el.className = 'thumb' + (state.panels[selected].img === item.file ? ' picked' : '');
    el.addEventListener('click', () => {
      pushHistory();
      state.panels[selected].img = item.file;
      state.panels[selected].zoom = 1;
      state.panels[selected].ox = 0;
      state.panels[selected].oy = 0;
      render();
      setStatus(`${item.label} is now in panel ${selected + 1}.`);
    });
    tray.appendChild(el);
  }
}

function panelAt(px, py) {
  const rect = canvas.getBoundingClientRect();
  const x = ((px - rect.left) / rect.width) * canvas.width;
  const y = ((py - rect.top) / rect.height) * canvas.height;
  const slots = layoutSlots(state.layout, canvas.width, canvas.height);
  const hit = slots.find((s) => s.kind === 'img' && !s.rot
    && x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
  return hit ? hit.panel : null;
}

// Drag on the preview pans the photo inside the selected panel.
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (hit === null) return;
  selected = hit;
  const panel = state.panels[selected];
  drag = { x: e.clientX, y: e.clientY, ox: panel.ox, oy: panel.oy, moved: false };
  canvas.setPointerCapture(e.pointerId);
  render();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const panel = state.panels[selected];
  const slots = layoutSlots(state.layout, canvas.width, canvas.height);
  const slot = slots.find((s) => s.kind === 'img' && s.panel === selected);
  if (!slot) return;
  const dx = ((e.clientX - drag.x) / rect.width) * canvas.width;
  const dy = ((e.clientY - drag.y) / rect.height) * canvas.height;
  const spanX = Math.max(1, (slot.w * (panel.zoom || 1)) - slot.w);
  const spanY = Math.max(1, (slot.h * (panel.zoom || 1)) - slot.h);
  panel.ox = Math.max(-1, Math.min(1, drag.ox + (dx / spanX) * 2));
  panel.oy = Math.max(-1, Math.min(1, drag.oy + (dy / spanY) * 2));
  if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 3) drag.moved = true;
  render();
});
canvas.addEventListener('pointerup', () => {
  if (drag && drag.moved) pushHistory();
  drag = null;
  updateButtons();
});

document.getElementById('zoom').addEventListener('input', (e) => {
  state.panels[selected].zoom = Number(e.target.value);
  render();
});
document.getElementById('zoom').addEventListener('change', () => {
  pushHistory();
  render();
});

document.getElementById('title').addEventListener('input', (e) => {
  state.title = e.target.value.toUpperCase().slice(0, 24);
  render();
});
document.getElementById('title').addEventListener('change', () => { pushHistory(); render(); });
document.getElementById('tagline').addEventListener('input', (e) => {
  state.tagline = e.target.value.slice(0, 40);
  render();
});
document.getElementById('tagline').addEventListener('change', () => { pushHistory(); render(); });

for (const key of ['grain', 'vignette', 'halftone']) {
  document.getElementById(key).addEventListener('change', (e) => {
    pushHistory();
    state.effects[key] = e.target.checked;
    render();
  });
}

document.querySelectorAll('[data-layout]').forEach((b) => {
  b.addEventListener('click', () => {
    if (state.layout === b.dataset.layout) return;
    pushHistory();
    state.layout = b.dataset.layout;
    render();
    setStatus(`Layout: ${b.textContent.trim()}.`);
  });
});
document.querySelectorAll('[data-grade]').forEach((b) => {
  b.addEventListener('click', () => {
    if (state.grade === b.dataset.grade) return;
    pushHistory();
    state.grade = b.dataset.grade;
    render();
    setStatus(`Grade: ${b.textContent.trim()}.`);
  });
});
document.querySelectorAll('[data-size]').forEach((b) => {
  b.addEventListener('click', () => {
    state.size = b.dataset.size;
    render();
    setStatus(`Export size: ${b.textContent.trim()}.`);
  });
});

document.getElementById('undo').addEventListener('click', undo);
document.getElementById('redo').addEventListener('click', redo);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
});

document.getElementById('shuffle').addEventListener('click', () => {
  pushHistory();
  const pool = SAMPLES.map((s) => s.file);
  const order = [...pool].sort(() => Math.random() - 0.5);
  state.panels = state.panels.map((p, i) => ({ ...p, img: order[i % order.length], zoom: 1, ox: 0, oy: 0 }));
  render();
  setStatus('Shuffled the panels.');
});

document.getElementById('reset').addEventListener('click', () => {
  pushHistory();
  state = defaultState();
  state.size = document.getElementById('size').value || '1080x1080';
  syncControls();
  render();
  setStatus('Reset to the Neon Coast starter cover.');
});

document.getElementById('upload').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  for (const file of files) {
    const url = URL.createObjectURL(file);
    uploads.push({ file, url, label: file.name.replace(/\.[^.]+$/, '') });
    const el = new Image();
    await new Promise((resolve) => { el.onload = resolve; el.onerror = resolve; el.src = url; });
    images.set(url, el);
  }
  pushHistory();
  if (files.length) {
    state.panels[selected].img = uploads[uploads.length - 1].url;
    state.panels[selected].zoom = 1;
    state.panels[selected].ox = 0;
    state.panels[selected].oy = 0;
  }
  buildTray();
  render();
  setStatus(`${files.length} photo${files.length === 1 ? '' : 's'} added — the last one is in panel ${selected + 1}.`);
});

// Export: render the cover at the chosen post size and download the PNG.
document.getElementById('export').addEventListener('click', () => {
  const size = EXPORT_SIZES.find((s) => s.id === (state.size || '1080x1080')) || EXPORT_SIZES[0];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  renderCover(off.getContext('2d'), size.w, size.h, state, images);
  off.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — the canvas was empty.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-${size.id}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Exported ${size.label} PNG.`);
  }, 'image/png');
  window.__lastExport = { w: size.w, h: size.h };
});

// Exposed for the interaction tests: hash the preview pixels so a test
// can prove undo/redo restores them exactly.
window.__imagesReady = () => [...images.entries()].map(([k, v]) => [k, v.naturalWidth]);
window.__pixelHash = async () => {
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let h1 = 5381;
  let h2 = 52711;
  for (let i = 0; i < data.length; i += 997) {
    h1 = ((h1 * 33) ^ data[i]) >>> 0;
    h2 = ((h2 * 31) + data[i]) >>> 0;
  }
  return `${h1.toString(16)}-${h2.toString(16)}`;
};
window.__editorState = () => ({ state: clone(state), selected, undo: undoStack.length, redo: redoStack.length });
window.__doUndo = undo;
window.__doRedo = redo;
window.__pickLayout = (id) => { pushHistory(); state.layout = id; render(); };
window.__pickGrade = (id) => { pushHistory(); state.grade = id; render(); };
window.__layoutSlots = (layout, w, h) => layoutSlots(layout, w, h);

async function boot() {
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  images = await loadImages(SAMPLES);
  if (shot) {
    await runShot(shot, query, { state: () => state, setState: (s) => { state = s; }, images, render, syncControls, buildTray });
    ready = true;
    return;
  }
  state.size = '1080x1080';
  syncControls();
  render();
  setStatus('Ready — pick a panel, drop in a photo, export your cover.');
  ready = true;
  window.__shotReady = true;
}

document.fonts.ready.then(() => { if (ready) render(); });
boot();
