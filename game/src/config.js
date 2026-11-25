// Sizzle & Serve — a fast-food kitchen game. Constants, dishes, ingredients and layout.
// All sizes are for the 1280x720 canvas; the game scales to the window at draw time.
export const W = 1280;
export const H = 720;
export const SHIFT_SECONDS = 150;
export const MAX_TICKETS = 4;
export const STEP = 1 / 60;

// An ingredient: what the bins hold. `cook` names the station that must cook it
// (null = served raw); cookTime seconds to done, burnTime seconds past done to burnt.
export const INGREDIENTS = {
  bun:     { name: 'Bun',     cook: null,    cookTime: 0,   burnTime: 0,  color: '#e8b06a', dark: '#b97f3a' },
  patty:   { name: 'Patty',   cook: 'grill', cookTime: 6,   burnTime: 6,  color: '#7a4a28', dark: '#4e2c14' },
  cheese:  { name: 'Cheese',  cook: null,    cookTime: 0,   burnTime: 0,  color: '#ffc93c', dark: '#e09e00' },
  lettuce: { name: 'Lettuce', cook: null,    cookTime: 0,   burnTime: 0,  color: '#7ed957', dark: '#3f9e2e' },
  tomato:  { name: 'Tomato',  cook: null,    cookTime: 0,   burnTime: 0,  color: '#ff5a4e', dark: '#c22e24' },
  fries:   { name: 'Fries',   cook: 'fryer', cookTime: 5,   burnTime: 5,  color: '#ffd94d', dark: '#d9a400' },
  noodles: { name: 'Noodles', cook: 'pot',   cookTime: 7,   burnTime: 6,  color: '#f2c14e', dark: '#c08a1e' },
  egg:     { name: 'Egg',     cook: 'pot',   cookTime: 5,   burnTime: 5,  color: '#fff3d6', dark: '#e8c96a' },
};
export const BIN_ORDER = ['bun', 'patty', 'cheese', 'lettuce', 'tomato', 'fries', 'noodles', 'egg'];

// A dish: the multiset of items (cooked form where it applies) a plate must hold.
export const DISHES = [
  { id: 'burger',  name: 'Classic Burger', needs: ['bun', 'patty:cooked', 'lettuce', 'tomato', 'cheese', 'bun'], price: 14 },
  { id: 'fries',   name: 'Cheese Fries',   needs: ['fries:cooked', 'cheese'],                                  price: 9 },
  { id: 'salad',   name: 'Garden Salad',   needs: ['lettuce', 'tomato', 'cheese'],                             price: 8 },
  { id: 'noodles', name: 'Noodle Bowl',    needs: ['noodles:cooked', 'egg:cooked', 'tomato'],                   price: 13 },
  { id: 'double',  name: 'Double Stack',   needs: ['bun', 'patty:cooked', 'patty:cooked', 'cheese', 'lettuce', 'bun'], price: 20 },
];

// Cooking stations, in left-to-right order on the counter.
export const STATIONS = [
  { id: 'grill', name: 'Grill', takes: ['patty'],   color: '#3a3f4a', glow: '#ff7a3c' },
  { id: 'fryer', name: 'Fryer', takes: ['fries'],   color: '#3a3f4a', glow: '#ffc93c' },
  { id: 'pot',   name: 'Soup Pot', takes: ['noodles', 'egg'], color: '#3a3f4a', glow: '#5ec8e5' },
];

// Fixed layout rectangles (canvas coordinates).
export function layout() {
  const tickets = [];
  for (let i = 0; i < MAX_TICKETS; i += 1) {
    tickets.push({ x: 24 + i * 308, y: 66, w: 292, h: 118 });
  }
  const bins = BIN_ORDER.map((id, i) => ({ id, x: 24 + i * 154, y: 592, w: 142, h: 104 }));
  const stations = STATIONS.map((s, i) => ({ ...s, x: 24 + i * 210, y: 205, w: 196, h: 150 }));
  return {
    topBar: { x: 0, y: 0, w: W, h: 56 },
    tickets,
    stations,
    plate: { x: 680, y: 200, w: 330, h: 215 },
    hand: { x: 1040, y: 200, w: 216, h: 100 },
    trash: { x: 1040, y: 312, w: 216, h: 103 },
    bins,
  };
}
