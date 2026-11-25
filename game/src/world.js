// Sizzle & Serve rules: orders, cooking stations, plate assembly, serving, scoring.
// The world is plain data plus methods; input and screenshots drive the same methods.
import { BIN_ORDER, DISHES, INGREDIENTS, MAX_TICKETS, SHIFT_SECONDS, STATIONS } from './config.js';
import { makeRng, pick } from './random.js';
import { sfx } from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

export function baseOf(item) {
  return item.split(':')[0];
}

export function isCooked(item) {
  return item.endsWith(':cooked');
}

export function isBurnt(item) {
  return item.endsWith(':burnt');
}

function counts(list) {
  const map = new Map();
  for (const item of list) map.set(item, (map.get(item) ?? 0) + 1);
  return map;
}

export function plateMatches(plate, dish) {
  const a = counts(plate);
  const b = counts(dish.needs);
  if (a.size !== b.size) return false;
  for (const [key, n] of b) if (a.get(key) !== n) return false;
  return true;
}

export function dishFor(plate) {
  return DISHES.find((d) => plateMatches(plate, d)) ?? null;
}

export class World {
  constructor(seed = 1) {
    this.seed = seed;
    this.reset();
  }

  reset() {
    this.rng = makeRng(this.seed);
    this.screen = SCREEN_TITLE;
    this.elapsed = 0;
    this.timeLeft = SHIFT_SECONDS;
    this.coins = 0;
    this.served = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.burnt = 0;
    this.walkouts = 0;
    this.wrongServes = 0;
    this.comboTimer = 0;
    this.spawnTimer = 2.5;
    this.ticketSeq = 0;
    this.tickets = [];
    this.stations = {};
    for (const s of STATIONS) this.stations[s.id] = { item: null, t: 0 };
    this.plate = [];
    this.hand = null;
    this.popups = [];
    this.flashTicket = -1;
    this.flashTimer = 0;
    this.shakeTicket = -1;
    this.shakeTimer = 0;
    this.servedDishName = '';
  }

  startGame() {
    this.reset();
    this.screen = SCREEN_PLAY;
    this.spawnTicket();
    this.spawnTicket();
  }

  // ---- orders ----
  availableDishes() {
    // Heavier dishes join the menu as the shift goes on.
    if (this.elapsed < 30) return DISHES.filter((d) => d.id !== 'double' && d.id !== 'noodles');
    if (this.elapsed < 75) return DISHES.filter((d) => d.id !== 'double');
    return DISHES;
  }

  spawnTicket() {
    if (this.tickets.length >= MAX_TICKETS) return;
    const dish = pick(this.rng, this.availableDishes());
    const patience = Math.max(26, 46 - this.elapsed / 6);
    this.tickets.push({ id: this.ticketSeq++, dish, patience, maxPatience: patience });
  }

  spawnInterval() {
    return Math.max(6, 14 - this.elapsed / 12);
  }

  // ---- player actions (input and the screenshot autopilot share these) ----
  pickBin(id) {
    if (this.screen !== SCREEN_PLAY) return false;
    if (!BIN_ORDER.includes(id)) return false;
    this.hand = id;
    sfx.pickup();
    return true;
  }

  stationState(id) {
    const slot = this.stations[id];
    if (!slot.item) return { empty: true };
    const ing = INGREDIENTS[baseOf(slot.item)];
    const done = slot.t >= ing.cookTime;
    const burnt = slot.t >= ing.cookTime + ing.burnTime;
    return { empty: false, item: slot.item, t: slot.t, done, burnt, progress: Math.min(1, slot.t / ing.cookTime) };
  }

