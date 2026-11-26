// Meridian Ridge Runner — entry point: loop, phases, deterministic shot mode.
// One clear job: wire the modules together and drive one frame at a time.
import { CANVAS_W, CANVAS_H } from './config.js';
import { createFlightState, resetFlight, stepFlight } from './flight.js';
import { renderScene } from './render.js';
import { drawHUD, drawTitleScreen, drawEndScreen } from './instruments.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

const state = createFlightState();
const input = createInput(canvas);
const audio = createAudio();

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
let shotMode = false;
let lastRings = 0;

if (shotName) {
  // Deterministic screenshot mode: park the jet, draw one frame, stop.
  shotMode = true;
  applyShot(state, shotName);
  renderScene(ctx, state);
  drawHUD(ctx, state);
  document.title = `Meridian Ridge Runner — shot ${shotName}`;
  window.__shotReady = true;
}

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
  lastTime = now;

  if (input.consumeStart()) audio.unlock();
  if (input.consumeMute()) audio.toggleMute();
  if (state.phase === 'title' && input.consumeStart()) {
    resetFlight(state);
    lastRings = 0;
  }
  if ((state.phase === 'crashed' || state.phase === 'complete' || state.phase === 'landed')
    && input.consumeRestart()) {
    resetFlight(state);
    lastRings = 0;
  }

  if (state.phase === 'flying') {
    stepFlight(state, input, dt);
    if (state.ringsPassed > lastRings) {
      audio.ring();
      lastRings = state.ringsPassed;
    }
    if (state.phase === 'crashed') audio.thud();
    audio.setEngine(state.throttle, state.speed);
  }

  renderScene(ctx, state);
  drawHUD(ctx, state);
  if (state.phase === 'title') drawTitleScreen(ctx, state);
  if (state.phase === 'crashed' || state.phase === 'complete' || state.phase === 'landed') {
    drawEndScreen(ctx, state);
  }
  requestAnimationFrame(frame);
}

if (!shotMode) requestAnimationFrame(frame);
