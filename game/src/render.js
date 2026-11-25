// Sizzle & Serve rendering: every frame is drawn from the world state on one canvas.
import { BIN_ORDER, DISHES, INGREDIENTS, W, H, layout } from './config.js';
import { baseOf, isBurnt, isCooked, dishFor, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

const L = layout();

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align = 'center', weight = '700') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function shadow(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  rr(ctx, x + 3, y + 4, w, h, 14);
  ctx.fill();
}

// One ingredient, drawn as vector art. `cooked` changes patty/fries/noodles/egg.
export function drawIngredient(ctx, id, x, y, r, cooked = false) {
  const ing = INGREDIENTS[id];
  ctx.save();
  ctx.translate(x, y);
  if (id === 'bun') {
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.arc(0, 2, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ing.dark;
    ctx.fillRect(-r, 0, r * 2, r * 0.28);
    ctx.fillStyle = '#fff2cf';
    for (const [sx, sy] of [[-0.45, -0.45], [0, -0.6], [0.45, -0.45]]) {
      ctx.beginPath();
      ctx.arc(sx * r, sy * r, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'patty') {
    ctx.fillStyle = cooked ? '#5d3418' : ing.color;
    rr(ctx, -r, -r * 0.55, r * 2, r * 1.1, r * 0.5);
    ctx.fill();
    if (cooked) {
      ctx.strokeStyle = '#2e1a08';
      ctx.lineWidth = 2;
      for (const oy of [-0.25, 0.15]) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.7, oy * r);
        ctx.lineTo(r * 0.7, oy * r);
        ctx.stroke();
      }
    }
  } else if (id === 'cheese') {
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.6);
    ctx.lineTo(0, -r * 0.8);
    ctx.lineTo(r, r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ing.dark;
    for (const [sx, sy] of [[-0.3, 0.15], [0.25, 0.3]]) {
      ctx.beginPath();
      ctx.arc(sx * r, sy * r, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'lettuce') {
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    for (let i = 0; i <= 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      const rad = r * (i % 2 === 0 ? 1 : 0.62);
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad * 0.7;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ing.dark;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'tomato') {
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8a7a';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.3, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ing.dark;
    ctx.beginPath();
    ctx.arc(0, -r * 0.75, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'fries') {
    ctx.fillStyle = '#e2574c';
    rr(ctx, -r * 0.9, -r * 0.2, r * 1.8, r * 0.85, 4);
    ctx.fill();
    ctx.fillStyle = cooked ? '#ffcf3d' : '#ffe98a';
    for (let i = -2; i <= 2; i += 1) {
      ctx.save();
      ctx.translate(i * r * 0.32, -r * 0.1);
      ctx.rotate(i * 0.08);
      ctx.fillRect(-r * 0.13, -r * 1.05, r * 0.26, r * 1.1);
      ctx.restore();
    }
  } else if (id === 'noodles') {
    ctx.strokeStyle = cooked ? ing.color : '#ffe9a8';
    ctx.lineWidth = r * 0.22;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      const oy = (i - 1) * r * 0.42;
      ctx.moveTo(-r * 0.8, oy);
      ctx.bezierCurveTo(-r * 0.3, oy - r * 0.35, r * 0.3, oy + r * 0.35, r * 0.8, oy);
      ctx.stroke();
    }
  } else if (id === 'egg') {
    ctx.fillStyle = '#fff8e6';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cooked ? '#ff9d2e' : '#ffd94d';
    ctx.beginPath();
    ctx.arc(r * 0.1, r * 0.05, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDishIcon(ctx, dish, x, y, scale) {
  // A mini plate with the dish's ingredients stacked.
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, 12 * scale, 34 * scale, 10 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9c2b4';
  ctx.lineWidth = 2;
  ctx.stroke();
  let oy = 6 * scale;
  for (const item of dish.needs) {
    drawIngredient(ctx, baseOf(item), 0, oy, 13 * scale, isCooked(item));
    oy -= 9 * scale;
  }
  ctx.restore();
}

function drawKitchen(ctx, t) {
  // Wall tiles.
  ctx.fillStyle = '#f7e8d0';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffe9c4';
  for (let y = 56; y < 470; y += 46) {
    for (let x = (y % 92 === 0 ? 0 : 23); x < W; x += 46) {
      ctx.fillRect(x + 1, y + 1, 44, 44);
    }
  }
  // Warm pendant lamps.
  for (const x of [240, 640, 1040]) {
    ctx.strokeStyle = '#8a6b45';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 56);
    ctx.lineTo(x, 84);
    ctx.stroke();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.moveTo(x - 26, 84);
    ctx.lineTo(x + 26, 84);
    ctx.lineTo(x + 14, 106);
    ctx.lineTo(x - 14, 106);
    ctx.closePath();
    ctx.fill();
    const glow = ctx.createRadialGradient(x, 112, 4, x, 112, 90);
    glow.addColorStop(0, 'rgba(255, 190, 90, 0.28)');
    glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 90, 20, 180, 190);
  }
  // Wooden counter band.
  ctx.fillStyle = '#a4713e';
  ctx.fillRect(0, 470, W, 18);
  ctx.fillStyle = '#8a5a2e';
  ctx.fillRect(0, 484, W, 6);
  // Floor.
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(0, 490, W, H - 490);
  ctx.fillStyle = '#7d5738';
  for (let x = 0; x < W; x += 90) ctx.fillRect(x, 560, 2, H - 560);
  void t;
}

function drawTopBar(ctx, world) {
  const bar = L.topBar;
  ctx.fillStyle = '#2b2118';
  ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
  text(ctx, 'SIZZLE & SERVE', 24, 29, 24, '#ffb347', 'left', '900');
  text(ctx, 'Neon Noodle & Burger Bar', 258, 31, 13, '#d8c3a5', 'left', '600');
  const mm = Math.floor(world.timeLeft / 60);
  const ss = Math.floor(world.timeLeft % 60).toString().padStart(2, '0');
  const low = world.timeLeft <= 30 && world.screen === SCREEN_PLAY;
  text(ctx, `TIME ${mm}:${ss}`, 640, 29, 22, low ? '#ff6b5e' : '#ffffff', 'center', '800');
  text(ctx, `COINS $${world.coins}`, 860, 29, 22, '#ffd94d', 'center', '800');
  text(ctx, `SERVED ${world.served}`, 1010, 29, 18, '#ffffff', 'center', '700');
  if (world.combo >= 2) text(ctx, `COMBO x${world.combo}`, 1160, 29, 18, '#ff9d5c', 'center', '800');
}

function drawTickets(ctx, world) {
  for (let i = 0; i < L.tickets.length; i += 1) {
    const r = L.tickets[i];
    const ticket = world.tickets[i];
    const shake = world.shakeTicket === i && world.shakeTimer > 0 ? Math.sin(world.shakeTimer * 60) * 4 : 0;
    const flash = world.flashTicket === i && world.flashTimer > 0;
    ctx.save();
    ctx.translate(shake, 0);
    if (!ticket) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.setLineDash([6, 6]);
      rr(ctx, r.x, r.y, r.w, r.h, 12);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, 'waiting for orders…', r.x + r.w / 2, r.y + r.h / 2, 14, '#7a6a55', 'center', '600');
      ctx.restore();
      continue;
    }
    const frac = Math.max(0, ticket.patience / ticket.maxPatience);
    const urgent = frac < 0.35;
    shadow(ctx, r.x, r.y, r.w, r.h, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = flash ? '#fff3c4' : '#fffdf6';
    rr(ctx, r.x, r.y, r.w, r.h, 12);
    ctx.fill();
    ctx.strokeStyle = urgent ? '#ff6b5e' : '#e0d5c0';
    ctx.lineWidth = urgent ? 3 : 2;
    ctx.stroke();
    // Patience bar.
    ctx.fillStyle = '#e8e0d0';
    rr(ctx, r.x + 12, r.y + 12, r.w - 24, 10, 5);
    ctx.fill();
    ctx.fillStyle = urgent ? '#ff6b5e' : frac < 0.6 ? '#ffb347' : '#7ed957';
    rr(ctx, r.x + 12, r.y + 12, (r.w - 24) * frac, 10, 5);
    ctx.fill();
    text(ctx, `#${ticket.id + 1}  ${ticket.dish.name}`, r.x + 14, r.y + 44, 17, '#2b2118', 'left', '800');
    text(ctx, `$${ticket.dish.price}`, r.x + r.w - 14, r.y + 44, 17, '#c07f00', 'right', '800');
    // Needed ingredients.
    let ix = r.x + 30;
    for (const item of ticket.dish.needs) {
      drawIngredient(ctx, baseOf(item), ix, r.y + 84, 15, isCooked(item));
      ix += 34;
    }
    if (plateMatchesCheck(world, ticket)) {
      ctx.fillStyle = '#2f9e44';
      rr(ctx, r.x + r.w - 92, r.y + r.h - 34, 80, 24, 12);
      ctx.fill();
      text(ctx, 'READY!', r.x + r.w - 52, r.y + r.h - 21, 13, '#ffffff', 'center', '800');
    }
    ctx.restore();
  }
}

function plateMatchesCheck(world, ticket) {
  // Imported lazily to keep render free of rule logic duplication.
  return world.plate.length > 0 && plateMatchesWorld(world, ticket.dish);
}

function plateMatchesWorld(world, dish) {
  const a = new Map();
  for (const item of world.plate) a.set(item, (a.get(item) ?? 0) + 1);
  const b = new Map();
  for (const item of dish.needs) b.set(item, (b.get(item) ?? 0) + 1);
  if (a.size !== b.size) return false;
  for (const [k, n] of b) if (a.get(k) !== n) return false;
  return true;
}

function drawStations(ctx, world, t) {
  for (const s of L.stations) {
    const state = world.stationState(s.id);
    shadow(ctx, s.x, s.y, s.w, s.h, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = '#4a4f5c';
    rr(ctx, s.x, s.y, s.w, s.h, 14);
    ctx.fill();
    ctx.fillStyle = '#333743';
    rr(ctx, s.x + 10, s.y + 34, s.w - 20, s.h - 46, 10);
    ctx.fill();
    text(ctx, s.name.toUpperCase(), s.x + s.w / 2, s.y + 20, 15, '#cfd6e4', 'center', '800');
    if (state.empty) {
      text(ctx, `needs ${STATIONS_TAKES(s.id)}`, s.x + s.w / 2, s.y + 92, 14, '#8a93a5', 'center', '600');
    } else if (state.burnt) {
      drawIngredient(ctx, baseOf(state.item), s.x + s.w / 2, s.y + 88, 34);
      ctx.fillStyle = 'rgba(20,12,6,0.55)';
      rr(ctx, s.x + 10, s.y + 34, s.w - 20, s.h - 46, 10);
      ctx.fill();
      text(ctx, 'BURNT!', s.x + s.w / 2, s.y + 88, 20, '#ff8a5c', 'center', '900');
      text(ctx, 'click to scrape off', s.x + s.w / 2, s.y + 122, 12, '#ffd9c4', 'center', '600');
    } else {
      drawIngredient(ctx, baseOf(state.item), s.x + s.w / 2, s.y + 82, 34, state.done);
      // Progress ring around the food.
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(s.x + s.w / 2, s.y + 82, 48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = state.done ? '#7ed957' : s.glow;
      ctx.beginPath();
      ctx.arc(s.x + s.w / 2, s.y + 82, 48, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.progress);
      ctx.stroke();
      // Steam when done.
      if (state.done) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (let i = 0; i < 3; i += 1) {
          const sx = s.x + s.w / 2 - 24 + i * 24;
          const sy = s.y + 34 - ((t * 22 + i * 17) % 26);
          ctx.beginPath();
          ctx.arc(sx, sy, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        text(ctx, 'READY — click to take', s.x + s.w / 2, s.y + 132, 12, '#b8ff9d', 'center', '700');
      } else {
        text(ctx, 'cooking…', s.x + s.w / 2, s.y + 132, 12, '#cfd6e4', 'center', '600');
      }
    }
  }
}

function STATIONS_TAKES(id) {
  return id === 'grill' ? 'patty' : id === 'fryer' ? 'fries' : 'noodles / egg';
}

function drawPlate(ctx, world) {
  const r = L.plate;
  const match = dishFor(world.plate);
  shadow(ctx, r.x, r.y, r.w, r.h, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = match ? '#e9f9e0' : '#fffdf6';
  rr(ctx, r.x, r.y, r.w, r.h, 14);
  ctx.fill();
  ctx.strokeStyle = match ? '#2f9e44' : '#e0d5c0';
  ctx.lineWidth = match ? 3 : 2;
  ctx.stroke();
  text(ctx, 'YOUR PLATE  —  click to add what you hold', r.x + r.w / 2, r.y + 22, 14, '#7a6a55', 'center', '700');
  // Plate ellipse with stacked ingredients.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(r.x + r.w / 2, r.y + 150, 120, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9c2b4';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (world.plate.length === 0) {
    text(ctx, 'empty — pick ingredients below', r.x + r.w / 2, r.y + 118, 14, '#a89a82', 'center', '600');
  } else {
    let oy = r.y + 128;
    for (const item of world.plate) {
      drawIngredient(ctx, baseOf(item), r.x + r.w / 2, oy, 20, isCooked(item));
      oy -= 15;
    }
  }
  if (match) {
    ctx.fillStyle = '#2f9e44';
    rr(ctx, r.x + r.w / 2 - 110, r.y + r.h - 36, 220, 26, 13);
    ctx.fill();
    text(ctx, `${match.name} — ready to serve!`, r.x + r.w / 2, r.y + r.h - 22, 14, '#ffffff', 'center', '800');
  }
}

function drawHandAndTrash(ctx, world) {
  const hand = L.hand;
  shadow(ctx, hand.x, hand.y, hand.w, hand.h, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = '#fffdf6';
  rr(ctx, hand.x, hand.y, hand.w, hand.h, 12);
  ctx.fill();
  ctx.strokeStyle = '#e0d5c0';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, 'IN YOUR HAND', hand.x + hand.w / 2, hand.y + 16, 12, '#7a6a55', 'center', '700');
  if (world.hand) {
    drawIngredient(ctx, baseOf(world.hand), hand.x + hand.w / 2, hand.y + 50, 22, isCooked(world.hand));
    text(ctx, INGREDIENTS[baseOf(world.hand)].name + (isCooked(world.hand) ? ' (cooked)' : isBurnt(world.hand) ? ' (burnt)' : ''), hand.x + hand.w / 2, hand.y + 86, 13, '#2b2118', 'center', '700');
  } else {
    text(ctx, 'nothing yet', hand.x + hand.w / 2, hand.y + 54, 14, '#a89a82', 'center', '600');
  }
  const tr = L.trash;
  shadow(ctx, tr.x, tr.y, tr.w, tr.h, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = '#5c2e2e';
  rr(ctx, tr.x, tr.y, tr.w, tr.h, 12);
  ctx.fill();
  ctx.fillStyle = '#ffd9d0';
  // Drawn trash can: body, rim and handle.
  ctx.fillRect(tr.x + tr.w / 2 - 16, tr.y + 30, 32, 34);
  ctx.fillRect(tr.x + tr.w / 2 - 20, tr.y + 26, 40, 6);
  ctx.fillRect(tr.x + tr.w / 2 - 6, tr.y + 20, 12, 7);
  ctx.fillStyle = '#5c2e2e';
  ctx.fillRect(tr.x + tr.w / 2 - 8, tr.y + 38, 3, 18);
  ctx.fillRect(tr.x + tr.w / 2 - 1, tr.y + 38, 3, 18);
  ctx.fillRect(tr.x + tr.w / 2 + 6, tr.y + 38, 3, 18);
  text(ctx, 'TRASH', tr.x + tr.w / 2, tr.y + 76, 14, '#ffd9d0', 'center', '800');
  text(ctx, 'clear hand / plate', tr.x + tr.w / 2, tr.y + 94, 11, '#e8b8ae', 'center', '600');
}

function drawBins(ctx, world) {
  text(ctx, 'INGREDIENTS — click a bin to pick it up  •  keys 1–8 work too', 24, 580, 14, '#e8dcc8', 'left', '700');
  for (const b of L.bins) {
    const ing = INGREDIENTS[b.id];
    const held = world.hand === b.id;
    shadow(ctx, b.x, b.y, b.w, b.h, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = held ? '#ffe9b8' : '#fffdf6';
    rr(ctx, b.x, b.y, b.w, b.h, 12);
    ctx.fill();
    ctx.strokeStyle = held ? '#ff9d2e' : '#e0d5c0';
    ctx.lineWidth = held ? 3 : 2;
    ctx.stroke();
    drawIngredient(ctx, b.id, b.x + b.w / 2, b.y + 42, 24);
    text(ctx, ing.name, b.x + b.w / 2, b.y + 78, 14, '#2b2118', 'center', '800');
    if (ing.cook) {
      const station = ing.cook === 'grill' ? 'Grill' : ing.cook === 'fryer' ? 'Fryer' : 'Pot';
      text(ctx, `→ ${station} ${ing.cookTime}s`, b.x + b.w / 2, b.y + 94, 11, '#8a7a62', 'center', '600');
    } else {
      text(ctx, 'ready to plate', b.x + b.w / 2, b.y + 94, 11, '#8a7a62', 'center', '600');
    }
    text(ctx, String(BIN_ORDER.indexOf(b.id) + 1), b.x + 14, b.y + 14, 11, '#b09a78', 'center', '700');
  }
}

function drawPopups(ctx, world) {
  for (const p of world.popups) {
    ctx.globalAlpha = Math.min(1, p.ttl);
    text(ctx, p.text, p.x, p.y - (1.4 - p.ttl) * 30, 24, p.color, 'center', '900');
    ctx.globalAlpha = 1;
  }
}

function drawTitle(ctx, world, t) {
  ctx.fillStyle = 'rgba(30,18,8,0.72)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'SIZZLE & SERVE', W / 2, 170, 72, '#ffb347', 'center', '900');
  text(ctx, 'Neon Noodle & Burger Bar', W / 2, 232, 26, '#ffe9c4', 'center', '600');
  const lines = [
    'Customers order. You cook. Serve fast, earn tips, keep the combo alive.',
    '1. Click an ingredient bin to pick it up.   2. Cook patties on the Grill, fries in the Fryer, noodles & eggs in the Pot.',
    '3. Click the plate to stack it.   4. Click the matching order ticket to serve.   Don\'t let food burn!',
    'Keys 1–8 pick ingredients · T trashes your hand or plate · R restarts · M mutes',
  ];
  lines.forEach((line, i) => text(ctx, line, W / 2, 300 + i * 34, 18, '#ffffff', 'center', '600'));
  const pulse = 0.75 + Math.sin(t * 4) * 0.25;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffb347';
  rr(ctx, W / 2 - 190, 470, 380, 56, 28);
  ctx.fill();
  ctx.globalAlpha = 1;
  text(ctx, 'CLICK OR PRESS ENTER TO OPEN', W / 2, 499, 20, '#2b2118', 'center', '900');
  text(ctx, 'Five dishes on the menu · 150-second shifts · how much can you earn?', W / 2, 560, 15, '#d8c3a5', 'center', '600');
}

function drawOver(ctx, world) {
  ctx.fillStyle = 'rgba(30,18,8,0.78)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'SHIFT OVER!', W / 2, 150, 60, '#ffb347', 'center', '900');
  const stars = world.stars();
  for (let i = 0; i < 3; i += 1) {
    const sx = W / 2 - 90 + i * 90;
    ctx.fillStyle = i < stars ? '#ffd94d' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    for (let k = 0; k < 10; k += 1) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rad = k % 2 === 0 ? 34 : 15;
      const px = sx + Math.cos(a) * rad;
      const py = 220 + Math.sin(a) * rad;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  text(ctx, `You earned $${world.coins}`, W / 2, 300, 34, '#ffffff', 'center', '800');
  text(ctx, `Dishes served: ${world.served}    Best combo: x${world.bestCombo}    Burnt: ${world.burnt}    Walkouts: ${world.walkouts}`, W / 2, 350, 18, '#ffe9c4', 'center', '600');
  const verdict = stars === 3 ? 'Head Chef material!' : stars === 2 ? 'A solid shift — the regulars are happy.' : stars === 1 ? 'The kitchen survived. Barely.' : 'Rough shift. The grill forgives, the customers don\'t.';
  text(ctx, verdict, W / 2, 400, 20, '#ffb347', 'center', '700');
  text(ctx, 'Press R or click to cook another shift', W / 2, 470, 18, '#ffffff', 'center', '600');
}

export function draw(ctx, world, t) {
  drawKitchen(ctx, t);
  drawTopBar(ctx, world);
  drawTickets(ctx, world);
  drawStations(ctx, world, t);
  drawPlate(ctx, world);
  drawHandAndTrash(ctx, world);
  drawBins(ctx, world);
  drawPopups(ctx, world);
  if (world.screen === SCREEN_TITLE) drawTitle(ctx, world, t);
  if (world.screen === SCREEN_OVER) drawOver(ctx, world);
}

export { DISHES };
