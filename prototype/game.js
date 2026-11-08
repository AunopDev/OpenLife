'use strict';

/* ==========================================================
   OPENLIFE — WALKABLE PROTOTYPE v0.1
   เดินเองบนแผนที่ · เวลาเดินเอง · หยุดเฉพาะ event
   ========================================================== */

const TILE = 64;
const VW = 1440;
const VH = 900;

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');

/* ---------- fit stage ---------- */
function fitStage() {
  const stage = document.getElementById('stage');
  const s = Math.min(window.innerWidth / VW, window.innerHeight / VH);
  const ox = (window.innerWidth - VW * s) / 2;
  const oy = (window.innerHeight - VH * s) / 2;
  stage.style.transform = 'translate(' + ox + 'px,' + oy + 'px) scale(' + s + ')';
}
window.addEventListener('resize', fitStage);

/* ---------- utils ---------- */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
let seed = 987654321;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function fmt(n) { return Math.round(n).toLocaleString('en-US'); }

/* ==========================================================
   WORLD DATA
   ========================================================== */

const MAP_W = 40;
const MAP_H = 28;
const CITY_W = MAP_W * TILE;
const CITY_H = MAP_H * TILE;

const BUILDINGS = [
  { id: 'school',   name: 'โรงเรียน',        x: 2,  y: 2,  w: 4, h: 3, roof: '#5a6e8a', roofDark: '#3e4e66', wall: '#2f3a52', sign: '#2f3f66', door: 4 },
  { id: 'hospital', name: 'โรงพยาบาล',       x: 33, y: 3,  w: 4, h: 3, roof: '#8a4a5a', roofDark: '#5e2f3d', wall: '#3a2030', sign: '#a13a52', door: 35 },
  { id: 'office',   name: 'บริษัท สยามเทค',  x: 16, y: 3,  w: 5, h: 4, roof: '#39477e', roofDark: '#28325c', wall: '#232b52', sign: '#2f4bb0', door: 18 },
  { id: 'home',     name: 'บ้าน',            x: 3,  y: 12, w: 4, h: 3, roof: '#7a5240', roofDark: '#553327', wall: '#3d2419', sign: '#8a5f47', door: 5 },
  { id: 'seven',    name: '7-Eleven',        x: 24, y: 13, w: 3, h: 2, roof: '#2f7d52', roofDark: '#1f5537', wall: '#1d3d2c', sign: '#2f9d62', door: 25 },
  { id: 'gym',      name: 'ฟิตเนส',          x: 34, y: 12, w: 4, h: 3, roof: '#4b3a6e', roofDark: '#33264c', wall: '#241a3a', sign: '#6b4fb0', door: 36 },
  { id: 'bar',      name: 'ร้านเหล้า',        x: 24, y: 22, w: 3, h: 2, roof: '#6e3a4e', roofDark: '#4c2736', wall: '#33202a', sign: '#b04158', door: 25 }
];

const TREES = [
  [7, 3], [10, 3], [27, 3], [36, 3],
  [7, 11], [10, 11], [27, 11], [38, 11],
  [7, 17], [11, 17], [27, 17], [34, 17],
  [6, 24], [33, 24], [2, 10], [38, 16],
  [24, 7], [29, 17], [1, 6], [39, 5], [22, 24], [12, 24]
];

const BUSHES = [
  [8.2, 7.9], [13.4, 7.9], [19.2, 10.4], [23.2, 10.4],
  [27.6, 10.4], [35.4, 10.4], [4.6, 11.4], [8.4, 11.4],
  [15.4, 16.4], [18.2, 16.4], [30.4, 7.9], [37.4, 7.9],
  [2.4, 22.6], [9.6, 22.6], [12.4, 12.4], [21.4, 18.4]
];

const SCOOTERS = [
  [7.9, 10.55, '#c9d6ff'],
  [10.9, 7.45, '#ff8fb1'],
  [22.6, 10.5, '#ffd75e'],
  [33.6, 7.5, '#7dd3fc'],
  [27.4, 10.5, '#6ee7a8']
];

const LIGHTS = [
  [9, 7.4], [16, 7.4], [24, 7.4], [33, 7.4],
  [9, 10.6], [16, 10.6], [24, 10.6], [33, 10.6]
];

const POND = { x: 6, y: 24, w: 2, h: 2 };

const HOUSES = [
  { x: 15, y: 12, w: 3, h: 2, roof: '#5a6e8a', roofDark: '#3e4e66' },
  { x: 19, y: 12, w: 3, h: 2, roof: '#7a5240', roofDark: '#553327' },
  { x: 15, y: 15, w: 3, h: 2, roof: '#6e5a3a', roofDark: '#4a3c26' },
  { x: 19, y: 15, w: 3, h: 2, roof: '#4b5a7a', roofDark: '#333f58' },
  { x: 33, y: 16, w: 3, h: 2, roof: '#6e4a5a', roofDark: '#4c2736' },
  { x: 33, y: 23, w: 3, h: 2, roof: '#5a6e8a', roofDark: '#3e4e66' },
  { x: 15, y: 23, w: 3, h: 2, roof: '#7a5240', roofDark: '#553327' },
  { x: 28, y: 16, w: 2, h: 2, roof: '#6e5a3a', roofDark: '#4a3c26' },
  { x: 0, y: 16, w: 2, h: 2, roof: '#4b5a7a', roofDark: '#333f58' },
  { x: 28, y: 23, w: 2, h: 2, roof: '#6e5a3a', roofDark: '#4a3c26' }
];

/* ---------- city collision grid ---------- */
const cityGrid = [];
for (let y = 0; y < MAP_H; y++) cityGrid.push(new Array(MAP_W).fill(0));

BUILDINGS.forEach(function (b) {
  for (let y = b.y; y < b.y + b.h; y++) {
    for (let x = b.x; x < b.x + b.w; x++) cityGrid[y][x] = 1;
  }
});
HOUSES.forEach(function (b) {
  for (let y = b.y; y < b.y + b.h; y++) {
    for (let x = b.x; x < b.x + b.w; x++) cityGrid[y][x] = 1;
  }
});
TREES.forEach(function (t) { cityGrid[t[1]][t[0]] = 1; });
for (let y = POND.y; y < POND.y + POND.h; y++) {
  for (let x = POND.x; x < POND.x + POND.w; x++) cityGrid[y][x] = 1;
}

/* ---------- grass texture ---------- */
const GRASS_DOTS = [];
for (let i = 0; i < 900; i++) {
  GRASS_DOTS.push({
    x: Math.floor(rnd() * CITY_W),
    y: Math.floor(rnd() * CITY_H),
    w: 3 + Math.floor(rnd() * 6),
    h: 3,
    c: rnd() < 0.5 ? '#26492f' : '#305c3d'
  });
}

/* ==========================================================
   INTERIORS
   ========================================================== */

const OFFICE = { w: 18, h: 11 };
const HOME = { w: 14, h: 9 };

function makeGrid(w, h) {
  const g = [];
  for (let y = 0; y < h; y++) g.push(new Array(w).fill(0));
  for (let x = 0; x < w; x++) { g[0][x] = 1; g[h - 1][x] = 1; }
  for (let y = 0; y < h; y++) { g[y][0] = 1; g[y][w - 1] = 1; }
  return g;
}

const officeGrid = makeGrid(OFFICE.w, OFFICE.h);
officeGrid[10][9] = 0; // door
const DESKS = [[4, 3], [8, 3], [12, 3]];
DESKS.forEach(function (d) { officeGrid[d[1]][d[0]] = 1; officeGrid[d[1]][d[0] + 1] = 1; });
officeGrid[4][15] = 1; // water cooler

const homeGrid = makeGrid(HOME.w, HOME.h);
homeGrid[8][7] = 0; // door
[[2, 2], [3, 2], [2, 3], [3, 3]].forEach(function (t) { homeGrid[t[1]][t[0]] = 1; }); // bed
[[6, 1], [7, 1]].forEach(function (t) { homeGrid[t[1]][t[0]] = 1; }); // tv
[[10, 2], [11, 2], [12, 2]].forEach(function (t) { homeGrid[t[1]][t[0]] = 1; }); // kitchen

