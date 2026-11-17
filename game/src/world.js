// The world holds the run and steps it: waves, the blood economy, collisions, and the moment the
// run is won or lost. One fixed step, no wall clock, no randomness outside the seeded generator,
// so the same seed and the same input always produce the same run.

import { BANNER, COMBO, EMBER, FINAL_WAVE, GUN, PALETTE, PLAYER, WAVE_BREAK, waveSpec } from './config.js';
import { makeRng, mixSeed } from './random.js';
import { canFire, createPlayer, healPlayer, hurtPlayer, payForShot, updatePlayer } from './player.js';
import { kindOf, hurtEnemy, spawnEnemy, splitEnemy, updateEnemies } from './enemies.js';
import { spawnShot, updateBolts, updateShots } from './bullets.js';
import { dropEmber, updateEmbers } from './pickups.js';
import { ring, shake, spark, trail, updateParticles } from './particles.js';

export function createWorld(seed = 1) {
  const state = {
    seed: 1, rng: makeRng(1), sparkRng: makeRng(2),
    phase: 'play', elapsed: 0, outcomeT: 0,
    wave: 0, spec: waveSpec(1), spawnLeft: 0, spawnTimer: 0, waveBreak: 1.1,
    hp: PLAYER.startHp,
    score: 0, kills: 0, shotsFired: 0, shotsHit: 0, damageTaken: 0,
    combo: 1, comboTimer: 0, longest: 1,
    banner: { title: '', sub: '' }, bannerT: 0,
    shake: 0, won: false,
    player: createPlayer(),
    enemies: [], shots: [], bolts: [], embers: [], particles: [], floaters: [], pendingContact: [],
    events: [],
  };
  resetWorld(state, seed);
  return state;
}

export function resetWorld(state, seed) {
  state.seed = seed >>> 0 || 1;
  state.rng = makeRng(state.seed);
  state.sparkRng = makeRng(mixSeed(state.seed, 'spark'));
  state.phase = 'play';
  state.elapsed = 0;
  state.outcomeT = 0;
  state.wave = 0;
  state.spec = waveSpec(1);
  state.spawnLeft = 0;
  state.spawnTimer = 0;
  state.waveBreak = 1;
  state.hp = PLAYER.startHp;
  state.score = 0;
  state.kills = 0;
  state.shotsFired = 0;
  state.shotsHit = 0;
  state.damageTaken = 0;
  state.combo = 1;
  state.comboTimer = 0;
  state.longest = 1;
  state.banner = { title: '', sub: '' };
  state.bannerT = 0;
  state.shake = 0;
  state.won = false;
  state.player = createPlayer();
  state.enemies.length = 0;
  state.shots.length = 0;
  state.bolts.length = 0;
  state.embers.length = 0;
  state.particles.length = 0;
  state.floaters.length = 0;
  state.pendingContact.length = 0;
  state.events.length = 0;
  return state;
}

export function accuracyOf(state) {
  return state.shotsFired === 0 ? 0 : state.shotsHit / state.shotsFired;
}

function floater(state, x, y, text, colour, size = 14) {
  state.floaters.push({ x, y, text, colour, life: 0.9, max: 0.9, size, drift: -26 });
}

function nextWave(state) {
  state.wave += 1;
  state.spec = waveSpec(state.wave);
  state.spawnLeft = state.spec.total;
  state.spawnTimer = 0.45;
  state.banner = { title: `WAVE ${state.wave} / ${FINAL_WAVE}`, sub: state.spec.kinds.join('  ·  ') };
  state.bannerT = BANNER;
  state.events.push('wave');
}

function updateWave(state, dt) {
  if (state.waveBreak > 0) {
    state.waveBreak -= dt;
    if (state.waveBreak <= 0) nextWave(state);
    return;
  }
  if (state.spawnLeft > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEnemy(state, state.rng.pick(state.spec.kinds), state.spec.speed);
      state.spawnLeft -= 1;
      state.spawnTimer = state.spec.gap * state.rng.range(0.75, 1.25);
    }
    return;
  }
  if (state.enemies.length > 0) return;
  if (state.wave >= FINAL_WAVE) {
    state.phase = 'clear';
    state.won = true;
    state.outcomeT = 0;
    state.banner = { title: 'ARENA CLEAR', sub: 'every wave you were sent' };
    state.bannerT = BANNER;
    state.events.push('win');
    return;
  }
  state.waveBreak = WAVE_BREAK;
  state.banner = { title: `WAVE ${state.wave} CLEAR`, sub: 'catch your breath' };
  state.bannerT = BANNER * 0.7;
  state.events.push('clear');
}

function tryFire(state) {
  const p = state.player;
  if (canFire(state)) {
    payForShot(state);
    spawnShot(state, p.x + Math.cos(p.aim) * (p.r + 4), p.y + Math.sin(p.aim) * (p.r + 4), p.aim, GUN.spread * state.rng.signed());
    ring(state, p.x + Math.cos(p.aim) * (p.r + 3), p.y + Math.sin(p.aim) * (p.r + 3), PALETTE.shot, 7);
    shake(state, 1.4);
    state.events.push('shot');
  } else if (p.cool <= 0 && p.dry <= 0) {
    p.dry = 0.4;
    state.events.push('dry');
  }
}

