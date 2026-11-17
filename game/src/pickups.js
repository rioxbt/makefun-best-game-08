// Embers: what a kill can leave behind. They are the other half of the blood economy, and the
// reason the player crosses the arena when the bar is low instead of hugging a wall.

import { EMBER, WORLD } from './config.js';

export function dropEmber(state, x, y) {
  state.embers.push({
    x, y,
    vx: state.rng.signed() * 40,
    vy: state.rng.signed() * 40,
    life: EMBER.life,
    r: EMBER.radius,
  });
}

export function updateEmbers(state, dt) {
  const player = state.player;
  const list = state.embers;
  let write = 0;
  const reach = EMBER.pull;
  for (let i = 0; i < list.length; i += 1) {
    const e = list[i];
    e.life -= dt;
    if (e.life <= 0) continue;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < reach) {
      // Within reach it flies to the player: picking one up should feel immediate.
      e.vx += (dx / d) * 900 * dt;
      e.vy += (dy / d) * 900 * dt;
    }
    const k = Math.exp(-2.2 * dt);
    e.vx *= k;
    e.vy *= k;
    e.x = Math.max(8, Math.min(WORLD.width - 8, e.x + e.vx * dt));
    e.y = Math.max(8, Math.min(WORLD.height - 8, e.y + e.vy * dt));
    list[write] = e;
    write += 1;
  }
  list.length = write;
}