/* ==========================================================
   STATE
   ========================================================== */

const stats = {
  health: 82,
  heart: 41,
  energy: 62,
  money: 4500,
  kpi: 54,
  credit: 65
};

const world = {
  minutes: 7 * 60 + 30,
  day: 0,
  speed: 4.8 // game minutes per real second
};

const flags = {
  workedToday: false,
  otEvent: false,
  usedBus: false
};

const player = {
  x: 6.5 * TILE,
  y: 16.4 * TILE,
  dir: 'down',
  moving: false,
  frame: 0
};

let scene = 'city';
let paused = false;
let anim = 0;
let cam = { x: 0, y: 0 };
let currentHotspot = null;

const sceneInfo = {
  city: { w: CITY_W, h: CITY_H, grid: cityGrid, name: 'บางรัก · กรุงเทพฯ' },
  office: { w: OFFICE.w * TILE, h: OFFICE.h * TILE, grid: officeGrid, name: 'ออฟฟิศ · ชั้น 7' },
  home: { w: HOME.w * TILE, h: HOME.h * TILE, grid: homeGrid, name: 'บ้าน · บางรัก' }
};

/* ==========================================================
   INPUT
   ========================================================== */

const keys = {};

function isWalkKey(k) {
  return k === 'w' || k === 'a' || k === 's' || k === 'd' ||
    k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright';
}

window.addEventListener('keydown', function (e) {
  const k = e.key.toLowerCase();
  if (isWalkKey(k) || k === ' ') e.preventDefault();
  if (keys[k]) return;
  keys[k] = true;
  if (k === 'e' && !paused) interact();
});
window.addEventListener('keyup', function (e) {
  keys[e.key.toLowerCase()] = false;
});
window.addEventListener('blur', function () {
  Object.keys(keys).forEach(function (k) { keys[k] = false; });
});

/* ==========================================================
   HOTSPOTS
   ========================================================== */

function doorSpot(b) {
  return {
    x: (b.door + 0.5) * TILE,
    y: (b.y + b.h + 0.15) * TILE,
    r: 108
  };
}

const cityHotspots = [
  Object.assign(doorSpot(BUILDINGS[3]), { label: 'เข้าบ้าน', act: enterHome }),
  Object.assign(doorSpot(BUILDINGS[2]), { label: 'เข้าออฟฟิศ', act: enterOffice }),
  Object.assign(doorSpot(BUILDINGS[4]), { label: 'ซื้อของที่ 7-Eleven', act: buyFood }),
  Object.assign(doorSpot(BUILDINGS[5]), { label: 'เข้ายิม', act: gotoGym }),
  Object.assign(doorSpot(BUILDINGS[6]), { label: 'นั่งร้านเหล้า', act: drink }),
  Object.assign(doorSpot(BUILDINGS[1]), { label: 'ตรวจสุขภาพ', act: checkup }),
  { x: 9.5 * TILE, y: 10.4 * TILE, r: 100, label: 'ขึ้นรถเมล์ไปออฟฟิศ', act: busToOffice }
];

const officeHotspots = [
  { x: 8.6 * TILE, y: 4.4 * TILE, r: 100, label: 'ทำงานที่โต๊ะ', act: openWork },
  { x: 15.5 * TILE, y: 4.4 * TILE, r: 100, label: 'คุยกับเพื่อนร่วมงาน', act: chatCoworker },
  { x: 9.5 * TILE, y: 10.25 * TILE, r: 90, label: 'ออกจากออฟฟิศ', act: leaveOffice }
];

const homeHotspots = [
  { x: 3.0 * TILE, y: 4.4 * TILE, r: 100, label: 'นอน', act: sleep },
  { x: 6.5 * TILE, y: 2.4 * TILE, r: 100, label: 'ดูทีวี', act: watchTv },
  { x: 11.0 * TILE, y: 3.4 * TILE, r: 100, label: 'กินข้าว', act: eatAtHome },
  { x: 7.5 * TILE, y: 8.25 * TILE, r: 90, label: 'ออกจากบ้าน', act: leaveHome }
];

function hotspots() {
  if (scene === 'office') return officeHotspots;
  if (scene === 'home') return homeHotspots;
  return cityHotspots;
}

function nearestHotspot() {
  let best = null;
  let bestD = Infinity;
  hotspots().forEach(function (h) {
    const dx = player.x - h.x;
    const dy = player.y - h.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < h.r && d < bestD) { best = h; bestD = d; }
  });
  return best;
}

function interact() {
  if (currentHotspot) currentHotspot.act();
}

/* ==========================================================
   ACTIONS
   ========================================================== */

function toast(text) {
  const wrap = document.getElementById('toast');
  const d = document.createElement('div');
  d.className = 'toast-item';
  d.textContent = text;
  wrap.appendChild(d);
  setTimeout(function () { d.remove(); }, 2600);
}

function addMinutes(m) {
  world.minutes += m;
  while (world.minutes >= 1440) {
    world.minutes -= 1440;
    world.day += 1;
    stats.energy = clamp(stats.energy - 8, 0, 100);
    flags.workedToday = false;
  }
}

function enterHome() {
  scene = 'home';
  player.x = 7 * TILE;
  player.y = 7.2 * TILE;
  player.dir = 'up';
  toast('เข้าบ้าน');
}
function leaveHome() {
  scene = 'city';
  player.x = 5.5 * TILE;
  player.y = 15.9 * TILE;
  player.dir = 'down';
}
function enterOffice() {
  scene = 'office';
  player.x = 9 * TILE;
  player.y = 9.2 * TILE;
  player.dir = 'up';
  toast('เข้าออฟฟิศ · 08:00');
}
function leaveOffice() {
  scene = 'city';
  player.x = 18.5 * TILE;
  player.y = 7.9 * TILE;
  player.dir = 'down';
  if (flags.workedToday && !flags.otEvent) {
    flags.otEvent = true;
    setTimeout(triggerOvertimeEvent, 300);
  }
}

function buyFood() {
  if (stats.money < 30) { toast('เงินไม่พอ'); return; }
  stats.money -= 30;
  stats.energy = clamp(stats.energy + 10, 0, 100);
  addMinutes(15);
  toast('ซื้อข้าวกล่อง 30฿ · พลังงาน +10');
}

function gotoGym() {
  if (stats.money < 60) { toast('เงินไม่พอ'); return; }
  stats.money -= 60;
  stats.health = clamp(stats.health + 2, 0, 100);
  stats.heart = clamp(stats.heart + 4, 0, 100);
  stats.energy = clamp(stats.energy - 12, 0, 100);
  addMinutes(60);
  toast('ออกกำลังกาย 1 ชั่วโมง · สุขภาพ +2 ใจ +4');
}

function drink() {
  if (stats.money < 350) { toast('เงินไม่พอ'); return; }
  stats.money -= 350;
  stats.heart = clamp(stats.heart + 10, 0, 100);
  stats.health = clamp(stats.health - 2, 0, 100);
  stats.energy = clamp(stats.energy - 5, 0, 100);
  addMinutes(90);
  toast('นั่งร้านเหล้ากับเพื่อน · ใจ +10 สุขภาพ −2');
}

function checkup() {
  if (stats.money < 150) { toast('เงินไม่พอ'); return; }
  stats.money -= 150;
  stats.health = clamp(stats.health + 8, 0, 100);
  addMinutes(60);
  toast('ตรวจสุขภาพ · สุขภาพ +8');
}

function busToOffice() {
  if (stats.money < 15) { toast('เงินไม่พอ'); return; }
  stats.money -= 15;
  addMinutes(20);
  player.x = 18.5 * TILE;
  player.y = 10.4 * TILE;
  toast('รถเมล์ · ถึงหน้าออฟฟิศ (−15฿, 20 นาที)');
}

function sleep() {
  world.day += 1;
  world.minutes = 7 * 60;
  stats.energy = clamp(stats.energy + 45, 0, 100);
  stats.heart = clamp(stats.heart + 6, 0, 100);
  stats.health = clamp(stats.health + 1, 0, 100);
  flags.workedToday = false;
  closeModal();
  toast('เช้าวันใหม่ · พลังงานเต็มขึ้น');
}

