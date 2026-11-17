// Every number the game is tuned with and the palette it is drawn in, in one place: the systems
// read the tuning from here, so a balance change is made here and nowhere else.

/** The arena is a fixed 16:9 stage, drawn to a canvas that is scaled to the window. */
export const WORLD = { width: 960, height: 540 };

/** The simulation runs a fixed 1/60 s step; rendering may run at any rate. */
export const STEP = 1 / 60;
export const MAX_SUBSTEPS = 5;

export const PALETTE = {
  void: '#06070b',
  grid: '#101728',
  wall: '#1d2a44',
  ink: '#e9f1ff',
  dim: '#61708e',
  faint: '#2a3654',
  blood: '#ff3355',
  bloodDeep: '#571126',
  bloodPale: '#ff8098',
  player: '#8ef2ff',
  playerCore: '#eafdff',
  shot: '#fff0b8',
  ember: '#ffc94d',
  drifter: '#ff4d7a',
  splitter: '#4dffa5',
  spitter: '#ff9c3d',
  brute: '#a86bff',
  shard: '#7dffcf',
};

/** The player: a mote of light that glides, and the body its blood buys bullets from. */
export const PLAYER = {
  radius: 13,
  accel: 1750,
  maxSpeed: 268,
  friction: 7.4,
  maxHp: 100,
  startHp: 100,
  regen: 0.9,
  invuln: 0.78,
  knockback: 240,
};

/** The gun: the whole game. A shot is charged to your blood, a kill refunds more than it cost. */
export const GUN = {
  cost: 4,
  refund: 12,
  shardRefund: 7,
  damage: 6,
  cooldown: 0.13,
  speed: 640,
  radius: 3.2,
  life: 1.05,
  spread: 0.012,
  minHp: 5,
  reserve: 1,
};

/** An ember is a wounded enemy's leftover heat: pick it up to buy more shots. */
export const EMBER = { heal: 18, life: 10, radius: 9, pull: 190, size: 5 };

export const COMBO = { step: 0.25, max: 5, hold: 3.2, decay: 1.6 };

/** Wave by wave: how many arrive, how fast they come on, and which kinds walk in. */
export const WAVE_TABLE = [
  { total: 6, gap: 0.85, speed: 1.0, kinds: ['drifter'] },
  { total: 9, gap: 0.74, speed: 1.04, kinds: ['drifter', 'drifter', 'splitter'] },
  { total: 12, gap: 0.64, speed: 1.09, kinds: ['drifter', 'splitter', 'spitter'] },
  { total: 15, gap: 0.56, speed: 1.14, kinds: ['drifter', 'splitter', 'spitter', 'drifter'] },
  { total: 17, gap: 0.56, speed: 1.18, kinds: ['drifter', 'brute', 'spitter', 'splitter'] },
  { total: 20, gap: 0.52, speed: 1.24, kinds: ['drifter', 'brute', 'splitter', 'spitter'] },
  { total: 24, gap: 0.48, speed: 1.3, kinds: ['drifter', 'brute', 'splitter', 'spitter', 'drifter'] },
  { total: 28, gap: 0.44, speed: 1.36, kinds: ['drifter', 'brute', 'splitter', 'spitter', 'drifter'] },
];

/** The wave that ends the game with a win: clear it and the arena goes quiet. */
export const FINAL_WAVE = WAVE_TABLE.length;

/** Seconds a wave banner stays up, and the pause between waves. */
export const BANNER = 2.4;
export const WAVE_BREAK = 1.6;

export function waveSpec(wave) {
  const row = WAVE_TABLE[Math.max(0, Math.min(WAVE_TABLE.length, wave) - 1)];
  return { ...row, wave };
}
