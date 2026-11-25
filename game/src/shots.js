// Screenshot scenes (?shot=start|play|serve|end). Each one plays the real rules forward
// from a fresh world for a fixed number of steps, driven by the same actions a player
// uses, so the frame is what a real shift looks like and the same seed always gives
// the same frame. No scene edits the canvas directly.
import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 48;
const SERVE_SECONDS = 58;
const END_SECONDS = 160;
const SAMPLE = STEP;

/** Cook one item of `id` on its station and take it back once done. */
function cookOne(world, id, stationId) {
  world.pickBin(id);
  world.clickStation(stationId);
  // Wait until the station reports done (or the shift ends).
  for (let i = 0; i < 400; i += 1) {
    world.update(SAMPLE);
    if (world.screen !== SCREEN_PLAY) return false;
    const st = world.stationState(stationId);
    if (st.empty || st.done) break;
  }
  world.clickStation(stationId);
  return world.hand !== null;
}

/** Build the ticket's dish on the plate from bins and stations. */
function buildTicket(world, index) {
  const ticket = world.tickets[index];
  if (!ticket) return false;
  const stationFor = { patty: 'grill', fries: 'fryer', noodles: 'pot', egg: 'pot' };
  for (const item of ticket.dish.needs) {
    const [base, kind] = item.split(':');
    if (kind === 'cooked') {
      if (!cookOne(world, base, stationFor[base])) return false;
    } else {
      world.pickBin(base);
    }
    world.clickPlate();
  }
  return true;
}

/** The ticket needing the fewest cooked ingredients — the fastest one to serve. */
function easiestTicket(world) {
  let best = -1;
  let bestCooked = Infinity;
  for (let i = 0; i < world.tickets.length; i += 1) {
    const cooked = world.tickets[i].dish.needs.filter((n) => n.endsWith(':cooked')).length;
    if (cooked < bestCooked) {
      bestCooked = cooked;
      best = i;
    }
  }
  return best;
}

function runFor(world, seconds) {
  for (let i = 0; i < seconds / SAMPLE; i += 1) {
    world.update(SAMPLE);
    if (world.screen !== SCREEN_PLAY) break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: title over a staged kitchen. play: mid-shift, food cooking, plate half built.
 * serve: a finished plate matching a flashing ticket. end: the shift-over screen.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'serve' && name !== 'end') {
    // Title scene: a lively kitchen behind the title card.
    world.screen = SCREEN_PLAY;
    runFor(world, START_SECONDS);
    world.screen = SCREEN_TITLE;
    return { screen: SCREEN_TITLE };
  }
  world.startGame();
  if (name === 'play') {
    runFor(world, PLAY_SECONDS);
    // Leave a patty sizzling and a plate half built.
    world.pickBin('patty');
    world.clickStation('grill');
    runFor(world, 4);
    world.pickBin('bun');
    world.clickPlate();
    world.pickBin('lettuce');
    world.clickPlate();
    return { screen: SCREEN_PLAY };
  }
  if (name === 'serve') {
    // Serve one dish first, then leave a second plate finished and flashing READY.
    runFor(world, 12);
    const first = easiestTicket(world);
    if (first >= 0 && buildTicket(world, first)) world.serveTicket(first);
    runFor(world, 6);
    const second = easiestTicket(world);
    if (second >= 0) buildTicket(world, second);
    return { screen: SCREEN_PLAY };
  }
  // end: play a whole shift, serving what we can, then the results screen.
  runFor(world, 15);
  for (let round = 0; round < 6; round += 1) {
    if (world.screen !== SCREEN_PLAY) break;
    const pick = easiestTicket(world);
    if (pick >= 0 && buildTicket(world, pick)) {
      world.serveTicket(pick);
    }
    runFor(world, 10);
  }
  runFor(world, END_SECONDS);
  world.screen = SCREEN_OVER;
  return { screen: SCREEN_OVER };
}

export { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE };
