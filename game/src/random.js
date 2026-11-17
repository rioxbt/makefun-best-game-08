// A seeded generator, so a run is a pure function of its seed: the same seed always gives the
// same waves, the same spread on the same shots, and the same frame in a screenshot scene.

/** mulberry32: small, fast, and good enough for spawning and spread. */
export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    /** A number in [0, 1). */
    next,
    /** A number in [lo, hi). */
    range: (lo, hi) => lo + next() * (hi - lo),
    /** An integer in [0, n). */
    int: (n) => Math.floor(next() * n) % n,
    /** One of `list`, chosen evenly. */
    pick: (list) => list[Math.floor(next() * list.length) % list.length],
    /** A number near 0, in about [-1, 1]. */
    signed: () => next() * 2 - 1,
  };
}

/** Hash a seed and a salt into a fresh seed, so each subsystem draws from its own stream. */
export function mixSeed(seed, salt) {
  let h = (seed >>> 0) ^ 0x9e3779b9;
  const text = String(salt);
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x85ebca6b);
    h = (h ^ (h >>> 13)) >>> 0;
  }
  return (h ^ (h >>> 16)) >>> 0;
}
