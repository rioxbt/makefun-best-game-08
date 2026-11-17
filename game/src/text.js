// One place that draws the game's text: the HUD, the arena's floating numbers and the screens all
// write through `say`, so the type is the same family, weight and alignment everywhere.

export const FONT = 'ui-monospace, SFMono-Regular, Consolas, "DejaVu Sans Mono", monospace';

/** Draw one line of the game's own type, bold and monospaced, never a system default. */
export function say(ctx, value, x, y, size, colour, align = 'left', alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = colour;
  ctx.fillText(value, x, y);
  ctx.restore();
}
