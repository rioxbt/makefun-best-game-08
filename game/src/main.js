// Boot: the canvas and its scaling, the fixed-step frame loop, the screens between runs, and the
// keys and mouse that drive them. The run itself belongs to world.js; this file only steers it.

import { FINAL_WAVE, MAX_SUBSTEPS, STEP, WORLD } from './config.js';
import { createWorld, resetWorld, stepWorld } from './world.js';
import { createInput } from './input.js';
import { steer } from './bot.js';
import { stageShot } from './shots.js';
import { drawFrame } from './render.js';
import { sfx } from './audio.js';

const BEST_KEY = 'lastshot.best';
/** A moment at which the blinking prompts are at their brightest, for a screenshot frame. */
const PROMPT_LIT = 1.9635;

const canvas = document.querySelector('#arena');
const spoken = document.querySelector('#spoken');
const ctx = canvas.getContext('2d');
canvas.width = WORLD.width;
canvas.height = WORLD.height;

function fit() {
  const scale = Math.min(window.innerWidth / WORLD.width, window.innerHeight / WORLD.height);
  canvas.style.width = `${Math.round(WORLD.width * scale)}px`;
  canvas.style.height = `${Math.round(WORLD.height * scale)}px`;
}
window.addEventListener('resize', fit);
fit();

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedArg = Number(params.get('seed'));
const world = createWorld(Number.isFinite(seedArg) && seedArg > 0 ? seedArg : 1);
const input = createInput(canvas);

let best = readBest();
let mode = 'title';
let screen = 'title';
let screenT = 0;
let demoSeed = 7;
let accum = 0;
let last = performance.now();
let frozen = shotName !== null;

if (frozen) {
  screen = stageShot(shotName, world, Number.isFinite(seedArg) && seedArg > 0 ? seedArg : 1).screen;
  // A photograph of the HUD shows the best score a run left behind, not a fresh browser's zero.
  best = screen === 'win' ? world.score : Math.round((world.score * 1.3) / 10) * 10;
  screenT = PROMPT_LIT;
  document.title = `Last Shot — ${screen}`;
  // A screenshot page must not wait for an animation frame: draw the staged frame at once.
  render();
}

function readBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function writeBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // A page without storage still plays; only the best score is forgotten.
  }
}

function startRun() {
  demoSeed += 1;
  resetWorld(world, ((Date.now() ^ Math.imul(demoSeed, 2654435761)) >>> 0) || demoSeed);
  mode = 'play';
  screen = 'play';
  screenT = 0;
  input.clearTaps();
  sfx.open();
}

function toTitle() {
  mode = 'title';
  screen = 'title';
  screenT = 0;
  resetWorld(world, demoSeed);
}

function finish(won) {
  mode = won ? 'win' : 'over';
  screen = mode;
  screenT = 0;
  if (world.score > best) {
    best = world.score;
    writeBest(best);
  }
}

/** Keys are read once a frame, never once a step, so a tap is one action however the clock runs. */
function consumeKeys() {
  if (shotName !== null) return;
  const confirm = input.tapped('Enter') || input.tapped('NumpadEnter') || input.tapped('Space');
  const back = input.tapped('Escape');
  const pauseKey = input.tapped('KeyP');
  if (input.tapped('KeyM')) {
    sfx.mute(!sfx.isMuted());
  }
  if (mode === 'title') {
    if (confirm) startRun();
  } else if (mode === 'play') {
    if (pauseKey || back) {
      mode = pauseKey ? 'pause' : 'title';
      screen = pauseKey ? 'pause' : 'title';
      screenT = 0;
      if (mode === 'title') resetWorld(world, demoSeed);
    }
  } else if (mode === 'pause') {
    if (confirm || pauseKey) {
      mode = 'play';
      screen = 'play';
    } else if (back) {
      toTitle();
    }
  } else if (confirm) {
    startRun();
  } else if (back) {
    toTitle();
  }
  input.clearTaps();
}

function announce() {
  const events = world.events;
  for (let i = 0; i < events.length; i += 1) {
    const name = events[i];
    if (name === 'shot') sfx.shot();
    else if (name === 'kill') sfx.kill();
    else if (name === 'hurt') sfx.hurt();
    else if (name === 'dry') sfx.dry();
    else if (name === 'ember') sfx.ember();
    else if (name === 'bolt') sfx.bolt();
    else if (name === 'charge') sfx.charge();
    else if (name === 'wave') {
      sfx.wave();
      spoken.textContent = `Wave ${world.wave} of ${FINAL_WAVE}`;
    } else if (name === 'win') {
      sfx.win();
      spoken.textContent = 'Every wave cleared';
    } else if (name === 'lose') {
      sfx.lose();
      spoken.textContent = 'You bled out';
    }
  }
}

function updateSim(dt) {
  if (mode === 'title') {
    stepWorld(world, steer(world, 'tidy', 1.7), dt);
    if (world.phase !== 'play') {
      demoSeed = (demoSeed * 1103515245 + 12345) & 0xffff;
      resetWorld(world, demoSeed || 3);
    }
    return;
  }
  if (mode !== 'play') return;
  stepWorld(world, input.read(), dt);
  if (world.phase === 'clear') finish(true);
  else if (world.phase === 'over') finish(false);
}

function frame(now) {
  // The next frame is asked for before this one is drawn, so one bad frame cannot end the run.
  window.requestAnimationFrame(frame);
  const dt = Math.min(0.25, Math.max(0, (now - last) / 1000));
  last = now;
  // A staged frame is frozen whole, its screen included: the same seed gives the same bytes.
  if (!frozen) screenT += dt;
  if (frozen) {
    render();
    return;
  }
  consumeKeys();
  if (mode !== 'pause') {
    accum += dt;
    let steps = 0;
    while (accum >= STEP && steps < MAX_SUBSTEPS) {
      updateSim(STEP);
      announce();
      accum -= STEP;
      steps += 1;
    }
    if (steps >= MAX_SUBSTEPS) accum = 0;
  } else {
    accum = 0;
  }
  render();
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  drawFrame(ctx, world, { screen, best, t: screenT });
  if (shotName !== null) window.__shotReady = true;
}

window.addEventListener('pointerdown', () => sfx.open(), { once: true });
window.addEventListener('keydown', () => sfx.open(), { once: true });
window.requestAnimationFrame(frame);
