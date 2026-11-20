// Fixed scenes for screenshots: ?shot=1-cover shows the V collage alone,
// ?shot=2-editor the editor with photos loaded, ?shot=3-cover the tilted
// layout, ?shot=4-cover the poster layout. window.__shotReady is set once
// the scene has painted, so the screenshot tool can capture it.

import { defaultState } from './cover.js';

const PRESETS = {
  '1-cover': { layout: 'vcollage', grade: 'sunset', coverOnly: true },
  '2-editor': { layout: 'vcollage', grade: 'sunset', coverOnly: false },
  '3-cover': { layout: 'tilted', grade: 'neon', coverOnly: true },
  '4-cover': { layout: 'poster', grade: 'dusk', coverOnly: true },
};

// `api` is the editor's handle: state accessors, the renderer and the
// control sync, passed in from main.js so this file stays small.
export async function runShot(shot, query, api) {
  const preset = PRESETS[shot] || PRESETS['2-editor'];
  const state = defaultState();
  state.layout = query.get('layout') || preset.layout;
  state.grade = query.get('grade') || preset.grade;
  state.title = query.get('title') || 'NEON COAST';
  state.tagline = query.get('tagline') || 'chase the sunset';
  state.size = '1080x1080';
  api.setState(state);
  api.syncControls();
  if (preset.coverOnly) document.body.classList.add('shot-cover');
  api.render();
  // Two frames, so the canvas paint and the webfonts have landed.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await document.fonts.ready;
  api.render();
  window.__shotReady = true;
}