function watchTv() {
  addMinutes(45);
  stats.heart = clamp(stats.heart + 5, 0, 100);
  stats.energy = clamp(stats.energy + 3, 0, 100);
  toast('ดูซีรีส์ 45 นาที · ใจ +5');
}

function eatAtHome() {
  if (stats.money < 25) { toast('เงินไม่พอ'); return; }
  stats.money -= 25;
  stats.energy = clamp(stats.energy + 12, 0, 100);
  addMinutes(30);
  toast('กินข้าวที่บ้าน · พลังงาน +12');
}

function chatCoworker() {
  stats.heart = clamp(stats.heart + 3, 0, 100);
  addMinutes(10);
  toast('เม้าท์กับเพื่อนร่วมงาน · ใจ +3');
}

/* ==========================================================
   MODALS
   ========================================================== */

const overlay = document.getElementById('overlay');
const modal = document.getElementById('modal');

function openModal(html) {
  paused = true;
  modal.innerHTML = html;
  overlay.classList.remove('hidden');
}
function closeModal() {
  paused = false;
  overlay.classList.add('hidden');
  modal.innerHTML = '';
}

function bindChoices(fn) {
  modal.querySelectorAll('[data-choice]').forEach(function (b) {
    b.addEventListener('click', function () {
      fn(Number(b.getAttribute('data-choice')));
    });
  });
}

/* ---------- work ---------- */
function openWork() {
  if (flags.workedToday) { toast('วันนี้ทำงานแล้ว · กลับบ้านเถอะ'); return; }
  if (world.minutes > 16 * 60) { toast('เลยเวลาเข้างานแล้ว'); return; }

  const html =
    '<div class="ev-head"><span class="ev-chip">ออฟฟิศ</span><span>08:10 · ถึงโต๊ะทำงาน</span></div>' +
    '<div class="ev-title">วันนี้จะทำงานยังไง?</div>' +
    '<div class="ev-text">กองงานบนโต๊ะสูงเท่าหัว หัวหน้าอยู่ในห้องประชุม และวันนี้มีเดดไลน์ตอน 5 โมงเย็น</div>' +
    '<div class="choices">' +
    '<button class="choice" data-choice="0"><span class="c-label">1. โหมงานหนัก</span>' +
    '<span class="c-hint"><span class="hint up">ผลงาน ++</span><span class="hint down">พลังงาน −−</span><span class="hint down">ใจ −</span></span></button>' +
    '<button class="choice" data-choice="1"><span class="c-label">2. ทำงานพอดี ๆ</span>' +
    '<span class="c-hint"><span class="hint up">ผลงาน +</span><span class="hint down">พลังงาน −</span></span></button>' +
    '<button class="choice" data-choice="2"><span class="c-label">3. ชิล ๆ วันนี้</span>' +
    '<span class="c-hint"><span class="hint up">ใจ +</span><span class="hint down">ผลงาน −</span></span></button>' +
    '</div>' +
    '<div class="work-preview">เวลา <b>→ 17:00</b></div>';

  openModal(html);
  bindChoices(function (i) {
    if (i === 0) {
      stats.kpi = clamp(stats.kpi + 8, 0, 100);
      stats.energy = clamp(stats.energy - 22, 0, 100);
      stats.heart = clamp(stats.heart - 9, 0, 100);
      toast('โหมงานหนัก · ผลงาน +8 พลังงาน −22 ใจ −9');
    } else if (i === 1) {
      stats.kpi = clamp(stats.kpi + 4, 0, 100);
      stats.energy = clamp(stats.energy - 13, 0, 100);
      stats.heart = clamp(stats.heart - 5, 0, 100);
      toast('ทำงานปกติ · ผลงาน +4');
    } else {
      stats.kpi = clamp(stats.kpi - 2, 0, 100);
      stats.energy = clamp(stats.energy - 6, 0, 100);
      stats.heart = clamp(stats.heart + 4, 0, 100);
      toast('วันชิล ๆ · ใจ +4 ผลงาน −2');
    }
    world.minutes = 17 * 60;
    flags.workedToday = true;
    closeModal();
  });
}

/* ---------- overtime event ---------- */
function triggerOvertimeEvent() {
  const html =
    '<div class="ev-head"><span class="ev-chip">เหตุการณ์ · 17:55</span><span>หน้าออฟฟิศ</span></div>' +
    '<div class="ev-title">งานด่วนก่อนเลิกงาน</div>' +
    '<div class="ev-text">หัวหน้าเดินตามออกมาถึงหน้าตึก — “น้อง ช่วยทำสไลด์ชุดนี้ให้พี่ก่อนพรุ่งนี้เช้านะ” ' +
    'ทั้งที่คุณนัดเพื่อนไว้แล้ว และวันนี้คุณก็ทำงานเต็มวันมาแล้ว</div>' +
    '<div class="choices">' +
    '<button class="choice" data-choice="0"><span class="c-label">1. กลับเข้าไปทำต่อ</span>' +
    '<span class="c-hint"><span class="hint up">ผลงาน +</span><span class="hint down">ใจ −</span><span class="hint down">พลังงาน −</span><span class="hint time">เวลา −2 ชม.</span></span></button>' +
    '<button class="choice" data-choice="1"><span class="c-label">2. บอกว่ามีนัดสำคัญ</span>' +
    '<span class="c-hint"><span class="hint up">ใจ +</span><span class="hint down">หัวหน้า −</span><span class="hint down">ผลงาน −</span></span></button>' +
    '<button class="choice" data-choice="2" disabled><span class="c-label">3. ขอให้เพื่อนช่วยแบ่งงาน</span>' +
    '<span class="c-hint"><span class="hint req">ต้องมีมนุษยสัมพันธ์ 50</span></span></button>' +
    '</div>';

  openModal(html);
  bindChoices(function (i) {
    if (i === 0) {
      stats.kpi = clamp(stats.kpi + 6, 0, 100);
      stats.heart = clamp(stats.heart - 10, 0, 100);
      stats.energy = clamp(stats.energy - 14, 0, 100);
      addMinutes(120);
      toast('กลับไปทำต่อ · ผลงาน +6 ใจ −10');
    } else if (i === 1) {
      stats.heart = clamp(stats.heart + 5, 0, 100);
      stats.kpi = clamp(stats.kpi - 2, 0, 100);
      toast('ปฏิเสธอย่างสุภาพ · ใจ +5 ผลงาน −2');
    }
    closeModal();
  });
}

/* ==========================================================
   UPDATE
   ========================================================== */

function gridAt(sc, x, y) {
  const info = sceneInfo[sc];
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= info.grid[0].length || ty >= info.grid.length) return 1;
  return info.grid[ty][tx];
}

function canStand(sc, x, y) {
  const hw = 11;
  const top = y - 22;
  const bottom = y + 4;
  return !gridAt(sc, x - hw, top) && !gridAt(sc, x + hw, top) &&
    !gridAt(sc, x - hw, bottom) && !gridAt(sc, x + hw, bottom);
}

