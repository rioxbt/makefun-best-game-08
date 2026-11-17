// The five things that come for you, and how each of them moves. Every kind is one row of data
// and one named behaviour, so a new enemy is a row rather than a new branch in the step.

import { GUN, PALETTE, WORLD } from './config.js';
import { spawnBolt } from './bullets.js';
import { ring, spark, trail } from './particles.js';

export const KINDS = {
  drifter: { hp: 12, speed: 66, r: 14, score: 10, contact: 9, refund: GUN.refund, colour: PALETTE.drifter, behaviour: 'drift', ember: 0.3 },
  splitter: { hp: 18, speed: 82, r: 16, score: 16, contact: 10, refund: GUN.refund, colour: PALETTE.splitter, behaviour: 'drift', ember: 0.35, splits: 2 },
  shard: { hp: 8, speed: 132, r: 9, score: 6, contact: 6, refund: GUN.shardRefund, colour: PALETTE.shard, behaviour: 'drift', ember: 0.12 },
  spitter: { hp: 24, speed: 56, r: 16, score: 24, contact: 8, refund: GUN.refund, colour: PALETTE.spitter, behaviour: 'hold', range: 245, volley: 1.9, ember: 0.4 },
  brute: { hp: 50, speed: 46, r: 21, score: 40, contact: 14, refund: GUN.refund, colour: PALETTE.brute, behaviour: 'charge', wind: 1.1, dash: 300, dashTime: 0.5, rest: 0.95, ember: 1 },
};

/** Every kind the wave tables may ask for has a name there; a typo should be loud, not silent. */
export function kindOf(name) {
  const kind = KINDS[name];
  if (kind === undefined) throw new Error(`enemies: no kind named ${name}`);
  return kind;
}

function make(kind, x, y, scale) {
  const data = kindOf(kind);
  return {
    kind, x, y, vx: 0, vy: 0,
    hp: data.hp, maxHp: data.hp, r: data.r,
    speed: data.speed * scale, score: data.score,
    spawn: 0, hurt: 0, tick: 0, mode: 'ready', phase: 0, aimX: x, aimY: y,
  };
}

/** Walk in from a random edge, so a wave arrives from every side over its course. */
export function spawnEnemy(state, kind, scale = 1) {
  const data = kindOf(kind);
  const edge = state.rng.int(4);
  const pad = data.r + 26;
  const x = edge === 0 ? -pad : edge === 1 ? WORLD.width + pad : state.rng.range(60, WORLD.width - 60);
  const y = edge < 2 ? state.rng.range(60, WORLD.height - 60) : edge === 2 ? -pad : WORLD.height + pad;
  state.enemies.push(make(kind, x, y, scale));
}

export function spawnEnemyAt(state, kind, x, y, scale = 1) {
  const enemy = make(kind, x, y, scale);
  enemy.spawn = 1;
  state.enemies.push(enemy);
  ring(state, x, y, kindOf(kind).colour, 14);
}

/** Steady pursuit: the plain threat, and the shape the splitter and its shards share. */
function drift(enemy, state, dt) {
  const p = state.player;
  const dx = p.x - enemy.x;
  const dy = p.y - enemy.y;
  const d = Math.hypot(dx, dy) || 1;
  const want = enemy.speed;
  enemy.vx += ((dx / d) * want - enemy.vx) * Math.min(1, 5 * dt);
  enemy.vy += ((dy / d) * want - enemy.vy) * Math.min(1, 5 * dt);
}

/** The spitter holds its distance and lobs a bolt at you: the enemy you cannot ignore. */
function hold(enemy, state, dt) {
  const data = kindOf(enemy.kind);
  const p = state.player;
  const dx = p.x - enemy.x;
  const dy = p.y - enemy.y;
  const d = Math.hypot(dx, dy) || 1;
  const want = d < data.range - 26 ? -enemy.speed : d > data.range + 26 ? enemy.speed : 0;
  enemy.vx += ((dx / d) * want - enemy.vx) * Math.min(1, 4 * dt);
  enemy.vy += ((dy / d) * want - enemy.vy) * Math.min(1, 4 * dt);
  enemy.tick += dt;
  if (enemy.tick >= data.volley) {
    enemy.tick = 0;
    enemy.mode = 'aim';
    enemy.phase = 0.42;
    state.events.push('charge');
  }
  if (enemy.mode === 'aim') {
    enemy.phase -= dt;
    if (enemy.phase <= 0) {
      enemy.mode = 'ready';
      spawnBolt(state, enemy.x, enemy.y, (dx / d) * 210, (dy / d) * 210);
      state.events.push('bolt');
    }
  }
}

