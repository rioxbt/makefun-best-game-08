// Shots and bolts: your paid-for slugs, and the spitters' free ones. They only move and expire
// here; what they hit is decided in the step, which has both sides in front of it.

import { GUN, WORLD } from './config.js';
import { trail } from './particles.js';

export function spawnShot(state, x, y, angle, spread) {
  const a = angle + spread;
  state.shots.push({
    x, y,
    vx: Math.cos(a) * GUN.speed,
    vy: Math.sin(a) * GUN.speed,
    life: GUN.life,
    r: GUN.radius,
    paid: GUN.cost,
  });
}

export function spawnBolt(state, x, y, vx, vy) {
  state.bolts.push({ x, y, vx, vy, life: 3.4, r: 5.5 });
}

export function updateShots(state, dt) {
  const list = state.shots;
  let write = 0;
  for (let i = 0; i < list.length; i += 1) {
    const s = list[i];
    s.life -= dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.life <= 0 || s.x < -30 || s.y < -30 || s.x > WORLD.width + 30 || s.y > WORLD.height + 30) continue;
    trail(state, s.x - s.vx * dt * 0.5, s.y - s.vy * dt * 0.5, '#ffd98a', 1.8);
    list[write] = s;
    write += 1;
  }
  list.length = write;
}

export function updateBolts(state, dt) {
  const list = state.bolts;
  let write = 0;
  for (let i = 0; i < list.length; i += 1) {
    const b = list[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0 || b.x < -40 || b.y < -40 || b.x > WORLD.width + 40 || b.y > WORLD.height + 40) continue;
    list[write] = b;
    write += 1;
  }
  list.length = write;
}