function update(dt) {
  anim += dt;
  world.minutes += dt * world.speed;
  while (world.minutes >= 1440) {
    world.minutes -= 1440;
    world.day += 1;
    stats.energy = clamp(stats.energy - 8, 0, 100);
    flags.workedToday = false;
    toast('อีกวันผ่านไป...');
  }

  let dx = 0;
  let dy = 0;
  if (keys.w || keys.arrowup) dy -= 1;
  if (keys.s || keys.arrowdown) dy += 1;
  if (keys.a || keys.arrowleft) dx -= 1;
  if (keys.d || keys.arrowright) dx += 1;

  player.moving = dx !== 0 || dy !== 0;

  if (player.moving) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len; dy /= len;
    const speed = 172 * dt;
    const nx = player.x + dx * speed;
    const ny = player.y + dy * speed;

    if (canStand(scene, nx, player.y)) player.x = nx;
    if (canStand(scene, player.x, ny)) player.y = ny;

    player.frame += dt * 8;

    if (Math.abs(dx) > Math.abs(dy)) player.dir = dx > 0 ? 'right' : 'left';
    else player.dir = dy > 0 ? 'down' : 'up';
  }

  // keep camera inside world
  const info = sceneInfo[scene];
  cam.x = info.w <= VW ? (info.w - VW) / 2 : clamp(player.x - VW / 2, 0, info.w - VW);
  cam.y = info.h <= VH ? (info.h - VH) / 2 : clamp(player.y - VH / 2, 0, info.h - VH);

  // cars & pedestrians
  cars.forEach(function (c) {
    if (c.axis === 'h') {
      c.x += c.dir * c.speed * dt;
      if (c.dir > 0 && c.x > CITY_W + 80) c.x = -80;
      if (c.dir < 0 && c.x < -80) c.x = CITY_W + 80;
    } else {
      c.y += c.dir * c.speed * dt;
      if (c.dir > 0 && c.y > CITY_H + 80) c.y = -80;
      if (c.dir < 0 && c.y < -80) c.y = CITY_H + 80;
    }
  });

  peds.forEach(function (p) {
    p.x += p.dir * p.speed * dt;
    if (p.x > p.max) { p.x = p.max; p.dir = -1; }
    if (p.x < p.min) { p.x = p.min; p.dir = 1; }
    p.phase += dt * 7;
  });

  // prompt
  currentHotspot = nearestHotspot();
  const prompt = document.getElementById('prompt');
  if (currentHotspot) {
    prompt.classList.remove('hidden');
    document.getElementById('promptText').textContent = currentHotspot.label;
  } else {
    prompt.classList.add('hidden');
  }

  updateHud();
}

function updateHud() {
  const hh = Math.floor(world.minutes / 60);
  const mm = Math.floor(world.minutes % 60);
  document.getElementById('clockTime').textContent =
    String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  document.getElementById('dayProg').style.width = (world.minutes / 1440 * 100) + '%';
  document.getElementById('clockDate').textContent = dateLabel();
  document.getElementById('locName').textContent = sceneInfo[scene].name;

  STAT_DEFS.forEach(function (d) {
    const el = statEls[d.key];
    if (!el) return;
    const v = stats[d.key];
    el.val.textContent = d.key === 'money' ? fmt(v) : Math.round(v);
    el.bar.style.width = clamp(v / d.max * 100, 1, 100) + '%';
  });
}

/* ---------- date ---------- */
const WEEK = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function dateLabel() {
  let d = world.day;
  let m = 0;
  while (d >= MDAYS[m]) { d -= MDAYS[m]; m = (m + 1) % 12; }
  const weekday = WEEK[(world.day + 1) % 7];
  return weekday + ' ' + (d + 1) + ' ' + MONTHS[m] + ' 2569';
}

/* ==========================================================
   STATS UI
   ========================================================== */

const ICONS = {
  health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20s-7-4.5-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.5 12 20 12 20z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M9 14c1 1.2 2 1.8 3 1.8s2-.6 3-1.8"/><path d="M9 10h.01M15 10h.01"/></svg>',
  energy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 5 14h6l-1 8 8-12h-6l1-8z"/></svg>',
  money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>',
  kpi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V9M10 19V5M16 19v-6M22 19H2"/></svg>',
  credit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>'
};

const STAT_DEFS = [
  { key: 'health', label: 'สุขภาพ', color: '#6ee7a8', max: 100 },
  { key: 'heart', label: 'ใจ', color: '#ff8fb1', max: 100 },
  { key: 'energy', label: 'พลังงาน', color: '#ffd75e', max: 100 },
  { key: 'money', label: 'เงิน', color: '#7dd3fc', max: 50000 },
  { key: 'kpi', label: 'ผลงาน', color: '#b39dff', max: 100 },
  { key: 'credit', label: 'เครดิต', color: '#ff9f4a', max: 100 }
];

const statEls = {};

function buildStats() {
  const wrap = document.getElementById('statPanel');
  wrap.innerHTML = '';
  STAT_DEFS.forEach(function (d) {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML =
      '<span class="stat-ico" style="color:' + d.color + '">' + ICONS[d.key] + '</span>' +
      '<span class="stat-lbl">' + d.label + '</span>' +
      '<span class="stat-val"></span>' +
      '<span class="stat-bar"><i style="background:' + d.color + '"></i></span>';
    wrap.appendChild(row);
    statEls[d.key] = {
      val: row.querySelector('.stat-val'),
      bar: row.querySelector('.stat-bar i')
    };
  });
}

/* ==========================================================
   PORTRAIT
   ========================================================== */

function drawPortrait() {
  const p = document.getElementById('portrait');
  const c = p.getContext('2d');
  c.fillStyle = '#2a2f5c'; c.fillRect(0, 0, 24, 24);
  c.fillStyle = '#e0b48c'; c.fillRect(10, 16, 4, 3);
  c.fillStyle = '#f0c9a0'; c.fillRect(7, 6, 10, 11);
  c.fillRect(6, 10, 1, 3); c.fillRect(17, 10, 1, 3);
  c.fillStyle = '#161a2e';
  c.fillRect(5, 4, 14, 4); c.fillRect(5, 8, 2, 4); c.fillRect(17, 8, 2, 4);
  c.fillRect(8, 9, 3, 1); c.fillRect(13, 9, 3, 1);
  c.fillStyle = '#12142a'; c.fillRect(9, 11, 2, 2); c.fillRect(14, 11, 2, 2);
  c.fillRect(11, 15, 3, 1);
  c.fillStyle = '#e8eefc'; c.fillRect(5, 18, 14, 6);
  c.fillStyle = '#2b3a7a'; c.fillRect(11, 18, 2, 6);
  c.fillStyle = '#ff5c6c'; c.fillRect(11, 19, 2, 5);
}

/* ==========================================================
   ENTITIES
   ========================================================== */

const cars = [
  { axis: 'h', x: 120, y: 8.35 * TILE, dir: 1, speed: 120, color: '#e85c6c' },
  { axis: 'h', x: 1400, y: 9.35 * TILE, dir: -1, speed: 95, color: '#7dd3fc' },
  { axis: 'h', x: 700, y: 20.35 * TILE, dir: 1, speed: 130, color: '#ffd75e' },
  { axis: 'h', x: 1900, y: 21.35 * TILE, dir: -1, speed: 105, color: '#6ee7a8' },
  { axis: 'v', y: 220, x: 12.35 * TILE, dir: 1, speed: 110, color: '#ff9f4a' },
  { axis: 'v', y: 1200, x: 31.35 * TILE, dir: -1, speed: 118, color: '#c4a7ff' }
];

const peds = [
  { x: 300, y: 7.55 * TILE, min: 80, max: 1800, dir: 1, speed: 40, phase: 0, color: '#c9d6ff' },
  { x: 1500, y: 10.45 * TILE, min: 100, max: 2300, dir: -1, speed: 34, phase: 1, color: '#ff8fb1' },
  { x: 900, y: 19.55 * TILE, min: 300, max: 2100, dir: 1, speed: 46, phase: 2, color: '#ffd75e' },
  { x: 1700, y: 22.45 * TILE, min: 200, max: 2200, dir: -1, speed: 38, phase: 3, color: '#6ee7a8' }
];

/* ==========================================================
   RENDER
   ========================================================== */

