// The screenshot scenes, behind ?shot=start|play|win|over. Each one plays the real rules forward
// from a fresh world with the autopilot on the controls, so the frame is what a real run of that
// seed looks like from the seat of a player, and the same seed always gives the same frame.

import { STEP } from './config.js';
import { resetWorld, stepWorld } from './world.js';
import { steer } from './bot.js';

/** How long a play frame may be hunted for, and the styles tried in order, best game first. */
const PLAY_LIMIT = 95;
const PLAY_STYLES = ['tidy', 'bold', 'steady'];

function kindsOnField(state) {
  const seen = new Set();
  for (let i = 0; i < state.enemies.length; i += 1) seen.add(state.enemies[i].kind);
  return seen;
}

/**
 * A frame worth putting on the judge's sheet: late enough that every kind is on the field, with
 * shots in the air and blood left to spend, rather than a clean early wave.
 */
function worthPhotographing(state) {
  if (state.wave < 5) return false;
  if (state.enemies.length < 5) return false;
  if (state.shots.length < 2) return false;
  if (state.hp < 34 || state.hp > 52) return false;
  if (state.combo < 2.5) return false;
  return kindsOnField(state).size >= 4;
}

function autoplay(state, style, seconds, phase = 0) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    stepWorld(state, steer(state, style, phase), STEP);
    if (state.phase !== 'play') return i;
  }
  return steps;
}

/** Play under the autopilot until the run ends; returns whether it ended in a win. */
function playToEnd(state, style) {
  const limit = Math.round(420 / STEP);
  for (let i = 0; i < limit; i += 1) {
    stepWorld(state, steer(state, style), STEP);
    if (state.phase !== 'play') return state.won;
  }
  return false;
}

/** Hunt for the play frame the sheet wants; the last attempt's frame stands if none satisfies it. */
function stagePlay(state, seed) {
  for (let i = 0; i < PLAY_STYLES.length; i += 1) {
    resetWorld(state, seed);
    for (let step = 0; step < Math.round(PLAY_LIMIT / STEP); step += 1) {
      stepWorld(state, steer(state, PLAY_STYLES[i]), STEP);
      if (state.phase !== 'play') break;
      if (worthPhotographing(state)) return true;
    }
  }
  resetWorld(state, seed);
  autoplay(state, 'steady', 26);
  return false;
}

/**
 * Set the world to the named scene and name the screen to draw over it: title, play, win or over.
 * An unknown name is the title.
 */
export function stageShot(name, state, seed) {
  if (name === 'win') {
    resetWorld(state, seed);
    const won = playToEnd(state, 'tidy');
    if (won) autoplay(state, 'tidy', 1.1);
    return { screen: won ? 'win' : 'over', seed: state.seed };
  }
  if (name === 'over') {
    resetWorld(state, seed);
    playToEnd(state, 'bold');
    autoplay(state, 'bold', 0.9);
    return { screen: state.won ? 'win' : 'over', seed: state.seed };
  }
  if (name === 'play') {
    stagePlay(state, seed);
    return { screen: 'play', seed: state.seed };
  }
  // The title screen is drawn over a real frame of a real fight, as it plays live.
  stagePlay(state, seed);
  return { screen: 'title', seed: state.seed };
}