function kill(state, enemy) {
  const data = kindOf(enemy.kind);
  const mult = state.combo;
  const points = Math.round(data.score * mult);
  state.kills += 1;
  state.score += points;
  state.combo = Math.min(COMBO.max, state.combo + COMBO.step);
  state.comboTimer = COMBO.hold;
  state.longest = Math.max(state.longest, state.combo);
  healPlayer(state, data.refund);
  spark(state, enemy.x, enemy.y, data.colour, 16, 260, 3);
  ring(state, enemy.x, enemy.y, data.colour, enemy.r * 2.4);
  shake(state, 3.4);
  floater(state, enemy.x, enemy.y - 10, `+${points}`, PALETTE.ink, 15);
  floater(state, enemy.x, enemy.y + 8, `+${data.refund} BLOOD`, PALETTE.bloodPale, 11);
  splitEnemy(state, enemy);
  if (state.rng.next() < data.ember) dropEmber(state, enemy.x, enemy.y);
  state.events.push('kill');
}

function collideShots(state) {
  const shots = state.shots;
  const enemies = state.enemies;
  let write = 0;
  for (let i = 0; i < shots.length; i += 1) {
    const s = shots[i];
    let spent = false;
    for (let j = 0; j < enemies.length; j += 1) {
      const e = enemies[j];
      const dx = e.x - s.x;
      const dy = e.y - s.y;
      const want = e.r + s.r;
      if (dx * dx + dy * dy > want * want) continue;
      spent = true;
      state.shotsHit += 1;
      const len = Math.hypot(s.vx, s.vy) || 1;
      if (hurtEnemy(state, e, GUN.damage, s.vx / len, s.vy / len)) {
        kill(state, e);
        enemies.splice(j, 1);
      }
      break;
    }
    if (spent) continue;
    shots[write] = s;
    write += 1;
  }
  shots.length = write;
}

function collideBolts(state) {
  const p = state.player;
  const bolts = state.bolts;
  let write = 0;
  for (let i = 0; i < bolts.length; i += 1) {
    const b = bolts[i];
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const want = p.r + b.r;
    if (dx * dx + dy * dy <= want * want) {
      hurtPlayer(state, 9, b.x, b.y);
      spark(state, b.x, b.y, PALETTE.spitter, 8, 180, 2.4);
      continue;
    }
    bolts[write] = b;
    write += 1;
  }
  bolts.length = write;
}

function resolveContacts(state) {
  const list = state.pendingContact;
  for (let i = 0; i < list.length; i += 1) {
    const hit = list[i];
    if (!state.enemies.includes(hit.enemy)) continue;
    const e = hit.enemy;
    if (hurtPlayer(state, kindOf(e.kind).contact, hit.x, hit.y)) {
      // A body that hits you is spent: it bursts, and no kill is paid for it.
      spark(state, e.x, e.y, kindOf(e.kind).colour, 12, 220, 2.8);
      state.enemies.splice(state.enemies.indexOf(e), 1);
    }
  }
}

function collectEmbers(state) {
  const p = state.player;
  const list = state.embers;
  let write = 0;
  for (let i = 0; i < list.length; i += 1) {
    const e = list[i];
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const want = p.r + e.r + 3;
    if (dx * dx + dy * dy <= want * want) {
      healPlayer(state, EMBER.heal);
      spark(state, e.x, e.y, PALETTE.ember, 12, 200, 2.6);
      ring(state, e.x, e.y, PALETTE.ember, 20);
      floater(state, e.x, e.y - 8, `+${EMBER.heal} BLOOD`, PALETTE.ember, 13);
      state.events.push('ember');
      continue;
    }
    list[write] = e;
    write += 1;
  }
  list.length = write;
}

function decayCombo(state, dt) {
  state.comboTimer -= dt;
  if (state.comboTimer <= 0) state.combo = Math.max(1, state.combo - COMBO.decay * dt);
}

function updateFloaters(state, dt) {
  const list = state.floaters;
  let write = 0;
  for (let i = 0; i < list.length; i += 1) {
    const f = list[i];
    f.life -= dt;
    if (f.life <= 0) continue;
    f.y += f.drift * dt;
    list[write] = f;
    write += 1;
  }
  list.length = write;
}

/** One fixed step of the run. `input` is {move:{x,y}, aim:{x,y}, fire}. */
export function stepWorld(state, input, dt) {
  state.events.length = 0;
  state.pendingContact.length = 0;
  updateParticles(state, dt);
  updateFloaters(state, dt);
  state.bannerT = Math.max(0, state.bannerT - dt);
  if (state.phase !== 'play') {
    state.outcomeT += dt;
    updateShots(state, dt);
    updateBolts(state, dt);
    return;
  }
  state.elapsed += dt;
  updateWave(state, dt);
  updatePlayer(state, input, dt);
  // A wake behind a moving mote: the arena reads as alive even between kills.
  const mote = state.player;
  if (Math.hypot(mote.vx, mote.vy) > 70 && state.sparkRng.next() < 0.45) trail(state, mote.x, mote.y, PALETTE.player, 2.4);
  if (input.fire) tryFire(state);
  updateEnemies(state, dt);
  updateShots(state, dt);
  updateBolts(state, dt);
  updateEmbers(state, dt);
  collideShots(state);
  collideBolts(state);
  resolveContacts(state);
  collectEmbers(state);
  decayCombo(state, dt);
}