function drawCircleGlow(x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawCity() {
  // grass
  ctx.fillStyle = '#2a5136';
  ctx.fillRect(0, 0, CITY_W, CITY_H);
  GRASS_DOTS.forEach(function (d) {
    ctx.fillStyle = d.c;
    ctx.fillRect(d.x, d.y, d.w, d.h);
  });

  // park
  ctx.fillStyle = '#2e6b45';
  ctx.fillRect(3 * TILE, 23 * TILE, 7 * TILE, 4 * TILE);

  // sidewalks
  ctx.fillStyle = '#4b5170';
  ctx.fillRect(0, 7 * TILE, CITY_W, TILE);
  ctx.fillRect(0, 10 * TILE, CITY_W, TILE);
  ctx.fillRect(0, 19 * TILE, CITY_W, TILE);
  ctx.fillRect(0, 22 * TILE, CITY_W, TILE);
  ctx.fillRect(11 * TILE, 0, TILE, CITY_H);
  ctx.fillRect(14 * TILE, 0, TILE, CITY_H);
  ctx.fillRect(29 * TILE, 0, TILE, CITY_H);
  ctx.fillRect(32 * TILE, 0, TILE, CITY_H);

  // sidewalk seams
  ctx.strokeStyle = 'rgba(20,24,50,.35)';
  ctx.lineWidth = 1;
  for (let x = 0; x < CITY_W; x += TILE) {
    [7, 10, 19, 22].forEach(function (r) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, r * TILE);
      ctx.lineTo(x + 0.5, r * TILE + TILE);
      ctx.stroke();
    });
  }

  // roads
  ctx.fillStyle = '#3a4058';
  ctx.fillRect(0, 8 * TILE, CITY_W, 2 * TILE);
  ctx.fillRect(0, 20 * TILE, CITY_W, 2 * TILE);
  ctx.fillRect(12 * TILE, 0, 2 * TILE, CITY_H);
  ctx.fillRect(30 * TILE, 0, 2 * TILE, CITY_H);

  // road edges
  ctx.fillStyle = 'rgba(18,22,44,.75)';
  ctx.fillRect(0, 8 * TILE, CITY_W, 3);
  ctx.fillRect(0, 10 * TILE - 3, CITY_W, 3);
  ctx.fillRect(0, 20 * TILE, CITY_W, 3);
  ctx.fillRect(0, 22 * TILE - 3, CITY_W, 3);
  ctx.fillRect(12 * TILE, 0, 3, CITY_H);
  ctx.fillRect(14 * TILE - 3, 0, 3, CITY_H);
  ctx.fillRect(30 * TILE, 0, 3, CITY_H);
  ctx.fillRect(32 * TILE - 3, 0, 3, CITY_H);

  // lane markings
  ctx.fillStyle = 'rgba(210,220,250,.55)';
  for (let x = 20; x < CITY_W; x += 96) {
    ctx.fillRect(x, 9 * TILE - 2, 44, 4);
    ctx.fillRect(x, 21 * TILE - 2, 44, 4);
  }
  for (let y = 20; y < CITY_H; y += 96) {
    ctx.fillRect(13 * TILE - 2, y, 4, 44);
    ctx.fillRect(31 * TILE - 2, y, 4, 44);
  }

  // pond
  ctx.fillStyle = '#1d4a6b';
  ctx.fillRect(POND.x * TILE, POND.y * TILE, POND.w * TILE, POND.h * TILE);
  ctx.fillStyle = 'rgba(120,210,255,.25)';
  ctx.fillRect(POND.x * TILE + 10, POND.y * TILE + 14, 30, 3);
  ctx.fillRect(POND.x * TILE + 40, POND.y * TILE + 46, 26, 3);

  // park path + benches
  ctx.fillStyle = '#6b6047';
  ctx.fillRect(4 * TILE, 25.4 * TILE, 2 * TILE, 40);
  ctx.fillRect(8 * TILE, 24.2 * TILE, 2 * TILE, 40);
  drawBench(4.6 * TILE, 24.4 * TILE);
  drawBench(8.6 * TILE, 25.9 * TILE);

  // buildings
  BUILDINGS.forEach(drawBuilding);
  HOUSES.forEach(drawHouse);

  // bushes
  BUSHES.forEach(function (b) { drawBush(b[0] * TILE, b[1] * TILE); });

  // trees
  TREES.forEach(function (t) {
    drawTree((t[0] + 0.5) * TILE, (t[1] + 0.9) * TILE);
  });

  // street furniture
  drawBench(9.6 * TILE, 10.9 * TILE);
  drawBin(8.2 * TILE, 10.8 * TILE);
  drawHydrant(20.5 * TILE, 7.7 * TILE);
  drawVendor(22.2 * TILE, 7.9 * TILE);
  drawVendor(12.6 * TILE, 22.4 * TILE);
  drawManhole(17.5 * TILE, 9.3 * TILE);
  drawManhole(27.5 * TILE, 21.3 * TILE);
  drawManhole(13.4 * TILE, 14.5 * TILE);

  // parked scooters
  SCOOTERS.forEach(function (s) { drawScooter(s[0] * TILE, s[1] * TILE, s[2]); });

  // bus stop sign
  drawBusStop(9.5 * TILE, 10.2 * TILE);

  // streetlights
  const light = lightState();
  const night = light[1] > 0.18;
  LIGHTS.forEach(function (l) {
    const lx = l[0] * TILE;
    const ly = l[1] * TILE;
    if (night) drawCircleGlow(lx, ly - 40, 120, 'rgba(255,220,140,.55)', 0.35);
    ctx.fillStyle = '#2a3050';
    ctx.fillRect(lx - 2, ly - 46, 4, 46);
    ctx.fillStyle = night ? '#ffe9a8' : '#5a6280';
    ctx.fillRect(lx - 6, ly - 52, 12, 7);
  });

  // cars
  cars.forEach(drawCar);

  // pedestrians
  peds.forEach(function (p) {
    drawWalker(p.x, p.y, p.phase, p.color, 0.8);
  });
}

function drawBuilding(b) {
  const x = b.x * TILE;
  const y = b.y * TILE;
  const w = b.w * TILE;
  const h = b.h * TILE;
  const wallH = clamp(Math.round(h * 0.46), 54, 112);
  const roofH = h - wallH;
  const roofY = y;
  const wallY = y + roofH;

  ctx.fillStyle = 'rgba(3,6,20,.4)';
  ctx.fillRect(x + 10, y + 14, w, h);

  // wall
  ctx.fillStyle = b.wall;
  ctx.fillRect(x, wallY, w, wallH);
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  ctx.fillRect(x, wallY, w, 3);
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.fillRect(x, y + h - 8, w, 8);

  // windows
  const rows = wallH > 68 ? 2 : 1;
  const doorCol1 = Math.floor((b.w - 1) / 2);
  const doorCol2 = Math.ceil((b.w - 1) / 2);
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < b.w; i++) {
      if (r === rows - 1 && (i === doorCol1 || i === doorCol2)) continue;
      const wx = x + i * TILE + 16;
      const wy = wallY + 12 + r * 30;
      ctx.fillStyle = '#262c4a';
      ctx.fillRect(wx - 3, wy - 3, 24, 20);
      ctx.fillStyle = '#ffe9a8';
      ctx.fillRect(wx, wy, 18, 14);
      ctx.fillStyle = '#262c4a';
      ctx.fillRect(wx + 8, wy, 2, 14);
      ctx.fillRect(wx, wy + 6, 18, 2);
    }
  }

  // door + awning
  const doorH = Math.min(46, wallH - 6);
  const dx = x + w / 2 - 16;
  const dy = y + h - doorH;
  ctx.fillStyle = '#0f1328';
  ctx.fillRect(dx, dy, 32, doorH);
  ctx.fillStyle = '#ffd75e';
  ctx.fillRect(dx + 5, dy + 9, 22, 2);
  ctx.fillStyle = b.sign;
  ctx.fillRect(dx - 10, dy - 9, 52, 11);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.fillRect(dx - 10, dy + 2, 52, 3);

  // roof (with eave overhang)
  ctx.fillStyle = b.roof;
  ctx.fillRect(x - 5, roofY - 7, w + 10, roofH + 11);
  ctx.fillStyle = 'rgba(255,255,255,.10)';
  ctx.fillRect(x - 5, roofY - 7, w + 10, 7);
  ctx.strokeStyle = 'rgba(0,0,0,.38)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 3.5, roofY - 5.5, w + 7, roofH + 8);

  ctx.fillStyle = 'rgba(0,0,0,.13)';
  const seams = Math.max(2, Math.round(b.w * 1.6));
  for (let i = 1; i < seams; i++) {
    ctx.fillRect(x - 5 + (w + 10) * i / seams, roofY - 7, 2, roofH + 11);
  }
  ctx.fillRect(x - 5, roofY + Math.round(roofH * 0.58), w + 10, 2);

  // rooftop AC
  const acX = x + 18;
  const acY = roofY + 14;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(acX + 3, acY + 4, 30, 22);
  ctx.fillStyle = '#6b7492';
  ctx.fillRect(acX, acY, 30, 22);
  ctx.fillStyle = '#8a93b8';
  ctx.fillRect(acX + 3, acY + 3, 24, 16);
  ctx.fillStyle = '#3a4058';
  ctx.beginPath(); ctx.arc(acX + 10, acY + 11, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(acX + 19, acY + 11, 4, 0, Math.PI * 2); ctx.fill();

  // water tank
  if (b.w >= 4 && roofH > 84) {
    const tx = x + w - 52;
    const ty = roofY + 24;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.fillRect(tx + 4, ty + 4, 28, 28);
    ctx.fillStyle = '#7d86a8';
    ctx.fillRect(tx, ty, 28, 28);
    ctx.fillStyle = '#a3abcd';
    ctx.fillRect(tx + 3, ty + 3, 22, 9);
  }

  // signboard on the eave
  const sw = Math.min(w - 26, 190);
  const sx = x + w / 2 - sw / 2;
  const sy = roofY + roofH - 25;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fillRect(sx + 3, sy + 3, sw, 20);
  ctx.fillStyle = b.sign;
  ctx.fillRect(sx, sy, sw, 20);
  ctx.strokeStyle = 'rgba(255,255,255,.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, 19);
  ctx.fillStyle = '#fff';
  ctx.font = '11px "Noto Sans Thai", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.name, x + w / 2, sy + 10);
  ctx.textAlign = 'left';
}

