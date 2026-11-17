// The screens that say what the game is: the title over a live frame of the arena, the pause card,
// and the win or loss screen with the run's numbers and its restart. Drawing only: no run state is
// touched here, and every line comes from the same text helper the HUD uses.

import { EMBER, FINAL_WAVE, GUN, PALETTE, WORLD } from './config.js';
import { accuracyOf } from './world.js';
import { drawHud } from './hud.js';
import { say } from './text.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(7,9,15,0.92)';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = accent;
  ctx.stroke();
  ctx.restore();
}

function clock(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function drawTitle(ctx, state, best, t) {
  ctx.fillStyle = 'rgba(6,7,11,0.5)';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  panel(ctx, 108, 84, 744, 372, PALETTE.player);
  say(ctx, 'LAST SHOT', WORLD.width / 2, 158, 58, PALETTE.ink, 'center');
  say(ctx, 'your bullets are paid for in your own blood', WORLD.width / 2, 186, 16, PALETTE.dim, 'center');
  say(ctx, `A SHOT COSTS ${GUN.cost} BLOOD   ·   A KILL PAYS ${GUN.refund} BACK   ·   AN EMBER ${EMBER.heal}`, WORLD.width / 2, 232, 16, PALETTE.player, 'center');
  say(ctx, 'miss too often and you have nothing left to shoot with', WORLD.width / 2, 254, 12, PALETTE.faint, 'center');
  say(ctx, 'MOVE', 136, 292, 13, PALETTE.ink);
  say(ctx, 'W A S D   /   ARROWS', 224, 292, 13, PALETTE.dim);
  say(ctx, 'AIM', 136, 316, 13, PALETTE.ink);
  say(ctx, 'MOUSE', 224, 316, 13, PALETTE.dim);
  say(ctx, 'FIRE', 136, 340, 13, PALETTE.ink);
  say(ctx, 'HOLD CLICK   /   SPACE', 224, 340, 13, PALETTE.dim);
  say(ctx, `CLEAR ALL ${FINAL_WAVE} WAVES TO WIN`, 824, 292, 12, PALETTE.dim, 'right');
  say(ctx, 'KILLS IN A ROW RAISE THE MULTIPLIER', 824, 316, 12, PALETTE.dim, 'right');
  say(ctx, 'BLOOD TRICKLES BACK, SLOWLY', 824, 340, 12, PALETTE.dim, 'right');
  const blink = 0.55 + 0.45 * Math.sin(t * 4);
  say(ctx, 'PRESS ENTER TO PLAY', WORLD.width / 2, 392, 23, PALETTE.ember, 'center', blink);
  say(ctx, `BEST ${best.toLocaleString('en-US')}`, WORLD.width / 2, 420, 13, PALETTE.dim, 'center');
  say(ctx, 'P pause   ·   M mute   ·   ESC title', WORLD.width / 2, 442, 11, PALETTE.faint, 'center');
}

function stats(ctx, state, best) {
  const rows = [
    ['SCORE', state.score.toLocaleString('en-US')],
    ['KILLS', String(state.kills)],
    ['ACCURACY', `${Math.round(accuracyOf(state) * 100)}%`],
    ['BEST', best.toLocaleString('en-US')],
    ['LONGEST COMBO', `×${state.longest.toFixed(2)}`],
    ['TIME', clock(state.elapsed)],
  ];
  const columns = [228, 480, 732];
  for (let i = 0; i < rows.length; i += 1) {
    const x = columns[i % 3];
    const y = i < 3 ? 258 : 342;
    say(ctx, rows[i][0], x, y, 11, PALETTE.dim, 'center');
    say(ctx, rows[i][1], x, y + 32, 26, PALETTE.ink, 'center');
  }
}

function drawOutcome(ctx, state, best, screen, t) {
  const won = screen === 'win';
  ctx.fillStyle = won ? 'rgba(6,12,14,0.72)' : 'rgba(16,4,9,0.74)';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  panel(ctx, 96, 64, 768, 412, won ? PALETTE.player : PALETTE.blood);
  say(ctx, won ? `ALL ${FINAL_WAVE} WAVES CLEARED` : 'YOU BLED OUT', WORLD.width / 2, 138, 42, won ? PALETTE.player : PALETTE.blood, 'center');
  say(ctx, won
    ? 'the arena is quiet — you were the last thing in it'
    : `the blood ran out on wave ${Math.max(1, state.wave)} of ${FINAL_WAVE} — the trigger is a budget, not a button`,
  WORLD.width / 2, 170, 14, PALETTE.dim, 'center');
  stats(ctx, state, best);
  const blink = 0.55 + 0.45 * Math.sin(t * 4);
  say(ctx, 'ENTER  play again', WORLD.width / 2 - 108, 414, 20, PALETTE.ink, 'center', blink);
  say(ctx, 'ESC  title', WORLD.width / 2 + 138, 414, 20, PALETTE.dim, 'center');
  say(ctx, 'EVERY SHOT IS PAID FOR IN YOUR BLOOD', WORLD.width / 2, 452, 12, PALETTE.faint, 'center');
}

function drawPaused(ctx, state, best) {
  drawHud(ctx, state, best);
  ctx.fillStyle = 'rgba(6,7,11,0.7)';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  panel(ctx, 300, 200, 360, 140, PALETTE.faint);
  say(ctx, 'PAUSED', WORLD.width / 2, 262, 34, PALETTE.ink, 'center');
  say(ctx, 'ENTER or P to resume   ·   ESC for the title', WORLD.width / 2, 300, 13, PALETTE.dim, 'center');
}

/** The screen that belongs on top of the arena: the title, the pause card, or the outcome. */
export function drawScreen(ctx, state, view) {
  if (view.screen === 'pause') drawPaused(ctx, state, view.best);
  else if (view.screen === 'title') drawTitle(ctx, state, view.best, view.t);
  else drawOutcome(ctx, state, view.best, view.screen, view.t);
}
