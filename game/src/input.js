// Keyboard and mouse, read into the plain control object the simulation takes: a direction to
// move, a point to aim at, and whether the trigger is down. It never touches the world itself.

import { WORLD } from './config.js';

export function createInput(element) {
  const held = new Set();
  const tapped = new Set();
  const pointer = { x: WORLD.width / 2, y: WORLD.height / 2 - 120 };
  let firing = false;

  const toWorld = (event) => {
    const box = element.getBoundingClientRect();
    pointer.x = ((event.clientX - box.left) / box.width) * WORLD.width;
    pointer.y = ((event.clientY - box.top) / box.height) * WORLD.height;
  };

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    tapped.add(event.code);
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => {
    held.clear();
    firing = false;
  });
  element.addEventListener('pointermove', toWorld);
  element.addEventListener('pointerdown', (event) => {
    toWorld(event);
    if (event.button === 0) firing = true;
    element.setPointerCapture?.(event.pointerId);
  });
  window.addEventListener('pointerup', () => {
    firing = false;
  });
  element.addEventListener('contextmenu', (event) => event.preventDefault());

  const axis = (plus, minus) => (held.has(plus) ? 1 : 0) - (held.has(minus) ? 1 : 0);

  return {
    /** Was `code` pressed since the last read? */
    tapped(code) {
      return tapped.has(code);
    },
    /** Forget presses already acted on (call once per simulated frame). */
    clearTaps() {
      tapped.clear();
    },
    read() {
      return {
        move: {
          x: axis('KeyD', 'KeyA') || axis('ArrowRight', 'ArrowLeft'),
          y: axis('KeyS', 'KeyW') || axis('ArrowDown', 'ArrowUp'),
        },
        aim: { x: pointer.x, y: pointer.y },
        fire: firing || held.has('Space') || held.has('KeyJ'),
      };
    },
  };
}