function drawHouse(b) {
  const x = b.x * TILE;
  const y = b.y * TILE;
  const w = b.w * TILE;
  const h = b.h * TILE;
  const wallH = clamp(Math.round(h * 0.5), 40, 92);
  const roofH = h - wallH;
  const roofY = y;
  const wallY = y + roofH;

  ctx.fillStyle = 'rgba(3,6,20,.34)';
  ctx.fillRect(x + 7, y + 10, w, h);

  ctx.fillStyle = b.roofDark;
  ctx.fillRect(x, wallY, w, wallH);
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.fillRect(x, y + h - 6, w, 6);

  // windows either side of the door
  for (let i = 0; i < b.w; i++) {
    if (i === Math.floor(b.w / 2)) continue;
    const wx = x + i * TILE + 18;
    const wy = wallY + 12;
    ctx.fillStyle = '#262c4a';
    ctx.fillRect(wx - 3, wy - 3, 22, 18);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(wx, wy, 16, 12);
    ctx.fillStyle = '#262c4a';
    ctx.fillRect(wx + 7, wy, 2, 12);
  }

  // door
  const doorH = Math.min(34, wallH - 8);
  const dx = x + w / 2 - 12;
  const dy = y + h - doorH;
  ctx.fillStyle = '#0f1328';
  ctx.fillRect(dx, dy, 24, doorH);
  ctx.fillStyle = '#ffd75e';
  ctx.fillRect(dx + 4, dy + 7, 16, 2);

  // roof
  ctx.fillStyle = b.roof;
  ctx.fillRect(x - 5, roofY - 6, w + 10, roofH + 9);
  ctx.fillStyle = 'rgba(255,255,255,.09)';
  ctx.fillRect(x - 5, roofY - 6, w + 10, 6);
  ctx.strokeStyle = 'rgba(0,0,0,.36)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 4, roofY - 5, w + 8, roofH + 7);

  ctx.fillStyle = 'rgba(0,0,0,.12)';
  const seams = Math.max(2, Math.round(b.w * 1.8));
  for (let i = 1; i < seams; i++) {
    ctx.fillRect(x - 5 + (w + 10) * i / seams, roofY - 6, 2, roofH + 9);
  }

  // rooftop AC
  ctx.fillStyle = '#6b7492';
  ctx.fillRect(x + 16, roofY + 12, 22, 16);
  ctx.fillStyle = '#8a93b8';
  ctx.fillRect(x + 18, roofY + 14, 18, 12);
}

