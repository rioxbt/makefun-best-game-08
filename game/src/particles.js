// Sparks, blood and screen shake: the feedback that makes a hit feel like a hit. Every particle
// is a plain record in the state's list, so a staged screenshot frame is reproducible.

const MAX_PARTICLES = 420;

function push(state, particle) {
  if (state.particles.length >= MAX_PARTICLES) state.particles.shift();
  state.particles.push(particle);
}

/** A burst of bits flying outward, used for kills, impacts and embers. */
export function spark(state, x, y, color, count, speed, size = 2.6) {
  const rng = state.sparkRng;
  for (let i = 0; i < count; i += 1) {
    const angle = rng.range(0, Math.PI * 2);
    const v = speed * rng.range(0.4, 1.2);
    const life = rng.range(0.22, 0.55);
    push(state, {
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life, max: life,
      size: size * rng.range(0.6, 1.3),
      color, drag: 3.4, kind: 'spark',
    });
  }
}

/** A wounded enemy's blood, thrown away from the hit. */
export function bloodSpray(state, x, y, awayX, awayY, color) {
  const rng = state.sparkRng;
  const base = Math.atan2(awayY, awayX);
  for (let i = 0; i < 9; i += 1) {
    const angle = base + rng.range(-1.1, 1.1);
    const v = rng.range(40, 210);
    const life = rng.range(0.3, 0.8);
    push(state, {
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life, max: life,
      size: rng.range(1.6, 4),
      color, drag: 2.2, kind: 'blood',
    });
  }
}

/** A soft trail behind something that is moving fast. */
export function trail(state, x, y, color, size = 2) {
  push(state, { x, y, vx: 0, vy: 0, life: 0.22, max: 0.22, size, color, drag: 6, kind: 'spark' });
}

/** A shockwave: one expanding ring, drawn as a particle with a growing size. */
export function ring(state, x, y, color, size) {
  push(state, { x, y, vx: 0, vy: 0, life: 0.42, max: 0.42, size, color, drag: 0, kind: 'ring' });
}

export function shake(state, amount) {
  state.shake = Math.min(26, state.shake + amount);
}

export function updateParticles(state, dt) {
  const list = state.particles;
  let write = 0;
  for (let i = 0; i < list.length; i += 1) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) continue;
    const k = Math.exp(-p.drag * dt);
    p.vx *= k;
    p.vy *= k;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    list[write] = p;
    write += 1;
  }
  list.length = write;
  state.shake *= Math.exp(-7 * dt);
  if (state.shake < 0.15) state.shake = 0;
}
