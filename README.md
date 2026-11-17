# makefun-best-game-08

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/rioxbt/makefun-best-game-08/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/rioxbt/makefun-best-game-08/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Last Shot** is a top-down arena shooter built on one rule: your gun is loaded with your own blood.
A shot costs 4 blood, a kill pays 12 back, an ember pays 18, and the red bar that buys your bullets
is the same bar that keeps you alive. Miss a few times and the bar runs dry — and a dry player has
nothing to shoot with, so the only way to keep shooting is to keep killing. Survive eight waves of
drifters, splitters, shards, spitters and brutes and the arena goes quiet.

## Play it

No build step, no library, no network request: the game is plain static files under `game/`, drawn
on one canvas with a little WebAudio sound made from oscillators.

```sh
cd game && python3 -m http.server 8080    # then open http://localhost:8080
```

## Run it

```sh
# the entry program (Node 22): copies game/ and screenshots/ to out/ and writes out/dossier.json
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## What is in here

| path | what it is |
| --- | --- |
| `game/index.html` | the page: one canvas, and the module that starts the game |
| `game/src/config.js` | the tuning: arena, palette, player, gun, ember, combo, wave table |
| `game/src/world.js` | the run: waves, collisions, the blood economy, winning and losing |
| `game/src/player.js` | the mote, and the rule that a shot is paid for in blood |
| `game/src/enemies.js` | the five kinds, and how each of them moves |
| `game/src/bullets.js` | your paid-for slugs and the spitters' free bolts |
| `game/src/pickups.js` | embers: what a kill leaves behind |
| `game/src/hud.js` | the score, the wave, the blood bar and the multiplier |
| `game/src/render.js` | the arena, its shapes and its screens |
| `game/src/bot.js` | the autopilot: the demo behind the title, and the screenshot scenes |
| `game/src/shots.js` | the staged scenes behind `?shot=start|play|win` |
| `game/src/input.js` `audio.js` `particles.js` `random.js` `main.js` | keys and mouse, synthesised sound, sparks and shake, the seeded generator, the frame loop |
| `screenshots/` | three real renders of the game in desktop Chrome, the cover first |
| `main.ts`, `vendor/makefun-game.ts` | the entry program, and the kit's dossier library it uses |

## Controls

`W A S D` or arrow keys to move, the mouse to aim, hold the left button or `Space` to fire.
`P` pauses, `M` mutes the sound, `Enter` starts and restarts, `Esc` returns to the title.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
