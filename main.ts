// Last Shot, an entry in make.fun's "Make the best game" bounty. Node 22, standard library only:
// this program copies the repository's game/ (the playable game, plain static files) and
// screenshots/ (three renders of it) into the output directory and writes dossier.json beside
// them with the kit's own library, which is what the judge reads.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// and the game is played by serving its own folder with any static server:
//   cd game && python3 -m http.server 8080   (then open http://localhost:8080)

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

/**
 * The scorer's own limits, as the kit's reference/gate.json states them: the same numbers the
 * library refuses an entry for, so this program cannot hand in a dossier the gate would rebuild
 * differently or reject.
 */
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Every file under `dir`, so the program can report the size of what it hands in. */
function filesUnder(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...filesUnder(path));
    else found.push(path);
  }
  return found;
}

function copyIn(name: string): number {
  const from = join(here, name);
  if (!existsSync(from)) throw new Error(`main.ts: this repository has no ${name}/`);
  const to = join(outDir, name);
  // Each run starts from nothing it did not write, so two runs of the entry write the same bytes.
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
  return filesUnder(to).length;
}

if (!existsSync(join(here, 'game', 'index.html'))) throw new Error('main.ts: game/index.html is missing, and the game is what is handed in');

mkdirSync(outDir, { recursive: true });
rmSync(join(outDir, 'dossier.json'), { force: true });
const gameFiles = copyIn('game');
const shotFiles = copyIn('screenshots');
if (shotFiles < 3 || shotFiles > 4) throw new Error(`main.ts: screenshots/ holds ${shotFiles} files, and the sheet takes 3 or 4 renders of the game`);

writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, CAPS));
const dossierBytes = statSync(join(outDir, 'dossier.json')).size;
console.log(`Last Shot: game/ ${gameFiles} files, screenshots/ ${shotFiles} renders, dossier.json ${dossierBytes} bytes`);
