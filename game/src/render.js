// The arena and everything in it: floor, motes, embers, the shapes that come for you, your paid-for
// shots, the mote you steer, and the sparks of every hit. It only reads the run's state, so any
// frame can be reproduced from a seed; the screens that say what the game is live in screens.js.

import { GUN, PALETTE, WORLD } from './config.js';
import { say } from './text.js';
import { drawScreen } from './screens.js';
import { drawHud, drawRuleLine } from './hud.js';

const BLEED = 30;

const SHAPES = {
  drifter: { points: 3, offset: Math.PI / 2, hole: 0.32, spin: true },
  splitter: { points: 6, offset: Math.PI / 6, hole: 0.36, spin: true },
  shard: { points: 4, offset: Math.PI / 4, hole: 0.28, spin: true },
  spitter: { points: 4, offset: 0, hole: 0.44, spin: true },
  brute: { points: 8, offset: Math.PI / 8, hole: 0.5, spin: false },
};

const COLOURS = {
  drifter: PALETTE.drifter,
  splitter: PALETTE.splitter,
  shard: PALETTE.shard,
  spitter: PALETTE.spitter,
  brute: PALETTE.brute,
};

function shapeOf(enemy) {
  return SHAPES[enemy.kind] ?? SHAPES.drifter;
}

function colourOf(enemy) {
  return COLOURS[enemy.kind] ?? PALETTE.drifter;
}

function drawBackground(ctx) {
  ctx.fillStyle = PALETTE.void;
  ctx.fillRect(-BLEED, -BLEED, WORLD.width + BLEED * 2, WORLD.height + BLEED * 2);
  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= WORLD.width; x += 60) {
    ctx.moveTo(x + 0.5, -BLEED);
    ctx.lineTo(x + 0.5, WORLD.height + BLEED);
  }
  for (let y = 0; y <= WORLD.height; y += 60) {
    ctx.moveTo(-BLEED, y + 0.5);
    ctx.lineTo(WORLD.width + BLEED, y + 0.5);
  }
  ctx.stroke();
  ctx.strokeStyle = '#131c2f';
  ctx.lineWidth = 1.5;
  for (let ring = 1; ring <= 3; ring += 1) {
    ctx.beginPath();
    ctx.arc(WORLD.width / 2, WORLD.height / 2, ring * 96, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = PALETTE.wall;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, WORLD.width - 3, WORLD.height - 3);
  ctx.strokeStyle = PALETTE.faint;
  ctx.lineWidth = 1;
  const tick = 20;
  const corners = [[0, 0, 1, 1], [WORLD.width, 0, -1, 1], [0, WORLD.height, 1, -1], [WORLD.width, WORLD.height, -1, -1]];
  for (let i = 0; i < corners.length; i += 1) {
    const corner = corners[i];
    ctx.beginPath();
    ctx.moveTo(corner[0] + corner[2] * 2, corner[1] + corner[3] * tick);
    ctx.lineTo(corner[0] + corner[2] * 2, corner[1] + corner[3] * 2);
    ctx.lineTo(corner[0] + corner[2] * tick, corner[1] + corner[3] * 2);
    ctx.stroke();
  }
}

const hash = (n) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const wrap = (v, m) => ((v % m) + m) % m;

/** Slow motes, placed and moved by a hash alone: no assets, no state, the same frame every run. */
function drawDust(ctx, state) {
  const t = state.elapsed;
  const spanX = WORLD.width + 40;
  const spanY = WORLD.height + 40;
  for (let i = 0; i < 58; i += 1) {
    const a = hash(i);
    const b = hash(i + 91);
    const c = hash(i + 311);
    const x = wrap(a * spanX - 20 + t * (5 + b * 9), spanX) - 20;
    const y = wrap(b * spanY - 20 + t * (2 + c * 5), spanY) - 20;
    ctx.globalAlpha = 0.14 + c * 0.34;
    ctx.fillStyle = c > 0.75 ? '#3d5480' : '#22304d';
    ctx.fillRect(x, y, c > 0.85 ? 2.4 : 1.6, c > 0.85 ? 2.4 : 1.6);
  }
  ctx.globalAlpha = 1;
}

function drawVignette(ctx) {
  const grad = ctx.createRadialGradient(WORLD.width / 2, WORLD.height / 2, WORLD.height * 0.36, WORLD.width / 2, WORLD.height / 2, WORLD.height * 0.95);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
}

