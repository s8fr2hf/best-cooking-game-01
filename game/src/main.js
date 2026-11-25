// Sizzle & Serve boot: canvas setup, game loop, URL params (?shot=, ?seed=).
import { W, H } from './config.js';
import { World } from './world.js';
import { draw } from './render.js';
import { handleClick, handleKey, toCanvas } from './input.js';
import { stageShot } from './shots.js';
import { setMuted } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') ?? 1) || 1;
const shot = params.get('shot');
if (params.get('mute') === '1') setMuted(true);

const world = new World(seed);
let staged = null;
if (shot) {
  staged = stageShot(shot, world);
} else {
  world.reset();
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

canvas.addEventListener('pointerdown', (event) => {
  const p = toCanvas(event, canvas);
  handleClick(world, p.x, p.y);
  announce();
});
window.addEventListener('keydown', (event) => {
  if ([' ', 'ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault();
  handleKey(world, event.key);
  announce();
});

function announce() {
  if (!statusEl) return;
  statusEl.textContent =
    world.screen === 'play'
      ? `Coins $${world.coins}, ${world.served} dishes served, ${world.timeLeft | 0} seconds left, ${world.tickets.length} orders waiting.`
      : world.screen === 'over'
        ? `Shift over. You earned $${world.coins} and served ${world.served} dishes.`
        : 'Sizzle and Serve. Press Enter to open the kitchen.';
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!staged) world.update(dt);
  draw(ctx, world, now / 1000);
  requestAnimationFrame(frame);
}
announce();
requestAnimationFrame(frame);