function drawBush(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b5c3d';
  ctx.beginPath(); ctx.arc(x, y - 4, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#357047';
  ctx.beginPath(); ctx.arc(x - 3, y - 7, 6, 0, Math.PI * 2); ctx.fill();
}

function drawVendor(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#8a6448';
  ctx.fillRect(x - 24, y - 16, 48, 20);
  ctx.fillStyle = '#a67c5a';
  ctx.fillRect(x - 24, y - 20, 48, 6);

  ctx.fillStyle = '#2a3050';
  ctx.beginPath(); ctx.arc(x - 16, y + 5, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 16, y + 5, 5, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#2a3050';
  ctx.fillRect(x - 1, y - 52, 3, 32);
  ctx.fillStyle = '#e85c6c';
  ctx.beginPath();
  ctx.moveTo(x - 34, y - 52);
  ctx.lineTo(x + 34, y - 52);
  ctx.lineTo(x, y - 70);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd75e';
  ctx.beginPath();
  ctx.moveTo(x - 34, y - 52);
  ctx.lineTo(x, y - 70);
  ctx.lineTo(x, y - 52);
  ctx.closePath();
  ctx.fill();
}

function drawManhole(x, y) {
  ctx.fillStyle = 'rgba(20,24,50,.55)';
  ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2c3145';
  ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#454b63';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke();
}

function drawScooter(x, y, c) {
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#20263f';
  ctx.beginPath(); ctx.arc(x - 8, y, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 8, y, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c;
  ctx.fillRect(x - 10, y - 12, 20, 8);
  ctx.fillStyle = '#c9d6ff';
  ctx.fillRect(x - 2, y - 18, 18, 6);
}

function drawTree(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1d3f2a';
  ctx.beginPath(); ctx.arc(x, y - 22, 21, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b5c3d';
  ctx.beginPath(); ctx.arc(x, y - 27, 17, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#357047';
  ctx.beginPath(); ctx.arc(x - 5, y - 32, 10, 0, Math.PI * 2); ctx.fill();
}

function drawBench(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.fillRect(x - 22, y + 8, 44, 6);
  ctx.fillStyle = '#6b4a3a';
  ctx.fillRect(x - 20, y, 40, 8);
  ctx.fillStyle = '#8a6448';
  ctx.fillRect(x - 20, y - 2, 40, 4);
  ctx.fillStyle = '#2a3050';
  ctx.fillRect(x - 18, y + 8, 3, 8);
  ctx.fillRect(x + 15, y + 8, 3, 8);
}

function drawBin(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.fillRect(x - 9, y + 10, 18, 5);
  ctx.fillStyle = '#3f6b52';
  ctx.fillRect(x - 8, y - 6, 16, 18);
  ctx.fillStyle = '#558c6a';
  ctx.fillRect(x - 9, y - 9, 18, 4);
}

function drawHydrant(x, y) {
  ctx.fillStyle = '#b04158';
  ctx.fillRect(x - 5, y - 8, 10, 16);
  ctx.fillRect(x - 8, y - 2, 16, 4);
}

function drawBusStop(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.fillRect(x - 3, y - 2, 8, 4);
  ctx.fillStyle = '#2a3050';
  ctx.fillRect(x - 2, y - 56, 4, 56);
  ctx.fillStyle = '#2f4bb0';
  ctx.fillRect(x - 22, y - 66, 44, 20);
  ctx.fillStyle = '#fff';
  ctx.font = '10px "Noto Sans Thai", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ป้ายรถเมล์', x, y - 56);
  ctx.textAlign = 'left';
}

function drawWalker(x, y, phase, color, scale) {
  const s = scale || 1;
  const bob = Math.sin(phase) * 2;
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 8 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#20263f';
  ctx.fillRect(x - 5 * s, y - 8 * s + bob, 4 * s, 10 * s);
  ctx.fillRect(x + 1 * s, y - 8 * s - bob, 4 * s, 10 * s);

  ctx.fillStyle = color;
  ctx.fillRect(x - 6 * s, y - 24 * s + bob, 12 * s, 16 * s);

  ctx.fillStyle = '#f0c9a0';
  ctx.fillRect(x - 5 * s, y - 34 * s + bob, 10 * s, 10 * s);
  ctx.fillStyle = '#161a2e';
  ctx.fillRect(x - 5 * s, y - 36 * s + bob, 10 * s, 3 * s);
}

function drawCar(c) {
  const w = 42;
  const h = 24;
  const x = c.axis === 'h' ? c.x : c.x - h / 2;
  const y = c.axis === 'h' ? c.y - h / 2 : c.y;

  ctx.fillStyle = 'rgba(0,0,0,.3)';
  if (c.axis === 'h') ctx.fillRect(x + 3, y + 4, w, h);
  else ctx.fillRect(x + 3, y + 3, h, w);

  ctx.fillStyle = c.color;
  if (c.axis === 'h') {
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#0e1430';
    ctx.fillRect(x + 10, y + 4, 14, h - 8);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    if (c.dir > 0) ctx.fillRect(x + w - 5, y + 5, 4, 4);
    else ctx.fillRect(x + 1, y + 5, 4, 4);
  } else {
    ctx.fillRect(x, y, h, w);
    ctx.fillStyle = '#0e1430';
    ctx.fillRect(x + 4, y + 10, h - 8, 14);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    if (c.dir > 0) ctx.fillRect(x + 5, y + w - 5, 4, 4);
    else ctx.fillRect(x + 5, y + 1, 4, 4);
  }
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;
  const bob = player.moving ? Math.sin(player.frame * 2) * 2 : 0;
  const legSwing = player.moving ? Math.sin(player.frame * 2) * 4 : 0;

  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // legs
  ctx.fillStyle = '#1b2340';
  ctx.fillRect(x - 8 + legSwing, y - 10 + bob, 7, 12);
  ctx.fillRect(x + 1 - legSwing, y - 10 - bob, 7, 12);
  ctx.fillStyle = '#0f1428';
  ctx.fillRect(x - 9 + legSwing, y + 1 + bob, 8, 3);
  ctx.fillRect(x + 1 - legSwing, y + 1 - bob, 8, 3);

  // body
  ctx.fillStyle = '#e8eefc';
  ctx.fillRect(x - 10, y - 34 + bob, 20, 25);
  ctx.fillStyle = '#2b3a7a';
  ctx.fillRect(x - 10, y - 34 + bob, 20, 4);

  // arms
  ctx.fillStyle = '#dfe6f8';
  ctx.fillRect(x - 13, y - 33 + bob, 4, 17);
  ctx.fillRect(x + 9, y - 33 + bob, 4, 17);

  // tie
  ctx.fillStyle = '#e23a50';
  ctx.fillRect(x - 2, y - 30 + bob, 4, 15);

  // head
  ctx.fillStyle = '#f0c9a0';
  ctx.fillRect(x - 8, y - 50 + bob, 16, 15);

  // hair
  ctx.fillStyle = '#161a2e';
  ctx.fillRect(x - 9, y - 54 + bob, 18, 7);
  if (player.dir !== 'up') {
    ctx.fillRect(x - 9, y - 48 + bob, 3, 7);
    ctx.fillRect(x + 6, y - 48 + bob, 3, 7);
  } else {
    ctx.fillRect(x - 9, y - 48 + bob, 18, 4);
  }

  // eyes
  if (player.dir === 'down') {
    ctx.fillStyle = '#12142a';
    ctx.fillRect(x - 4, y - 43 + bob, 2, 2);
    ctx.fillRect(x + 2, y - 43 + bob, 2, 2);
  } else if (player.dir === 'left') {
    ctx.fillStyle = '#12142a';
    ctx.fillRect(x - 6, y - 43 + bob, 2, 2);
  } else if (player.dir === 'right') {
    ctx.fillStyle = '#12142a';
    ctx.fillRect(x + 4, y - 43 + bob, 2, 2);
  }
}

/* ---------- interiors ---------- */

function drawOffice() {
  const W = OFFICE.w * TILE;
  const H = OFFICE.h * TILE;

  // carpet
  ctx.fillStyle = '#2b3352';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.025)';
  for (let y = 1; y < OFFICE.h - 1; y++) {
    for (let x = 1; x < OFFICE.w - 1; x++) {
      if ((x + y) % 2 === 0) ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }

  // ceiling light pools
  [3, 9, 15].forEach(function (cx) {
    const lx = cx * TILE;
    const ly = 5 * TILE;
    const g = ctx.createRadialGradient(lx, ly, 10, lx, ly, 240);
    g.addColorStop(0, 'rgba(255,240,200,.10)');
    g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(lx - 240, ly - 240, 480, 480);
  });

  // walls
  ctx.fillStyle = '#1a2040';
  ctx.fillRect(0, 0, W, TILE);
  ctx.fillRect(0, H - TILE, W, TILE);
  ctx.fillRect(0, 0, TILE, H);
  ctx.fillRect(W - TILE, 0, TILE, H);

  // top wall windows
  for (let i = 2; i < OFFICE.w - 2; i += 3) {
    const wx = i * TILE + 10;
    ctx.fillStyle = '#0d1a3a';
    ctx.fillRect(wx, 8, TILE - 20, TILE - 24);
    ctx.fillStyle = 'rgba(120,190,255,.30)';
    ctx.fillRect(wx + 2, 10, TILE - 24, TILE - 28);
    ctx.fillStyle = '#1a2040';
    ctx.fillRect(wx + (TILE - 22) / 2, 8, 3, TILE - 24);
  }

  ctx.fillStyle = '#232b52';
  ctx.fillRect(TILE, H - TILE - 6, W - 2 * TILE, 6);

  // door
  ctx.fillStyle = '#2b3352';
  ctx.fillRect(9 * TILE, H - TILE, TILE, TILE);
  ctx.fillStyle = '#ffd75e';
  ctx.fillRect(9 * TILE + 8, H - TILE + 10, TILE - 16, 4);
  ctx.fillStyle = '#3a4268';
  ctx.fillRect(9 * TILE + 6, H - TILE + 22, TILE - 12, 16);

  // desks
  DESKS.forEach(function (d) {
    const x = d[0] * TILE;
    const y = d[1] * TILE;

    ctx.fillStyle = 'rgba(0,0,0,.30)';
    ctx.fillRect(x + 8, y + TILE - 8, 2 * TILE, 18);

    ctx.fillStyle = '#6b4a3a';
    ctx.fillRect(x, y + TILE - 30, 2 * TILE, 26);
    ctx.fillStyle = '#8a6448';
    ctx.fillRect(x, y + TILE - 34, 2 * TILE, 8);

    // monitor
    ctx.fillStyle = '#12162c';
    ctx.fillRect(x + 30, y + TILE - 84, 44, 34);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(x + 34, y + TILE - 80, 36, 26);
    ctx.fillStyle = '#0e1430';
    ctx.fillRect(x + 48, y + TILE - 50, 8, 10);

    // keyboard + mug
    ctx.fillStyle = '#2a3050';
    ctx.fillRect(x + 40, y + TILE - 22, 28, 8);
    ctx.fillStyle = '#ffd75e';
    ctx.fillRect(x + 82, y + TILE - 26, 10, 10);

    // chair
    ctx.fillStyle = '#2a3050';
    ctx.fillRect(x + 42, y + TILE - 2, 34, 26);
    ctx.fillStyle = '#39415e';
    ctx.fillRect(x + 46, y + TILE + 4, 26, 14);
  });

  // water cooler
  ctx.fillStyle = '#2a3050';
  ctx.fillRect(15 * TILE, 4 * TILE, TILE - 8, TILE);
  ctx.fillStyle = '#7dd3fc';
  ctx.fillRect(15 * TILE + 10, 4 * TILE + 8, TILE - 28, 22);
  ctx.fillStyle = '#c9e9ff';
  ctx.fillRect(15 * TILE + 14, 4 * TILE + 11, TILE - 36, 8);

  // plants
  [[2, 2], [16, 8], [2, 8]].forEach(function (p) {
    const x = p[0] * TILE;
    const y = p[1] * TILE;
    ctx.fillStyle = '#2a3050';
    ctx.fillRect(x + 18, y + 28, 20, 20);
    ctx.fillStyle = '#2b5c3d';
    ctx.beginPath(); ctx.arc(x + 28, y + 22, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#357047';
    ctx.beginPath(); ctx.arc(x + 23, y + 16, 10, 0, Math.PI * 2); ctx.fill();
  });
}

function drawHome() {
  const W = HOME.w * TILE;
  const H = HOME.h * TILE;

  // wood floor
  ctx.fillStyle = '#4a3b2e';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,0,0,.16)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= W; x += TILE) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.03)';
  for (let y = 1; y < HOME.h; y++) {
    ctx.fillRect(0, y * TILE, W, 2);
  }

  // walls
  ctx.fillStyle = '#3a2c22';
  ctx.fillRect(0, 0, W, TILE);
  ctx.fillRect(0, H - TILE, W, TILE);
  ctx.fillRect(0, 0, TILE, H);
  ctx.fillRect(W - TILE, 0, TILE, H);

  // window on top wall
  ctx.fillStyle = '#0d1a3a';
  ctx.fillRect(9 * TILE, 12, TILE - 6, TILE - 28);
  ctx.fillStyle = 'rgba(120,190,255,.28)';
  ctx.fillRect(9 * TILE + 3, 15, TILE - 12, TILE - 34);
  ctx.fillStyle = '#3a2c22';
  ctx.fillRect(9 * TILE + (TILE - 6) / 2, 12, 3, TILE - 28);

  // door
  ctx.fillStyle = '#5a4433';
  ctx.fillRect(7 * TILE, H - TILE, TILE, TILE);
  ctx.fillStyle = '#ffd75e';
  ctx.fillRect(7 * TILE + 8, H - TILE + 10, TILE - 16, 4);
  ctx.fillStyle = '#6b5240';
  ctx.fillRect(7 * TILE + 6, H - TILE + 22, TILE - 12, 16);

  // rug
  ctx.fillStyle = 'rgba(255,143,177,.16)';
  ctx.fillRect(5 * TILE, 4 * TILE, 4 * TILE, 2 * TILE);
  ctx.strokeStyle = 'rgba(255,143,177,.28)';
  ctx.lineWidth = 3;
  ctx.strokeRect(5 * TILE + 6, 4 * TILE + 6, 4 * TILE - 12, 2 * TILE - 12);

  // bed
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.fillRect(2 * TILE + 6, 2 * TILE + 8, 2 * TILE, 2 * TILE);
  ctx.fillStyle = '#c9d6ff';
  ctx.fillRect(2 * TILE, 2 * TILE, 2 * TILE, 2 * TILE);
  ctx.fillStyle = '#ff8fb1';
  ctx.fillRect(2 * TILE, 2 * TILE + 44, 2 * TILE, TILE * 2 - 44);
  ctx.fillStyle = '#e8eefc';
  ctx.fillRect(2 * TILE + 10, 2 * TILE + 8, TILE - 16, 26);

  // tv + stand
  ctx.fillStyle = '#2a3050';
  ctx.fillRect(6 * TILE, 1 * TILE, 2 * TILE, TILE);
  ctx.fillStyle = '#12162c';
  ctx.fillRect(6 * TILE + 12, 1 * TILE + 8, 2 * TILE - 24, TILE - 22);
  ctx.fillStyle = '#7dd3fc';
  ctx.fillRect(6 * TILE + 16, 1 * TILE + 12, 2 * TILE - 32, TILE - 30);

  // kitchen
  ctx.fillStyle = '#5a4433';
  ctx.fillRect(10 * TILE, 2 * TILE, 3 * TILE, TILE);
  ctx.fillStyle = '#8a6448';
  ctx.fillRect(10 * TILE, 2 * TILE, 3 * TILE, 10);
  ctx.fillStyle = '#c9d6ff';
  ctx.fillRect(11 * TILE + 2, 2 * TILE + 14, 30, 26);
  ctx.fillStyle = '#39415e';
  ctx.fillRect(10 * TILE + 12, 2 * TILE + 16, 24, 16);

  // fridge
  ctx.fillStyle = '#8a93b8';
  ctx.fillRect(13 * TILE, 2 * TILE + 4, TILE - 18, 2 * TILE - 8);
  ctx.fillStyle = '#a3abcd';
  ctx.fillRect(13 * TILE + 4, 2 * TILE + 8, TILE - 26, 26);
  ctx.fillStyle = '#39415e';
  ctx.fillRect(13 * TILE + (TILE - 18) / 2, 2 * TILE + 12, 3, 12);
}

function lightState() {
  const h = world.minutes / 60;
  if (h < 4.5) return ['#050a24', 0.62];
  if (h < 6.5) return ['#0a1338', 0.62 - (h - 4.5) / 2 * 0.62];
  if (h < 16.5) return ['#000000', 0];
  if (h < 19) return ['#3a1a3a', (h - 16.5) / 2.5 * 0.30];
  if (h < 21) return ['#0a1030', 0.30 + (h - 19) / 2 * 0.18];
  return ['#050a24', 0.62];
}

function drawLighting() {
  const l = lightState();
  if (l[1] <= 0.01) return;
  ctx.fillStyle = l[0];
  ctx.globalAlpha = l[1];
  ctx.fillRect(0, 0, VW, VH);
  ctx.globalAlpha = 1;

  // gentle vignette
  const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VH * 0.85);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,.38)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);
}

