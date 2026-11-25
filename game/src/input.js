// Mouse and keyboard input: hit-test the layout rectangles and call world actions.
import { BIN_ORDER, layout } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './world.js';
import { setMuted, sfx } from './audio.js';

const L = layout();

function inside(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function toCanvas(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 1280,
    y: ((event.clientY - rect.top) / rect.height) * 720,
  };
}

export function handleClick(world, x, y) {
  if (world.screen === SCREEN_TITLE) {
    world.startGame();
    sfx.ding();
    return;
  }
  if (world.screen === SCREEN_OVER) {
    world.startGame();
    sfx.ding();
    return;
  }
  if (world.screen !== SCREEN_PLAY) return;
  for (let i = 0; i < L.tickets.length; i += 1) {
    if (inside(x, y, L.tickets[i])) {
      world.serveTicket(i);
      return;
    }
  }
  for (const s of L.stations) {
    if (inside(x, y, s)) {
      world.clickStation(s.id);
      return;
    }
  }
  if (inside(x, y, L.plate)) {
    world.clickPlate();
    return;
  }
  if (inside(x, y, L.trash)) {
    world.clickTrash();
    return;
  }
  for (const b of L.bins) {
    if (inside(x, y, b)) {
      world.pickBin(b.id);
      return;
    }
  }
}

export function handleKey(world, key) {
  const k = key.toLowerCase();
  if (world.screen === SCREEN_TITLE && (k === 'enter' || k === ' ')) {
    world.startGame();
    sfx.ding();
    return;
  }
  if (world.screen === SCREEN_OVER && (k === 'r' || k === 'enter' || k === ' ')) {
    world.startGame();
    sfx.ding();
    return;
  }
  if (world.screen !== SCREEN_PLAY) return;
  if (k >= '1' && k <= '8') {
    world.pickBin(BIN_ORDER[Number(k) - 1]);
    return;
  }
  if (k === 't') world.clickTrash();
  if (k === 'm') setMuted(true);
  if (k === 'g') world.clickStation('grill');
  if (k === 'f') world.clickStation('fryer');
  if (k === 'p') world.clickStation('pot');
  if (k === ' ') world.clickPlate();
}
