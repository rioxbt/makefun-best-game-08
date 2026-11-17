// The autopilot: a small brain that plays the real rules, used for the demo behind the title
// screen and for staging the screenshot scenes. It reads the same state the player does and
// returns the same control object, so a staged frame is a frame a person could have played.

import { GUN, WORLD } from './config.js';

const SKILL = {
  steady: { reserve: 26, nerve: 150, lead: 0.28, dodge: 1, greed: 0.8 },
  bold: { reserve: 14, nerve: 210, lead: 0.2, dodge: 1.25, greed: 1.4 },
  tidy: { reserve: 34, nerve: 120, lead: 0.34, dodge: 1.6, greed: 1 },
};

function nearestEnemy(state) {
  let best = null;
  let bestD = Infinity;
  for (let i = 0; i < state.enemies.length; i += 1) {
    const e = state.enemies[i];
    const d = Math.hypot(e.x - state.player.x, e.y - state.player.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return { enemy: best, distance: bestD };
}

function nearestEmber(state) {
  let best = null;
  let bestD = Infinity;
  for (let i = 0; i < state.embers.length; i += 1) {
    const e = state.embers[i];
    const d = Math.hypot(e.x - state.player.x, e.y - state.player.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return { ember: best, distance: bestD };
}

/** Sideways push away from every bolt that is about to arrive, strongest when it is close. */
function dodgeBolts(state, out, weight) {
  const p = state.player;
  for (let i = 0; i < state.bolts.length; i += 1) {
    const b = state.bolts[i];
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > 240) continue;
    const closing = (b.vx * -dx + b.vy * -dy) / d;
    if (closing <= 0) continue;
    const time = d / closing;
    if (time > 0.55) continue;
    const urgency = (1 - time / 0.55) * (1 - d / 240) * weight;
    // Step across the bolt's line rather than straight back: standing still is what kills.
    out.x += ((-dy / d) * Math.sign(b.vx || 1) + (dx / d) * 0.7) * urgency * 4;
    out.y += ((dx / d) * Math.sign(b.vy || 1) + (dy / d) * 0.7) * urgency * 4;
  }
}

function seekCover(state, out) {
  const p = state.player;
  const { enemy, distance } = nearestEnemy(state);
  if (enemy === null) return;
  const dx = p.x - enemy.x;
  const dy = p.y - enemy.y;
  const d = Math.hypot(dx, dy) || 1;
  const close = distance < 170 ? (1 - distance / 170) ** 2 : 0;
  if (close === 0) return;
  out.x += (dx / d) * close * 1.7;
  out.y += (dy / d) * close * 1.7;
}

function stayOffWalls(state, out) {
  const p = state.player;
  const pad = 74;
  if (p.x < pad) out.x += (1 - p.x / pad) * 0.9;
  if (p.x > WORLD.width - pad) out.x -= (1 - (WORLD.width - p.x) / pad) * 0.9;
  if (p.y < pad) out.y += (1 - p.y / pad) * 0.9;
  if (p.y > WORLD.height - pad) out.y -= (1 - (WORLD.height - p.y) / pad) * 0.9;
}

function wander(state, out, phase) {
  const t = state.elapsed + phase;
  out.x += Math.cos(t * 0.7) * 0.35;
  out.y += Math.sin(t * 1.1) * 0.35;
}

/** One control frame: where to move, what to aim at, and whether to spend blood. */
export function steer(state, style = 'steady', phase = 0) {
  const skill = SKILL[style] ?? SKILL.steady;
  const p = state.player;
  const move = { x: 0, y: 0 };
  const { enemy, distance } = nearestEnemy(state);

  seekCover(state, move);
  dodgeBolts(state, move, skill.dodge);
  stayOffWalls(state, move);
  wander(state, move, phase);

  const { ember, distance: emberDistance } = nearestEmber(state);
  if (ember !== null && state.hp < 62 && emberDistance < 420) {
    const dx = ember.x - p.x;
    const dy = ember.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const pull = ((62 - state.hp) / 62) * skill.greed * 2.4;
    move.x += (dx / d) * pull;
    move.y += (dy / d) * pull;
  }

  const aim = enemy === null
    ? { x: p.x + Math.cos(p.aim) * 100, y: p.y + Math.sin(p.aim) * 100 }
    : {
        x: enemy.x + enemy.vx * skill.lead * (distance / GUN.speed),
        y: enemy.y + enemy.vy * skill.lead * (distance / GUN.speed),
        };
  const wantX = aim.x - p.x;
  const wantY = aim.y - p.y;
  const wantD = Math.hypot(wantX, wantY) || 1;
  const aimAngle = Math.atan2(wantY, wantX);
  let off = Math.abs(((aimAngle - p.aim + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  const onTarget = off < 0.09 + 0.05 * Math.min(1, 220 / wantD);
  const hungry = state.hp >= GUN.cost + GUN.minHp + skill.reserve;
  const pressed = distance < skill.nerve;
  const fire = enemy !== null && onTarget && wantD < 560 && (hungry || pressed);

  return { move, aim: { x: aim.x, y: aim.y }, fire };
}