/* ---------- minimap ---------- */

function drawMini() {
  const el = document.getElementById('mini');
  const c = el.getContext('2d');
  const MW = el.width;
  const MH = el.height;

  c.fillStyle = '#0b1030';
  c.fillRect(0, 0, MW, MH);

  if (scene === 'city') {
    const s = MW / MAP_W;
    // ground
    c.fillStyle = '#22452e';
    c.fillRect(0, 0, MW, MH);
    // roads
    c.fillStyle = '#3a4058';
    c.fillRect(0, 8 * s, MW, 2 * s);
    c.fillRect(0, 20 * s, MW, 2 * s);
    c.fillRect(12 * s, 0, 2 * s, MH);
    c.fillRect(30 * s, 0, 2 * s, MH);
    // buildings
    BUILDINGS.forEach(function (b) {
      c.fillStyle = b.roof;
      c.fillRect(b.x * s, b.y * s, b.w * s, b.h * s);
    });
    // pond
    c.fillStyle = '#1d4a6b';
    c.fillRect(POND.x * s, POND.y * s, POND.w * s, POND.h * s);
    // player
    c.fillStyle = '#ffd75e';
    c.fillRect((player.x / TILE) * s - 2, (player.y / TILE) * s - 2, 4, 4);
    // viewport
    c.strokeStyle = 'rgba(232,238,255,.5)';
    c.lineWidth = 1;
    c.strokeRect(cam.x / TILE * s, cam.y / TILE * s, VW / TILE * s, VH / TILE * s);
  } else {
    const info = sceneInfo[scene];
    const s = Math.min(MW / info.w, (MH - 10) / info.h);
    c.fillStyle = '#1b2244';
    c.fillRect(0, 0, MW, MH);
    c.fillStyle = '#2b3352';
    c.fillRect(6, 6, MW - 12, MH - 16);
    c.fillStyle = '#ffd75e';
    c.fillRect(6 + (player.x / info.w) * (MW - 12) - 2, 6 + (player.y / info.h) * (MH - 16) - 2, 4, 4);
  }
}

/* ---------- main render ---------- */

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, VW, VH);
  ctx.fillStyle = '#0a0f2b';
  ctx.fillRect(0, 0, VW, VH);

  ctx.save();
  ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

  if (scene === 'city') {
    drawCity();
  } else if (scene === 'office') {
    drawOffice();
  } else {
    drawHome();
  }

  drawPlayer();
  ctx.restore();

  drawLighting();
  drawMini();
}

/* ==========================================================
   BOOT
   ========================================================== */

buildStats();
drawPortrait();
fitStage();
updateHud();

let last = 0;
function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min(0.05, (ts - last) / 1000);
  last = ts;

  if (!paused) update(dt);
  else {
    // keep prompt hidden while paused
    document.getElementById('prompt').classList.add('hidden');
  }

  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------- debug ---------- */
window.__ol = {
  stats: stats,
  world: world,
  player: player,
  flags: flags,
  tp: function (tx, ty) { player.x = tx * TILE; player.y = ty * TILE; },
  setScene: function (s) { scene = s; },
  tick: function (dt) { update(dt); render(); },
  doAction: function () { interact(); },
  fireEvent: function () { triggerOvertimeEvent(); },
  sleep: function () { sleep(); }
};