/** The brute telegraphs, then comes at you in a straight line faster than you can walk. */
function charge(enemy, state, dt) {
  const data = kindOf(enemy.kind);
  const p = state.player;
  const dx = p.x - enemy.x;
  const dy = p.y - enemy.y;
  const d = Math.hypot(dx, dy) || 1;
  if (enemy.mode === 'ready') {
    enemy.vx += ((dx / d) * enemy.speed - enemy.vx) * Math.min(1, 3 * dt);
    enemy.vy += ((dy / d) * enemy.speed - enemy.vy) * Math.min(1, 3 * dt);
    enemy.tick += dt;
    if (enemy.tick >= data.rest && d < 420) {
      enemy.mode = 'wind';
      enemy.phase = data.wind;
      state.events.push('charge');
    }
  } else if (enemy.mode === 'wind') {
    enemy.vx *= Math.exp(-6 * dt);
    enemy.vy *= Math.exp(-6 * dt);
    enemy.phase -= dt;
    enemy.aimX = p.x;
    enemy.aimY = p.y;
    if (enemy.phase <= 0) {
      enemy.mode = 'dash';
      enemy.phase = data.dashTime;
      const ax = enemy.aimX - enemy.x;
      const ay = enemy.aimY - enemy.y;
      const ad = Math.hypot(ax, ay) || 1;
      enemy.vx = (ax / ad) * data.dash;
      enemy.vy = (ay / ad) * data.dash;
      trail(state, enemy.x, enemy.y, data.colour, 5);
    }
  } else {
    enemy.phase -= dt;
    if (enemy.phase <= 0) {
      enemy.mode = 'ready';
      enemy.tick = 0;
    }
  }
}

const BEHAVIOUR = { drift, hold, charge };

export function updateEnemies(state, dt) {
  const list = state.enemies;
  const p = state.player;
  for (let i = 0; i < list.length; i += 1) {
    const e = list[i];
    const data = kindOf(e.kind);
    e.hurt = Math.max(0, e.hurt - dt);
    e.spawn = Math.min(1, e.spawn + 3.4 * dt);
    BEHAVIOUR[data.behaviour](e, state, dt);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    const margin = e.r + 2;
    e.x = Math.max(-margin * 3, Math.min(WORLD.width + margin * 3, e.x));
    e.y = Math.max(-margin * 3, Math.min(WORLD.height + margin * 3, e.y));
  }
  // Keep them from stacking into one dot: push the overlapping pairs apart.
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i];
      const b = list[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const want = a.r + b.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= want * want || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const push = ((want - d) / d) * 0.5;
      a.x -= dx * push;
      a.y -= dy * push;
      b.x += dx * push;
      b.y += dy * push;
    }
  }
  // And off the player they cannot shoot through: contact is the close-range tax.
  for (let i = 0; i < list.length; i += 1) {
    const e = list[i];
    if (e.spawn < 1) continue;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const want = e.r + p.r;
    if (dx * dx + dy * dy > want * want) continue;
    const d = Math.hypot(dx, dy) || 1;
    e.vx -= (dx / d) * 60;
    e.vy -= (dy / d) * 60;
    if (p.invuln <= 0) state.pendingContact.push({ enemy: e, x: e.x, y: e.y });
  }
}

/** A hit on an enemy: returns whether it died, and throws its blood the way the shot went. */
export function hurtEnemy(state, enemy, damage, dirX, dirY) {
  enemy.hp -= damage;
  enemy.hurt = 0.14;
  enemy.vx += dirX * 90;
  enemy.vy += dirY * 90;
  const data = kindOf(enemy.kind);
  spark(state, enemy.x, enemy.y, data.colour, 4, 150, 2.2);
  if (enemy.hp > 0) return false;
  return true;
}

/** A dead enemy's last act: the splitter comes apart into faster, weaker pieces. */
export function splitEnemy(state, enemy) {
  const data = kindOf(enemy.kind);
  if (data.splits === undefined) return;
  for (let i = 0; i < data.splits; i += 1) {
    spawnEnemyAt(state, 'shard', enemy.x + state.rng.signed() * 14, enemy.y + state.rng.signed() * 14, 1);
  }
}