function drawEmbers(ctx, state) {
  for (let i = 0; i < state.embers.length; i += 1) {
    const e = state.embers[i];
    const pulse = 0.72 + 0.28 * Math.sin(e.life * 9);
    ctx.save();
    ctx.shadowColor = PALETTE.ember;
    ctx.shadowBlur = 16 * pulse;
    ctx.fillStyle = PALETTE.ember;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 4.5 * pulse + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,201,77,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawParticles(ctx, state) {
  const list = state.particles;
  for (let i = 0; i < list.length; i += 1) {
    const p = list[i];
    const t = Math.max(0, p.life / p.max);
    ctx.globalAlpha = Math.min(1, t * 1.6);
    if (p.kind === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5 + 2.5 * t;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + (1 - t) * 1.1), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      const size = p.size * (0.4 + t * 0.8);
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    }
  }
  ctx.globalAlpha = 1;
}

function drawEnemy(ctx, enemy, face, time) {
  const shape = shapeOf(enemy);
  const colour = colourOf(enemy);
  const scale = 0.55 + 0.45 * enemy.spawn;
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  const spin = shape.spin ? face + (shape.points === 3 ? 0 : Math.sin(time * 1.6 + enemy.x * 0.01) * 0.4) : time * 0.5;
  ctx.rotate(spin);
  ctx.scale(scale, scale);
  ctx.globalAlpha = 0.4 + 0.6 * enemy.spawn;
  ctx.lineWidth = 3;
  ctx.strokeStyle = enemy.hurt > 0 ? '#ffffff' : colour;
  ctx.fillStyle = enemy.hurt > 0 ? 'rgba(255,255,255,0.62)' : `${colour}55`;
  ctx.beginPath();
  const r = enemy.r;
  for (let i = 0; i < shape.points; i += 1) {
    const a = shape.offset + (i / shape.points) * Math.PI * 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(6,7,11,0.72)';
  ctx.beginPath();
  ctx.arc(0, 0, r * shape.hole, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (enemy.spawn < 1) return;
  if (enemy.mode === 'wind' || enemy.mode === 'aim') {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(time * 22);
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.r + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (enemy.hp < enemy.maxHp) {
    const width = enemy.r * 2;
    ctx.fillStyle = 'rgba(6,7,11,0.8)';
    ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.r - 10, width, 3);
    ctx.fillStyle = colour;
    ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.r - 10, width * (enemy.hp / enemy.maxHp), 3);
  }
}

function drawEnemies(ctx, state) {
  const p = state.player;
  for (let i = 0; i < state.enemies.length; i += 1) {
    const e = state.enemies[i];
    drawEnemy(ctx, e, Math.atan2(p.y - e.y, p.x - e.x), state.elapsed);
  }
}

function drawBolts(ctx, state) {
  for (let i = 0; i < state.bolts.length; i += 1) {
    const b = state.bolts[i];
    ctx.save();
    ctx.shadowColor = PALETTE.spitter;
    ctx.shadowBlur = 12;
    ctx.fillStyle = PALETTE.spitter;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#2a1206';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawShots(ctx, state) {
  for (let i = 0; i < state.shots.length; i += 1) {
    const s = state.shots[i];
    const len = Math.hypot(s.vx, s.vy) || 1;
    ctx.save();
    ctx.shadowColor = PALETTE.shot;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = PALETTE.shot;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x - (s.vx / len) * 12, s.y - (s.vy / len) * 12);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  const dry = state.hp - GUN.cost < GUN.minHp;
  ctx.save();
  ctx.globalAlpha = p.invuln > 0 ? 0.55 + 0.45 * Math.sin(state.elapsed * 40) : 1;
  ctx.strokeStyle = dry ? PALETTE.blood : PALETTE.player;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = p.flash > 0 ? PALETTE.blood : `${PALETTE.player}66`;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.aim) * (p.r + 8), p.y + Math.sin(p.aim) * (p.r + 8));
  ctx.lineTo(p.x + Math.cos(p.aim) * 30, p.y + Math.sin(p.aim) * 30);
  ctx.stroke();
  ctx.shadowColor = PALETTE.player;
  ctx.shadowBlur = 22;
  ctx.fillStyle = p.flash > 0 ? PALETTE.bloodPale : PALETTE.playerCore;
  ctx.beginPath();
  ctx.arc(p.x, p.y, dry ? p.r * 0.45 : p.r * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFloaters(ctx, state) {
  for (let i = 0; i < state.floaters.length; i += 1) {
    const f = state.floaters[i];
    say(ctx, f.text, f.x, f.y, f.size, f.colour, 'center', Math.min(1, f.life / f.max + 0.2));
  }
}

/** The whole frame: the arena shaken by the last hit, then the screen that belongs on top. */
export function drawFrame(ctx, state, view) {
  const shake = state.shake;
  const ox = shake > 0.2 ? Math.sin(state.elapsed * 61) * shake * 0.5 : 0;
  const oy = shake > 0.2 ? Math.cos(state.elapsed * 73) * shake * 0.5 : 0;
  ctx.save();
  ctx.translate(ox, oy);
  drawBackground(ctx);
  drawDust(ctx, state);
  drawEmbers(ctx, state);
  drawEnemies(ctx, state);
  drawBolts(ctx, state);
  drawParticles(ctx, state);
  drawShots(ctx, state);
  drawPlayer(ctx, state);
  drawFloaters(ctx, state);
  ctx.restore();
  drawVignette(ctx);
  if (view.screen === 'play') {
    drawHud(ctx, state, view.best);
    drawRuleLine(ctx);
  } else {
    drawScreen(ctx, state, view);
  }
}
