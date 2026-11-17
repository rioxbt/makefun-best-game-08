// The player: a mote of light with one resource. Moving costs nothing; every shot is paid for
// out of the same pool of blood that keeps it alive, which is the whole game in one rule.

import { GUN, PALETTE, PLAYER, WORLD } from './config.js';
import { bloodSpray, ring, shake } from './particles.js';

export function createPlayer() {
  return { x: WORLD.width / 2, y: WORLD.height / 2, vx: 0, vy: 0, r: PLAYER.radius, aim: -Math.PI / 2, cool: 0, invuln: 0, flash: 0, dry: 0 };
}

export function healPlayer(state, amount) {
  state.hp = Math.min(PLAYER.maxHp, state.hp + amount);
}

/** True while the trigger is worth pulling: a shot must leave the last drop of blood alone. */
export function canFire(state) {
  return state.phase === 'play' && state.player.cool <= 0 && state.hp - GUN.cost >= GUN.minHp;
}

export function payForShot(state) {
  const p = state.player;
  state.hp -= GUN.cost;
  p.cool = GUN.cooldown;
  state.shotsFired += 1;
}

/** A wound: no damage while the mote is still glowing from the last one. */
export function hurtPlayer(state, amount, fromX, fromY) {
  const p = state.player;
  if (p.invuln > 0 || state.phase !== 'play') return false;
  state.hp -= amount;
  p.invuln = PLAYER.invuln;
  p.flash = 0.3;
  state.damageTaken += amount;
  const dx = p.x - fromX;
  const dy = p.y - fromY;
  const d = Math.hypot(dx, dy) || 1;
  p.vx += (dx / d) * PLAYER.knockback;
  p.vy += (dy / d) * PLAYER.knockback;
  bloodSpray(state, p.x, p.y, dx / d, dy / d, PALETTE.blood);
  ring(state, p.x, p.y, PALETTE.blood, 26);
  shake(state, 13);
  state.events.push('hurt');
  if (state.hp <= 0) {
    state.hp = 0;
    state.phase = 'over';
    state.outcomeT = 0;
    state.events.push('lose');
  }
  return true;
}

export function updatePlayer(state, input, dt) {
  const p = state.player;
  const dx = input.aim.x - p.x;
  const dy = input.aim.y - p.y;
  if (dx * dx + dy * dy > 16) p.aim = Math.atan2(dy, dx);

  let mx = input.move.x;
  let my = input.move.y;
  const len = Math.hypot(mx, my);
  if (len > 1e-6) {
    mx /= len;
    my /= len;
    p.vx += mx * PLAYER.accel * dt;
    p.vy += my * PLAYER.accel * dt;
  }
  const drag = Math.exp(-PLAYER.friction * dt);
  p.vx *= drag;
  p.vy *= drag;
  const speed = Math.hypot(p.vx, p.vy);
  if (speed > PLAYER.maxSpeed) {
    p.vx = (p.vx / speed) * PLAYER.maxSpeed;
    p.vy = (p.vy / speed) * PLAYER.maxSpeed;
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (p.x < p.r) {
    p.x = p.r;
    p.vx = Math.abs(p.vx) * 0.25;
  } else if (p.x > WORLD.width - p.r) {
    p.x = WORLD.width - p.r;
    p.vx = -Math.abs(p.vx) * 0.25;
  }
  if (p.y < p.r) {
    p.y = p.r;
    p.vy = Math.abs(p.vy) * 0.25;
  } else if (p.y > WORLD.height - p.r) {
    p.y = WORLD.height - p.r;
    p.vy = -Math.abs(p.vy) * 0.25;
  }
  p.cool = Math.max(0, p.cool - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.flash = Math.max(0, p.flash - dt);
  p.dry = Math.max(0, p.dry - dt);
  healPlayer(state, PLAYER.regen * dt);
}
