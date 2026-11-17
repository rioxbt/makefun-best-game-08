// The head-up display: score, wave, the blood bar the whole idea turns on, the combo, the wave
// banners and the floating numbers. It draws over the arena and never touches the run.

import { COMBO, EMBER, FINAL_WAVE, GUN, PALETTE, PLAYER, WORLD } from './config.js';
import { say } from './text.js';

function group(value) {
  return value.toLocaleString('en-US');
}

/** The blood bar: its fill is your life, its notch is what the next shot takes out of it. */
function drawBloodBar(ctx, state) {
  const width = 340;
  const height = 22;
  const x = WORLD.width / 2 - width / 2;
  const y = WORLD.height - 62;
  const frac = Math.max(0, Math.min(1, state.hp / PLAYER.maxHp));
  const dry = state.hp - GUN.cost < GUN.minHp;
  const spendable = Math.max(0, (state.hp - GUN.minHp) / PLAYER.maxHp);
  const danger = frac < 0.28;
  const pulse = danger ? 0.72 + 0.28 * Math.sin(state.elapsed * 11) : 1;

  ctx.save();
  ctx.fillStyle = '#12060c';
  ctx.fillRect(x - 3, y - 3, width + 6, height + 6);
  ctx.fillStyle = '#1b0a12';
  ctx.fillRect(x, y, width, height);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = dry ? PALETTE.bloodDeep : PALETTE.blood;
  ctx.fillRect(x, y, width * frac, height);
  ctx.globalAlpha = 1;
  const grad = ctx.createLinearGradient(0, y, 0, y + height);
  grad.addColorStop(0, 'rgba(255,255,255,0.28)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, width * frac, height);
  // The floor: the last drop is never spent, so the bar can never be emptied by firing.
  ctx.fillStyle = 'rgba(6,7,11,0.72)';
  ctx.fillRect(x, y, width * (GUN.minHp / PLAYER.maxHp), height);
  ctx.strokeStyle = PALETTE.faint;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  // The notch: exactly what one trigger pull costs.
  const notch = width * spendable;
  ctx.strokeStyle = dry ? PALETTE.dim : PALETTE.shot;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + notch, y - 4);
  ctx.lineTo(x + notch, y + height + 4);
  ctx.stroke();
  ctx.restore();

  say(ctx, 'BLOOD', x, y - 9, 12, PALETTE.bloodPale);
  say(ctx, `${Math.ceil(state.hp)} / ${PLAYER.maxHp}`, x + width, y - 9, 12, PALETTE.dim, 'right');
  say(ctx, dry ? 'NO BLOOD TO SPEND — DODGE' : `SHOT −${GUN.cost}   KILL +${GUN.refund}   EMBER +${EMBER.heal}`, WORLD.width / 2, y + height + 22, 12,
    dry ? PALETTE.blood : PALETTE.dim, 'center');
}

function drawScore(ctx, state, best) {
  say(ctx, group(state.score), 24, 44, 30, PALETTE.ink);
  say(ctx, `BEST ${group(best)}`, 24, 64, 12, PALETTE.dim);
  say(ctx, `KILLS ${state.kills}`, 24, 84, 12, PALETTE.faint);
}

function drawWave(ctx, state) {
  const label = `WAVE ${Math.max(1, state.wave)} / ${FINAL_WAVE}`;
  say(ctx, label, WORLD.width / 2, 36, 20, PALETTE.ink, 'center');
  const pipW = 22;
  const pips = FINAL_WAVE;
  const total = pips * (pipW + 4) - 4;
  let px = WORLD.width / 2 - total / 2;
  for (let i = 0; i < pips; i += 1) {
    const done = i + 1 < state.wave || state.won;
    const now = i + 1 === state.wave;
    ctx.fillStyle = done ? PALETTE.player : now ? PALETTE.ink : PALETTE.faint;
    ctx.fillRect(px, 44, pipW, 4);
    px += pipW + 4;
  }
}

function drawCombo(ctx, state) {
  if (state.combo <= 1.02) return;
  const hot = Math.min(1, (state.combo - 1) / (COMBO.max - 1));
  const colour = hot > 0.6 ? PALETTE.ember : PALETTE.ink;
  say(ctx, `×${state.combo.toFixed(2)}`, WORLD.width - 24, 44, 28, colour, 'right');
  const width = 132;
  const x = WORLD.width - 24 - width;
  ctx.fillStyle = PALETTE.faint;
  ctx.fillRect(x, 52, width, 4);
  ctx.fillStyle = colour;
  ctx.fillRect(x, 52, width * Math.max(0, Math.min(1, state.comboTimer / COMBO.hold)), 4);
}

function drawBanner(ctx, state) {
  if (state.bannerT <= 0) return;
  const alpha = Math.min(1, state.bannerT / 0.6);
  const y = 128;
  say(ctx, state.banner.title, WORLD.width / 2, y, 30, PALETTE.ink, 'center', alpha);
  say(ctx, state.banner.sub, WORLD.width / 2, y + 24, 13, PALETTE.dim, 'center', alpha);
}

function drawFloaters(ctx, state) {
  for (let i = 0; i < state.floaters.length; i += 1) {
    const f = state.floaters[i];
    say(ctx, f.text, f.x, f.y, f.size, f.colour, 'center', Math.min(1, f.life / f.max + 0.15));
  }
}

export function drawHud(ctx, state, best) {
  drawScore(ctx, state, best);
  drawWave(ctx, state);
  drawCombo(ctx, state);
  drawBloodBar(ctx, state);
  drawFloaters(ctx, state);
  drawBanner(ctx, state);
  say(ctx, 'P pause   M mute   ESC title', 24, WORLD.height - 18, 11, PALETTE.faint);
}

/** The one line the game wants read even when the screen is a thumbnail. */
export function drawRuleLine(ctx) {
  say(ctx, 'EVERY SHOT IS PAID FOR IN YOUR BLOOD — EVERY KILL PAYS IT BACK', WORLD.width / 2, WORLD.height - 96, 13, PALETTE.player, 'center');
}