  clickStation(id) {
    if (this.screen !== SCREEN_PLAY) return false;
    const def = STATIONS.find((s) => s.id === id);
    if (!def) return false;
    const slot = this.stations[id];
    const state = this.stationState(id);
    if (!slot.item) {
      if (this.hand && def.takes.includes(baseOf(this.hand)) && !isCooked(this.hand) && !isBurnt(this.hand)) {
        slot.item = this.hand;
        slot.t = 0;
        this.hand = null;
        sfx.sizzle();
        return true;
      }
      return false;
    }
    if (state.burnt) {
      // Burnt food is scraped off and thrown away.
      slot.item = null;
      slot.t = 0;
      this.burnt += 1;
      sfx.burn();
      this.addPopup(430, 290, 'Burnt! Scraped off', '#ff8a5c');
      return true;
    }
    if (state.done) {
      this.hand = `${baseOf(slot.item)}:cooked`;
      slot.item = null;
      slot.t = 0;
      sfx.pickup();
      return true;
    }
    return false;
  }

  clickPlate() {
    if (this.screen !== SCREEN_PLAY) return false;
    if (!this.hand) return false;
    this.plate.push(this.hand);
    this.hand = null;
    sfx.click();
    return true;
  }

  clickTrash() {
    if (this.screen !== SCREEN_PLAY) return false;
    if (this.hand) {
      this.hand = null;
      sfx.click();
      return true;
    }
    if (this.plate.length) {
      this.plate = [];
      sfx.click();
      return true;
    }
    return false;
  }

  serveTicket(index) {
    if (this.screen !== SCREEN_PLAY) return false;
    const ticket = this.tickets[index];
    if (!ticket) return false;
    if (!plateMatches(this.plate, ticket.dish)) {
      this.wrongServes += 1;
      this.shakeTicket = index;
      this.shakeTimer = 0.4;
      sfx.bad();
      this.addPopup(640, 240, 'Wrong dish!', '#ff6b5e');
      return false;
    }
    const tip = Math.round(6 * (ticket.patience / ticket.maxPatience));
    const comboBonus = this.combo * 2;
    const earned = ticket.dish.price + tip + comboBonus;
    this.coins += earned;
    this.served += 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.comboTimer = 10;
    this.servedDishName = ticket.dish.name;
    this.flashTicket = index;
    this.flashTimer = 0.9;
    this.tickets.splice(index, 1);
    this.plate = [];
    sfx.coin();
    sfx.ding();
    this.addPopup(640, 240, `+$${earned}  ${ticket.dish.name}!`, '#ffd94d');
    if (this.combo >= 3) this.addPopup(640, 280, `COMBO x${this.combo}!`, '#ff9d5c');
    return true;
  }

  addPopup(x, y, text, color) {
    this.popups.push({ x, y, text, color, ttl: 1.4 });
  }

  // ---- simulation ----
  update(dt) {
    if (this.screen !== SCREEN_PLAY) {
      for (const p of this.popups) p.ttl -= dt;
      this.popups = this.popups.filter((p) => p.ttl > 0);
      if (this.flashTimer > 0) this.flashTimer -= dt;
      if (this.shakeTimer > 0) this.shakeTimer -= dt;
      return;
    }
    this.elapsed += dt;
    this.timeLeft = Math.max(0, SHIFT_SECONDS - this.elapsed);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.shakeTimer > 0) this.shakeTimer -= dt;
    for (const p of this.popups) p.ttl -= dt;
    this.popups = this.popups.filter((p) => p.ttl > 0);

    for (const slot of Object.values(this.stations)) {
      if (slot.item) slot.t += dt;
    }

    for (let i = this.tickets.length - 1; i >= 0; i -= 1) {
      const ticket = this.tickets[i];
      ticket.patience -= dt;
      if (ticket.patience <= 0) {
        this.tickets.splice(i, 1);
        this.walkouts += 1;
        this.combo = 0;
        this.addPopup(640, 240, 'A customer walked out!', '#ff6b5e');
        sfx.bad();
      }
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTicket();
      this.spawnTimer = this.spawnInterval();
    }

    if (this.timeLeft <= 0) {
      this.screen = SCREEN_OVER;
      sfx.win();
    }
  }

  stars() {
    if (this.coins >= 150) return 3;
    if (this.coins >= 95) return 2;
    if (this.coins >= 50) return 1;
    return 0;
  }
}
