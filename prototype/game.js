'use strict';

/* ==========================================================
   OPENLIFE — WALKABLE PROTOTYPE v0.1
   เดินเองบนแผนที่ · เวลาเดินเอง · หยุดเฉพาะ event
   ========================================================== */

const TILE = 64;
const VW = 1440;
const VH = 900;

const ART = 16;              // art pixels per tile
const W2A = TILE / ART;      // world px per art px (= 4)
const STREET_PIX = 4;        // screen px per art px — street view
const MAP_PIX = 2;           // screen px per art px — city map view
let PIX = STREET_PIX;
let AW = VW / PIX;           // art-pixel viewport width
let AH = VH / PIX;           // art-pixel viewport height

const cv = document.getElementById('game');
const mainCtx = cv.getContext('2d');
mainCtx.imageSmoothingEnabled = false;

const buffer = document.createElement('canvas');
buffer.width = AW;
buffer.height = AH;
const bctx = buffer.getContext('2d');
bctx.imageSmoothingEnabled = false;
let ctx = bctx;

function setPixelScale(p) {
  if (p === PIX) return;
  PIX = p;
  AW = VW / PIX;
  AH = VH / PIX;
  buffer.width = AW;
  buffer.height = AH;
  bctx.imageSmoothingEnabled = false;
}

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
  { id: 'bar',      name: 'ร้านเหล้า',        x: 23, y: 25, w: 3, h: 2, roof: '#6e3a4e', roofDark: '#4c2736', wall: '#33202a', sign: '#b04158', door: 24 }
];

const TREES = [
  [7, 3], [9, 3], [27, 3], [38, 3],
  [7, 11], [9, 11], [27, 11], [39, 11],
  [7, 17], [23, 17], [37, 17],
  [0, 6], [39, 5], [22, 24], [37, 24],
  [2, 18], [22, 6]
];

const BUSHES = [
  [7.4, 5.4], [9.6, 5.4],
  [4.6, 11.2], [8.4, 11.2],
  [19.2, 11.4], [23.2, 11.4], [27.6, 11.4],
  [22.4, 13.4], [22.4, 16.4],
  [8.4, 18.2], [21.4, 18.4],
  [35.4, 11.4], [38.4, 16.4],
  [22.4, 23.4], [22.4, 26.4],
  [2.4, 23.4], [9.9, 25.5],
  [24.4, 5.4], [28.4, 5.4], [26.6, 6.4], [38.6, 6.4], [8.2, 6.4]
];

const SCOOTERS = [
  [7.9, 10.55, '#c9d6ff'],
  [25.4, 7.45, '#ff8fb1'],
  [22.6, 10.5, '#ffd75e'],
  [33.6, 7.5, '#7dd3fc'],
  [27.4, 10.5, '#6ee7a8']
];

const LIGHTS = [
  [9, 7.4], [16, 7.4], [24, 7.4], [33, 7.4],
  [9, 10.6], [16, 10.6], [24, 10.6], [33, 10.6],
  [9.6, 26.3]
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
  { x: 26, y: 16, w: 2, h: 2, roof: '#6e5a3a', roofDark: '#4a3c26' },
  { x: 0, y: 16, w: 2, h: 2, roof: '#4b5a7a', roofDark: '#333f58' },
  { x: 26, y: 23, w: 2, h: 2, roof: '#6e5a3a', roofDark: '#4a3c26' }
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
for (let y = 2; y <= 5; y++) officeGrid[y][16] = 1;       // filing cabinets
for (let y = 6; y <= 7; y++) {                            // meeting table
  for (let x = 6; x <= 8; x++) officeGrid[y][x] = 1;
}

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
  credit: 65,
  smarts: 55,
  social: 50
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

/* ---------- career / economy (vertical slice: อายุ 22, บทสร้างตัว) ---------- */

const profile = {
  name: 'สมชาย ใจดี',
  age: 22,
  chapter: 'สร้างตัว',
  job: 'พนักงานเงินเดือน · เด็กใหม่'
};

const finance = {
  salary: 22000,       // เงินเดือนสุทธิ
  rent: 5500,          // ค่าเช่าห้อง
  transport: 3000      // เดินทางรายเดือน
};

const CAREER_RANKS = [
  { title: 'เด็กใหม่', min: 18000, max: 25000 },
  { title: 'เจ้าหน้าที่อาวุโส', min: 25000, max: 35000 },
  { title: 'หัวหน้าทีม', min: 35000, max: 50000 },
  { title: 'ผู้จัดการ', min: 50000, max: 80000 },
  { title: 'ผู้อำนวยการ', min: 80000, max: 150000 }
];

const career = {
  rank: 0,
  yearsInRank: 0,
  lastReviewAge: 264,
  reviews: 0,
  promotions: 0,
  bonusTotal: 0
};

// หนี้ 3 ก้อน (ต้นแบบ M1) — ผู้เล่นต้องจ่ายเอง ไม่หักเงินเดือนอัตโนมัติ
const debts = {
  credit: { label: 'บัตรเครดิต', balance: 15000, rate: 0.025, min: 1500, dueDay: 25, missed: 0, lastPaidKey: null, repossessed: false, collector: false, lawsuit: false, grace: false },
  car: { label: 'ผ่อนรถ', balance: 180000, rate: 0.006, min: 6500, dueDay: 5, missed: 0, lastPaidKey: null, repossessed: false, collector: false, lawsuit: false, grace: false },
  student: { label: 'กยศ.', balance: 120000, rate: 0.01, min: 1200, dueDay: 15, missed: 0, lastPaidKey: null, repossessed: false, collector: false, lawsuit: false, grace: false }
};

let monthsPlayed = 0;
let pendingEnding = null;
let gameOver = false;
const SAVE_KEY = 'openlife.save.v3';

/* ==========================================================
   FULL LIFE · chapters, creation, event pools
   ========================================================== */

const CHAPTERS = [
  { n: 1, name: 'ปฐมวัย', from: 0, to: 6, months: 24, turns: 3 },
  { n: 2, name: 'ประถม', from: 6, to: 12, months: 12, turns: 6 },
  { n: 3, name: 'มัธยม', from: 12, to: 18, months: 12, turns: 6 },
  { n: 4, name: 'อุดมศึกษา/อาชีวะ', from: 18, to: 22, months: 12, turns: 4 },
  { n: 5, name: 'สร้างตัว', from: 22, to: 27, months: 1, turns: 60 },
  { n: 6, name: 'ตั้งหลัก', from: 27, to: 35, months: 3, turns: 32 },
  { n: 7, name: 'ครอบครัว', from: 35, to: 45, months: 6, turns: 20 },
  { n: 8, name: 'วิกฤตกลางคน', from: 45, to: 55, months: 3, turns: 40 },
  { n: 9, name: 'ปลายทาง', from: 55, to: 60, months: 6, turns: 10 },
  { n: 10, name: 'ชรา', from: 60, to: 120, months: 12, turns: 25 }
];

const life = {
  phase: 'creation',   // creation | early | adult | ended
  chapter: 1,
  turn: 0,
  ageMonths: 0,
  backgroundId: null,
  dreamId: null,
  gender: 'ชาย',
  province: 'กรุงเทพฯ',
  traits: [],
  rel: { family: 70, friend: 50, love: 0, boss: 50 },
  flags: {},
  log: [],
  eventIndex: {},
  lastEventTitle: '',
  child: { name: 'ลูก', ageMonths: -1, relation: 70 },
  parents: { health: 75, alive: true }
};

const BACKGROUNDS = [
  { id: 'poor', name: 'จนแต่ขยัน', desc: 'เงินไม่พอ แต่บ้านเต็มไปด้วยกำลังใจ', money: 500, health: 60, heart: 70, family: 90, trait: 'แรงฮึด' },
  { id: 'mid', name: 'กลาง ๆ', desc: 'ไม่รวยไม่จน พออยู่ได้', money: 5000, health: 70, heart: 65, family: 70, trait: null },
  { id: 'rich', name: 'มีเงิน แต่พ่อแม่ไม่ค่อยอยู่บ้าน', desc: 'วัตถุครบ แต่ความอบอุ่นขาด', money: 50000, health: 70, heart: 45, family: 35, trait: 'มีคอนเนคชัน' },
  { id: 'broken', name: 'ครอบครัวแตกแยก', desc: 'ต้องโตเองเร็วกว่าคนอื่น', money: 2000, health: 65, heart: 30, family: 20, trait: 'อดทน' }
];

const DREAMS = [
  { id: 'house', name: 'ซื้อบ้านให้พ่อแม่' },
  { id: 'family', name: 'มีครอบครัวที่อบอุ่น' },
  { id: 'manager', name: 'เป็นผู้จัดการก่อน 35' },
  { id: 'retire', name: 'มีเงินเก็บพอเกษียณ' },
  { id: 'business', name: 'เป็นเจ้าของธุรกิจตัวเอง' },
  { id: 'free', name: 'ใช้ชีวิตโดยไม่ต้องคิดถึงเงินเดือน' }
];

const PROVINCES = ['กรุงเทพฯ', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'เชียงใหม่', 'ขอนแก่น', 'ชลบุรี', 'สงขลา'];

/* ---------- early-life events (chapters 1–4) ---------- */

const EARLY_EVENTS = {
  1: [
    {
      title: 'คำแรกที่พูด',
      text: 'คุณกำลังหัดพูด พ่อกับแม่นั่งล้อมรอบรอฟัง',
      choices: [
        { label: 'พูด “แม่”', fx: { heart: 6, rel: { family: 6 } } },
        { label: 'พูด “พ่อ”', fx: { heart: 4, rel: { family: 4 } } },
        { label: 'พูดคำที่ไม่มีใครเข้าใจ', fx: { smarts: 4, heart: 2 } }
      ]
    },
    {
      title: 'ของเล่นที่อยากได้',
      text: 'เพื่อนบ้านมีของเล่นใหม่ และคุณอยากได้บ้าง',
      choices: [
        { label: 'ร้องไห้งอแงจนได้มา', fx: { heart: 2, rel: { family: -4 } } },
        { label: 'เก็บเงินเองทีละบาท', fx: { smarts: 4, money: 50, trait: 'ประหยัด' } },
        { label: 'แบ่งของเล่นให้เพื่อน', fx: { social: 5, rel: { friend: 5 } } }
      ]
    },
    {
      title: 'พ่อแม่ทะเลาะกัน',
      text: 'เสียงทะเลาะดังมาจากห้องนอน และคุณไม่รู้จะทำอะไร',
      choices: [
        { label: 'ซ่อนตัวใต้ผ้าห่ม', fx: { heart: -4 } },
        { label: 'เข้าไปกอดแม่', fx: { heart: 2, rel: { family: 3 }, trait: 'อดทน' } },
        { label: 'วิ่งออกไปนอกบ้าน', fx: { health: -2, heart: -2 } }
      ]
    }
  ],
  2: [
    {
      title: 'วันแรกของโรงเรียน',
      text: 'คุณถือกระเป๋าใหม่ ยืนอยู่หน้าประตูห้องเรียน',
      choices: [
        { label: 'แนะนำตัวกับทุกคน', fx: { social: 6, heart: 3 } },
        { label: 'นั่งเงียบ ๆ คนเดียว', fx: { smarts: 2, social: -3 } },
        { label: 'ไปหาเพื่อนที่ดูใจดี', fx: { social: 4, rel: { friend: 4 } } }
      ]
    },
    {
      title: 'สอบปลายภาค',
      text: 'คืนนี้มีสอบ พรุ่งนี้เช้าต้องตื่นแต่หกโมง',
      choices: [
        { label: 'อ่านหนังสือจนดึก', fx: { smarts: 6, energy: -8, health: -1 } },
        { label: 'เล่นเกมแล้วอ่านนิดหน่อย', fx: { heart: 3, smarts: 1 } },
        { label: 'ขอลอกการบ้านเพื่อน', fx: { smarts: 1, social: -2, trait: 'เจ้าเล่ห์' } }
      ]
    },
    {
      title: 'เพื่อนถูกแกล้ง',
      text: 'เพื่อนสนิทของคุณถูกเพื่อนโตกว่าล้อเรื่องเสื้อผ้า',
      choices: [
        { label: 'เข้าไปปกป้องเพื่อน', fx: { social: 6, health: -2, rel: { friend: 7 } } },
        { label: 'ทำเป็นไม่เห็น', fx: { heart: -4, rel: { friend: -4 } } },
        { label: 'ไปบอกครู', fx: { smarts: 3, social: 2, rel: { friend: 4 } } }
      ]
    },
    {
      title: 'ค่าขนม',
      text: 'แม่ให้เงินมา 50 บาทสำหรับทั้งสัปดาห์',
      choices: [
        { label: 'เก็บไว้ใช้ยามจำเป็น', fx: { money: 30, trait: 'ประหยัด' } },
        { label: 'ซื้อขนมที่อยากกิน', fx: { heart: 4, energy: 3 } },
        { label: 'แบ่งให้เพื่อนที่ไม่มีเงิน', fx: { social: 5, rel: { friend: 5 }, money: -20 } }
      ]
    },
    {
      title: 'กีฬาสี',
      text: 'โรงเรียนจัดกีฬาสี และคุณต้องเลือกว่าจะอยู่ทีมไหน',
      choices: [
        { label: 'ลงแข่งวิ่ง', fx: { health: 5, social: 3, energy: -4 } },
        { label: 'เป็นกองเชียร์', fx: { social: 5, heart: 3 } },
        { label: 'หลบไปอ่านหนังสือ', fx: { smarts: 5, social: -3 } }
      ]
    },
    {
      title: 'พ่อแม่ทำงานหนัก',
      text: 'คุณเห็นแม่กลับบ้านดึกทุกวัน และบางคืนก็ร้องไห้',
      choices: [
        { label: 'ช่วยงานบ้านทุกวัน', fx: { rel: { family: 7 }, energy: -3 } },
        { label: 'ขอให้ซื้อของอีก', fx: { heart: -2, rel: { family: -3 }, money: -100 } },
        { label: 'ตั้งใจเรียนให้แม่ภูมิใจ', fx: { smarts: 4, rel: { family: 4 } } }
      ]
    }
  ],
  3: [
    {
      title: 'เลือกสายการเรียน',
      text: 'มัธยมปลายต้องเลือกสาย ครูถามว่าคุณอยากเป็นอะไร',
      choices: [
        { label: 'สายวิทย์–คณิต', fx: { smarts: 7, energy: -3, trait: 'ขยัน' } },
        { label: 'สายศิลป์–ภาษา', fx: { smarts: 4, social: 5 } },
        { label: 'สายอาชีวะ', fx: { smarts: 3, money: 1000, trait: 'อดทน' } }
      ]
    },
    {
      title: 'แฟนคนแรก',
      text: 'เพื่อนในห้องส่งกระดาษมาให้ พร้อมคำถามที่ทำให้ใจเต้น',
      choices: [
        { label: 'สารภาพรัก', fx: { heart: 8, rel: { love: 20 }, social: 3 } },
        { label: 'เก็บความรู้สึกไว้', fx: { heart: 2, smarts: 2 } },
        { label: 'ให้เพื่อนเป็นคนถามแทน', fx: { social: 4, heart: 3 } }
      ]
    },
    {
      title: 'สอบเข้ามหาวิทยาลัย',
      text: 'เหลืออีกสามเดือนก่อนสอบใหญ่',
      choices: [
        { label: 'ติวหนักทุกวัน', fx: { smarts: 8, energy: -10, health: -1 } },
        { label: 'ติวบ้าง เที่ยวบ้าง', fx: { smarts: 3, heart: 4 } },
        { label: 'วางแผนเรียนอาชีวะ', fx: { smarts: 2, money: 500 } }
      ]
    },
    {
      title: 'เพื่อนชวนเที่ยวกลางคืน',
      text: 'เพื่อนกลุ่มใหม่ชวนออกไปเที่ยวทั้งคืน',
      choices: [
        { label: 'ไปด้วย', fx: { social: 6, health: -4, money: -300 } },
        { label: 'ปฏิเสธ', fx: { heart: 2, smarts: 2 } },
        { label: 'ไปแค่ช่วงหัวค่ำ', fx: { social: 3, heart: 2 } }
      ]
    },
    {
      title: 'ครอบครัวมีหนี้',
      text: 'คุณได้ยินพ่อคุยโทรศัพท์เรื่องเจ้าหนี้',
      choices: [
        { label: 'ทำงานเสริมหารายได้', fx: { money: 2000, energy: -6, rel: { family: 5 }, trait: 'ขยัน' } },
        { label: 'ไม่ยุ่งเรื่องผู้ใหญ่', fx: { heart: 1 } },
        { label: 'ถามพ่อตรง ๆ', fx: { rel: { family: 3 }, smarts: 2 } }
      ]
    },
    {
      title: 'ความฝัน',
      text: 'ครูให้เขียนเรียงความ “ฉันอยากเป็นอะไรในอีก 10 ปี”',
      choices: [
        { label: 'เขียนความฝันเดิม', fx: { heart: 5 } },
        { label: 'เขียนสิ่งที่พ่ออยากให้เป็น', fx: { rel: { family: 3 }, heart: -2 } },
        { label: 'ยังไม่รู้ ตอบตรง ๆ', fx: { smarts: 2, heart: 2 } }
      ]
    }
  ],
  4: [
    {
      title: 'เลือกเส้นทางหลังมัธยม',
      text: 'ผลสอบออกแล้ว และประตูหลายบานเปิดพร้อมกัน',
      choices: [
        { label: 'เข้ามหาวิทยาลัย', fx: { smarts: 8, money: -2000, trait: 'ขยัน', flags: { path: 'uni' } } },
        { label: 'เรียนอาชีวะ/เทคนิค', fx: { smarts: 4, money: 1000, trait: 'อดทน', flags: { path: 'voc' } } },
        { label: 'ออกไปทำงานเลย', fx: { money: 5000, social: 3, heart: -2, flags: { path: 'work' } } }
      ]
    },
    {
      title: 'ฝึกงาน',
      text: 'คุณได้ฝึกงานที่บริษัทแห่งหนึ่ง หัวหน้าดูจริงจัง',
      choices: [
        { label: 'ตั้งใจทำงานทุกอย่าง', fx: { kpi: 6, energy: -6, smarts: 3 } },
        { label: 'สร้างคอนเนคชัน', fx: { social: 7, rel: { boss: 5 } } },
        { label: 'ทำงานพอผ่าน', fx: { heart: 3, kpi: 1 } }
      ]
    },
    {
      title: 'กยศ.',
      text: 'ค่าเทอมกับค่าครองชีพไม่พอ และมีทางเลือกกู้',
      choices: [
        { label: 'กู้ กยศ.', apply: function () { stats.money += 30000; life.flags.studentLoan = 30000; stats.heart = clamp(stats.heart - 2, 0, 100); } },
        { label: 'ไม่กู้ ทำงานพิเศษ', fx: { money: 8000, energy: -8, trait: 'ขยัน' } },
        { label: 'ขอความช่วยเหลือจากครอบครัว', fx: { money: 15000, rel: { family: -4 } } }
      ]
    },
    {
      title: 'เพื่อนสนิท',
      text: 'เพื่อนที่สนิทที่สุดกำลังจะลาออกจากมหาวิทยาลัย',
      choices: [
        { label: 'ช่วยเหลือเต็มที่', fx: { money: -3000, rel: { friend: 10 }, heart: 4 } },
        { label: 'ให้กำลังใจเท่าที่ทำได้', fx: { rel: { friend: 4 }, heart: 2 } },
        { label: 'ปล่อยให้เป็นเรื่องของเขา', fx: { rel: { friend: -6 }, heart: -3 } }
      ]
    }
  ]
};


/* ---------- adult chapter events (5–10) ---------- */

const ADULT_EVENTS = {
  5: [
    {
      title: 'งานแรกในชีวิต',
      text: 'คุณเซ็นสัญญาพนักงานใหม่ เงินเดือนยังไม่มาก แต่ทุกอย่างเริ่มต้นที่นี่',
      choices: [
        { label: 'โหมงานเพื่อพิสูจน์ตัวเอง', fx: { kpi: 8, health: -2, heart: -3 } },
        { label: 'ทำงานให้พอดี', fx: { kpi: 4, heart: 2 } },
        { label: 'สร้างความสัมพันธ์กับทีม', fx: { social: 6, rel: { boss: 4, friend: 4 } } }
      ]
    },
    {
      title: 'เงินเดือนก้อนแรก',
      text: 'เงินเดือนออกแล้ว คุณอยากใช้มันให้คุ้มที่สุด',
      choices: [
        { label: 'เก็บครึ่งหนึ่ง', fx: { money: 3000, trait: 'ประหยัด' } },
        { label: 'ส่งให้พ่อแม่', fx: { money: -2000, rel: { family: 7 }, heart: 4 } },
        { label: 'เลี้ยงเพื่อนร่วมงาน', fx: { money: -1500, social: 5, rel: { friend: 4 } } }
      ]
    },
    {
      title: 'เพื่อนร่วมงานที่ไว้ใจได้',
      text: 'เพื่อนใหม่ในทีมชวนคุณไปดื่มหลังเลิกงาน',
      choices: [
        { label: 'ไปสร้างความสัมพันธ์', fx: { social: 5, heart: 3, health: -1, money: -500 } },
        { label: 'กลับบ้านพักผ่อน', fx: { health: 2, heart: 1 } },
        { label: 'ชวนคุยเรื่องงานต่อ', fx: { kpi: 4, rel: { boss: 2 } } }
      ]
    }
  ],
  6: [
    {
      title: 'แต่งงานหรือไม่',
      cond: function () { return !life.flags.married; },
      text: 'ความสัมพันธ์มาถึงจุดที่ต้องตัดสินใจ — จะจดทะเบียนหรือรอต่อไป',
      choices: [
        { label: 'แต่งงาน', fx: { money: -50000, heart: 12, rel: { love: 20, family: 5 }, flags: { married: true } } },
        { label: 'อยู่ด้วยกันก่อน', fx: { heart: 6, rel: { love: 8 } } },
        { label: 'ขอเวลาเพิ่ม', fx: { heart: -2, rel: { love: -5 } } }
      ]
    },
    {
      title: 'บ้านหลังแรก',
      cond: function () { return !life.flags.house; },
      text: 'คุณเริ่มคิดถึงที่อยู่ของตัวเอง แต่ราคาบ้านไม่เคยรอใคร',
      choices: [
        { label: 'กู้ซื้อบ้าน', fx: { money: -100000, heart: 8, flags: { house: true }, trait: 'อดทน' } },
        { label: 'เช่าต่อไป', fx: { money: -30000, heart: 2 } },
        { label: 'อยู่กับพ่อแม่', fx: { money: 10000, rel: { family: 4 } } }
      ]
    },
    {
      title: 'มีลูกไหม',
      cond: function () { return life.flags.married && !life.flags.kid; },
      text: 'ทั้งสองคนคุยกันเรื่องอนาคต และคำว่า “ครอบครัว” ก็หนักขึ้น',
      choices: [
        { label: 'มีลูก', fx: { money: -30000, heart: 10, rel: { love: 8, family: 6 }, flags: { kid: true } } },
        { label: 'ยังไม่พร้อม', fx: { money: 10000, heart: 2 } },
        { label: 'เลี้ยงสัตว์แทน', fx: { money: -5000, heart: 5 } }
      ]
    },
    {
      title: 'ข้อเสนอจากบริษัทอื่น',
      text: 'มี recruiter โทรมา เงินเดือนมากกว่าเดิม 25% แต่ต้องเริ่มใหม่',
      choices: [
        { label: 'รับข้อเสนอ', apply: function () { finance.salary = Math.round(finance.salary * 1.25); stats.kpi = clamp(stats.kpi + 5, 0, 100); stats.heart = clamp(stats.heart - 4, 0, 100); profile.job = 'พนักงานบริษัท (ใหม่)'; } },
        { label: 'ต่อรองที่เดิม', fx: { kpi: 5, rel: { boss: 3 } } },
        { label: 'ปฏิเสธ', fx: { heart: 3, rel: { boss: 2 } } }
      ]
    }
  ],
  7: [
    {
      title: 'ลูกเข้าโรงเรียน',
      text: 'ค่าเทอม โรงเรียน และอนาคตของลูกกลายเป็นเรื่องเดียวกัน',
      choices: [
        { label: 'โรงเรียนเอกชน', fx: { money: -40000, kpi: 2, rel: { family: 6 } } },
        { label: 'โรงเรียนรัฐใกล้บ้าน', fx: { money: -10000, rel: { family: 3 } } },
        { label: 'ให้ลูกอยู่บ้านเกิด', fx: { money: 5000, rel: { family: -3 } } }
      ]
    },
    {
      title: 'พ่อแม่ป่วย',
      text: 'แม่โทรมาบอกว่าพ่อเข้าห้อง ICU และต้องมีคนดูแล',
      choices: [
        { label: 'ลางานไปดูแล', fx: { money: -15000, health: -2, rel: { family: 12 }, heart: 6 } },
        { label: 'จ้างคนดูแล', fx: { money: -25000, rel: { family: 4 } } },
        { label: 'ฝากญาติช่วย', fx: { rel: { family: -6 }, heart: -5 } }
      ]
    },
    {
      title: 'งานกับชีวิต',
      text: 'โปรเจกต์ใหญ่มาพร้อม OT ทุกคืน แต่ลูกกำลังโต',
      choices: [
        { label: 'รับ OT', fx: { money: 8000, kpi: 6, health: -4, heart: -5, rel: { family: -6 } } },
        { label: 'ปฏิเสธและกลับบ้าน', fx: { heart: 5, rel: { family: 7 }, kpi: -3 } },
        { label: 'ขอทำงานที่บ้าน', fx: { heart: 2, kpi: 2, rel: { family: 3 } } }
      ]
    },
    {
      title: 'เพื่อนเก่าจากมหาวิทยาลัย',
      text: 'เพื่อนสนิทสมัยเรียนโทรมาชวนลงทุนร้านอาหาร',
      choices: [
        { label: 'ลงทุนด้วย', fx: { money: -30000, social: 5, rel: { friend: 8 } } },
        { label: 'ช่วยออกไอเดีย', fx: { social: 3, rel: { friend: 4 } } },
        { label: 'ปฏิเสธ', fx: { rel: { friend: -3 } } }
      ]
    }
  ],
  8: [
    {
      title: 'เลย์ออฟอายุ 45',
      text: 'HR เรียกเข้าห้อง พร้อมซองสีขาวและคำว่า “ปรับโครงสร้าง”',
      choices: [
        {
          label: 'รับเงินชดเชยแล้วหางานใหม่',
          apply: function () {
            finance.salary = Math.max(12000, Math.round(finance.salary * 0.7));
            stats.heart = clamp(stats.heart - 8, 0, 100);
            stats.health = clamp(stats.health - 3, 0, 100);
            life.flags.laidoff = true;
            life.flags.unemployed = true;
            profile.job = 'ว่างงาน';
          }
        },
        { label: 'ต่อรองกับบริษัท', fx: { kpi: 3, heart: -4, money: 8000 } },
        { label: 'ออกไปทำธุรกิจเอง', apply: function () { finance.salary = 15000; life.flags.business = true; profile.job = 'เจ้าของธุรกิจ'; stats.heart = clamp(stats.heart + 4, 0, 100); } }
      ]
    },
    {
      title: 'ผลตรวจสุขภาพ',
      text: 'หมอบอกว่าความดันสูงและน้ำตาลเริ่มผิดปกติ',
      choices: [
        { label: 'เปลี่ยนวิถีชีวิตทันที', fx: { health: 8, energy: -3, money: -3000 } },
        { label: 'กินยาต่อไป', fx: { health: 2, money: -1500 } },
        { label: 'ปล่อยไว้ก่อน', fx: { health: -8, heart: -2 } }
      ]
    },
    {
      title: 'หนี้ท่วม',
      text: 'ยอดหนี้รวมเกินเงินเก็บ และเจ้าหนี้เริ่มโทรมาบ่อยขึ้น',
      choices: [
        { label: 'ขายรถลดหนี้', apply: function () { debts.car.balance = 0; debts.car.repossessed = true; life.flags.car = false; stats.money += 30000; stats.heart = clamp(stats.heart - 4, 0, 100); } },
        { label: 'รวมหนี้ refinance', fx: { credit: -3, heart: -3 } },
        { label: 'ปล่อยไว้', fx: { credit: -6, heart: -5, health: -2 } }
      ]
    },
    {
      title: 'ลูกโตแล้ว',
      text: 'ลูกบอกว่าอยากไปเรียนต่อต่างจังหวัด',
      choices: [
        { label: 'สนับสนุนเต็มที่', fx: { money: -25000, rel: { family: 8 }, heart: 5 } },
        { label: 'ให้ทำงานเก็บเงินเอง', fx: { rel: { family: -4 }, heart: -2 } },
        { label: 'ให้เรียนใกล้บ้าน', fx: { money: -8000, rel: { family: 3 } } }
      ]
    }
  ],
  9: [
    {
      title: 'เกษียณหรือทำงานต่อ',
      text: 'อายุใกล้ 60 แล้ว คุณต้องเลือกจังหวะปล่อยวาง',
      choices: [
        { label: 'เกษียณ', apply: function () { finance.salary = 0; life.flags.retired = true; profile.job = 'เกษียณ'; stats.heart = clamp(stats.heart + 8, 0, 100); stats.health = clamp(stats.health + 3, 0, 100); } },
        { label: 'ทำงานต่ออีกหน่อย', fx: { money: 50000, health: -3, heart: -2 } },
        { label: 'ทำงานพาร์ทไทม์', apply: function () { finance.salary = 8000; life.flags.retired = true; profile.job = 'พนักงานพาร์ทไทม์'; } }
      ]
    },
    {
      title: 'บ้านของพ่อแม่',
      text: 'พ่อแม่จากไป และบ้านหลังเก่าตกเป็นของคุณ',
      choices: [
        { label: 'เก็บไว้เป็นความทรงจำ', fx: { heart: 6, money: -10000 } },
        { label: 'ขายแล้วแบ่งพี่น้อง', fx: { money: 150000, rel: { family: -3 } } },
        { label: 'ให้ญาติอยู่ต่อ', fx: { rel: { family: 5 }, heart: 3 } }
      ]
    },
    {
      title: 'งานศพญาติ',
      text: 'ญาติสนิทเสียชีวิต และคุณต้องไปงานศพที่ต่างจังหวัด',
      choices: [
        { label: 'ไปและใส่ซอง 3,000', fx: { money: -3000, rel: { family: 6 }, heart: 2 } },
        { label: 'ไปแต่ใส่ซองน้อย', fx: { money: -1000, rel: { family: 2 } } },
        { label: 'ไม่ได้ไป', fx: { rel: { family: -8 }, heart: -4 } }
      ]
    },
    {
      title: 'ความฝันที่เหลือ',
      text: 'คุณเปิดสมุดเก่าและเจอสิ่งที่เคยเขียนไว้ตอนอายุ 18',
      choices: [
        { label: 'ลองทำความฝันนั้นอีกครั้ง', fx: { heart: 10, money: -20000, trait: 'แรงฮึด' } },
        { label: 'ปล่อยมันไป', fx: { heart: -4 } },
        { label: 'เล่าให้ลูกฟัง', fx: { rel: { family: 6 }, heart: 4 } }
      ]
    }
  ],
  10: [
    {
      title: 'ร่างกายของวัยชรา',
      text: 'คุณตื่นมาแล้วรู้ว่าวันนี้ร่างกายไม่เหมือนเมื่อวาน',
      choices: [
        { label: 'ออกกำลังกายเบา ๆ', fx: { health: 5, energy: 2 } },
        { label: 'ไปตรวจสุขภาพ', fx: { health: 3, money: -2000 } },
        { label: 'อยู่บ้านพักผ่อน', fx: { health: -3, heart: 2 } }
      ]
    },
    {
      title: 'ลูกหลาน',
      text: 'ลูกพาหลานมาเยี่ยม และบ้านก็เต็มไปด้วยเสียงหัวเราะ',
      choices: [
        { label: 'เลี้ยงหลานทั้งวัน', fx: { rel: { family: 8 }, heart: 6, energy: -6 } },
        { label: 'เล่าเรื่องเก่าให้ฟัง', fx: { rel: { family: 5 }, heart: 4 } },
        { label: 'ขอพักผ่อน', fx: { health: 2, rel: { family: -2 } } }
      ]
    },
    {
      title: 'ความหมายของชีวิต',
      text: 'คุณมีเวลาว่างมากพอที่จะถามตัวเองว่าเหลืออะไรอีก',
      choices: [
        { label: 'ทำบุญและช่วยชุมชน', fx: { heart: 7, social: 5, money: -5000 } },
        { label: 'เขียนบันทึกความทรงจำ', fx: { smarts: 4, heart: 5 } },
        { label: 'อยู่เงียบ ๆ คนเดียว', fx: { heart: -3, health: 1 } }
      ]
    },
    {
      title: 'เพื่อนเก่าคนสุดท้าย',
      text: 'เพื่อนสมัยเด็กโทรมา เขาบอกว่าอยากเจอกันก่อนจะสายเกินไป',
      choices: [
        { label: 'ไปหา', fx: { social: 6, heart: 8, energy: -4 } },
        { label: 'โทรคุยแทน', fx: { heart: 3 } },
        { label: 'ไม่ได้ไป', fx: { heart: -5 } }
      ]
    }
  ]
};


const player = {
  x: 6.5 * TILE,
  y: 16.4 * TILE,
  dir: 'down',
  moving: false,
  frame: 0
};

let scene = 'city';
let viewMode = 'map';       // 'map' = แผนที่เมืองเต็มจอ · 'street' = เดินชมถนน
let cityMapStatic = null;
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
  if (k === 'f' && !paused) openFinance();
  if (k === 'j' && !paused && life.phase === 'adult') openJobSearch();
  if (k === 'l' && !paused && life.phase === 'adult') openLife();
  if (k === 'm' && scene === 'city' && !paused) {
    viewMode = viewMode === 'map' ? 'street' : 'map';
    toast(viewMode === 'map' ? 'มุมมองแผนที่เมือง' : 'มุมมองถนน');
  }
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
  { x: 3.0 * TILE, y: 4.4 * TILE, r: 100, label: 'นอน / จบเดือน', act: openSleep },
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

﻿
/* ---------- EXTRA EVENT PACK · +66 events ---------- */

const EXTRA_EVENTS = {
  1: [
    {
      title: 'ร้องไห้กลางดึก',
      text: 'คุณตื่นมากลางดึกเพราะฝันร้าย และบ้านทั้งหลังเงียบสนิท',
      choices: [
        { label: 'เรียกแม่', fx: { heart: 5, rel: { family: 4 }, energy: -2 } },
        { label: 'นอนต่อคนเดียว', fx: { heart: -2, trait: 'อดทน' } },
        { label: 'ไปนอนกับพ่อแม่', fx: { heart: 4, rel: { family: 3 } } }
      ]
    },
    {
      title: 'คำสอนของปู่ย่า',
      text: 'ปู่เล่าเรื่องสมัยก่อนให้ฟัง ขณะที่คุณยังไม่เข้าใจทั้งหมด',
      choices: [
        { label: 'นั่งฟังจนจบ', fx: { smarts: 4, rel: { family: 4 } } },
        { label: 'วิ่งไปเล่นต่อ', fx: { energy: 3, smarts: -1 } },
        { label: 'ถามกลับอย่างสงสัย', fx: { smarts: 5, social: 2 } }
      ]
    },
    {
      title: 'เป็นหวัดหนัก',
      text: 'คุณตัวร้อนและไอทั้งคืน แม่ลูบหลังพร้อมถามว่าจะกินยาหรือไปหาหมอ',
      choices: [
        { label: 'กินยาแล้วนอน', fx: { health: 3, energy: -4 } },
        { label: 'ไปหาหมอ', fx: { health: 6, money: -200 } },
        { label: 'อดทนไม่บอกใคร', fx: { health: -5, heart: -2 } }
      ]
    },
    {
      title: 'ของเล่นแตก',
      text: 'ของเล่นชิ้นโปรดหลุดจากมือและแตกเป็นชิ้นเล็ก ๆ',
      choices: [
        { label: 'ลองซ่อมเอง', fx: { smarts: 4, heart: 2 } },
        { label: 'ร้องไห้จนแม่ซื้อใหม่', fx: { money: -200, rel: { family: -2 }, heart: 2 } },
        { label: 'เก็บเศษไว้เป็นความทรงจำ', fx: { heart: 4, trait: 'อ่อนไหว' } }
      ]
    }
  ],
  2: [
    {
      title: 'ครูเรียกพบ',
      text: 'ครูประจำชั้นเรียกคุณไปคุยเรื่องการบ้านที่ค้างหลายครั้ง',
      choices: [
        { label: 'ยอมรับและตั้งใจแก้ไข', fx: { smarts: 4, kpi: 2, heart: 2 } },
        { label: 'แก้ตัวไปเรื่อย', fx: { social: 1, heart: -2 } },
        { label: 'บอกว่าที่บ้านมีปัญหา', fx: { rel: { family: -2 }, smarts: 2 } }
      ]
    },
    {
      title: 'เพื่อนใหม่ย้ายมา',
      text: 'มีนักเรียนใหม่เดินเข้ามาในห้อง และไม่มีใครคุยด้วย',
      choices: [
        { label: 'ชวนนั่งด้วย', fx: { social: 5, rel: { friend: 6 } } },
        { label: 'มองเฉย ๆ', fx: { heart: -1 } },
        { label: 'แกล้งเพื่อเรียกเสียงหัวเราะ', fx: { social: 2, heart: -3 } }
      ]
    },
    {
      title: 'พ่อแม่ทะเลาะเรื่องเงิน',
      text: 'คุณได้ยินเสียงพ่อกับแม่เถียงกันเรื่องบิลที่ยังไม่ได้จ่าย',
      choices: [
        { label: 'เก็บตัวในห้อง', fx: { heart: -3 } },
        { label: 'ถามว่าจะช่วยอะไรได้', fx: { rel: { family: 5 }, smarts: 2 } },
        { label: 'ไปอยู่บ้านเพื่อน', fx: { rel: { family: -4 }, social: 2 } }
      ]
    },
    {
      title: 'ถูกด่าเรื่องเสื้อผ้า',
      text: 'เพื่อนในห้องหัวเราะใส่รองเท้าคู่เก่าของคุณ',
      choices: [
        { label: 'ตอบกลับ', fx: { social: -2, heart: 2 } },
        { label: 'เงียบและเดินหนี', fx: { heart: -4, trait: 'อดทน' } },
        { label: 'ไปบอกครู', fx: { social: 2, heart: -1 } }
      ]
    },
    {
      title: 'ทัศนศึกษา',
      text: 'โรงเรียนพาไปพิพิธภัณฑ์ และคุณต้องเลือกว่าจะใช้เวลายังไง',
      choices: [
        { label: 'ฟังวิทยากรทุกคำ', fx: { smarts: 5, energy: -2 } },
        { label: 'เดินเล่นกับเพื่อน', fx: { social: 4, heart: 2 } },
        { label: 'แอบงีบใต้ต้นไม้', fx: { energy: 6, smarts: -2 } }
      ]
    },
    {
      title: 'เก็บเงินซื้อของ',
      text: 'คุณอยากได้กระเป๋าใบใหม่ แต่เงินเก็บยังไม่พอ',
      choices: [
        { label: 'เก็บต่อไป', fx: { money: 100, trait: 'ประหยัด' } },
        { label: 'ยืมเพื่อน', fx: { money: 300, social: -2 } },
        { label: 'ล้มเลิกความตั้งใจ', fx: { heart: 1, money: 100 } }
      ]
    }
  ],
  3: [
    {
      title: 'เพื่อนชวนสูบบุหรี่',
      text: 'หลังโรงเรียน เพื่อนกลุ่มหนึ่งยื่นบุหรี่ให้คุณพร้อมยิ้ม',
      choices: [
        { label: 'ปฏิเสธ', fx: { heart: 3, health: 2, social: -2 } },
        { label: 'ลองดูครั้งเดียว', fx: { social: 3, health: -4, trait: 'ใจร้อน' } },
        { label: 'เดินหนีทันที', fx: { health: 1, social: -3 } }
      ]
    },
    {
      title: 'ติวเตอร์หรือไม่',
      text: 'พ่อแม่ถามว่าจะเรียนพิเศษเพิ่มไหม ก่อนสอบเข้ามหาวิทยาลัย',
      choices: [
        { label: 'เรียนติวเตอร์', fx: { smarts: 6, money: -3000, energy: -3 } },
        { label: 'อ่านเองที่บ้าน', fx: { smarts: 3, trait: 'ขยัน' } },
        { label: 'ไม่สนใจสอบ', fx: { heart: 2, smarts: -4 } }
      ]
    },
    {
      title: 'พ่อแม่จับได้เรื่องแฟน',
      text: 'แม่เจอข้อความในโทรศัพท์ และถามตรง ๆ ว่าคุณมีแฟนแล้วใช่ไหม',
      choices: [
        { label: 'ยอมรับตามตรง', fx: { rel: { family: 3 }, heart: 2 } },
        { label: 'โกหก', fx: { rel: { family: -4 }, heart: -2 } },
        { label: 'โมโหและปิดประตูใส่', fx: { heart: -4, rel: { family: -6 } } }
      ]
    },
    {
      title: 'ประกวดแข่งขัน',
      text: 'ครูเสนอชื่อคุณเข้าประกวดทักษะระดับจังหวัด',
      choices: [
        { label: 'รับโอกาสนี้', fx: { smarts: 5, social: 4, energy: -5 } },
        { label: 'ปฏิเสธเพราะกลัว', fx: { heart: -2, smarts: 1 } },
        { label: 'ขอให้เพื่อนลงแทน', fx: { social: 2, rel: { friend: 3 } } }
      ]
    },
    {
      title: 'เงินหายในห้อง',
      text: 'เพื่อนในห้องทำเงินหาย และทุกคนเริ่มมองหน้ากัน',
      choices: [
        { label: 'ช่วยกันหา', fx: { social: 4, heart: 2 } },
        { label: 'เงียบไม่ยุ่ง', fx: { heart: -2 } },
        { label: 'บอกครูให้ค้นกระเป๋าทุกคน', fx: { social: -5, smarts: 1 } }
      ]
    },
    {
      title: 'งานช่วงปิดเทอม',
      text: 'ร้านใกล้บ้านรับสมัครพนักงานพาร์ทไทม์ช่วงปิดเทอม',
      choices: [
        { label: 'สมัครทำ', fx: { money: 4000, energy: -6, social: 3, trait: 'ขยัน' } },
        { label: 'พักผ่อน', fx: { energy: 5, money: -200 } },
        { label: 'ชวนเพื่อนไปทำด้วย', fx: { money: 3000, social: 5, rel: { friend: 4 } } }
      ]
    }
  ],
  4: [
    {
      title: 'เพื่อนร่วมห้องติดเกม',
      text: 'เพื่อนสนิทเริ่มขาดเรียนเพราะเล่นเกมทั้งคืน',
      choices: [
        { label: 'เตือนเพื่อน', fx: { rel: { friend: 4 }, social: 2, energy: -2 } },
        { label: 'เล่นด้วย', fx: { heart: 3, smarts: -3, health: -2 } },
        { label: 'ปล่อยให้เป็นเรื่องของเขา', fx: { rel: { friend: -4 } } }
      ]
    },
    {
      title: 'อาจารย์ให้โอกาสทำวิจัย',
      text: 'อาจารย์ชวนคุณเข้าร่วมโครงการวิจัยช่วงปิดเทอม',
      choices: [
        { label: 'รับทำ', fx: { smarts: 7, kpi: 3, energy: -6 } },
        { label: 'ปฏิเสธ', fx: { heart: 2 } },
        { label: 'ขอคิดดูก่อน', fx: { smarts: 2, heart: 1 } }
      ]
    },
    {
      title: 'ปัญหาหอพัก',
      text: 'ห้องข้าง ๆ ส่งเสียงดังทุกคืน และคุณเริ่มนอนไม่พอ',
      choices: [
        { label: 'ไปคุยตรง ๆ', fx: { social: 3, heart: -1, health: 2 } },
        { label: 'ทนต่อไป', fx: { health: -3 } },
        { label: 'ย้ายหอ', fx: { money: -5000, health: 3, energy: -2 } }
      ]
    },
    {
      title: 'ฝึกงานบริษัทใหญ่',
      text: 'บริษัทชื่อดังเปิดรับฝึกงาน แต่ต้องทำงานเต็มเวลา',
      choices: [
        { label: 'สมัคร', fx: { kpi: 5, social: 3, energy: -5 } },
        { label: 'ไม่สมัคร', fx: { heart: 2 } },
        { label: 'สมัครแต่ขอเวลาสัมภาษณ์', fx: { social: 2, kpi: 2 } }
      ]
    },
    {
      title: 'แฟนขอเลิก',
      text: 'ข้อความสั้น ๆ บอกว่าอยากให้เราห่างกันสักพัก',
      choices: [
        { label: 'พยายามง้อ', fx: { heart: -3, rel: { love: -5 }, energy: -4 } },
        { label: 'ปล่อยไป', fx: { heart: 2, smarts: 2, trait: 'อดทน' } },
        { label: 'โฟกัสการเรียน', fx: { smarts: 5, heart: -1 } }
      ]
    },
    {
      title: 'เงินไม่พอจ่ายค่าเทอม',
      text: 'วันสุดท้ายของการชำระเงินใกล้เข้ามา และบัญชีเหลือไม่พอ',
      choices: [
        { label: 'กู้เพิ่ม', apply: function () { stats.money += 20000; life.flags.studentLoan = (life.flags.studentLoan || 0) + 20000; stats.heart = clamp(stats.heart - 2, 0, 100); } },
        { label: 'หางานพิเศษ', fx: { money: 8000, energy: -8, trait: 'ขยัน' } },
        { label: 'ขอพ่อแม่', fx: { money: 10000, rel: { family: -3 } } }
      ]
    }
  ],
  5: [
    {
      title: 'หัวหน้าชวนดื่ม',
      text: 'หลังเลิกงาน หัวหน้าชวนทีมไปดื่มเพื่อฉลองปิดโปรเจกต์',
      choices: [
        { label: 'ไปกับทีม', fx: { social: 5, rel: { boss: 5, friend: 3 }, health: -2, money: -800 } },
        { label: 'กลับบ้าน', fx: { health: 2, heart: 1, rel: { boss: -2 } } },
        { label: 'ไปแป๊บเดียว', fx: { social: 2, rel: { boss: 2 }, health: -1 } }
      ]
    },
    {
      title: 'เพื่อนร่วมงานลาออก',
      text: 'เพื่อนร่วมทีมลาออกกะทันหัน และงานของเขาตกมาที่คุณ',
      choices: [
        { label: 'รับงานทั้งหมด', fx: { kpi: 7, energy: -8, heart: -4 } },
        { label: 'ปล่อยให้หัวหน้าจัดการ', fx: { rel: { boss: -3 }, heart: 2 } },
        { label: 'เสนอขอเพิ่มเงิน', fx: { kpi: 4, rel: { boss: 2 }, money: 2000 } }
      ]
    },
    {
      title: 'ของขึ้นราคา',
      text: 'เงินเดือนออกแล้ว แต่ข้าวเที่ยงขึ้นราคาอีก 10 บาท',
      choices: [
        { label: 'ทำอาหารเอง', fx: { money: 1000, energy: -3, health: 2 } },
        { label: 'ใช้จ่ายตามเดิม', fx: { money: -800, heart: 1 } },
        { label: 'หาอาชีพเสริม', fx: { money: 2500, energy: -5, trait: 'ขยัน' } }
      ]
    },
    {
      title: 'บริษัทจัดอบรม',
      text: 'บริษัทเปิดคอร์สอบรมหลังเลิกงาน ฟรี แต่ต้องแลกเวลาส่วนตัว',
      choices: [
        { label: 'สมัครเรียน', fx: { smarts: 5, kpi: 3, energy: -5 } },
        { label: 'ไม่สนใจ', fx: { heart: 3 } },
        { label: 'อ่านเองที่บ้าน', fx: { smarts: 3, energy: -2 } }
      ]
    },
    {
      title: 'OT สามคืนติด',
      text: 'หัวหน้าขอให้อยู่ทำรายงานด่วนสามคืนติด',
      choices: [
        { label: 'รับทุกคืน', fx: { money: 6000, kpi: 6, health: -5, heart: -5 } },
        { label: 'ปฏิเสธ', fx: { heart: 3, rel: { boss: -4 } } },
        { label: 'ทำสองคืน', fx: { money: 4000, kpi: 4, health: -3 } }
      ]
    },
    {
      title: 'เจอเพื่อนเก่าที่ BTS',
      text: 'คุณเจอเพื่อนสมัยมหาวิทยาลัยบนสถานีรถไฟฟ้า',
      choices: [
        { label: 'นั่งคุยกันต่อ', fx: { social: 5, rel: { friend: 5 }, heart: 4 } },
        { label: 'รีบไปทำงาน', fx: { kpi: 2, rel: { friend: -2 } } },
        { label: 'นัดเจอกันใหม่', fx: { social: 2, rel: { friend: 3 } } }
      ]
    },
    {
      title: 'เงินประกันสังคมถูกหัก',
      text: 'สลิปเงินเดือนมีรายการหักที่ไม่คุ้น และคุณไม่แน่ใจว่าถูกต้องไหม',
      choices: [
        { label: 'ตรวจสอบกับ HR', fx: { smarts: 3, social: 2, heart: 1 } },
        { label: 'ปล่อยไป', fx: { money: -300, heart: -1 } },
        { label: 'ปรึกษาเพื่อนร่วมงาน', fx: { social: 3, smarts: 2 } }
      ]
    },
    {
      title: 'แม่ขอให้ส่งเงินเพิ่ม',
      text: 'แม่โทรมาเล่าว่าค่ารักษาพ่อเพิ่มขึ้น และถามว่าคุณพอช่วยได้ไหม',
      choices: [
        { label: 'ส่งเพิ่ม 3,000', fx: { money: -3000, rel: { family: 8 }, heart: 4 } },
        { label: 'บอกว่ายังไม่ไหว', fx: { rel: { family: -3 }, heart: -2 } },
        { label: 'ส่ง 1,000', fx: { money: -1000, rel: { family: 4 } } }
      ]
    }
  ],
  6: [
    {
      title: 'เจ้านายย้ายทีม',
      text: 'หัวหน้าคนเดิมถูกย้ายไปทีมอื่น และมีหัวหน้าใหม่ในสัปดาห์หน้า',
      choices: [
        { label: 'ปรับตัวเร็ว', fx: { social: 4, kpi: 3, energy: -2 } },
        { label: 'รอดูท่าที', fx: { heart: 1, kpi: -1 } },
        { label: 'ขอตามหัวหน้าเดิม', fx: { rel: { boss: 4 }, kpi: 1 } }
      ]
    },
    {
      title: 'เพื่อนชวนลงทุนคอนโด',
      text: 'เพื่อนร่วมงานชวนร่วมลงทุนคอนโด ใกล้รถไฟฟ้า',
      choices: [
        { label: 'ลงทุนด้วย', fx: { money: -50000, heart: 2, flags: { condo: true } } },
        { label: 'ปฏิเสธ', fx: { heart: 1 } },
        { label: 'ศึกษาก่อน', fx: { smarts: 4, energy: -2 } }
      ]
    },
    {
      title: 'ญาติขอยืมเงิน',
      text: 'ญาติสนิทโทรมาขอยืมเงินเพื่อปิดหนี้นอกระบบ',
      choices: [
        { label: 'ให้ยืม 10,000', fx: { money: -10000, rel: { family: 6 }, heart: 2 } },
        { label: 'ปฏิเสธ', fx: { rel: { family: -5 }, heart: -2 } },
        { label: 'ให้ 3,000', fx: { money: -3000, rel: { family: 2 } } }
      ]
    },
    {
      title: 'งานอดิเรกใหม่',
      text: 'คุณเริ่มสนใจการถ่ายภาพ และอยากลงทุนกับมัน',
      choices: [
        { label: 'ซื้อกล้อง', fx: { money: -20000, heart: 6, trait: 'ขยัน' } },
        { label: 'ใช้มือถือไปก่อน', fx: { heart: 3 } },
        { label: 'ชวนคู่รักไปถ่ายรูป', fx: { rel: { love: 6 }, heart: 4, money: -2000 } }
      ]
    },
    {
      title: 'ตรวจสุขภาพประจำปี',
      text: 'บริษัทให้ตรวจสุขภาพฟรี แต่ต้องอดอาหารเช้า',
      choices: [
        { label: 'ไปตรวจ', fx: { health: 5, energy: -2 } },
        { label: 'เลื่อนนัด', fx: { health: -2 } },
        { label: 'ไม่ไป', fx: { health: -4, heart: -1 } }
      ]
    },
    {
      title: 'ทะเลาะกับคู่รักเรื่องเงิน',
      text: 'คู่รักบอกว่าคุณใช้เงินกับครอบครัวมากเกินไป',
      choices: [
        { label: 'นั่งคุยกันดี ๆ', fx: { rel: { love: 6 }, heart: 3 } },
        { label: 'หลบเลี่ยง', fx: { rel: { love: -6 }, heart: -3 } },
        { label: 'ยอมตามอีกฝ่าย', fx: { rel: { love: 3 }, heart: -2, money: -3000 } }
      ]
    },
    {
      title: 'ลูกเริ่มดื้อ',
      cond: function () { return life.flags.kid && childAgeYears() >= 4; },
      text: 'ลูกไม่ยอมทำการบ้านและตอบกลับทุกคำสั่ง',
      choices: [
        { label: 'คุยเหตุผล', fx: { rel: { family: 5 }, smarts: 2 } },
        { label: 'ลงโทษ', fx: { rel: { family: -5 }, heart: -2 } },
        { label: 'ปล่อยไป', fx: { rel: { family: -2 } } }
      ]
    },
    {
      title: 'ถูกเสนอตำแหน่งใหญ่',
      text: 'หัวหน้าเสนอตำแหน่งหัวหน้าทีม แต่ต้องรับผิดชอบคนทั้งทีม',
      choices: [
        { label: 'รับตำแหน่ง', fx: { kpi: 6, rel: { boss: 5 }, heart: -3, energy: -3 } },
        { label: 'ปฏิเสธ', fx: { heart: 2, kpi: -2 } },
        { label: 'ขอเวลาตัดสินใจ', fx: { smarts: 2 } }
      ]
    }
  ],
  7: [
    {
      title: 'ลูกอยากเรียนดนตรี',
      text: 'ลูกบอกว่าอยากเรียนเปียโน แต่ค่าเรียนไม่ถูก',
      choices: [
        { label: 'สนับสนุนเต็มที่', fx: { money: -15000, rel: { family: 7 }, heart: 5 } },
        { label: 'ให้เรียนของโรงเรียน', fx: { money: -3000, rel: { family: 3 } } },
        { label: 'บอกว่ายังไม่พร้อม', fx: { rel: { family: -3 }, heart: -2 } }
      ]
    },
    {
      title: 'พ่อแม่ขออยู่ด้วย',
      text: 'พ่อแม่แก่ขึ้นและอยากย้ายมาอยู่ใกล้คุณ',
      choices: [
        { label: 'รับมาอยู่ด้วย', fx: { money: -5000, rel: { family: 10 }, heart: 4, energy: -3 } },
        { label: 'ช่วยค่าเช่าบ้านใกล้ ๆ', fx: { money: -6000, rel: { family: 5 } } },
        { label: 'ปฏิเสธ', fx: { rel: { family: -8 }, heart: -4 } }
      ]
    },
    {
      title: 'เพื่อนร่วมงานแทงหลัง',
      text: 'เพื่อนร่วมงานนำไอเดียของคุณไปเสนอเป็นของตัวเอง',
      choices: [
        { label: 'สู้ในที่ประชุม', fx: { kpi: 4, social: -3, heart: -2 } },
        { label: 'เงียบ', fx: { heart: -4, kpi: -1 } },
        { label: 'ย้ายทีม', fx: { social: 2, kpi: 1, energy: -2 } }
      ]
    },
    {
      title: 'งานอดิเรกมีรายได้',
      text: 'งานอดิเรกที่ทำเล่น ๆ เริ่มมีคนจ้างจริงจัง',
      choices: [
        { label: 'รับงานเพิ่ม', fx: { money: 8000, energy: -5, heart: 3 } },
        { label: 'ทำเท่าเดิม', fx: { heart: 2 } },
        { label: 'ขยายเป็นธุรกิจ', fx: { money: -10000, flags: { sideBiz: true }, heart: 5 } }
      ]
    },
    {
      title: 'ตรวจพบความดันสูง',
      text: 'หมอเตือนว่าต้องลดเค็มและออกกำลังกาย',
      choices: [
        { label: 'เปลี่ยนอาหารทันที', fx: { health: 6, energy: -2, money: -1000 } },
        { label: 'กินยาอย่างเดียว', fx: { health: 2, money: -800 } },
        { label: 'ไม่สนใจ', fx: { health: -7, heart: -2 } }
      ]
    },
    {
      title: 'ลูกสอบเข้าไม่ติด',
      text: 'ลูกกลับบ้านมาด้วยหน้าตาเศร้า เพราะสอบเข้าโรงเรียนดังไม่ติด',
      choices: [
        { label: 'ปลอบและหาที่เรียนใหม่', fx: { rel: { family: 6 }, money: -10000 } },
        { label: 'ดุว่าไม่ตั้งใจ', fx: { rel: { family: -6 }, heart: -3 } },
        { label: 'ให้ลองใหม่ปีหน้า', fx: { rel: { family: 3 }, heart: 1 } }
      ]
    },
    {
      title: 'งานเลี้ยงรุ่น',
      text: 'เพื่อนสมัยมัธยมจัดงานเลี้ยงรุ่น และคุณไม่แน่ใจว่าจะไปไหม',
      choices: [
        { label: 'ไป', fx: { social: 6, rel: { friend: 5 }, money: -2000, heart: 4 } },
        { label: 'ไม่ไป', fx: { heart: 1 } },
        { label: 'ไปสายแล้วกลับเร็ว', fx: { social: 2, money: -1000 } }
      ]
    },
    {
      title: 'เงินเก็บเริ่มหมด',
      text: 'ค่าใช้จ่ายครอบครัวสูงขึ้นจนเงินเก็บเริ่มร่อยหรอ',
      choices: [
        { label: 'ลดค่าใช้จ่าย', fx: { money: 5000, heart: -3, trait: 'ประหยัด' } },
        { label: 'กู้เพิ่ม', fx: { money: 20000, credit: -4 } },
        { label: 'ขายของที่ไม่ใช้', fx: { money: 8000, heart: 1 } }
      ]
    }
  ],
  8: [
    {
      title: 'ลูกขอเงินดาวน์บ้าน',
      text: 'ลูกอยากซื้อบ้านหลังแรกและขอให้คุณช่วยดาวน์',
      cond: function () { return life.flags.kid && childAgeYears() >= 25; },
      choices: [
        { label: 'ช่วยเต็มที่', fx: { money: -100000, rel: { family: 10 }, heart: 5 } },
        { label: 'ช่วยบางส่วน', fx: { money: -40000, rel: { family: 5 } } },
        { label: 'ให้ยืนด้วยตัวเอง', fx: { rel: { family: -4 }, heart: -2 } }
      ]
    },
    {
      title: 'เพื่อนเก่าเสียชีวิต',
      text: 'เพื่อนสนิทสมัยเรียนจากไป และงานศพจัดที่ต่างจังหวัด',
      cond: function () { return ageYears() >= 45; },
      choices: [
        { label: 'ไปงานศพ', fx: { money: -3000, heart: 3, social: 3 } },
        { label: 'ส่งเงินช่วย', fx: { money: -2000, heart: 1 } },
        { label: 'ไม่ได้ไป', fx: { heart: -5, social: -3 } }
      ]
    },
    {
      title: 'บริษัทใหม่จ้างงานอาวุโส',
      text: 'บริษัทเล็ก ๆ เสนองานให้คุณในตำแหน่งที่มั่นคงกว่าเดิม',
      choices: [
        { label: 'รับงาน', apply: function () { finance.salary = Math.max(finance.salary, 30000); profile.job = 'ที่ปรึกษาอาวุโส'; life.flags.unemployed = false; stats.heart = clamp(stats.heart + 3, 0, 100); } },
        { label: 'ปฏิเสธ', fx: { heart: 1 } },
        { label: 'ต่อรองเงินเดือน', fx: { kpi: 2, money: 3000 } }
      ]
    },
    {
      title: 'ตรวจพบโรคร้าย',
      text: 'ผลตรวจออกมาไม่ดี และหมออยากให้เริ่มรักษาทันที',
      choices: [
        { label: 'รักษาเต็มที่', fx: { health: 8, money: -50000, energy: -5 } },
        { label: 'รักษาตามสิทธิ์', fx: { health: 3, money: -10000 } },
        { label: 'ปล่อยไว้', fx: { health: -15, heart: -5 } }
      ]
    },
    {
      title: 'ถูกหลอกลงทุน',
      text: 'กลุ่มลงทุนที่คุณเชื่อถือหายไปพร้อมเงินทั้งก้อน',
      choices: [
        { label: 'แจ้งความ', fx: { money: -5000, credit: -2, heart: -3 } },
        { label: 'ตามด้วยตัวเอง', fx: { money: -3000, energy: -5, heart: -2 } },
        { label: 'ปล่อยไป', fx: { heart: -6 } }
      ]
    },
    {
      title: 'คู่รักอยากแยกทาง',
      text: 'คู่รักบอกว่าความสัมพันธ์มาถึงทางตัน',
      cond: function () { return !!life.flags.married; },
      choices: [
        { label: 'พยายามประคอง', fx: { rel: { love: 5 }, heart: -2, energy: -3 } },
        { label: 'ปล่อยให้จบ', fx: { rel: { love: -15 }, heart: -8, money: -20000 } },
        { label: 'ไปปรึกษาแพทย์', fx: { money: -3000, heart: 2 } }
      ]
    },
    {
      title: 'ข้อเสนอเกษียณก่อนกำหนด',
      text: 'บริษัทเสนอเงินก้อนให้ลาออกก่อนกำหนด',
      cond: function () { return ageYears() >= 50; },
      choices: [
        { label: 'รับข้อเสนอ', apply: function () { stats.money += 500000; finance.salary = 0; profile.job = 'เกษียณก่อนกำหนด'; life.flags.retired = true; stats.heart = clamp(stats.heart + 3, 0, 100); } },
        { label: 'ทำงานต่อ', fx: { kpi: 3, energy: -3 } },
        { label: 'ต่อรองเงินชดเชย', fx: { money: 20000, rel: { boss: -2 } } }
      ]
    },
    {
      title: 'เริ่มดูแลหลาน',
      text: 'ลูกขอให้ช่วยดูแลหลานช่วงปิดเทอม',
      cond: function () { return life.flags.kid && childAgeYears() >= 25; },
      choices: [
        { label: 'รับดูแล', fx: { rel: { family: 8 }, heart: 6, energy: -6 } },
        { label: 'ช่วยบางวัน', fx: { rel: { family: 4 }, energy: -3 } },
        { label: 'ปฏิเสธ', fx: { rel: { family: -5 }, heart: -2 } }
      ]
    }
  ],
  9: [
    {
      title: 'งานเลี้ยงอำลา',
      text: 'เพื่อนร่วมงานจัดงานเลี้ยงอำลาก่อนคุณเกษียณ',
      choices: [
        { label: 'ไปและกล่าวขอบคุณ', fx: { social: 6, heart: 6, money: -1000 } },
        { label: 'ไม่ไป', fx: { heart: -2 } },
        { label: 'ไปแต่ไม่พูด', fx: { social: 2, heart: 2 } }
      ]
    },
    {
      title: 'เพื่อนชวนเปิดร้าน',
      text: 'เพื่อนเก่าชวนลงทุนเปิดร้านกาแฟเล็ก ๆ',
      choices: [
        { label: 'ลงทุน', fx: { money: -50000, flags: { business: true }, heart: 5 } },
        { label: 'ไม่ลงทุน', fx: { heart: 1 } },
        { label: 'ช่วยออกแบบร้าน', fx: { social: 4, heart: 3 } }
      ]
    },
    {
      title: 'ความฝันเก่าตามมา',
      text: 'คุณเจอสมุดบันทึกสมัยหนุ่มสาวและความฝันที่ยังไม่ได้ทำ',
      choices: [
        { label: 'ลองทำดูสักครั้ง', fx: { heart: 10, money: -20000, trait: 'แรงฮึด' } },
        { label: 'ปล่อยไป', fx: { heart: -3 } },
        { label: 'เล่าให้ครอบครัวฟัง', fx: { rel: { family: 5 }, heart: 3 } }
      ]
    },
    {
      title: 'บ้านต้องซ่อม',
      text: 'หลังคารั่วและระบบไฟเริ่มเก่า ต้องใช้เงินก้อน',
      choices: [
        { label: 'ซ่อมเต็มที่', fx: { money: -60000, health: 2, heart: 2 } },
        { label: 'ซ่อมเท่าที่จำเป็น', fx: { money: -20000, heart: 1 } },
        { label: 'ขายบ้านหลังนี้', fx: { money: 300000, flags: { house: false }, heart: -4 } }
      ]
    },
    {
      title: 'ลูกขอคำแนะนำเรื่องงาน',
      text: 'ลูกโทรมาเล่าปัญหาที่ทำงาน และถามว่าคุณจะทำยังไง',
      choices: [
        { label: 'ฟังและให้คำแนะนำ', fx: { rel: { family: 6 }, heart: 4 } },
        { label: 'บอกให้ตัดสินใจเอง', fx: { rel: { family: 2 }, smarts: 1 } },
        { label: 'ยุ่งจนไม่ได้คุย', fx: { rel: { family: -4 } } }
      ]
    },
    {
      title: 'ตรวจสุขภาพก่อนเกษียณ',
      text: 'คุณอยากรู้ว่าร่างกายพร้อมสำหรับชีวิตหลังเกษียณไหม',
      choices: [
        { label: 'ตรวจละเอียด', fx: { health: 5, money: -5000 } },
        { label: 'ตรวจพื้นฐาน', fx: { health: 2, money: -1500 } },
        { label: 'ไม่ตรวจ', fx: { health: -4 } }
      ]
    }
  ],
  10: [
    {
      title: 'หลานถามเรื่องความตาย',
      text: 'หลานตัวเล็กถามว่า “คุณปู่/คุณย่าจะอยู่กับหนูไปนานแค่ไหน?”',
      choices: [
        { label: 'ตอบตามจริงอย่างอ่อนโยน', fx: { rel: { family: 8 }, heart: 5 } },
        { label: 'เปลี่ยนเรื่อง', fx: { rel: { family: -2 }, heart: -1 } },
        { label: 'เล่าเรื่องความทรงจำ', fx: { rel: { family: 6 }, heart: 6 } }
      ]
    },
    {
      title: 'เพื่อนบ้านช่วยเหลือ',
      text: 'เพื่อนบ้านมาช่วยซ่อมรั้วและถามสารทุกข์สุกดิบ',
      choices: [
        { label: 'รับน้ำใจและตอบแทน', fx: { social: 5, heart: 4, money: -500 } },
        { label: 'ขอบคุณแต่ปฏิเสธ', fx: { social: 1 } },
        { label: 'ชวนทานข้าว', fx: { social: 4, heart: 5, money: -800 } }
      ]
    },
    {
      title: 'จดหมายถึงลูก',
      text: 'คุณอยากเขียนสิ่งที่ยังไม่ได้พูดกับลูกไว้',
      choices: [
        { label: 'เขียนจดหมาย', fx: { heart: 7, rel: { family: 5 } } },
        { label: 'โทรเล่าตรง ๆ', fx: { rel: { family: 4 }, heart: 4 } },
        { label: 'เก็บไว้ในใจ', fx: { heart: -2 } }
      ]
    },
    {
      title: 'ความจำเริ่มแย่',
      text: 'คุณลืมชื่อของคนที่เพิ่งคุยด้วยเมื่อวานนี้',
      choices: [
        { label: 'ไปตรวจความจำ', fx: { health: 3, money: -3000, heart: 2 } },
        { label: 'ยอมรับและจดบันทึก', fx: { smarts: 2, heart: 2 } },
        { label: 'ซ่อนไม่ให้ใครรู้', fx: { heart: -3, health: -2 } }
      ]
    },
    {
      title: 'งานบุญที่วัด',
      text: 'วัดใกล้บ้านจัดงานบุญ และเพื่อนบ้านชวนคุณไป',
      choices: [
        { label: 'ไปร่วมงาน', fx: { heart: 6, social: 4, money: -1000 } },
        { label: 'ส่งเงินทำบุญ', fx: { heart: 3, money: -500 } },
        { label: 'อยู่บ้าน', fx: { heart: -1 } }
      ]
    },
    {
      title: 'คำถามสุดท้าย',
      text: 'คุณนั่งมองพระอาทิตย์ตกและถามตัวเองว่า “ชีวิตนี้คุ้มไหม?”',
      choices: [
        { label: 'ยิ้มและตอบว่าคุ้ม', fx: { heart: 8 } },
        { label: 'ยังมีอะไรที่อยากทำอีก', fx: { heart: 3, smarts: 2 } },
        { label: 'ปล่อยให้คำถามค้างไว้', fx: { heart: -2 } }
      ]
    }
  ]
};




/* ---------- EVENT PACK 2 · +41 events (total >150) ---------- */

const MORE_EVENTS = {
  1: [
    {
      title: 'ก้าวแรก',
      text: 'คุณปล่อยมือจากโซฟาและก้าวเดินได้เป็นครั้งแรก',
      choices: [
        { label: 'วิ่งเข้าหาแม่', fx: { health: 3, rel: { family: 5 }, heart: 4 } },
        { label: 'ยืนนิ่งมองรอบตัว', fx: { smarts: 4, health: 2 } },
        { label: 'ล้มแล้วลุกเอง', fx: { trait: 'อดทน', heart: 2 } }
      ]
    },
    {
      title: 'ของขวัญวันเกิด',
      text: 'วันเกิดของคุณมีเค้กเล็ก ๆ และของขวัญที่ห่อด้วยกระดาษหนังสือพิมพ์',
      choices: [
        { label: 'แกะอย่างตื่นเต้น', fx: { heart: 5, rel: { family: 4 } } },
        { label: 'เก็บไว้ไม่กล้าแกะ', fx: { smarts: 2, heart: 2 } },
        { label: 'แบ่งของขวัญให้เด็กข้างบ้าน', fx: { social: 5, rel: { friend: 4 } } }
      ]
    }
  ],
  2: [
    {
      title: 'เพื่อนล้อชื่อ',
      text: 'เพื่อนในห้องล้อชื่อของคุณจนทั้งห้องหัวเราะ',
      choices: [
        { label: 'หัวเราะตาม', fx: { social: 4, heart: -1 } },
        { label: 'บอกว่าไม่ชอบ', fx: { heart: 3, social: 1 } },
        { label: 'ฟ้องครู', fx: { social: -2, heart: 2 } }
      ]
    },
    {
      title: 'หัวหน้าห้อง',
      text: 'ครูให้คุณเป็นหัวหน้าห้องคนใหม่',
      choices: [
        { label: 'รับหน้าที่', fx: { social: 5, smarts: 2, energy: -3 } },
        { label: 'ขอให้เพื่อนช่วย', fx: { social: 3, rel: { friend: 3 } } },
        { label: 'ปฏิเสธ', fx: { heart: 1, social: -2 } }
      ]
    },
    {
      title: 'จักรยานคันแรก',
      text: 'พ่อซื้อจักรยานมือสองให้คุณ และคุณอยากขี่ไปทุกที่',
      choices: [
        { label: 'ขี่ไปโรงเรียน', fx: { health: 4, social: 2, energy: -2 } },
        { label: 'ขี่เล่นในซอย', fx: { heart: 4, health: 2 } },
        { label: 'ให้เพื่อนยืม', fx: { rel: { friend: 5 }, social: 3 } }
      ]
    }
  ],
  3: [
    {
      title: 'มือถือเครื่องแรก',
      text: 'คุณเก็บเงินซื้อมือถือเครื่องแรกได้สำเร็จ',
      choices: [
        { label: 'ใช้ให้คุ้ม', fx: { social: 4, heart: 4 } },
        { label: 'เล่นจนดึก', fx: { heart: 3, health: -4, smarts: -2 } },
        { label: 'ให้พ่อแม่รู้รหัส', fx: { rel: { family: 4 } } }
      ]
    },
    {
      title: 'สอบตก',
      text: 'ผลสอบวิชาคณิตศาสตร์ออกมา และคุณได้คะแนนต่ำกว่าที่คาด',
      choices: [
        { label: 'ขอเรียนซ่อม', fx: { smarts: 5, energy: -3 } },
        { label: 'ซ่อนผลสอบ', fx: { heart: -4, rel: { family: -3 } } },
        { label: 'ยอมรับและตั้งใจใหม่', fx: { smarts: 3, heart: 2 } }
      ]
    },
    {
      title: 'แข่งเกมออนไลน์',
      text: 'เพื่อนชวนลงแข่งเกมระดับโรงเรียน',
      choices: [
        { label: 'ลงแข่ง', fx: { social: 5, heart: 3, smarts: -1 } },
        { label: 'เป็นกองเชียร์', fx: { social: 3, heart: 2 } },
        { label: 'ไม่เข้าร่วม', fx: { smarts: 2 } }
      ]
    }
  ],
  4: [
    {
      title: 'รูมเมทคนใหม่',
      text: 'คุณต้องแชร์ห้องกับคนแปลกหน้าและต้องตกลงกติกากัน',
      choices: [
        { label: 'คุยกันชัดเจน', fx: { social: 4, smarts: 2 } },
        { label: 'ปล่อยไปตามใจ', fx: { heart: -2, health: -1 } },
        { label: 'ย้ายไปอยู่คนเดียว', fx: { money: -4000, heart: 2 } }
      ]
    },
    {
      title: 'อาจารย์ที่ปรึกษา',
      text: 'อาจารย์ที่ปรึกษาถามว่าคุณอยากทำอาชีพอะไรหลังจบ',
      choices: [
        { label: 'เล่าความฝันจริง ๆ', fx: { heart: 4, smarts: 2 } },
        { label: 'ตอบตามที่พ่อแม่หวัง', fx: { rel: { family: 3 }, heart: -2 } },
        { label: 'ยังไม่รู้', fx: { smarts: 2 } }
      ]
    },
    {
      title: 'งานคาเฟ่',
      text: 'ร้านกาแฟใกล้มหาวิทยาลัยรับพนักงานพาร์ทไทม์',
      choices: [
        { label: 'ทำเต็มเวลา', fx: { money: 6000, energy: -7, social: 3 } },
        { label: 'ทำเฉพาะเสาร์อาทิตย์', fx: { money: 3000, social: 2 } },
        { label: 'ไม่ทำ', fx: { energy: 3 } }
      ]
    }
  ],
  5: [
    {
      title: 'ปริ้นเตอร์เสีย',
      text: 'ปริ้นเตอร์ในออฟฟิศเสียก่อนส่งรายงานสำคัญ',
      choices: [
        { label: 'ซ่อมเอง', fx: { kpi: 4, smarts: 3, energy: -3 } },
        { label: 'ไปร้านถ่ายเอกสาร', fx: { money: -300, kpi: 2 } },
        { label: 'แจ้งหัวหน้า', fx: { rel: { boss: -2 }, heart: 1 } }
      ]
    },
    {
      title: 'ลูกค้าตำหนิ',
      text: 'ลูกค้าโทรมาบ่นเรื่องงานของคุณต่อหน้าทีม',
      choices: [
        { label: 'ขอโทษและแก้ไข', fx: { kpi: 4, heart: -3, social: 2 } },
        { label: 'เถียงกลับ', fx: { heart: 2, kpi: -3 } },
        { label: 'วางสาย', fx: { heart: -5, rel: { boss: -3 } } }
      ]
    },
    {
      title: 'เพื่อนร่วมงานลาป่วย',
      text: 'เพื่อนร่วมงานลาป่วยกะทันหัน และงานด่วนยังต้องส่ง',
      choices: [
        { label: 'รับงานแทน', fx: { kpi: 5, energy: -6, rel: { friend: 5 } } },
        { label: 'ปล่อยให้ทีมจัดการ', fx: { heart: 2, rel: { friend: -2 } } },
        { label: 'ขอ OT', fx: { money: 2000, energy: -4 } }
      ]
    },
    {
      title: 'เงินเดือนออกช้า',
      text: 'วันที่ 25 ผ่านไปแล้ว แต่เงินเดือนยังไม่เข้า',
      choices: [
        { label: 'ถาม HR', fx: { smarts: 2, social: 2 } },
        { label: 'อดทนรอ', fx: { heart: -3, money: -500 } },
        { label: 'ยืมเพื่อน', fx: { money: 2000, social: -2 } }
      ]
    },
    {
      title: 'เจอเพื่อนที่ร้านเหล้า',
      text: 'หลังเลิกงาน คุณเจอเพื่อนสมัยเรียนที่ร้านเหล้าใกล้บ้าน',
      choices: [
        { label: 'นั่งคุยด้วย', fx: { social: 5, heart: 5, money: -800, health: -1 } },
        { label: 'ทักแล้วกลับ', fx: { social: 2, heart: 2 } },
        { label: 'ทำเป็นไม่เห็น', fx: { rel: { friend: -3 } } }
      ]
    },
    {
      title: 'งานเสริมนอกเวลา',
      text: 'มีคนจ้างแปลเอกสารตอนกลางคืน',
      choices: [
        { label: 'รับงาน', fx: { money: 4000, energy: -6, health: -2 } },
        { label: 'ปฏิเสธ', fx: { health: 2 } },
        { label: 'รับงานเล็ก ๆ', fx: { money: 1500, energy: -3 } }
      ]
    }
  ],
  6: [
    {
      title: 'ซื้อรถคันใหม่',
      text: 'คุณอยากอัพรถแต่ยังผ่อนคันเดิมไม่หมด',
      choices: [
        { label: 'ซื้อเพิ่ม', apply: function () { debts.car.balance += 250000; stats.heart = clamp(stats.heart + 5, 0, 100); life.flags.car = true; } },
        { label: 'ใช้คันเดิมต่อ', fx: { heart: 1, money: 10000 } },
        { label: 'ขายคันเดิม', apply: function () { debts.car.balance = 0; stats.money += 40000; life.flags.car = false; } }
      ]
    },
    {
      title: 'ลูกเข้าเรียน',
      text: 'ลูกถึงวัยเข้าโรงเรียน และคุณต้องเลือกโรงเรียน',
      cond: function () { return life.flags.kid && childAgeYears() >= 5; },
      choices: [
        { label: 'โรงเรียนใกล้บ้าน', fx: { money: -10000, rel: { family: 3 } } },
        { label: 'โรงเรียนชื่อดัง', fx: { money: -40000, rel: { family: 6 }, kpi: 1 } },
        { label: 'เรียนที่บ้าน', fx: { money: -5000, energy: -4, rel: { family: 5 } } }
      ]
    },
    {
      title: 'พ่อแม่ขอเงิน',
      text: 'พ่อแม่ขอเงินก้อนเพื่อซ่อมบ้าน',
      choices: [
        { label: 'ให้เต็มที่', fx: { money: -30000, rel: { family: 10 }, heart: 4 } },
        { label: 'ให้บางส่วน', fx: { money: -10000, rel: { family: 4 } } },
        { label: 'ปฏิเสธ', fx: { rel: { family: -6 }, heart: -3 } }
      ]
    },
    {
      title: 'เพื่อนชวนทำธุรกิจ',
      text: 'เพื่อนสนิทชวนเปิดบริษัทเล็ก ๆ ด้วยกัน',
      choices: [
        { label: 'ลงทุน', fx: { money: -50000, flags: { business: true }, heart: 5, energy: -4 } },
        { label: 'ช่วยเป็นที่ปรึกษา', fx: { social: 4, heart: 3 } },
        { label: 'ปฏิเสธ', fx: { heart: 1 } }
      ]
    },
    {
      title: 'ตรวจสุขภาพคู่รัก',
      text: 'คู่รักชวนไปตรวจสุขภาพด้วยกันก่อนวางแผนอนาคต',
      cond: function () { return !!life.flags.married; },
      choices: [
        { label: 'ไปด้วยกัน', fx: { health: 4, rel: { love: 5 }, money: -2000 } },
        { label: 'ให้อีกฝ่ายไปคนเดียว', fx: { rel: { love: -2 } } },
        { label: 'เลื่อนไปก่อน', fx: { health: -1 } }
      ]
    },
    {
      title: 'ย้ายบ้าน',
      text: 'คุณมีโอกาสย้ายไปอยู่ใกล้ที่ทำงานมากขึ้น',
      choices: [
        { label: 'ย้าย', fx: { money: -20000, heart: 3, energy: 2 } },
        { label: 'อยู่ที่เดิม', fx: { heart: 1 } },
        { label: 'ย้ายไปอยู่กับพ่อแม่', fx: { money: 10000, rel: { family: 5 } } }
      ]
    }
  ],
  7: [
    {
      title: 'ลูกมีแฟน',
      text: 'ลูกบอกว่ามีคนที่ชอบ และขอคำแนะนำจากคุณ',
      cond: function () { return life.flags.kid && childAgeYears() >= 13; },
      choices: [
        { label: 'ฟังและให้คำแนะนำ', fx: { rel: { family: 6 }, smarts: 2 } },
        { label: 'ห้าม', fx: { rel: { family: -6 }, heart: -2 } },
        { label: 'ทำเป็นไม่รู้', fx: { rel: { family: -1 } } }
      ]
    },
    {
      title: 'งานโรงเรียนของลูก',
      text: 'ลูกมีงานแสดงที่โรงเรียน และคุณมีประชุมสำคัญในวันเดียวกัน',
      cond: function () { return !!life.flags.kid; },
      choices: [
        { label: 'ไปงานลูก', fx: { rel: { family: 8 }, kpi: -3, heart: 5 } },
        { label: 'ไปประชุม', fx: { kpi: 5, rel: { family: -5 } } },
        { label: 'ให้คู่รักไปแทน', fx: { rel: { family: 2, love: -2 } } }
      ]
    },
    {
      title: 'พ่อแม่หกล้ม',
      text: 'พ่อหกล้มที่บ้านและต้องมีคนดูแลระยะหนึ่ง',
      choices: [
        { label: 'ไปดูแลเอง', fx: { money: -10000, rel: { family: 10 }, energy: -5 } },
        { label: 'จ้างผู้ดูแล', fx: { money: -20000, rel: { family: 4 } } },
        { label: 'ให้ญาติช่วย', fx: { rel: { family: -4 }, heart: -2 } }
      ]
    },
    {
      title: 'เพื่อนร่วมงานเกษียณ',
      text: 'รุ่นพี่ที่ทำงานด้วยกันมาหลายปีเกษียณ และทีมจัดงานเลี้ยง',
      choices: [
        { label: 'ไปงาน', fx: { social: 4, heart: 4, money: -1000 } },
        { label: 'ส่งของขวัญ', fx: { money: -500, heart: 2 } },
        { label: 'ไม่ไป', fx: { social: -2 } }
      ]
    },
    {
      title: 'เงินเดือนไม่พอ',
      text: 'ค่าใช้จ่ายครอบครัวสูงขึ้นจนเงินเดือนแทบไม่เหลือ',
      choices: [
        { label: 'ลดค่าใช้จ่าย', fx: { money: 5000, heart: -2, trait: 'ประหยัด' } },
        { label: 'ทำงานเสริม', fx: { money: 6000, energy: -6, health: -2 } },
        { label: 'กู้เพิ่ม', fx: { money: 20000, credit: -4 } }
      ]
    },
    {
      title: 'ทริปครอบครัว',
      text: 'คุณอยากพาครอบครัวไปเที่ยวสักครั้งก่อนลูกโต',
      choices: [
        { label: 'ไปเที่ยว', fx: { money: -15000, rel: { family: 8, love: 5 }, heart: 6 } },
        { label: 'ไปใกล้ ๆ', fx: { money: -5000, rel: { family: 4 }, heart: 3 } },
        { label: 'เก็บเงินไว้ก่อน', fx: { money: 3000, rel: { family: -3 } } }
      ]
    }
  ],
  8: [
    {
      title: 'ลูกเรียนจบ',
      text: 'ลูกเรียนจบและบอกว่าจะเริ่มทำงาน',
      cond: function () { return life.flags.kid && childAgeYears() >= 18; },
      choices: [
        { label: 'ฉลองให้ลูก', fx: { money: -10000, rel: { family: 10 }, heart: 8 } },
        { label: 'ให้กำลังใจ', fx: { rel: { family: 5 }, heart: 4 } },
        { label: 'บอกให้รีบหาเงิน', fx: { rel: { family: -4 }, heart: -1 } }
      ]
    },
    {
      title: 'บริษัทลดขนาดองค์กร',
      text: 'บริษัทประกาศลดพนักงานอีกรอบ และชื่อคุณอยู่ในลิสต์เฝ้าระวัง',
      choices: [
        { label: 'ทำงานหนักขึ้น', fx: { kpi: 6, energy: -6, heart: -4 } },
        { label: 'อัปเดตเรซูเม่', fx: { smarts: 3, heart: 2 } },
        { label: 'รอความชัดเจน', fx: { heart: -2 } }
      ]
    },
    {
      title: 'ตรวจพบเบาหวาน',
      text: 'ผลตรวจเลือดบอกว่าน้ำตาลสูงกว่าปกติ',
      choices: [
        { label: 'คุมอาหารจริงจัง', fx: { health: 6, energy: -2, money: -2000 } },
        { label: 'กินยา', fx: { health: 3, money: -1000 } },
        { label: 'ไม่สนใจ', fx: { health: -6, heart: -2 } }
      ]
    },
    {
      title: 'เพื่อนชวนเกษียณ',
      text: 'เพื่อนวัยเดียวกันบอกว่าวางแผนเกษียณเร็วและชวนคุณคิดตาม',
      choices: [
        { label: 'เริ่มวางแผน', fx: { smarts: 3, money: -5000, heart: 3 } },
        { label: 'ยังไม่พร้อม', fx: { kpi: 2 } },
        { label: 'ชวนกันไปเที่ยว', fx: { money: -8000, heart: 5, social: 3 } }
      ]
    },
    {
      title: 'ขายที่ดิน',
      text: 'ญาติเสนอขายที่ดินมรดก และแบ่งเงินกัน',
      choices: [
        { label: 'ขาย', fx: { money: 200000, rel: { family: -3 } } },
        { label: 'เก็บไว้', fx: { heart: 3, money: -5000 } },
        { label: 'ให้ญาติเช่า', fx: { money: 20000, rel: { family: 4 } } }
      ]
    },
    {
      title: 'ดูแลพ่อแม่',
      text: 'พ่อแม่ต้องการคนดูแลมากขึ้น และคุณต้องตัดสินใจ',
      choices: [
        { label: 'ย้ายไปอยู่ด้วย', fx: { money: -15000, rel: { family: 12 }, energy: -5 } },
        { label: 'จ้างพยาบาล', fx: { money: -30000, rel: { family: 5 } } },
        { label: 'ฝากสถานดูแล', fx: { money: -20000, rel: { family: -3 }, heart: -2 } }
      ]
    },
    {
      title: 'ชวนโกงบัญชีบริษัท',
      text: 'เพื่อนร่วมงานเสนอให้ช่วยปกปิดตัวเลขบัญชีแลกกับเงินก้อน',
      cond: function () { return ageYears() >= 40; },
      choices: [
        { label: 'ทำ', apply: function () { stats.money += 80000; stats.credit = clamp(stats.credit - 20, 0, 100); life.flags.crime = true; stats.heart = clamp(stats.heart - 8, 0, 100); } },
        { label: 'ปฏิเสธ', fx: { heart: 3, social: -2 } },
        { label: 'แจ้งความ', fx: { social: 4, heart: 2, credit: 2 } }
      ]
    }
  ],
  9: [
    {
      title: 'งานศพเพื่อน',
      text: 'เพื่อนสนิทคนหนึ่งจากไป และคุณต้องตัดสินใจว่าจะไปงานศพหรือไม่',
      choices: [
        { label: 'ไปงานศพ', fx: { money: -3000, heart: 3, social: 3 } },
        { label: 'ส่งเงินช่วย', fx: { money: -2000, heart: 1 } },
        { label: 'ไม่ได้ไป', fx: { heart: -5 } }
      ]
    },
    {
      title: 'ทำพินัยกรรม',
      text: 'คุณเริ่มคิดว่าจะมอบอะไรให้ใครหลังจากไป',
      choices: [
        { label: 'ทำพินัยกรรม', fx: { smarts: 3, heart: 3, money: -5000 } },
        { label: 'ยังไม่ต้อง', fx: { heart: -1 } },
        { label: 'ปรึกษาลูก', fx: { rel: { family: 5 }, heart: 3 } }
      ]
    },
    {
      title: 'เที่ยวต่างประเทศ',
      text: 'คุณมีโอกาสไปเที่ยวต่างประเทศครั้งแรกในชีวิต',
      choices: [
        { label: 'ไป', fx: { money: -60000, heart: 10, social: 4 } },
        { label: 'ไปกับครอบครัว', fx: { money: -90000, heart: 8, rel: { family: 8 } } },
        { label: 'เก็บเงินไว้', fx: { money: 5000, heart: -2 } }
      ]
    }
  ],
  10: [
    {
      title: 'ลุกไม่ไหว',
      text: 'เช้านี้คุณลุกจากเตียงแล้วรู้สึกเจ็บที่สะโพก',
      choices: [
        { label: 'ไปหาหมอ', fx: { money: -3000, health: 4 } },
        { label: 'พักผ่อน', fx: { health: -2, heart: 1 } },
        { label: 'ฝืนทำกิจวัตร', fx: { health: -5, trait: 'อดทน' } }
      ]
    },
    {
      title: 'หลานมาอยู่ด้วย',
      text: 'ลูกขอให้หลานมาอยู่เป็นเพื่อนคุณช่วงปิดเทอม',
      cond: function () { return life.flags.kid && childAgeYears() >= 25; },
      choices: [
        { label: 'ดีใจและรับไว้', fx: { rel: { family: 8 }, heart: 8, energy: -4 } },
        { label: 'รับเป็นบางวัน', fx: { rel: { family: 4 }, heart: 4 } },
        { label: 'ขออยู่คนเดียว', fx: { heart: -2, rel: { family: -3 } } }
      ]
    },
    {
      title: 'ความทรงจำสุดท้าย',
      text: 'คุณนึกถึงใบหน้าของคนที่จากไปแล้วทีละคน',
      choices: [
        { label: 'ยิ้มให้ความทรงจำ', fx: { heart: 7 } },
        { label: 'เสียใจที่ไม่ได้ทำอะไรบางอย่าง', fx: { heart: -4 } },
        { label: 'เล่าให้หลานฟัง', fx: { rel: { family: 5 }, heart: 5 } }
      ]
    }
  ]
};



/* ---------- FAMILY EVENTS · ลูกโต / พ่อแม่ชรา / หลาน ---------- */

const FAMILY_EVENTS = {
  7: [
    {
      title: 'ลูกสอบเข้ามหาวิทยาลัย',
      text: 'ลูกกำลังจะสอบเข้า และทั้งบ้านเงียบกว่าทุกวัน',
      cond: function () { return life.flags.kid && childAgeYears() >= 16; },
      choices: [
        { label: 'สนับสนุนเต็มที่', fx: { money: -20000, child: 8, rel: { family: 5 } } },
        { label: 'ให้ลูกตัดสินใจเอง', fx: { child: 3, smarts: 2 } },
        { label: 'บอกให้ทำงานแทน', fx: { child: -8, rel: { family: -4 } } }
      ]
    }
  ],
  8: [
    {
      title: 'พ่อแม่ป่วยหนัก',
      text: 'พ่อแม่สุขภาพแย่ลงมาก และต้องการคนดูแลใกล้ชิด',
      cond: function () { return life.parents.alive && life.parents.health < 45; },
      choices: [
        { label: 'ดูแลเอง', fx: { money: -20000, rel: { family: 10 }, energy: -6, health: -2 } },
        { label: 'จ้างพยาบาล', fx: { money: -40000, rel: { family: 4 } } },
        { label: 'ปล่อยให้ญาติช่วย', fx: { rel: { family: -8 }, heart: -4 } }
      ]
    },
    {
      title: 'ลูกขอคำปรึกษาเรื่องงาน',
      text: 'ลูกโทรมาเล่าปัญหาที่ทำงาน และถามว่าคุณจะทำยังไง',
      cond: function () { return life.flags.kid && childAgeYears() >= 20; },
      choices: [
        { label: 'ฟังและให้คำแนะนำ', fx: { child: 6, rel: { family: 4 }, heart: 3 } },
        { label: 'เล่าประสบการณ์ตัวเอง', fx: { child: 4, smarts: 2 } },
        { label: 'บอกว่ายุ่ง', fx: { child: -5, rel: { family: -2 } } }
      ]
    }
  ],
  9: [
    {
      title: 'ลูกแต่งงาน',
      text: 'ลูกบอกว่าจะแต่งงาน และถามว่าคุณจะช่วยงานไหม',
      cond: function () { return life.flags.kid && childAgeYears() >= 24; },
      choices: [
        { label: 'ช่วยจัดงานเต็มที่', fx: { money: -100000, child: 10, rel: { family: 8 }, heart: 6 } },
        { label: 'ช่วยเท่าที่ไหว', fx: { money: -30000, child: 5, rel: { family: 4 } } },
        { label: 'ให้ลูกจัดเอง', fx: { child: -4, rel: { family: -2 } } }
      ]
    }
  ],
  10: [
    {
      title: 'มีหลานคนแรก',
      text: 'ลูกโทรมาแจ้งข่าวว่าคุณจะมีหลานแล้ว',
      cond: function () { return life.flags.kid && childAgeYears() >= 25 && !life.flags.grandchild; },
      choices: [
        { label: 'ดีใจและช่วยดูแล', fx: { child: 8, rel: { family: 8 }, heart: 10, flags: { grandchild: true } } },
        { label: 'ยินดีแต่ขอพักผ่อน', fx: { child: 3, heart: 4, flags: { grandchild: true } } },
        { label: 'บอกว่าไม่พร้อม', fx: { child: -5, heart: -3, flags: { grandchild: true } } }
      ]
    }
  ]
};


/* ==========================================================
   LIFE ENGINE · เกิด → ตาย
   ========================================================== */

function chapterData(n) {
  return CHAPTERS[(n || life.chapter) - 1];
}

function ageYears() {
  return Math.floor(life.ageMonths / 12);
}

function turnMonths() {
  return chapterData().months;
}

function currentTurnKey() {
  return life.chapter + ':' + life.turn;
}

const FX_LABEL = {
  health: 'สุขภาพ', heart: 'ใจ', energy: 'พลังงาน', money: 'เงิน',
  kpi: 'ผลงาน', credit: 'เครดิต', smarts: 'ปัญญา', social: 'มนุษย์'
};
const REL_LABEL = { family: 'ครอบครัว', friend: 'เพื่อน', love: 'คู่รัก', boss: 'หัวหน้า' };

function fxHints(fx) {
  if (!fx) return '';
  const out = [];
  Object.keys(FX_LABEL).forEach(function (k) {
    if (!fx[k]) return;
    const v = fx[k];
    const cls = v > 0 ? 'up' : 'down';
    const sign = v > 0 ? '+' : '';
    out.push('<span class="hint ' + cls + '">' + FX_LABEL[k] + ' ' + sign + v + '</span>');
  });
  if (fx.rel) {
    Object.keys(fx.rel).forEach(function (k) {
      const v = fx.rel[k];
      if (!v) return;
      out.push('<span class="hint ' + (v > 0 ? 'up' : 'down') + '">' + (REL_LABEL[k] || k) + ' ' + (v > 0 ? '+' : '') + v + '</span>');
    });
  }
  if (fx.trait) out.push('<span class="hint req">ได้ trait: ' + fx.trait + '</span>');
  if (fx.flags) out.push('<span class="hint req">สถานะชีวิตเปลี่ยน</span>');
  return out.slice(0, 5).join('');
}

function applyLifeFx(fx) {
  if (!fx) return;
  ['health', 'heart', 'energy', 'money', 'kpi', 'credit', 'smarts', 'social'].forEach(function (k) {
    if (!fx[k]) return;
    const v = stats[k] + fx[k];
    stats[k] = k === 'money' ? Math.max(0, v) : clamp(v, 0, 100);
  });
  if (fx.rel) {
    Object.keys(fx.rel).forEach(function (k) {
      life.rel[k] = clamp((life.rel[k] || 0) + fx.rel[k], 0, 100);
    });
  }
  if (fx.flags) {
    Object.keys(fx.flags).forEach(function (k) { life.flags[k] = fx.flags[k]; });
    if (fx.flags.kid && (!life.child || life.child.ageMonths < 0)) {
      life.child = { name: 'ลูก', ageMonths: 0, relation: 70 };
    }
  }
  if (fx.child) {
    life.child.relation = clamp((life.child.relation || 70) + fx.child, 0, 100);
  }
  if (fx.trait && life.traits.indexOf(fx.trait) < 0) life.traits.push(fx.trait);
}

function lifeEventHtml(ev, meta) {
  return '<div class="ev-head"><span class="ev-chip">' + meta.chip + '</span><span>' + meta.sub + '</span></div>' +
    '<div class="ev-title">' + ev.title + '</div>' +
    '<div class="ev-text">' + ev.text + '</div>' +
    '<div class="choices">' +
    ev.choices.map(function (c, i) {
      const hints = c.hint ? hintHtml(c.hint) : fxHints(c.fx);
      return '<button class="choice" data-choice="' + i + '"><span class="c-label">' + (i + 1) + '. ' + c.label + '</span>' +
        '<span class="c-hint">' + hints + '</span></button>';
    }).join('') +
    '</div>';
}

function applyBackground(id) {
  const b = BACKGROUNDS.filter(function (x) { return x.id === id; })[0] || BACKGROUNDS[1];
  stats.health = b.health;
  stats.heart = b.heart;
  stats.energy = 100;
  stats.money = b.money;
  stats.kpi = 50;
  stats.credit = 65;
  stats.smarts = 50;
  stats.social = 50;
  life.rel.family = b.family;
  if (b.trait && life.traits.indexOf(b.trait) < 0) life.traits.push(b.trait);
}

function openLifeCreation() {
  profile.job = 'เด็ก';
  profile.chapter = 'ปฐมวัย';
  profile.age = 0;
  updateHud();
  const provinceOpts = PROVINCES.map(function (p) { return '<option>' + p + '</option>'; }).join('');
  const html =
    '<div class="ev-head"><span class="ev-chip">สร้างชีวิต</span><span>พ.ศ. 2547</span></div>' +
    '<div class="ev-title">เกิดมาเป็นใคร?</div>' +
    '<div class="ev-text">ทุกชีวิตเริ่มจากจุดที่ไม่ได้เลือก — แต่หลังจากนี้ คุณจะเลือกเอง</div>' +
    '<div class="field"><label>ชื่อ–นามสกุล</label><input id="crName" maxlength="28" value="สมชาย ใจดี" /></div>' +
    '<div class="field"><label>เพศ</label><select id="crGender"><option>ชาย</option><option>หญิง</option><option>อื่น ๆ</option></select></div>' +
    '<div class="field"><label>จังหวัดเกิด</label><select id="crProvince">' + provinceOpts + '</select></div>' +
    '<button class="btn-primary" id="crNext">ต่อไป ▶</button>';
  openModal(html);
  document.getElementById('crNext').addEventListener('click', function () {
    profile.name = (document.getElementById('crName').value || 'ไม่มีชื่อ').trim();
    life.gender = document.getElementById('crGender').value;
    life.province = document.getElementById('crProvince').value;
    showBackgroundStep();
  });
}

function showBackgroundStep() {
  const html =
    '<div class="ev-head"><span class="ev-chip">ภูมิหลังครอบครัว</span><span>เลือกได้ 1 อย่าง</span></div>' +
    '<div class="ev-title">คุณเกิดมาในครอบครัวแบบไหน?</div>' +
    '<div class="choices">' +
    BACKGROUNDS.map(function (b, i) {
      return '<button class="choice" data-choice="' + i + '"><span class="c-label">' + b.name + '</span>' +
        '<span class="c-hint">' + b.desc + '</span></button>';
    }).join('') +
    '</div>';
  openModal(html);
  bindChoices(function (i) {
    life.backgroundId = BACKGROUNDS[i].id;
    applyBackground(life.backgroundId);
    updateHud();
    showDreamStep();
  });
}

function showDreamStep() {
  const html =
    '<div class="ev-head"><span class="ev-chip">ความฝัน</span><span>ใช้ตัดสินตอนจบชีวิต</span></div>' +
    '<div class="ev-title">คุณอยากได้อะไรจากชีวิตนี้?</div>' +
    '<div class="choices">' +
    DREAMS.map(function (d, i) {
      return '<button class="choice" data-choice="' + i + '"><span class="c-label">' + d.name + '</span></button>';
    }).join('') +
    '</div>';
  openModal(html);
  bindChoices(function (i) {
    life.dreamId = DREAMS[i].id;
    const b = BACKGROUNDS.filter(function (x) { return x.id === life.backgroundId; })[0];
    const d = DREAMS[i];
    const html2 =
      '<div class="ev-head"><span class="ev-chip">ยืนยัน</span><span>เริ่มชีวิต</span></div>' +
      '<div class="ev-title">' + profile.name + '</div>' +
      '<div class="pay-debt">เพศ <b>' + life.gender + '</b> · เกิดที่ <b>' + life.province + '</b><br>' +
      'ครอบครัว: <b>' + b.name + '</b><br>ความฝัน: <b>' + d.name + '</b><br>' +
      'เงินเริ่มต้น: <b>฿' + fmt(stats.money) + '</b> · ครอบครัว <b>' + life.rel.family + '</b>/100</div>' +
      '<button class="btn-primary" id="crStart">เริ่มชีวิต ▶</button>';
    openModal(html2);
    document.getElementById('crStart').addEventListener('click', startEarlyLife);
  });
}

function startEarlyLife() {
  life.phase = 'early';
  life.chapter = 1;
  life.turn = 0;
  life.ageMonths = 0;
  life.log = [];
  profile.age = 0;
  profile.chapter = chapterData().name;
  profile.job = 'เด็ก';
  world.day = 0;
  world.minutes = 7 * 60;
  stats.energy = 100;
  closeModal();
  saveGame();
  updateHud();
  showEarlyTurn();
}

function pickEventFromPool(pool, forceFirst) {
  if (!pool.length) return null;
  let ev;
  if (forceFirst) {
    ev = pool[0];
  } else {
    ev = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && ev.title === life.lastEventTitle) {
      ev = pool[(pool.indexOf(ev) + 1) % pool.length];
    }
  }
  life.lastEventTitle = ev.title;
  return ev;
}

function showEarlyTurn() {
  if (life.phase !== 'early') return;
  const ch = chapterData();
  if (life.ageMonths >= ch.to * 12 || life.turn >= ch.turns) {
    completeEarlyChapter();
    return;
  }
  const pool = (EARLY_EVENTS[life.chapter] || [])
    .concat(EXTRA_EVENTS[life.chapter] || [])
    .concat(MORE_EVENTS[life.chapter] || []);
  if (!pool.length) { advanceEarlyTurn(); return; }
  const ev = pickEventFromPool(pool, life.turn === 0);
  openModal(lifeEventHtml(ev, {
    chip: 'บท ' + ch.n + ' · ' + ch.name,
    sub: 'อายุ ' + ageYears() + ' ปี'
  }));
  bindChoices(function (i) {
    const c = ev.choices[i];
    if (!c) return;
    if (c.apply) c.apply(); else applyLifeFx(c.fx);
    life.log.push({ age: ageYears(), chapter: life.chapter, title: ev.title, choice: c.label });
    advanceEarlyTurn();
  });
}

function advanceEarlyTurn() {
  const ch = chapterData();
  life.turn += 1;
  life.ageMonths += ch.months;
  profile.age = ageYears();
  profile.chapter = ch.name;
  updateHud();
  saveGame();
  if (life.ageMonths >= ch.to * 12 || life.turn >= ch.turns) {
    completeEarlyChapter();
  } else {
    showEarlyTurn();
  }
}

function completeEarlyChapter() {
  const ch = chapterData();
  if (life.chapter >= 4) {
    enterAdulthood();
    return;
  }
  const next = CHAPTERS[life.chapter];
  showChapterSummary(
    'จบบท ' + ch.n + ' · ' + ch.name,
    'คุณอายุ ' + ageYears() + ' ปี — อีกไม่นานประตูสู่บท “' + next.name + '” จะเปิด<br><br>' +
    'สุขภาพ ' + Math.round(stats.health) + ' · ใจ ' + Math.round(stats.heart) +
    ' · ปัญญา ' + Math.round(stats.smarts) + ' · มนุษย์ ' + Math.round(stats.social) +
    '<br>ครอบครัว ' + life.rel.family + ' · เพื่อน ' + life.rel.friend +
    (life.traits.length ? '<br>นิสัย: ' + life.traits.join(', ') : ''),
    function () {
      life.chapter += 1;
      life.turn = 0;
      profile.chapter = chapterData().name;
      saveGame();
      updateHud();
      showEarlyTurn();
    }
  );
}

function showChapterSummary(title, text, onNext) {
  openModal(
    '<div class="ev-head"><span class="ev-chip">ผ่านช่วงชีวิต</span><span>' + dateLabel() + '</span></div>' +
    '<div class="ev-title">' + title + '</div>' +
    '<div class="ev-text">' + text + '</div>' +
    '<button class="btn-primary" id="chapterNext">ไปต่อ ▶</button>'
  );
  document.getElementById('chapterNext').addEventListener('click', function () {
    closeModal();
    onNext();
  });
}

function resetFinances() {
  debts.credit.balance = 15000;
  debts.car.balance = 180000;
  debts.student.balance = 120000 + (life.flags.studentLoan || 0);
  ['credit', 'car', 'student'].forEach(function (k) {
    const d = debts[k];
    d.missed = 0;
    d.lastPaidKey = null;
    d.repossessed = false;
    d.collector = false;
    d.lawsuit = false;
    d.grace = false;
  });
  finance.salary = 22000;
  finance.rent = 5500;
  finance.transport = 3000;
  if (stats.money < 4500) stats.money = 4500;
  life.flags.car = true;
  life.flags.unemployed = false;
}

function enterAdulthood() {
  life.phase = 'adult';
  life.chapter = 5;
  life.turn = 0;
  life.ageMonths = 22 * 12;
  profile.age = 22;
  profile.chapter = chapterData().name;

  const path = life.flags.path || 'uni';
  let base = 22000;
  if (path === 'voc') base = 15000;
  else if (path === 'work') base = 18000;
  base += Math.round(Math.max(0, stats.smarts - 50) * 80);

  if (path === 'voc') profile.job = 'พนักงานโรงงาน · เด็กใหม่';
  else if (path === 'work') profile.job = 'พนักงานบริษัท · เด็กใหม่';
  else profile.job = 'พนักงานเงินเดือน · เด็กใหม่';

  career.rank = 0;
  career.yearsInRank = 0;
  career.lastReviewAge = 264;
  career.reviews = 0;
  career.promotions = 0;
  career.bonusTotal = 0;

  resetFinances();
  finance.salary = base;
  initDebtDue();
  world.day = 0;
  world.minutes = 7 * 60;
  stats.energy = 100;
  scene = 'city';
  viewMode = 'map';
  closeModal();
  paused = false;
  saveGame();
  updateHud();
  toast('เข้าสู่วัยทำงาน · อายุ 22 · เงินเดือน ฿' + fmt(finance.salary) + ' · กด F');
}

function openLife() {
  if (paused) return;
  const ch = chapterData();
  const bg = BACKGROUNDS.filter(function (x) { return x.id === life.backgroundId; })[0];
  const dream = DREAMS.filter(function (x) { return x.id === life.dreamId; })[0];
  const rel = Object.keys(REL_LABEL).map(function (k) {
    return REL_LABEL[k] + ' <b>' + Math.round(life.rel[k] || 0) + '</b>';
  }).join(' · ');
  const childLine = life.flags.kid
    ? 'ลูก <b>' + (childAgeYears() >= 0 ? childAgeYears() + ' ปี' : 'แรกเกิด') + '</b> · ความสัมพันธ์ <b>' + Math.round(life.child.relation) + '</b>'
    : 'ยังไม่มีลูก';
  const parentLine = life.parents.alive
    ? 'พ่อแม่ยังมีชีวิต · สุขภาพ <b>' + Math.round(life.parents.health) + '</b>'
    : 'พ่อแม่เสียชีวิตแล้ว';
  const html =
    '<div class="ev-head"><span class="ev-chip">ชีวิต</span><span>' + profile.name + '</span></div>' +
    '<div class="ev-title">' + profile.age + ' ปี · ' + ch.name + '</div>' +
    '<div class="pay-debt">' +
    'จังหวัด: <b>' + life.province + '</b> · เพศ: <b>' + life.gender + '</b><br>' +
    'ภูมิหลัง: <b>' + (bg ? bg.name : '-') + '</b><br>' +
    'ความฝัน: <b>' + (dream ? dream.name : '-') + '</b><br>' +
    'งาน: <b>' + profile.job + '</b> · เงินเดือน <b>฿' + fmt(finance.salary) + '</b><br>' +
    'ประเมินแล้ว ' + career.reviews + ' ครั้ง · เลื่อนขั้น ' + career.promotions + ' ครั้ง<br>' +
    'นิสัย: <b>' + (life.traits.length ? life.traits.join(', ') : 'ยังไม่มี') + '</b><br><br>' +
    rel + '<br>' + childLine + '<br>' + parentLine + '<br>' +
    'เงินสด <b>฿' + fmt(stats.money) + '</b> · หนี้รวม <b>฿' + fmt(totalDebt()) + '</b><br>' +
    'บทที่ ' + ch.n + ' · เทิร์น ' + (life.turn + 1) + ' / ' + ch.turns +
    '</div>' +
    '<button class="btn-ghost" id="lifeClose">ปิด</button>';
  openModal(html);
  document.getElementById('lifeClose').addEventListener('click', closeModal);
}

function pickAdultEvent() {
  const pool = (ADULT_EVENTS[life.chapter] || []).filter(function (e) {
    return !e.cond || e.cond();
  });
  (EXTRA_EVENTS[life.chapter] || []).forEach(function (e) {
    if (!e.cond || e.cond()) pool.push(e);
  });
  (MORE_EVENTS[life.chapter] || []).forEach(function (e) {
    if (!e.cond || e.cond()) pool.push(e);
  });
  (FAMILY_EVENTS[life.chapter] || []).forEach(function (e) {
    if (!e.cond || e.cond()) pool.push(e);
  });
  if (life.chapter === 5) {
    MONTH_EVENTS.forEach(function (e) {
      if (!e.cond || e.cond()) pool.push(e);
    });
  }
  return pickEventFromPool(pool, false);
}

function startAdultTurn() {
  if (life.phase !== 'adult' || gameOver) return;
  paused = true;
  const ev = pickAdultEvent();
  if (!ev) { resolveMonth(null); return; }

  const ch = chapterData();
  openModal(lifeEventHtml(ev, {
    chip: 'บท ' + ch.n + ' · ' + ch.name,
    sub: 'อายุ ' + ageYears() + ' ปี'
  }));
  bindChoices(function (i) {
    const c = ev.choices[i];
    if (!c) return;
    if (c.apply) c.apply(); else applyLifeFx(c.fx);
    life.log.push({ age: ageYears(), chapter: life.chapter, title: ev.title, choice: c.label });
    resolveMonth(ev);
  });
}

function deathRoll(months) {
  if (stats.health <= 0) return true;
  const age = ageYears();
  if (age < 45) return false;
  let risk = Math.max(0, age - 45) * 0.002 + (100 - stats.health) * 0.002;
  if (age >= 80) risk += (age - 80) * 0.008;
  risk = risk * Math.max(0.6, months / 12);
  if (Math.random() < risk) {
    stats.health = clamp(stats.health - (18 + Math.random() * 28), 0, 100);
    if (stats.health <= 0) return true;
    toast('ร่างกายส่งสัญญาณเตือน · สุขภาพลดลง');
  }
  return false;
}

function dreamAchieved() {
  switch (life.dreamId) {
    case 'house': return !!(life.flags.house || stats.money >= 500000);
    case 'family': return life.rel.family >= 70 && life.rel.love >= 40;
    case 'manager': return finance.salary >= 50000;
    case 'retire': return stats.money >= 2000000;
    case 'business': return !!life.flags.business;
    case 'free': return finance.salary === 0 && stats.money >= 500000;
    default: return false;
  }
}

function needsReview() {
  return life.phase === 'adult' &&
    !life.flags.retired &&
    finance.salary > 0 &&
    life.ageMonths - career.lastReviewAge >= 12;
}

function reviewCareer() {
  const score = clamp(Math.round(stats.kpi * 0.6 + stats.social * 0.2 + life.rel.boss * 0.2 + (Math.random() * 8 - 4)), 0, 100);
  let raisePct = 0;
  let bonusMonths = 0;

  if (score >= 85) {
    raisePct = 0.10 + Math.random() * 0.02;
    bonusMonths = 3 + Math.random() * 3;
  } else if (score >= 70) {
    raisePct = 0.05 + Math.random() * 0.02;
    bonusMonths = 1.5 + Math.random() * 1.5;
  } else if (score >= 55) {
    raisePct = 0.02 + Math.random() * 0.02;
    bonusMonths = Math.random() * 1.2;
  }

  const oldSalary = finance.salary;
  let promoted = false;
  if (score >= 75 && career.yearsInRank >= 1 && career.rank < 4 && stats.kpi >= 70 && stats.social >= 50) {
    career.rank += 1;
    career.yearsInRank = 0;
    career.promotions += 1;
    promoted = true;
  } else {
    career.yearsInRank += 1;
  }

  let newSalary = Math.round(oldSalary * (1 + raisePct));
  if (promoted) {
    newSalary = Math.max(newSalary, CAREER_RANKS[career.rank].min);
    profile.job = CAREER_RANKS[career.rank].title;
  }
  finance.salary = newSalary;

  const bonus = Math.round(newSalary * bonusMonths);
  stats.money += bonus;
  career.bonusTotal += bonus;
  career.reviews += 1;
  career.lastReviewAge = life.ageMonths;
  stats.kpi = clamp(45 + (stats.kpi - 50) * 0.3, 0, 100);
  stats.heart = clamp(stats.heart + (promoted ? 6 : 1), 0, 100);

  let laidOff = false;
  if (ageYears() >= 45 && score < 50 && Math.random() < 0.35) {
    laidOff = true;
    finance.salary = 0;
    profile.job = 'ว่างงาน';
    life.flags.laidoff = true;
    life.flags.unemployed = true;
    stats.heart = clamp(stats.heart - 15, 0, 100);
    stats.health = clamp(stats.health - 4, 0, 100);
  }

  return {
    score: score, oldSalary: oldSalary, newSalary: finance.salary,
    raisePct: raisePct, bonus: bonus, bonusMonths: bonusMonths,
    promoted: promoted, laidOff: laidOff, rank: career.rank
  };
}

function showYearReview(next) {
  const r = reviewCareer();
  const html =
    '<div class="ev-head"><span class="ev-chip">ประเมินปลายปี</span><span>อายุ ' + ageYears() + ' ปี</span></div>' +
    '<div class="ev-title">ผลประเมิน: ' + r.score + ' / 100</div>' +
    '<div class="pay-table">' +
    payRow('ผลงาน (KPI)', Math.round(stats.kpi) + ' / 100') +
    payRow('เงินเดือนเดิม', '฿' + fmt(r.oldSalary)) +
    payRow('ปรับขึ้น', (r.raisePct > 0 ? '+' + (r.raisePct * 100).toFixed(1) + '%' : 'ไม่ขึ้น'), 'pos') +
    payRow('โบนัส', '฿' + fmt(r.bonus), 'pos') +
    '<div class="pay-total"><span>เงินเดือนใหม่</span><b>฿' + fmt(r.newSalary) + '</b></div>' +
    '</div>' +
    (r.promoted ? '<div class="pay-warn">เลื่อนตำแหน่ง → ' + CAREER_RANKS[r.rank].title + '</div>' : '') +
    (r.laidOff ? '<div class="pay-warn">ถูกเลย์ออฟ — เงินเดือนกลายเป็น 0 และต้องหางานใหม่</div>' : '') +
    '<div class="pay-debt">โบนัสสะสมทั้งชีวิต <b>฿' + fmt(career.bonusTotal) + '</b> · เลื่อนขั้นแล้ว <b>' + career.promotions + '</b> ครั้ง</div>' +
    '<button class="btn-primary" id="reviewNext">ไปต่อ ▶</button>';

  openModal(html);
  document.getElementById('reviewNext').addEventListener('click', function () {
    closeModal();
    updateHud();
    saveGame();
    next();
  });
}

function endingFor(type) {
  const age = ageYears();
  const family = life.rel.family;
  const money = stats.money;

  if (life.flags.crime) {
    return {
      id: 'crime',
      title: 'บทส่งท้าย · ติดคดี',
      text: 'เงินที่ได้มาไม่เคยพอ และหลักฐานที่คุณคิดว่าซ่อนได้ ก็กลับมาถึงมือคนอื่นจนได้ — คุกไม่ได้จบชีวิตทันที แต่มันเปลี่ยนทุกอย่างที่เหลือ'
    };
  }
  if (type === 'bankruptcy' || totalDebt() > 500000) {
    return {
      id: 'debt',
      title: 'บทส่งท้าย · หนี้ท่วมจนตัวแตก',
      text: 'เจ้าหนี้ฟ้องล้มละลาย ทรัพย์สินถูกยึด และชื่อของคุณติดแบล็กลิสต์อีกหลายปี — ชีวิตใหม่เริ่มได้ แต่ไม่มีใครบอกว่ามันจะง่าย'
    };
  }
  if (type === 'death' || stats.health <= 0) {
    if (age < 45) {
      return {
        id: 'early_death',
        title: 'บทส่งท้าย · ตายก่อนวัยอันควร',
        text: 'ไม่มีใครเตรียมตัวสำหรับวันนี้ ทั้งงานที่ยังค้าง ครอบครัวที่ยังรอ และคำพูดที่ยังไม่ได้พูด'
      };
    }
    return {
      id: 'health',
      title: 'บทส่งท้าย · สุขภาพพังก่อนเกษียณ',
      text: 'ร่างกายส่งสัญญาณมานานหลายปี แต่คุณเลือกจะทำงานต่อ — จนวันหนึ่งมันก็ไม่ยอมรับฟังคุณอีกแล้ว'
    };
  }
  if (life.flags.business) {
    return {
      id: 'business',
      title: 'บทส่งท้าย · ลาออกไปทำของตัวเอง',
      text: 'คุณไม่ได้รวยที่สุด แต่ได้ตื่นมาแล้วรู้ว่าวันนี้จะทำอะไร — และนั่นคือสิ่งที่คุณตามหามาทั้งชีวิต'
    };
  }
  if (money >= 1000000 && family < 50) {
    return {
      id: 'rich_alone',
      title: 'บทส่งท้าย · รวยแต่ตัวคนเดียว',
      text: 'งานศพของคุณมีคนมาเยอะ แวดล้อมด้วยดอกไม้และคำชม — แต่ไม่มีใครที่รู้จักคุณจริง ๆ'
    };
  }
  if (stats.heart < 25) {
    return {
      id: 'burnout',
      title: 'บทส่งท้าย · หมดไฟกลางทาง',
      text: 'คุณทำงานหนักมาตลอด จนลืมไปว่าตัวเองอยากอะไร — และวันนี้ก็ไม่มีแรงจะเริ่มถามอีก'
    };
  }
  return {
    id: 'peace',
    title: 'บทส่งท้าย · เกษียณอย่างสงบ',
    text: 'คุณจากไปในบ้านที่มีคนที่รักอยู่ข้าง ๆ ความฝันบางอย่างสำเร็จ บางอย่างไม่ — แต่ทั้งหมดนั้นคือชีวิตของคุณ'
  };
}

function showLifeEnding(type) {
  gameOver = true;
  const age = ageYears();
  const debt = totalDebt();
  const dreamOk = dreamAchieved();
  const ending = endingFor(type);
  const title = ending.title;
  const text = ending.text;

  const log = life.log.slice(-7).map(function (l) {
    return '· อายุ ' + l.age + ': ' + l.title + ' — ' + l.choice;
  }).join('<br>');
  const bgObj = BACKGROUNDS.filter(function (x) { return x.id === life.backgroundId; })[0];
  const relLine = 'ครอบครัว <b>' + life.rel.family + '</b> · คู่รัก <b>' + life.rel.love + '</b> · เพื่อน <b>' + life.rel.friend + '</b>';

  const html =
    '<div class="ev-head"><span class="ev-chip">จบชีวิต</span><span>อายุ ' + age + ' ปี</span></div>' +
    '<div class="ev-title">' + title + '</div>' +
    '<div class="ev-text">' + text + '</div>' +
    '<div class="pay-debt">' +
    'เกิดที่ <b>' + life.province + '</b> · ภูมิหลัง <b>' + (bgObj ? bgObj.name : '-') + '</b><br>' +
    'สถานะสุดท้าย: <b>' + profile.chapter + '</b> · อาชีพ <b>' + profile.job + '</b><br>' +
    'เงินคงเหลือ <b>฿' + fmt(stats.money) + '</b> · หนี้ <b>฿' + fmt(debt) + '</b> · เครดิต <b>' + Math.round(stats.credit) + '</b><br>' +
    relLine + '<br>' +
    'ความฝัน: <b>' + (dreamOk ? 'สำเร็จ' : 'ไม่สำเร็จ') + '</b> · ประเมินแล้ว <b>' + career.reviews + '</b> ครั้ง<br>' +
    (log ? '<br>' + log : '') +
    '</div>' +
    '<button class="btn-primary" id="restartLife">เริ่มชีวิตใหม่ ▶</button>';
  openModal(html);
  document.getElementById('restartLife').addEventListener('click', function () {
    clearSave();
    location.reload();
  });
}

function resumeLife() {
  if (life.phase === 'early') {
    showEarlyTurn();
  } else if (life.phase === 'adult') {
    closeModal();
    paused = false;
    updateHud();
    toast('กลับมาที่ชีวิตเดิม · อายุ ' + ageYears());
  } else if (life.phase === 'creation') {
    openLifeCreation();
  }
}


/* ==========================================================
   MONTH CYCLE · เงินเดือน · หนี้ · event · save
   ========================================================== */

function payRow(label, value, cls) {
  return '<div class="pay-row' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span><b>' + value + '</b></div>';
}

function openSleep() {
  const months = Math.max(1, turnMonths());
  const html =
    '<div class="ev-head"><span class="ev-chip">บ้าน</span><span>' + dateLabel() + '</span></div>' +
    '<div class="ev-title">จะเข้านอนแล้ว?</div>' +
    '<div class="ev-text">เตียงนุ่ม แต่พรุ่งนี้ยังมีงานรออยู่ — จะพักคืนเดียว หรือจบเทิร์นนี้เพื่อเดินหน้าเวลา?</div>' +
    '<div class="choices">' +
    '<button class="choice" data-choice="0"><span class="c-label">1. นอน 1 คืน</span>' +
    '<span class="c-hint"><span class="hint up">พลังงานเต็ม</span><span class="hint time">ตื่น 07:00</span></span></button>' +
    '<button class="choice" data-choice="1"><span class="c-label">2. จบเทิร์น (' + months + ' เดือน)</span>' +
    '<span class="c-hint"><span class="hint up">รับเงินเดือน</span><span class="hint down">หักค่าใช้จ่าย</span><span class="hint req">มี event</span></span></button>' +
    '<button class="choice" data-choice="2"><span class="c-label">3. ยังไม่นอน</span></button>' +
    '</div>';

  openModal(html);
  bindChoices(function (i) {
    if (i === 0) {
      sleep();
    } else if (i === 1) {
      startAdultTurn();
    } else {
      closeModal();
    }
  });
}

const MONTH_EVENTS = [
  {
    id: 'friend_borrow',
    chip: 'เหตุการณ์ · เพื่อนสนิท',
    title: 'เพื่อนสนิทโทรมาขอยืมเงิน',
    text: 'เพื่อนที่สนิทกันมาแต่เรียนมหาวิทยาลัยโทรมาเสียงเครียด “ขอกู้ห้าพันก่อนได้ไหม เดี๋ยวสิ้นเดือนคืนให้” — คุณรู้ว่าสิ้นเดือนของเขากับของคุณไม่เคยตรงกัน',
    cond: function () { return stats.money >= 5000; },
    choices: [
      { label: 'ให้ยืม 5,000', hint: [['down', 'เงิน −5,000'], ['up', 'ใจ +8']], apply: function () { stats.money -= 5000; stats.heart = clamp(stats.heart + 8, 0, 100); } },
      { label: 'ให้ยืม 2,000', hint: [['down', 'เงิน −2,000'], ['up', 'ใจ +3']], apply: function () { stats.money -= 2000; stats.heart = clamp(stats.heart + 3, 0, 100); } },
      { label: 'ปฏิเสธ', hint: [['down', 'ใจ −6']], apply: function () { stats.heart = clamp(stats.heart - 6, 0, 100); } }
    ]
  },
  {
    id: 'family_sick',
    chip: 'เหตุการณ์ · ครอบครัว',
    title: 'แม่โทรมา บอกว่าป่วย',
    text: 'แม่บอกว่าแค่เป็นหวัดใหญ่ แต่เสียงไอฟังดูหนักกว่าทุกครั้ง คุณรู้ว่าท่านไม่อยากให้ห่วง — และรู้ว่าค่ารักษาไม่เคยถูก',
    cond: function () { return stats.money >= 8000; },
    choices: [
      { label: 'ส่งเงิน 8,000', hint: [['down', 'เงิน −8,000'], ['up', 'ใจ +10']], apply: function () { stats.money -= 8000; stats.heart = clamp(stats.heart + 10, 0, 100); } },
      { label: 'ส่งเงิน 3,000', hint: [['down', 'เงิน −3,000'], ['up', 'ใจ +4']], apply: function () { stats.money -= 3000; stats.heart = clamp(stats.heart + 4, 0, 100); } },
      { label: 'บอกว่ายังไม่มี', hint: [['down', 'ใจ −12']], apply: function () { stats.heart = clamp(stats.heart - 12, 0, 100); } }
    ]
  },
  {
    id: 'scam_invest',
    chip: 'เหตุการณ์ · การเงิน',
    title: 'เพื่อนร่วมงานชวนลงทุน 20%/เดือน',
    text: '“การันตี 20% ต่อเดือน พี่ทำมาแล้วสามเดือน” — กลุ่มไลน์เต็มไปด้วยสลิปโอนเงิน และรูปถ่ายรถใหม่',
    cond: function () { return stats.money >= 5000; },
    choices: [
      {
        label: 'ลองลงทุน 5,000',
        hint: [['down', 'เงิน −5,000'], ['req', 'เสี่ยงสูง']],
        apply: function () {
          stats.money -= 5000;
          if (Math.random() < 0.35) {
            stats.money += 8000;
            toast('ลงทุนได้จริง +8,000 (รอบนี้)');
          } else {
            toast('เงินหายทั้งก้อน — กลุ่มไลน์ปิดไปแล้ว');
            stats.heart = clamp(stats.heart - 8, 0, 100);
          }
        }
      },
      { label: 'ปฏิเสธ', hint: [['up', 'ใจ +2']], apply: function () { stats.heart = clamp(stats.heart + 2, 0, 100); } }
    ]
  },
  {
    id: 'office_politics',
    chip: 'เหตุการณ์ · ออฟฟิศ',
    title: 'หัวหน้าขอให้ช่วยงานการเมืองในบริษัท',
    text: 'หัวหน้าชอบคุณเป็นการส่วนตัว และอยากให้คุณช่วย “ดูแลเอกสาร” ของทีมหนึ่งก่อนวันประชุมใหญ่',
    cond: function () { return true; },
    choices: [
      { label: 'ช่วยหัวหน้า', hint: [['up', 'ผลงาน +8'], ['down', 'ใจ −6'], ['down', 'พลังงาน −10']], apply: function () { stats.kpi = clamp(stats.kpi + 8, 0, 100); stats.heart = clamp(stats.heart - 6, 0, 100); stats.energy = clamp(stats.energy - 10, 0, 100); } },
      { label: 'โฟกัสงานตัวเอง', hint: [['up', 'ผลงาน +3']], apply: function () { stats.kpi = clamp(stats.kpi + 3, 0, 100); } },
      { label: 'เลิกงานตรงเวลา', hint: [['up', 'ใจ +6'], ['down', 'ผลงาน −2']], apply: function () { stats.heart = clamp(stats.heart + 6, 0, 100); stats.kpi = clamp(stats.kpi - 2, 0, 100); } }
    ]
  },
  {
    id: 'health_warning',
    chip: 'เหตุการณ์ · สุขภาพ',
    title: 'ร่างกายส่งสัญญาณ',
    text: 'คุณตื่นมาแล้วรู้สึกเจ็บแปลบที่อกซ้าย — อาจเป็นแค่กล้ามเนื้อ แต่ก็ไม่แน่',
    cond: function () { return stats.health < 75 && stats.money >= 1500; },
    choices: [
      { label: 'ไปตรวจสุขภาพ 1,500', hint: [['down', 'เงิน −1,500'], ['up', 'สุขภาพ +8']], apply: function () { stats.money -= 1500; stats.health = clamp(stats.health + 8, 0, 100); } },
      { label: 'ปล่อยไว้ก่อน', hint: [['down', 'สุขภาพ −5']], apply: function () { stats.health = clamp(stats.health - 5, 0, 100); } }
    ]
  }
];

function hintHtml(hints) {
  return hints.map(function (h) { return '<span class="hint ' + h[0] + '">' + h[1] + '</span>'; }).join('');
}

function pickMonthEvent() {
  if (monthsPlayed > 0 && Math.random() > 0.7) return null;
  const pool = MONTH_EVENTS.filter(function (e) { return !e.cond || e.cond(); });
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function startMonthEnd() {
  paused = true;
  const ev = pickMonthEvent();
  if (!ev) { resolveMonth(null); return; }

  const html =
    '<div class="ev-head"><span class="ev-chip">' + ev.chip + '</span><span>สิ้นเดือน · ' + MONTHS[dateParts(world.day).m] + '</span></div>' +
    '<div class="ev-title">' + ev.title + '</div>' +
    '<div class="ev-text">' + ev.text + '</div>' +
    '<div class="choices">' +
    ev.choices.map(function (c, i) {
      return '<button class="choice" data-choice="' + i + '"><span class="c-label">' + (i + 1) + '. ' + c.label + '</span>' +
        '<span class="c-hint">' + hintHtml(c.hint || []) + '</span></button>';
    }).join('') +
    '</div>';

  openModal(html);
  bindChoices(function (i) {
    const ch = ev.choices[i];
    if (ch) ch.apply();
    resolveMonth(ev);
  });
}

function totalDebt() {
  return Object.keys(debts).reduce(function (a, k) { return a + Math.max(0, debts[k].balance); }, 0);
}

function housingCost() {
  return life.flags.house ? 1500 : finance.rent;
}

function transportCost() {
  if (life.flags.car === false || debts.car.repossessed) return 1200;
  if (debts.car.balance <= 0) return 2000;
  return finance.transport;
}

function familyCost() {
  let c = 0;
  if (life.flags.married) c += 3000;
  if (life.flags.kid && life.child.ageMonths >= 0 && life.child.ageMonths < 22 * 12) c += 8000;
  return c;
}

function childAgeYears() {
  return life.child.ageMonths >= 0 ? Math.floor(life.child.ageMonths / 12) : -1;
}

function familyTick(months) {
  const notes = [];
  if (life.flags.kid && life.child.ageMonths >= 0) {
    life.child.ageMonths += months;
  }
  if (life.parents.alive) {
    const parentAge = ageYears() + 25;
    if (parentAge >= 60) {
      life.parents.health = clamp(life.parents.health - 0.2 * months, 0, 100);
    }
    if (life.parents.health <= 0) {
      life.parents.alive = false;
      life.parents.health = 0;
      stats.heart = clamp(stats.heart - 15, 0, 100);
      stats.money += 100000;
      life.flags.inheritance = true;
      notes.push('พ่อแม่จากไป — ได้รับมรดก ฿100,000');
    }
  }
  return notes;
}

function fixedPerMonth() {
  return housingCost() + transportCost() + familyCost();
}

function initDebtDue() {
  const key = currentTurnKey();
  Object.keys(debts).forEach(function (k) {
    debts[k].lastPaidKey = key; // เดือนแรกเริ่มนับ ไม่ถือว่าค้าง
    debts[k].missed = 0;
    debts[k].repossessed = false;
    debts[k].grace = true;
  });
}

function payDebt(key, amount) {
  const d = debts[key];
  if (!d) return;
  amount = Math.floor(Number(amount));
  if (!isFinite(amount) || amount <= 0) { toast('ใส่จำนวนเงินที่จะจ่าย'); return; }
  if (d.balance <= 0) { toast(d.label + ' ปิดแล้ว'); return; }
  if (amount > stats.money) { toast('เงินไม่พอ (มี ฿' + fmt(stats.money) + ')'); return; }

  const months = Math.max(1, turnMonths());
  const minDue = Math.min(d.min * months, d.balance);
  const alreadyPaid = d.lastPaidKey === currentTurnKey();
  amount = Math.min(amount, d.balance);
  stats.money -= amount;
  d.balance -= amount;

  if (amount >= minDue || d.balance === 0) {
    d.lastPaidKey = currentTurnKey();
    d.missed = 0;
    d.grace = false;
    if (!alreadyPaid) stats.credit = clamp(stats.credit + 1, 0, 100);
    toast('จ่าย ' + d.label + ' ฿' + fmt(amount) + ' · ครบขั้นต่ำงวดนี้');
  } else {
    toast('จ่าย ' + d.label + ' ฿' + fmt(amount) + ' · ยังไม่ถึงขั้นต่ำ ฿' + fmt(minDue));
  }

  saveGame();
  updateHud();
  openFinance(true);
}

function resolveMonth(ev) {
  pendingEnding = null;
  const months = Math.max(1, turnMonths());
  const p = lifeDateParts();
  const familyNotes = familyTick(months);
  const salary = finance.salary * months;
  stats.money += salary;

  const fixed = fixedPerMonth() * months;
  let fixedShortfall = 0;
  if (stats.money < fixed) {
    fixedShortfall = fixed - stats.money;
    stats.money = 0;
    debts.credit.balance += fixedShortfall;
    stats.credit = clamp(stats.credit - 3, 0, 100);
    stats.heart = clamp(stats.heart - 4, 0, 100);
  } else {
    stats.money -= fixed;
  }

  const closingKey = currentTurnKey();
  const debtNotes = [];
  const warnings = [];
  if (fixedShortfall) warnings.push('เงินไม่พอจ่ายค่าเช่า/เดินทาง — ยอดขาด ฿' + fmt(fixedShortfall) + ' ทบเข้าบัตรเครดิต');
  familyNotes.forEach(function (n) { warnings.push(n); });
  let interestTotal = 0;

  Object.keys(debts).forEach(function (key) {
    const d = debts[key];
    if (d.balance <= 0) {
      d.missed = 0;
      debtNotes.push(d.label + ': ' + (d.repossessed ? 'ถูกยึดแล้ว' : 'ปิดแล้ว'));
      return;
    }

    const interest = Math.round(d.balance * d.rate * months);
    d.balance += interest;
    interestTotal += interest;

    if (d.lastPaidKey === closingKey) {
      d.missed = 0;
      debtNotes.push(d.label + (d.grace ? ': เริ่มนับงวดนี้' : ': จ่ายตรงเวลา'));
    } else {
      d.missed = (d.missed || 0) + 1;
      const minDue = Math.min(d.min * months, d.balance);
      const fee = Math.round(minDue * 0.05);
      d.balance += fee;
      stats.credit = clamp(stats.credit - 3, 0, 100);
      stats.heart = clamp(stats.heart - 2, 0, 100);
      debtNotes.push(d.label + ': ค้าง ' + d.missed + ' งวด (ค่าปรับ ฿' + fmt(fee) + ')');
    }
    d.grace = false;
  });

  // บันไดบทลงโทษ
  const car = debts.car;
  if (car.balance > 0 && car.missed >= 3 && !car.repossessed) {
    car.repossessed = true;
    car.balance = 0;
    car.missed = 0;
    life.flags.car = false;
    stats.credit = clamp(stats.credit - 12, 0, 100);
    stats.heart = clamp(stats.heart - 10, 0, 100);
    stats.health = clamp(stats.health - 2, 0, 100);
    warnings.push('รถถูกยึด — หนี้ผ่อนรถปิดด้วยการยึดทรัพย์');
  }

  const credit = debts.credit;
  if (credit.balance > 0 && credit.missed >= 2 && !credit.collector) {
    credit.collector = true;
    stats.credit = clamp(stats.credit - 5, 0, 100);
    stats.heart = clamp(stats.heart - 5, 0, 100);
    stats.health = clamp(stats.health - 2, 0, 100);
    warnings.push('เจ้าหนี้บัตรเครดิตโทรมาและส่งจดหมาย');
  }
  if (credit.balance > 0 && credit.missed >= 4 && !credit.lawsuit) {
    credit.lawsuit = true;
    stats.credit = clamp(stats.credit - 10, 0, 100);
    stats.health = clamp(stats.health - 4, 0, 100);
    warnings.push('บัตรเครดิตถูกฟ้องศาล');
  }

  const student = debts.student;
  if (student.balance > 0 && student.missed >= 4 && !student.lawsuit) {
    student.lawsuit = true;
    stats.credit = clamp(stats.credit - 8, 0, 100);
    stats.health = clamp(stats.health - 3, 0, 100);
    warnings.push('กยศ. ถูกฟ้อง');
  }

  // monthly drift (scale with turn length)
  stats.health = clamp(stats.health - 0.15 * months, 0, 100);
  stats.heart = clamp(stats.heart - 0.3 * months, 0, 100);

  const missedTotal = Object.keys(debts).reduce(function (a, k) { return a + (debts[k].missed || 0); }, 0);
  const debtTotal = totalDebt();

  if (stats.health <= 0) {
    pendingEnding = 'death';
  } else if ((stats.credit <= 0 && missedTotal >= 6) || debtTotal > 500000) {
    pendingEnding = 'bankruptcy';
  }

  showPayslip({
    p: p,
    ev: ev,
    months: months,
    salary: salary,
    fixed: fixed,
    interestTotal: interestTotal,
    debtNotes: debtNotes,
    warnings: warnings,
    totalDebt: debtTotal,
    missedTotal: missedTotal,
    pendingEnding: pendingEnding
  });
}

function showPayslip(r) {
  let rows = payRow('เงินเดือน (' + r.months + ' เดือน)', '+' + fmt(r.salary), 'pos');
  rows += payRow('ที่อยู่', '−' + fmt(housingCost() * r.months), 'neg');
  rows += payRow('เดินทาง', '−' + fmt(transportCost() * r.months), 'neg');
  if (familyCost() > 0) {
    rows += payRow('ครอบครัว', '−' + fmt(familyCost() * r.months), 'neg');
  }

  const notes = r.debtNotes.map(function (t) { return '· ' + t; }).join('<br>');
  const warns = r.warnings.map(function (t) { return '⚠ ' + t; }).join('<br>');

  const html =
    '<div class="ev-head"><span class="ev-chip">สิ้นเดือน</span><span>' + dateLabel() + '</span></div>' +
    '<div class="ev-title">สลิปเงินเดือน · ' + MONTHS[r.p.m] + ' ' + r.p.y + '</div>' +
    '<div class="pay-table">' + rows +
    '<div class="pay-total"><span>คงเหลือในบัญชี</span><b>฿' + fmt(stats.money) + '</b></div>' +
    '</div>' +
    '<div class="pay-debt">ระบบ <b>ไม่หักหนี้อัตโนมัติ</b> — ต้องจ่ายเองที่ปุ่ม F<br>' +
    notes + '<br>ดอกเบี้ยเดือนนี้ <b>฿' + fmt(r.interestTotal) + '</b> · หนี้รวม <b>฿' + fmt(r.totalDebt) + '</b><br>' +
    'เครดิต <b>' + Math.round(stats.credit) + '</b> / 100</div>' +
    (warns ? '<div class="pay-warn">' + warns + '</div>' : '') +
    (r.pendingEnding ? '<div class="pay-warn">สถานะของคุณถึงจุดจบแล้ว — กดไปต่อเพื่อดูบทส่งท้าย</div>' : '') +
    '<button class="btn-primary" id="payContinue">' + (r.pendingEnding ? 'บทส่งท้าย ▶' : 'เริ่มเดือนใหม่ ▶') + '</button>';

  openModal(html);
  document.getElementById('payContinue').addEventListener('click', finishMonth);
}

function finishMonth() {
  const months = Math.max(1, turnMonths());

  life.turn += 1;
  life.ageMonths += months;
  profile.age = ageYears();
  world.day += months * 30;
  world.minutes = 7 * 60;
  stats.energy = clamp(stats.energy + 40, 0, 100);
  stats.heart = clamp(stats.heart + 2, 0, 100);
  flags.workedToday = false;
  monthsPlayed += 1;

  closeModal();

  if (pendingEnding) {
    clearSave();
    showLifeEnding(pendingEnding);
    return;
  }

  let chapterChanged = false;
  const ch = chapterData();
  if (life.ageMonths >= ch.to * 12 && life.chapter < 10) {
    life.chapter += 1;
    life.turn = 0;
    profile.chapter = chapterData().name;
    chapterChanged = true;
  }

  if (life.chapter === 10 && (life.turn >= chapterData().turns || life.ageMonths >= 90 * 12)) {
    clearSave();
    showLifeEnding('oldage');
    return;
  }

  if (deathRoll(months)) {
    clearSave();
    showLifeEnding('death');
    return;
  }

  const next = function () { afterTurnCommit(chapterChanged, months); };
  if (needsReview()) showYearReview(next);
  else next();
}

function afterTurnCommit(chapterChanged, months) {
  saveGame();
  updateHud();

  if (chapterChanged) {
    const nc = chapterData();
    showChapterSummary(
      'เข้าสู่บท ' + nc.n + ' · ' + nc.name,
      'อายุ ' + profile.age + ' ปี — ชีวิตเข้าสู่ช่วงใหม่<br><br>' +
      'สุขภาพ ' + Math.round(stats.health) + ' · ใจ ' + Math.round(stats.heart) +
      ' · เงิน ฿' + fmt(stats.money) + ' · หนี้ ฿' + fmt(totalDebt()) +
      '<br>ตำแหน่ง ' + profile.job + ' · เงินเดือน ฿' + fmt(finance.salary),
      function () {
        closeModal();
        paused = false;
        updateHud();
        saveGame();
      }
    );
  } else {
    toast('ผ่านไป ' + months + ' เดือน · อายุ ' + profile.age);
  }
}

function openFinance(force) {
  if (paused && !force) return;
  const months = Math.max(1, turnMonths());
  const key = currentTurnKey();
  const fixed = fixedPerMonth() * months;
  let monthlyDue = 0;
  let debtRowsHtml = '';

  Object.keys(debts).forEach(function (k) {
    const d = debts[k];
    const due = Math.min(d.min * months, d.balance);
    monthlyDue += due;
    const paid = d.lastPaidKey === key;
    const status = d.balance <= 0
      ? (d.repossessed ? 'ถูกยึดแล้ว' : 'ปิดแล้ว')
      : (paid ? (d.grace ? 'เริ่มนับงวดนี้' : 'จ่ายแล้วงวดนี้') : 'ยังไม่จ่าย');
    const statusCls = d.balance <= 0 ? 'muted' : (paid ? 'ok' : 'bad');

    debtRowsHtml +=
      '<div class="debt-row">' +
      '<div class="debt-info">' +
      '<div class="debt-title"><b>' + d.label + '</b><span class="debt-status ' + statusCls + '">' + status + (d.missed ? ' · ค้าง ' + d.missed + ' งวด' : '') + '</span></div>' +
      '<div class="debt-sub">คงเหลือ ฿' + fmt(d.balance) + ' · ขั้นต่ำงวดนี้ ฿' + fmt(due) + ' · กำหนดวันที่ ' + d.dueDay + '</div>' +
      '</div>' +
      (d.balance > 0
        ? '<div class="debt-pay"><input id="pay-' + k + '" type="number" min="0" step="100" value="' + due + '"><button data-pay="' + k + '">จ่าย</button></div>'
        : '') +
      '</div>';
  });

  const totalOut = fixed + monthlyDue;
  const net = (finance.salary * months) - totalOut;

  const html =
    '<div class="ev-head"><span class="ev-chip">การเงิน</span><span>' + MONTHS[lifeDateParts().m] + ' ' + lifeDateParts().y + '</span></div>' +
    '<div class="ev-title">ภาพรวมการเงิน</div>' +
    '<div class="pay-table">' +
    payRow('เงินเดือน (' + months + ' เดือน)', '+' + fmt(finance.salary * months), 'pos') +
    payRow('ที่อยู่', '−' + fmt(housingCost() * months), 'neg') +
    payRow('เดินทาง', '−' + fmt(transportCost() * months), 'neg') +
    (familyCost() > 0 ? payRow('ครอบครัว', '−' + fmt(familyCost() * months), 'neg') : '') +
    '<div class="pay-total"><span>เหลือต่องวด (ถ้าจ่ายขั้นต่ำ)</span><b>฿' + fmt(net) + '</b></div>' +
    '</div>' +
    '<div class="debt-list">' + debtRowsHtml + '</div>' +
    '<div class="pay-debt">หนี้รวม <b>฿' + fmt(totalDebt()) + '</b> · เครดิต <b>' + Math.round(stats.credit) + '</b> / 100 · เงินสด <b>฿' + fmt(stats.money) + '</b><br>' +
    'ระบบไม่หักหนี้อัตโนมัติ — จ่ายเองด้านบน หรือปล่อยค้างเพื่อดูผลที่ตามมา</div>' +
    '<button class="btn-ghost" id="finClose">ปิด</button>';

  openModal(html);
  document.getElementById('finClose').addEventListener('click', closeModal);
  modal.querySelectorAll('[data-pay]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const k = btn.getAttribute('data-pay');
      const input = document.getElementById('pay-' + k);
      payDebt(k, input ? input.value : 0);
    });
  });
}

function openJobSearch() {
  if (paused) return;
  if (life.phase !== 'adult') return;
  if (life.flags.retired) { toast('เกษียณแล้ว · ไม่ต้องหางานเพิ่ม'); return; }
  if (finance.salary > 0) { toast('คุณยังมีงานอยู่'); return; }
  if (life.flags.jobSearchTurn === currentTurnKey()) {
    toast('ลองหางานแล้วเทิร์นนี้ · รอเทิร์นหน้า');
    return;
  }

  const age = ageYears();
  const chance = clamp(Math.round(45 + (stats.smarts - 50) * 0.4 + (stats.social - 50) * 0.4 - Math.max(0, age - 40) * 1.2), 10, 90);
  const officeSalary = Math.max(15000, 16000 + Math.round(stats.smarts * 80) + Math.round(stats.social * 40) - Math.max(0, age - 40) * 150);
  const freeSalary = Math.max(8000, 7000 + Math.round(stats.social * 50) + Math.round(stats.smarts * 30));

  const html =
    '<div class="ev-head"><span class="ev-chip">หางาน</span><span>อายุ ' + age + ' ปี</span></div>' +
    '<div class="ev-title">ตกงาน — จะไปทางไหนต่อ?</div>' +
    '<div class="ev-text">เรซูเม่ถูกส่งไปหลายที่ แต่ตลาดงานอายุ 45+ ไม่ได้ใจดีกับใคร</div>' +
    '<div class="choices">' +
    '<button class="choice" data-choice="0"><span class="c-label">1. สมัครงานออฟฟิศ (โอกาส ' + chance + '%)</span>' +
    '<span class="c-hint"><span class="hint up">เงินเดือน ~฿' + fmt(officeSalary) + '</span><span class="hint req">เสี่ยงไม่ผ่าน</span></span></button>' +
    '<button class="choice" data-choice="1"><span class="c-label">2. รับงานฟรีแลนซ์/พาร์ทไทม์</span>' +
    '<span class="c-hint"><span class="hint up">ได้แน่ ~฿' + fmt(freeSalary) + '</span><span class="hint down">ไม่มีสวัสดิการ</span></span></button>' +
    '<button class="choice" data-choice="2"><span class="c-label">3. พักก่อน</span></button>' +
    '</div>';

  openModal(html);
  bindChoices(function (i) {
    if (i === 0) {
      life.flags.jobSearchTurn = currentTurnKey();
      if (Math.random() < chance / 100) {
        hireJob(officeSalary, 'office');
      } else {
        stats.heart = clamp(stats.heart - 3, 0, 100);
        closeModal();
        saveGame();
        updateHud();
        toast('สัมภาษณ์ไม่ผ่าน · ใจ −3');
      }
    } else if (i === 1) {
      life.flags.jobSearchTurn = currentTurnKey();
      hireJob(freeSalary, 'free');
    } else {
      closeModal();
    }
  });
}

function hireJob(salary, kind) {
  const oldRank = career.rank;
  career.rank = kind === 'office' ? Math.max(0, oldRank - 1) : 0;
  finance.salary = kind === 'office'
    ? Math.max(salary, CAREER_RANKS[career.rank].min)
    : salary;
  profile.job = kind === 'office' ? CAREER_RANKS[career.rank].title : 'ฟรีแลนซ์';
  career.yearsInRank = 0;
  career.lastReviewAge = life.ageMonths;
  stats.kpi = 50;
  life.flags.unemployed = false;
  closeModal();
  saveGame();
  updateHud();
  toast('ได้งาน: ' + profile.job + ' · ฿' + fmt(finance.salary) + '/เดือน');
}


function snapshot() {
  return {
    version: 3,
    savedAt: Date.now(),
    stats: JSON.parse(JSON.stringify(stats)),
    world: { minutes: world.minutes, day: world.day, speed: world.speed },
    flags: JSON.parse(JSON.stringify(flags)),
    profile: JSON.parse(JSON.stringify(profile)),
    finance: JSON.parse(JSON.stringify(finance)),
    debts: JSON.parse(JSON.stringify(debts)),
    career: JSON.parse(JSON.stringify(career)),
    life: JSON.parse(JSON.stringify(life)),
    monthsPlayed: monthsPlayed,
    player: { x: player.x, y: player.y, dir: player.dir },
    scene: scene,
    viewMode: viewMode
  };
}

function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot())); } catch (e) { /* ignore */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (!s || s.version !== 3) return false;
    Object.assign(stats, s.stats);
    Object.assign(world, s.world);
    Object.assign(flags, s.flags);
    Object.assign(profile, s.profile);
    Object.assign(finance, s.finance);
    if (s.career) Object.assign(career, s.career);
    if (s.life) {
      Object.assign(life, s.life);
      life.rel = Object.assign({ family: 70, friend: 50, love: 0, boss: 50 }, s.life.rel || {});
      life.traits = s.life.traits || [];
      life.log = s.life.log || [];
      life.eventIndex = s.life.eventIndex || {};
      life.lastEventTitle = s.life.lastEventTitle || '';
      life.flags = s.life.flags || {};
      life.child = Object.assign({ name: 'ลูก', ageMonths: -1, relation: 70 }, s.life.child || {});
      life.parents = Object.assign({ health: 75, alive: true }, s.life.parents || {});
      if (life.flags.kid && life.child.ageMonths < 0) life.child.ageMonths = 0;
    }
    if (!stats.smarts && stats.smarts !== 0) stats.smarts = 55;
    if (!stats.social && stats.social !== 0) stats.social = 50;
    if (s.debts) {
      Object.keys(debts).forEach(function (k) {
        if (s.debts[k]) Object.assign(debts[k], s.debts[k]);
      });
    }
    monthsPlayed = s.monthsPlayed || 0;
    if (s.player) {
      player.x = s.player.x;
      player.y = s.player.y;
      player.dir = s.player.dir || 'down';
    }
    if (s.scene && sceneInfo[s.scene]) scene = s.scene;
    if (s.viewMode) viewMode = s.viewMode;
    return true;
  } catch (e) {
    return false;
  }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}

/* ---------- work ---------- */
function openWork() {
  if (finance.salary <= 0) { openJobSearch(); return; }
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
  if (gameOver) return;
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
    const speed = (scene === 'city' && viewMode === 'map' ? 300 : 172) * dt;
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
  const ch = chapterData();
  profile.age = ageYears();
  profile.chapter = ch ? ch.name : '—';
  const nameEl = document.getElementById('charName');
  if (nameEl) nameEl.textContent = profile.name;

  if (life.phase === 'early' || life.phase === 'creation') {
    document.getElementById('clockTime').textContent = life.phase === 'creation' ? '—' : (profile.age + ' ปี');
    document.getElementById('clockDate').textContent = life.phase === 'creation' ? 'สร้างชีวิต' : ('บท ' + ch.n + ' · ' + ch.name);
    document.getElementById('paydayText').textContent = life.phase === 'creation' ? '' : ('เทิร์น ' + (life.turn + 1) + ' / ' + ch.turns);
    document.getElementById('locName').textContent = life.phase === 'creation' ? 'สร้างชีวิต' : ('บท ' + ch.n + ' · ' + ch.name);
  } else {
    const hh = Math.floor(world.minutes / 60);
    const mm = Math.floor(world.minutes % 60);
    document.getElementById('clockTime').textContent =
      String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    document.getElementById('clockDate').textContent = dateLabel();
    document.getElementById('locName').textContent = sceneInfo[scene].name;

    // payday (25th)
    const dp = lifeDateParts();
    const left = dp.d <= 25 ? 25 - dp.d : 30 - dp.d + 25;
    const overdue = Object.keys(debts).reduce(function (a, k) { return a + (debts[k].missed > 0 ? 1 : 0); }, 0);
    document.getElementById('paydayText').textContent =
      (finance.salary <= 0 && !life.flags.retired
        ? 'ว่างงาน · กด J หางาน'
        : (left === 0 ? 'เงินเดือนออกวันนี้' : 'เงินเดือนออกอีก ' + left + ' วัน') +
          (overdue ? ' · ⚠ ค้าง ' + overdue + ' หนี้' : ''));
  }

  document.getElementById('ageText').textContent = 'อายุ ' + profile.age + ' · ' + profile.chapter;
  const roleEl = document.getElementById('charRole');
  if (roleEl) roleEl.textContent = profile.job;

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

function dateParts(day) {
  let d = day;
  let m = 0;
  let y = 2569;
  while (d >= MDAYS[m]) {
    d -= MDAYS[m];
    m += 1;
    if (m >= 12) { m = 0; y += 1; }
  }
  return { d: d + 1, m: m, y: y };
}

function lifeDateParts() {
  const tm = Math.max(0, life.ageMonths || 0);
  return { d: 1 + (world.day % 30), m: tm % 12, y: 2547 + Math.floor(tm / 12) };
}

function dateLabel() {
  const p = lifeDateParts();
  const weekday = WEEK[(world.day + 1) % 7];
  return weekday + ' ' + p.d + ' ' + MONTHS[p.m] + ' ' + p.y;
}

function nextMonthStart(day) {
  const p = dateParts(day);
  return day + (MDAYS[p.m] - p.d + 1);
}

function isMonthEnd(day) {
  const p = dateParts(day);
  return p.d === MDAYS[p.m];
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
  { key: 'credit', label: 'เครดิต', color: '#ff9f4a', max: 100 },
  { key: 'smarts', label: 'ปัญญา', color: '#c4a7ff', max: 100 },
  { key: 'social', label: 'มนุษย์', color: '#7dd3fc', max: 100 }
];

const statEls = {};

function buildStats() {
  const wrap = document.getElementById('statPanel');
  wrap.innerHTML = '';
  STAT_DEFS.forEach(function (d) {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML =
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
   PIXEL-ART RENDER  ·  16px art tiles, 4x nearest neighbour
   ========================================================== */

const CITY_AW = MAP_W * ART;
const CITY_AH = MAP_H * ART;
const OFFICE_AW = OFFICE.w * ART;
const OFFICE_AH = OFFICE.h * ART;
const HOME_AW = HOME.w * ART;
const HOME_AH = HOME.h * ART;

const P = {
  grass: '#2a4b34', grassD: '#22402b', grassL: '#33593c', blade: '#3f6f4a',
  flowerA: '#ffd75e', flowerB: '#ff8fb1', flowerC: '#c9d6ff',
  dirt: '#59462f', dirtD: '#463622', dirtL: '#6b5539',
  road: '#333a52', roadD: '#2a3044', roadL: '#3d4560', line: '#d8dfef',
  walk: '#575f7d', walkD: '#4b526d', walkL: '#616a89', curb: '#7b85a8',
  water: '#1d4d75', waterD: '#16405f', waterL: '#2b6791',
  frame: '#141a30', winLit: '#ffe3a0', winLit2: '#ffcf7a', winOff: '#1b2440',
  shadow: '#050817'
};

let cityStatic = null;
let officeStatic = null;
let homeStatic = null;
const winGlows = [];

/* ---------- tiny helpers ---------- */

function rngArt(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function px(x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

function ditherRect(x, y, w, h, c, step, alpha) {
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  for (let yy = 0; yy < h; yy += step) {
    const off = (Math.floor(yy / step) % 2) * step;
    for (let xx = off; xx < w; xx += step * 2) {
      px(x + xx, y + yy, step, step, c);
    }
  }
  ctx.globalAlpha = 1;
}

function shadowBlob(x, y, w) {
  ctx.globalAlpha = 0.3;
  px(x - w / 2, y, w, 1, P.shadow);
  px(x - w / 2 + 1, y + 1, w - 2, 1, P.shadow);
  px(x - w / 2 + 3, y + 2, w - 6, 1, P.shadow);
  ctx.globalAlpha = 1;
}

function makeLayer(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const prev = ctx;
  ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  fn();
  ctx = prev;
  return c;
}

function filterLayer(src, filter) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const cx = c.getContext('2d');
  if (!('filter' in cx)) return src;
  cx.filter = filter;
  cx.drawImage(src, 0, 0);
  return c;
}

function buildStatics() {
  cityStatic = makeLayer(CITY_AW, CITY_AH, function () { buildCityArt(false); });
  const rawMap = makeLayer(CITY_AW, CITY_AH, function () { buildCityArt(true); });
  cityMapStatic = filterLayer(rawMap, 'brightness(1.16) saturate(1.06) contrast(1.02)');
  officeStatic = makeLayer(OFFICE_AW, OFFICE_AH, buildOfficeArt);
  homeStatic = makeLayer(HOME_AW, HOME_AH, buildHomeArt);
}

/* ---------- layout audit: ทุก object ต้องอยู่โซนที่ควรอยู่ ---------- */

function tileZone(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 'edge';
  for (let i = 0; i < BUILDINGS.length; i++) {
    const b = BUILDINGS[i];
    if (tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h) return 'building';
  }
  for (let i = 0; i < HOUSES.length; i++) {
    const b = HOUSES[i];
    if (tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h) return 'building';
  }
  if (tx >= POND.x && tx < POND.x + POND.w && ty >= POND.y && ty < POND.y + POND.h) return 'pond';
  if (ty === 8 || ty === 9 || ty === 20 || ty === 21) return 'road';
  if (tx === 12 || tx === 13 || tx === 30 || tx === 31) return 'road';
  if (ty === 7 || ty === 10 || ty === 19 || ty === 22) return 'sidewalk';
  if (tx === 11 || tx === 14 || tx === 29 || tx === 32) return 'sidewalk';
  if (tx >= 3 && tx < 10 && ty >= 23 && ty < 27) return 'park';
  return 'grass';
}

function auditLayout() {
  const issues = [];
  const check = function (label, x, y, allowed) {
    const z = tileZone(Math.floor(x), Math.floor(y));
    if (allowed.indexOf(z) === -1) {
      issues.push(label + ' @' + Number(x).toFixed(1) + ',' + Number(y).toFixed(1) + ' → ' + z);
    }
  };

  TREES.forEach(function (t) { check('tree', t[0] + 0.5, t[1] + 0.5, ['grass', 'park']); });
  BUSHES.forEach(function (b) { check('bush', b[0], b[1], ['grass', 'park']); });
  SCOOTERS.forEach(function (s) { check('scooter', s[0], s[1], ['sidewalk']); });
  LIGHTS.forEach(function (l) { check('lamp', l[0], l[1], ['sidewalk', 'park', 'grass']); });

  const props = [
    ['vendor', 22.2, 7.95, ['sidewalk']],
    ['vendor', 10.4, 24.2, ['park', 'grass']],
    ['bench', 4.1, 24.6, ['park']],
    ['bench', 10.3, 24.4, ['grass']],
    ['bench', 9.6, 10.9, ['sidewalk']],
    ['bin', 8.2, 10.9, ['sidewalk']],
    ['bin', 3.4, 26.6, ['park']],
    ['hydrant', 20.5, 7.8, ['sidewalk']],
    ['manhole', 17.5, 9.3, ['road']],
    ['manhole', 27.5, 21.3, ['road']],
    ['manhole', 13.4, 14.5, ['road']],
    ['drain', 15.4, 8.1, ['road']],
    ['drain', 24.4, 21.9, ['road']],
    ['bus stop', 9.5, 10.2, ['sidewalk']],
    ['vending', 23.0, 16.2, ['grass']],
    ['traffic light', 11.2, 7.6, ['sidewalk']],
    ['puddle', 16.2, 21.9, ['road']],
    ['puddle', 23.8, 8.2, ['road']],
    ['litter', 16.8, 10.7, ['sidewalk']],
    ['litter', 33.4, 22.7, ['sidewalk']],
    ['pot', 22.8, 24.2, ['grass']],
    ['pot', 28.6, 12.2, ['grass']],
    ['bags', 9.0, 19.7, ['sidewalk']],
    ['mailbox', 3.0, 15.5, ['grass']],
    ['bike', 17.3, 10.9, ['sidewalk']],
    ['bike', 28.6, 19.6, ['sidewalk']],
    ['pigeon', 15.4, 10.7, ['sidewalk']],
    ['pigeon', 16.2, 10.9, ['sidewalk']],
    ['pigeon', 27.6, 19.6, ['sidewalk']],
    ['pigeon', 6.8, 23.9, ['park']]
  ];
  props.forEach(function (p) { check(p[0], p[1], p[2], p[3]); });

  [[3.2, 7.9], [10.5, 7.9], [21.5, 7.9], [34.5, 7.9],
   [10.5, 22.9], [21.5, 22.9], [34.5, 22.9]].forEach(function (p) {
    check('power pole', p[0], p[1], ['sidewalk']);
  });

  // อาคาร/บ้าน ต้องไม่อยู่บนถนน/ทางเท้า และต้องไม่ทับกัน
  const structures = BUILDINGS.concat(HOUSES);
  structures.forEach(function (b) {
    for (let ty = b.y; ty < b.y + b.h; ty++) {
      for (let tx = b.x; tx < b.x + b.w; tx++) {
        if (ty === 7 || ty === 8 || ty === 9 || ty === 10 ||
            ty === 19 || ty === 20 || ty === 21 || ty === 22 ||
            tx === 11 || tx === 12 || tx === 13 || tx === 14 ||
            tx === 29 || tx === 30 || tx === 31 || tx === 32) {
          issues.push('building on street @' + tx + ',' + ty);
        }
      }
    }
  });
  for (let i = 0; i < structures.length; i++) {
    for (let j = i + 1; j < structures.length; j++) {
      const a = structures[i];
      const b = structures[j];
      if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
        issues.push('building overlap @' + a.x + ',' + a.y + ' × ' + b.x + ',' + b.y);
      }
    }
  }

  if (issues.length) console.warn('[OpenLife] layout issues:', issues);
  else console.info('[OpenLife] layout audit: OK (' + (TREES.length + BUSHES.length + props.length) + ' objects)');
  return issues;
}

/* ==========================================================
   CITY — STATIC ART
   ========================================================== */

function buildCityArt(flat) {
  const r = rngArt(20261109);

  // ---- grass base
  px(0, 0, CITY_AW, CITY_AH, P.grass);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * CITY_AW / 8) * 8;
    const y = Math.floor(r() * CITY_AH / 8) * 8;
    ditherRect(x, y, 8 + Math.floor(r() * 28), 8 + Math.floor(r() * 18), P.grassD, 2, 0.45);
  }
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(r() * CITY_AW / 8) * 8;
    const y = Math.floor(r() * CITY_AH / 8) * 8;
    ditherRect(x, y, 8 + Math.floor(r() * 22), 8 + Math.floor(r() * 14), P.grassL, 2, 0.35);
  }
  for (let i = 0; i < 2000; i++) {
    const x = Math.floor(r() * CITY_AW);
    const y = Math.floor(r() * CITY_AH);
    px(x, y, 1, 1, r() < 0.55 ? P.grassD : P.grassL);
  }
  for (let i = 0; i < 320; i++) {
    const x = Math.floor(r() * (CITY_AW - 2));
    const y = Math.floor(r() * (CITY_AH - 2));
    px(x, y, 1, 2, P.blade);
    px(x + 1, y + 1, 1, 1, P.grassL);
  }
  for (let i = 0; i < 80; i++) {
    const x = Math.floor(r() * CITY_AW);
    const y = Math.floor(r() * CITY_AH);
    const c = [P.flowerA, P.flowerB, P.flowerC][Math.floor(r() * 3)];
    px(x, y, 1, 1, c);
    if (r() < 0.4) px(x + 1, y, 1, 1, 'rgba(255,255,255,.55)');
  }

  // ---- park lawn (blended edges, flower beds, paths)
  const parkX = 3 * ART;
  const parkY = 23 * ART;
  const parkW = 7 * ART;
  const parkH = 4 * ART;
  px(parkX + 2, parkY, parkW - 4, parkH, '#2f5b3c');
  px(parkX, parkY + 2, parkW, parkH - 4, '#2f5b3c');
  px(parkX + 1, parkY + 1, parkW - 2, parkH - 2, '#2f5b3c');
  px(parkX + 3, parkY, parkW - 6, 1, '#274c33');
  px(parkX + 3, parkY + parkH - 1, parkW - 6, 1, '#274c33');
  const pr = rngArt(4242);
  for (let i = 0; i < 380; i++) {
    const x = parkX + Math.floor(pr() * parkW);
    const y = parkY + Math.floor(pr() * parkH);
    px(x, y, 1, 1, pr() < 0.5 ? '#3a6a45' : '#274c33');
  }
  // flower beds with soil
  for (let b = 0; b < 2; b++) {
    const bx = parkX + 10 + b * 48;
    px(bx - 1, parkY + 5, 22, 10, '#4a3a2a');
    px(bx, parkY + 6, 20, 8, P.dirt);
    for (let i = 0; i < 10; i++) {
      const fx = bx + (i % 5) * 4 + (Math.floor(i / 5) % 2) * 2;
      const fy = parkY + 7 + Math.floor(i / 5) * 4;
      px(fx, fy, 1, 1, i % 3 === 0 ? P.flowerB : P.flowerA);
      if (i % 4 === 0) px(fx + 1, fy, 1, 1, P.flowerC);
    }
  }
  // winding dirt paths (8 art px wide)
  [5, 9].forEach(function (tx) {
    const cx = tx * ART + 4;
    for (let y = 22 * ART; y < 27 * ART; y++) {
      const wob = Math.round(Math.sin(y * 0.55 + tx) * 1);
      px(cx - 4 + wob, y, 8, 1, P.dirt);
      px(cx - 3 + wob, y, 6, 1, (y % 3 === 0) ? P.dirtL : P.dirt);
    }
    for (let y = 22 * ART + 4; y < 27 * ART; y += 9) {
      px(cx - 3 + Math.round(Math.sin(y * 0.5) * 1), y, 6, 2, P.dirtL);
    }
  });
  // stepping stones + park litter
  for (let i = 0; i < 14; i++) {
    const x = parkX + 4 + Math.floor(pr() * (parkW - 8));
    const y = parkY + 20 + Math.floor(pr() * (parkH - 24));
    px(x, y, 1, 1, pr() < 0.5 ? P.dirtL : '#6b5539');
  }

  // ---- sidewalks
  const H_WALKS = [7, 10, 19, 22];
  const V_WALKS = [11, 14, 29, 32];
  H_WALKS.forEach(function (row) { pave(0, row * ART, CITY_AW, ART); });
  V_WALKS.forEach(function (col) { pave(col * ART, 0, ART, CITY_AH); });

  // ---- roads
  const H_ROADS = [[8, 2], [20, 2]];
  const V_ROADS = [[12, 2], [30, 2]];
  H_ROADS.forEach(function (rd) { roadSurface(0, rd[0] * ART, CITY_AW, rd[1] * ART, true); });
  V_ROADS.forEach(function (rd) { roadSurface(rd[0] * ART, 0, rd[1] * ART, CITY_AH, false); });

  // ---- curbs
  H_ROADS.forEach(function (rd) {
    const y = rd[0] * ART;
    const h = rd[1] * ART;
    px(0, y - 1, CITY_AW, 1, P.curb);
    px(0, y + h, CITY_AW, 1, P.curb);
    px(0, y, CITY_AW, 1, 'rgba(0,0,0,.30)');
    px(0, y + h - 1, CITY_AW, 1, 'rgba(0,0,0,.30)');
  });
  V_ROADS.forEach(function (rd) {
    const x = rd[0] * ART;
    const w = rd[1] * ART;
    px(x - 1, 0, 1, CITY_AH, P.curb);
    px(x + w, 0, 1, CITY_AH, P.curb);
    px(x, 0, 1, CITY_AH, 'rgba(0,0,0,.30)');
    px(x + w - 1, 0, 1, CITY_AH, 'rgba(0,0,0,.30)');
  });

  // ---- crosswalks
  crosswalkH(11 * ART, 8 * ART, 16, 32);
  crosswalkH(14 * ART, 8 * ART, 16, 32);
  crosswalkV(12 * ART, 7 * ART, 32, 16);
  crosswalkV(12 * ART, 10 * ART, 32, 16);
  crosswalkH(29 * ART, 8 * ART, 16, 32);
  crosswalkH(32 * ART, 8 * ART, 16, 32);
  crosswalkV(30 * ART, 7 * ART, 32, 16);
  crosswalkV(30 * ART, 10 * ART, 32, 16);

  // bus-stop curb paint
  for (let i = 0; i < 8; i++) {
    px(8 * ART + i * 4, 10 * ART - 3, 2, 2, i % 2 ? '#ffd75e' : '#1b2038');
  }

  // ---- pond
  drawPondArt();

  // ---- buildings & houses
  BUILDINGS.forEach(function (b) { drawBuildingArt(b, flat); });
  HOUSES.forEach(function (h) { drawHouseArt(h, flat); });

  // ---- vegetation
  BUSHES.forEach(function (b) { drawBushArt(b[0] * ART, b[1] * ART); });
  TREES.forEach(function (t, i) {
    drawTreeArt((t[0] + 0.5) * ART, (t[1] + 0.92) * ART, i % 3);
    if (i % 4 === 0) {
      for (let k = 0; k < 3; k++) px((t[0] + 0.3 + k * 0.22) * ART, (t[1] + 0.95) * ART, 1, 1, '#6b5539');
    }
  });
  drawPigeonArt(15.4 * ART, 10.7 * ART);
  drawPigeonArt(16.2 * ART, 10.9 * ART);
  drawPigeonArt(27.6 * ART, 19.6 * ART);
  drawPigeonArt(6.8 * ART, 23.9 * ART);

  // ---- street furniture
  drawBenchArt(4.1 * ART, 24.6 * ART);
  drawBenchArt(10.3 * ART, 24.4 * ART);
  drawBinArt(3.4 * ART, 26.6 * ART);
  drawBenchArt(9.6 * ART, 10.9 * ART);
  drawBinArt(8.2 * ART, 10.9 * ART);
  drawHydrantArt(20.5 * ART, 7.8 * ART);
  drawVendorArt(22.2 * ART, 7.95 * ART);
  drawVendorArt(10.4 * ART, 24.2 * ART);
  drawManholeArt(17.5 * ART, 9.3 * ART);
  drawManholeArt(27.5 * ART, 21.3 * ART);
  drawManholeArt(13.4 * ART, 14.5 * ART);
  drawDrainArt(15.4 * ART, 8.1 * ART);
  drawDrainArt(24.4 * ART, 21.9 * ART);

  // ---- parked scooters + bikes
  SCOOTERS.forEach(function (s) { drawScooterArt(s[0] * ART, s[1] * ART, s[2]); });
  drawBikeArt(17.3 * ART, 10.9 * ART);
  drawBikeArt(28.6 * ART, 19.6 * ART);

  // ---- bus stop
  drawBusStopArt(9.5 * ART, 10.2 * ART);

  // ---- street lamps (poles) + power poles
  LIGHTS.forEach(function (l) { drawLampPost(l[0] * ART, l[1] * ART); });
  drawPowerLine();

  // ---- little extras
  drawPuddle(16.2 * ART, 21.9 * ART, 10, 3);
  drawPuddle(23.8 * ART, 8.2 * ART, 8, 2);
  drawLitter(16.8 * ART, 10.7 * ART);
  drawLitter(33.4 * ART, 22.7 * ART);
  drawPot(22.8 * ART, 24.2 * ART);
  drawPot(28.6 * ART, 12.2 * ART);
  drawBags(9.0 * ART, 19.7 * ART);
  drawMailbox(3.0 * ART, 15.5 * ART);
  drawTrafficLight(11.2 * ART, 7.6 * ART);
  drawVendingArt(23.0 * ART, 16.2 * ART);
}

function pave(x, y, w, h) {
  px(x, y, w, h, P.walk);
  for (let yy = 0; yy < h; yy += 4) {
    for (let xx = 0; xx < w; xx += 4) {
      const light = ((Math.floor(xx / 4) + Math.floor(yy / 4)) % 2) === 0;
      px(x + xx, y + yy, 3, 3, light ? P.walkL : P.walk);
    }
  }
  px(x, y + h - 1, w, 1, P.walkD);
}

function roadSurface(x, y, w, h, horizontal) {
  px(x, y, w, h, P.road);
  const r = rngArt(x * 31 + y * 17 + (horizontal ? 7 : 13));
  const n = Math.floor((w * h) / 55);
  for (let i = 0; i < n; i++) {
    const sx = x + Math.floor(r() * w);
    const sy = y + Math.floor(r() * h);
    const k = r();
    px(sx, sy, 1, 1, k < 0.5 ? P.roadD : k < 0.85 ? P.roadL : '#4a5370');
  }
  if (horizontal) {
    // lighter tyre wear
    ctx.globalAlpha = 0.10;
    px(x, y + 6, w, 2, '#cfd6e6');
    px(x, y + 19, w, 2, '#cfd6e6');
    ctx.globalAlpha = 1;
    // dashed centre line
    for (let d = 6; d < w; d += 16) {
      px(x + d, y + h / 2 - 1, 6, 1, P.line);
    }
    // patches / cracks
    for (let i = 0; i < 4; i++) {
      const cx = x + Math.floor(r() * (w - 24));
      const cy = y + 3 + Math.floor(r() * (h - 8));
      px(cx, cy, 8 + Math.floor(r() * 12), 2, P.roadD);
    }
  } else {
    ctx.globalAlpha = 0.10;
    px(x + 6, y, 2, h, '#cfd6e6');
    px(x + 19, y, 2, h, '#cfd6e6');
    ctx.globalAlpha = 1;
    for (let d = 6; d < h; d += 16) {
      px(x + w / 2 - 1, y + d, 1, 6, P.line);
    }
    for (let i = 0; i < 4; i++) {
      const cx = x + 3 + Math.floor(r() * (w - 8));
      const cy = y + Math.floor(r() * (h - 24));
      px(cx, cy, 2, 8 + Math.floor(r() * 12), P.roadD);
    }
  }
}

function crosswalkH(x, y, w, h) {
  for (let yy = y + 2; yy < y + h - 1; yy += 4) {
    px(x + 1, yy, w - 2, 2, P.line);
  }
}

function crosswalkV(x, y, w, h) {
  for (let xx = x + 2; xx < x + w - 1; xx += 4) {
    px(xx, y + 1, 2, h - 2, P.line);
  }
}

function drawPondArt() {
  const x = POND.x * ART;
  const y = POND.y * ART;
  const w = POND.w * ART;
  const h = POND.h * ART;

  // stone rim
  px(x - 3, y - 1, w + 6, h + 2, '#6a6f88');
  px(x - 1, y - 3, w + 2, h + 6, '#6a6f88');
  px(x - 2, y - 2, w + 4, h + 4, '#565b72');
  // water body with rounded pixel corners
  px(x + 2, y, w - 4, h, P.water);
  px(x, y + 2, w, h - 4, P.water);
  px(x + 1, y + 1, w - 2, h - 2, P.water);
  // deep middle
  px(x + 5, y + 5, w - 10, h - 10, P.waterD);
  px(x + 8, y + 9, w - 16, h - 18, P.water);
  // surface glints
  px(x + 6, y + 6, 9, 1, P.waterL);
  px(x + 18, y + 16, 7, 1, 'rgba(160,220,255,.35)');
  px(x + 11, y + 22, 5, 1, 'rgba(160,220,255,.22)');
  // reeds and rocks along the rim
  for (let i = 0; i < 6; i++) px(x + 1 + i * 6, y + h - 3, 1, 4, '#3d6b45');
  px(x - 3, y + 8, 4, 3, '#4a4f64');
  px(x + w - 1, y + 20, 4, 3, '#4a4f64');
  // lily pads
  px(x + 6, y + 18, 5, 2, '#3f7a4e');
  px(x + 23, y + 7, 5, 3, '#3f7a4e');
  px(x + 25, y + 8, 1, 1, P.flowerB);
  // ducks
  px(x + 12, y + 11, 4, 3, '#e8eeff');
  px(x + 13, y + 10, 3, 1, '#f4f7ff');
  px(x + 16, y + 11, 1, 1, '#ff9f4a');
  px(x + 13, y + 14, 1, 1, '#c9d6ff');
  px(x + 21, y + 22, 3, 2, '#dce4ff');
  px(x + 23, y + 22, 1, 1, '#ff9f4a');
}

/* ---------- buildings ---------- */

function drawBuildingArt(b, flat) {
  if (flat) { drawBuildingFlat(b); return; }
  const x = b.x * ART;
  const y = b.y * ART;
  const w = b.w * ART;
  const h = b.h * ART;
  const wallH = clamp(Math.round(h * 0.46), 12, 30);
  const roofH = h - wallH;
  const wallY = y + roofH;
  const cx = x + w / 2;

  // ground shadow
  ctx.globalAlpha = 0.38;
  px(x + 3, y + 4, w, h, P.shadow);
  ctx.globalAlpha = 1;

  // wall
  px(x, wallY, w, wallH, b.wall);
  for (let yy = wallY + 3; yy < y + h - 1; yy += 4) {
    px(x, yy, w, 1, 'rgba(0,0,0,.16)');
    const off = (Math.floor(yy / 4) % 2) ? 4 : 0;
    for (let xx = x + off; xx < x + w; xx += 8) {
      px(xx, yy - 4, 1, 4, 'rgba(0,0,0,.10)');
    }
  }
  px(x, wallY, w, 1, 'rgba(255,255,255,.12)');
  px(x, y + h - 2, w, 2, 'rgba(0,0,0,.35)');

  // windows
  const rows = wallH >= 19 ? 2 : 1;
  const doorCol = Math.floor(b.w / 2) - 1;
  for (let rw = 0; rw < rows; rw++) {
    for (let i = 0; i < b.w; i++) {
      if (rw === rows - 1 && (i === doorCol || i === doorCol + 1)) continue;
      const wx = x + i * ART + 5;
      const wy = wallY + 3 + rw * 9;
      const lit = ((i * 3 + rw * 5 + b.x * 7) % 5) !== 0;
      const warm = ((i + rw + b.y) % 3) === 0;
      drawWindowArt(wx, wy, 6, 5, lit, warm);
    }
  }

  // door + awning + step
  const doorW = 8;
  const doorH = Math.min(12, wallH - 2);
  const dx = Math.round(cx - doorW / 2);
  const dy = y + h - doorH;
  px(dx - 1, dy - 1, doorW + 2, doorH + 1, P.frame);
  px(dx, dy, doorW, doorH, '#1a2038');
  px(dx + 1, dy + 1, doorW - 2, doorH - 3, '#252c4a');
  px(dx + doorW - 3, dy + Math.floor(doorH / 2), 1, 1, '#ffd75e');
  const awX = Math.round(cx - 8);
  const awY = dy - 4;
  for (let i = 0; i < 16; i += 4) px(awX + i, awY, 2, 3, b.sign);
  px(awX, awY, 16, 1, 'rgba(255,255,255,.30)');
  px(dx - 3, y + h - 2, doorW + 6, 2, '#3c425c');
  px(dx + 1, y + h - 4, doorW - 2, 2, '#4a2f2f');

  // roof
  px(x - 2, y, w + 4, roofH + 2, b.roofDark);
  px(x, y + 1, w, roofH - 1, b.roof);
  for (let yy = y + 3; yy < y + roofH; yy += 3) {
    px(x, yy, w, 1, 'rgba(0,0,0,.18)');
    const off = (Math.floor(yy / 3) % 2) ? 3 : 0;
    for (let xx = x + off; xx < x + w; xx += 6) {
      px(xx, yy - 3, 1, 3, 'rgba(0,0,0,.10)');
    }
  }
  px(x, y, w, 1, 'rgba(255,255,255,.18)');
  px(x - 2, y, w + 4, 1, 'rgba(255,255,255,.10)');
  px(x - 2, y + roofH, w + 4, 1, 'rgba(0,0,0,.38)');

  // rooftop machinery
  px(x + 4, y + 4, 10, 6, '#3d4560');
  px(x + 5, y + 5, 8, 3, '#7d86a8');
  px(x + 6, y + 6, 2, 2, '#2a3048');
  px(x + 10, y + 6, 2, 2, '#2a3048');
  px(x + 5, y + 9, 8, 1, '#2a3048');

  px(x + w - 12, y + 4, 6, 4, '#4a5270');
  px(x + w - 11, y + 5, 4, 1, '#2a3048');
  px(x + w - 11, y + 7, 4, 1, '#2a3048');

  if (b.w >= 4 && roofH >= 18) {
    px(x + w - 22, y + 6, 1, 6, '#8a93b8');
    px(x + w - 25, y + 6, 7, 1, '#8a93b8');
    px(x + w - 24, y + 9, 5, 1, 'rgba(138,147,184,.6)');
  }
  if (roofH >= 16) {
    px(Math.round(cx + 10), y - 2, 1, 6, '#8a93b8');
    px(Math.round(cx + 8), y, 5, 1, '#8a93b8');
  }

  // sign board (home gets a porch light instead)
  if (b.id === 'home') {
    px(dx + Math.floor(doorW / 2) - 1, dy - 6, 2, 2, '#ffe9a8');
    px(dx + Math.floor(doorW / 2) - 2, dy - 4, 4, 1, 'rgba(255,233,168,.25)');
    px(dx - 1, dy - 10, doorW + 2, 3, P.frame);
    px(dx, dy - 9, doorW, 1, b.sign);
  } else {
    const sw = Math.min(w - 8, 42);
    const sx = Math.round(cx - sw / 2);
    const sy = y + roofH - 8;
    px(sx - 1, sy - 1, sw + 2, 8, 'rgba(0,0,0,.35)');
    px(sx, sy, sw, 7, b.sign);
    px(sx, sy, sw, 1, 'rgba(255,255,255,.4)');
    px(sx, sy + 6, sw, 1, 'rgba(0,0,0,.25)');
    drawSignIcon(b.id, sx + 3, sy + 1);
    for (let i = 0; i < Math.min(5, Math.floor((sw - 14) / 4)); i++) {
      px(sx + 10 + i * 4, sy + 2, 2, 3, 'rgba(255,255,255,.85)');
    }
  }

  // entrance plants / props
  if (b.id !== 'home') {
    drawPot(dx - 5, y + h - 1);
    drawPot(dx + doorW + 3, y + h - 1);
  }
}

function drawBuildingFlat(b) {
  const x = b.x * ART;
  const y = b.y * ART;
  const w = b.w * ART;
  const h = b.h * ART;
  const cx = x + w / 2;

  ctx.globalAlpha = 0.34;
  px(x + 2, y + 3, w, h, P.shadow);
  ctx.globalAlpha = 1;

  // flat roof footprint (top-down)
  px(x, y, w, h, b.roofDark);
  px(x + 1, y + 1, w - 2, h - 2, b.roof);
  for (let yy = y + 4; yy < y + h - 2; yy += 3) {
    px(x + 1, yy, w - 2, 1, 'rgba(0,0,0,.13)');
  }
  px(x + 1, y + 1, w - 2, 1, 'rgba(255,255,255,.16)');
  px(x + 1, y + 1, 1, h - 2, 'rgba(255,255,255,.08)');
  px(x + 1, y + h - 2, w - 2, 1, 'rgba(0,0,0,.30)');

  // rooftop machinery
  if (w >= 40) {
    px(x + 3, y + 3, 10, 6, '#3d4560');
    px(x + 4, y + 4, 8, 2, '#7d86a8');
  }
  if (w >= 56) {
    px(x + w - 13, y + 4, 8, 7, '#6f7899');
    px(x + w - 12, y + 5, 6, 2, '#9aa3c4');
  }
  if (b.w >= 4) {
    px(cx + 9, y + 3, 1, 5, '#8a93b8');
    px(cx + 7, y + 4, 5, 1, '#8a93b8');
  }

  // small sign strip facing the street (south edge)
  const sw = Math.min(w - 8, 42);
  const sx = Math.round(cx - sw / 2);
  const sy = y + h - 7;
  px(sx - 1, sy - 1, sw + 2, 7, 'rgba(0,0,0,.32)');
  px(sx, sy, sw, 5, b.sign);
  px(sx, sy, sw, 1, 'rgba(255,255,255,.35)');
  drawSignIcon(b.id, sx + 2, sy + 1);
  for (let i = 0; i < Math.min(4, Math.floor((sw - 12) / 4)); i++) {
    px(sx + 9 + i * 4, sy + 1, 2, 2, 'rgba(255,255,255,.85)');
  }

  // entrance step + curb shadow
  px(cx - 3, y + h, 6, 2, '#3c425c');
}

function drawHouseFlat(home) {
  const x = home.x * ART;
  const y = home.y * ART;
  const w = home.w * ART;
  const h = home.h * ART;

  ctx.globalAlpha = 0.32;
  px(x + 2, y + 3, w, h, P.shadow);
  ctx.globalAlpha = 1;

  px(x, y, w, h, home.roofDark);
  px(x + 1, y + 1, w - 2, h - 2, home.roof);

  // roof tiles: rows + ridge
  for (let yy = y + 3; yy < y + h - 2; yy += 3) {
    px(x + 1, yy, w - 2, 1, 'rgba(0,0,0,.12)');
  }
  px(x + 2, y + Math.floor(h / 2), w - 4, 1, 'rgba(255,255,255,.16)');
  px(x + 1, y + 1, w - 2, 1, 'rgba(255,255,255,.14)');
  px(x + 1, y + h - 2, w - 2, 1, 'rgba(0,0,0,.28)');

  // chimney / vent
  px(x + w - 9, y + 3, 4, 4, '#5a4a40');
  px(x + w - 8, y + 4, 2, 1, '#3a2f28');

  // doorstep + tiny front garden strip
  px(x + Math.floor(w / 2) - 3, y + h, 6, 2, '#3a2a1e');
  px(x + 2, y + h - 2, 5, 2, '#2f5a3c');
  px(x + 8, y + h - 2, 3, 1, '#3d7d4d');
}

function drawWindowArt(x, y, w, h, lit, warm) {
  px(x - 1, y - 1, w + 2, h + 2, P.frame);
  px(x, y, w, h, lit ? (warm ? P.winLit2 : P.winLit) : P.winOff);
  if (lit) {
    px(x, y, w, 1, 'rgba(255,255,255,.75)');
    px(x + 1, y + 1, 1, h - 3, 'rgba(255,255,255,.35)');
    winGlows.push([x, y, w, h]);
  } else {
    px(x, y, 1, h, 'rgba(140,190,255,.14)');
    px(x + w - 2, y + 1, 1, h - 2, 'rgba(140,190,255,.10)');
  }
  px(x + Math.floor(w / 2), y, 1, h, P.frame);
  px(x, y + Math.floor(h / 2), w, 1, P.frame);
  px(x - 1, y + h + 1, w + 2, 1, 'rgba(0,0,0,.35)');
}

function drawSignIcon(id, x, y) {
  if (id === 'hospital') {
    px(x, y + 1, 4, 2, '#fff');
    px(x + 1, y, 2, 4, '#fff');
  } else if (id === 'office') {
    px(x, y, 4, 1, '#fff');
    px(x, y + 2, 4, 3, '#fff');
    px(x + 1, y + 3, 2, 1, '#2f4bb0');
  } else if (id === 'seven') {
    px(x, y, 4, 1, '#ff9f4a');
    px(x, y + 2, 4, 1, '#6ee7a8');
    px(x, y + 4, 4, 1, '#ff5c6c');
  } else if (id === 'gym') {
    px(x, y + 2, 1, 2, '#fff');
    px(x + 3, y + 2, 1, 2, '#fff');
    px(x + 1, y + 2, 2, 1, '#fff');
  } else if (id === 'bar') {
    px(x + 1, y, 2, 4, '#fff');
    px(x + 1, y + 4, 1, 1, '#fff');
  } else if (id === 'school') {
    px(x, y, 4, 1, '#fff');
    px(x, y + 2, 4, 1, '#fff');
    px(x, y, 1, 4, '#fff');
  } else {
    px(x, y, 4, 4, '#fff');
  }
}

function drawHouseArt(h, flat) {
  if (flat) { drawHouseFlat(h); return; }
  const x = h.x * ART;
  const y = h.y * ART;
  const w = h.w * ART;
  const hh = h.h * ART;
  const wallH = clamp(Math.round(hh * 0.52), 10, 18);
  const roofH = hh - wallH;
  const wallY = y + roofH;
  const cx = x + w / 2;

  ctx.globalAlpha = 0.34;
  px(x + 2, y + 3, w, hh, P.shadow);
  ctx.globalAlpha = 1;

  // wall with siding
  px(x, wallY, w, wallH, h.roofDark);
  for (let yy = wallY + 3; yy < y + hh; yy += 3) px(x, yy, w, 1, 'rgba(0,0,0,.14)');
  px(x, wallY, w, 1, 'rgba(255,255,255,.10)');

  // windows
  for (let i = 0; i < h.w; i++) {
    if (i === Math.floor(h.w / 2)) continue;
    drawWindowArt(x + i * ART + 6, wallY + 3, 5, 4, true, false);
  }

  // door
  const dw = 6;
  const dh = Math.min(9, wallH - 1);
  const dx = Math.round(cx - dw / 2);
  const dy = y + hh - dh;
  px(dx - 1, dy - 1, dw + 2, dh + 1, P.frame);
  px(dx, dy, dw, dh, '#2a1f17');
  px(dx + 1, dy + 1, dw - 2, dh - 3, '#4a3527');
  px(dx + dw - 2, dy + Math.floor(dh / 2), 1, 1, '#ffd75e');
  px(dx - 1, y + hh - 1, dw + 2, 1, '#3a2a1e');
  drawPot(dx - 4, y + hh - 1);
  drawPot(dx + dw + 2, y + hh - 1);

  // pyramid roof
  const halfTop = Math.max(2, Math.round(w * 0.14));
  const halfBase = w / 2 + 2;
  for (let i = 0; i < roofH; i++) {
    const t = roofH > 1 ? i / (roofH - 1) : 1;
    const half = halfTop + (halfBase - halfTop) * t;
    px(cx - half, y + i, half * 2, 1, i % 3 === 0 ? h.roofDark : h.roof);
  }
  px(cx - halfTop, y, halfTop * 2, 1, 'rgba(255,255,255,.20)');
  for (let i = 2; i < roofH; i += 3) {
    const t = roofH > 1 ? i / (roofH - 1) : 1;
    const half = halfTop + (halfBase - halfTop) * t;
    for (let xx = Math.round(cx - half) + 2; xx < cx + half - 1; xx += 4) {
      px(xx, y + i, 1, 1, 'rgba(0,0,0,.14)');
    }
  }

  // chimney
  if (roofH > 8) {
    px(cx + 3, y + 3, 4, 6, '#5a4a40');
    px(cx + 3, y + 2, 4, 2, '#3a2f28');
    px(cx + 4, y + 1, 2, 1, 'rgba(180,190,210,.20)');
  }

  // fence posts + garden
  px(x - 1, y + hh - 4, 2, 4, '#3f4a3a');
  px(x + w - 1, y + hh - 4, 2, 4, '#3f4a3a');
  px(x + w - 7, y + hh - 5, 5, 5, '#2f5a3c');
  px(x + w - 6, y + hh - 6, 3, 3, '#3d7d4d');
}

/* ---------- vegetation ---------- */

function drawTreeArt(cx, cy, variant) {
  const v = variant || 0;
  const lift = v === 1 ? 5 : 0;
  const base = cy - lift;
  shadowBlob(cx, cy - 1, 16);
  px(cx - 1, base - 9, 3, 9 + lift, '#4a3524');
  px(cx, base - 9, 1, 9 + lift, '#5f4630');
  px(cx - 2, base - 2, 5, 2, '#3a2a1c');

  px(cx - 7, base - 18, 14, 4, '#26482f');
  px(cx - 9, base - 16, 18, 3, '#26482f');
  px(cx - 8, base - 14, 16, 8, '#2f5a3a');
  px(cx - 10, base - 16, 5, 6, '#2f5a3a');
  px(cx + 5, base - 16, 5, 6, '#2f5a3a');
  px(cx - 6, base - 20, 12, 4, '#377048');
  px(cx - 4, base - 22, 8, 3, '#377048');
  px(cx - 5, base - 21, 4, 2, '#468a57');
  px(cx + 1, base - 18, 3, 2, '#468a57');
  px(cx - 9, base - 14, 2, 2, '#3d7d4d');
  px(cx + 7, base - 13, 2, 2, '#3d7d4d');
  px(cx - 6, base - 11, 12, 2, '#1e3b27');

  if (v === 2) {
    [[-6, -19], [-2, -17], [3, -20], [6, -15], [-8, -13], [1, -12]].forEach(function (p) {
      px(cx + p[0], base + p[1], 1, 1, '#ff8fb1');
      px(cx + p[0] + 1, base + p[1], 1, 1, '#ffd75e');
    });
  }
}

function drawPigeonArt(x, y) {
  px(x - 2, y - 3, 3, 2, '#6d7390');
  px(x - 1, y - 4, 2, 1, '#8a93b8');
  px(x + 1, y - 4, 1, 2, '#6d7390');
  px(x + 2, y - 4, 1, 1, '#ff9f4a');
  px(x - 2, y - 1, 1, 1, '#b04158');
  px(x, y - 1, 1, 1, '#b04158');
}

function drawBushArt(x, y) {
  px(x - 4, y - 3, 8, 4, '#2a5236');
  px(x - 5, y - 2, 10, 3, '#2a5236');
  px(x - 3, y - 4, 6, 2, '#356944');
  px(x - 1, y - 5, 3, 2, '#407c4f');
  px(x + 3, y - 3, 2, 1, '#356944');
}

/* ---------- street furniture ---------- */

function drawBenchArt(x, y) {
  ctx.globalAlpha = 0.3;
  px(x - 9, y + 2, 18, 2, P.shadow);
  ctx.globalAlpha = 1;
  px(x - 9, y - 3, 18, 2, '#8a6448');
  px(x - 9, y - 1, 18, 2, '#6b4a3a');
  px(x - 8, y - 6, 16, 2, '#8a6448');
  px(x - 8, y + 1, 2, 4, '#3a2f28');
  px(x + 6, y + 1, 2, 4, '#3a2f28');
}

function drawBinArt(x, y) {
  ctx.globalAlpha = 0.3;
  px(x - 4, y + 3, 8, 2, P.shadow);
  ctx.globalAlpha = 1;
  px(x - 3, y - 4, 7, 9, '#3f6b52');
  px(x - 4, y - 6, 9, 2, '#558c6a');
  px(x - 2, y - 2, 1, 4, 'rgba(0,0,0,.18)');
  px(x + 1, y - 2, 1, 4, 'rgba(0,0,0,.18)');
}

function drawHydrantArt(x, y) {
  px(x - 2, y - 5, 4, 6, '#b04158');
  px(x - 3, y - 2, 6, 2, '#c9526a');
  px(x - 2, y - 6, 4, 2, '#8f2f44');
  px(x - 3, y + 1, 6, 1, 'rgba(0,0,0,.3)');
}

function drawManholeArt(x, y) {
  px(x - 4, y - 1, 9, 3, '#2a3048');
  px(x - 3, y - 2, 7, 1, '#2a3048');
  px(x - 3, y + 2, 7, 1, '#2a3048');
  px(x - 2, y - 1, 5, 3, '#454b63');
  px(x - 1, y, 3, 1, '#2a3048');
}

function drawScooterArt(x, y, c) {
  ctx.globalAlpha = 0.3;
  px(x - 5, y + 2, 11, 2, P.shadow);
  ctx.globalAlpha = 1;
  px(x - 4, y - 1, 3, 3, '#20263f');
  px(x + 2, y - 1, 3, 3, '#20263f');
  px(x - 4, y - 6, 8, 4, c);
  px(x - 2, y - 9, 6, 3, c);
  px(x + 2, y - 10, 2, 5, '#c9d6ff');
  px(x - 3, y - 5, 5, 1, 'rgba(255,255,255,.35)');
}

function drawBusStopArt(x, y) {
  ctx.globalAlpha = 0.3;
  px(x - 3, y - 1, 7, 2, P.shadow);
  ctx.globalAlpha = 1;
  px(x - 1, y - 17, 2, 17, '#2a3050');
  px(x - 6, y - 25, 13, 9, '#2f4bb0');
  px(x - 5, y - 24, 11, 7, '#3b5cd0');
  px(x - 1, y - 22, 5, 4, '#e8eeff');
  px(x - 3, y - 20, 1, 1, '#2f4bb0');
  px(x + 1, y - 21, 1, 1, '#2f4bb0');
  px(x - 5, y - 17, 11, 1, 'rgba(255,255,255,.35)');
}

function drawLampPost(x, y) {
  px(x - 1, y - 14, 2, 14, '#262c48');
  px(x - 1, y - 15, 5, 2, '#262c48');
  px(x + 2, y - 14, 3, 2, '#4a5270');
  px(x + 2, y - 13, 2, 1, '#ffe9a8');
}

function drawPowerLine() {
  const poles = [
    [3.2, 7.9], [10.5, 7.9], [21.5, 7.9], [34.5, 7.9],
    [10.5, 22.9], [21.5, 22.9], [34.5, 22.9]
  ];
  poles.forEach(function (p) {
    const x = p[0] * ART;
    const y = p[1] * ART;
    px(x - 1, y - 21, 2, 21, '#3a3550');
    px(x - 3, y - 20, 7, 1, '#4a4568');
    px(x - 3, y - 17, 7, 1, '#4a4568');
    px(x - 3, y - 21, 1, 2, '#6a6488');
    px(x + 3, y - 21, 1, 2, '#6a6488');
  });
  // wires with a gentle sag
  drawWire(3.2 * ART, 7.9 * ART - 20, 10.5 * ART, 7.9 * ART - 20, 3);
  drawWire(10.5 * ART, 7.9 * ART - 20, 21.5 * ART, 7.9 * ART - 20, 4);
  drawWire(21.5 * ART, 7.9 * ART - 20, 34.5 * ART, 7.9 * ART - 20, 4);
  drawWire(10.5 * ART, 7.9 * ART - 17, 21.5 * ART, 7.9 * ART - 17, 3);
  drawWire(21.5 * ART, 7.9 * ART - 17, 34.5 * ART, 7.9 * ART - 17, 3);
  drawWire(10.5 * ART, 22.9 * ART - 20, 21.5 * ART, 22.9 * ART - 20, 4);
  drawWire(21.5 * ART, 22.9 * ART - 20, 34.5 * ART, 22.9 * ART - 20, 4);
}

function drawWire(x1, y1, x2, y2, sag) {
  for (let x = x1; x <= x2; x++) {
    const t = (x - x1) / Math.max(1, x2 - x1);
    const y = Math.round(y1 + (y2 - y1) * t + sag * 4 * t * (1 - t));
    px(x, y, 1, 1, 'rgba(8,12,26,.75)');
  }
}

function drawVendingArt(x, y) {
  ctx.globalAlpha = 0.3;
  px(x - 3, y, 9, 2, P.shadow);
  ctx.globalAlpha = 1;
  px(x - 4, y - 14, 9, 14, '#39415e');
  px(x - 3, y - 13, 7, 6, '#7dd3fc');
  px(x - 2, y - 9, 2, 1, '#ff8fb1');
  px(x + 1, y - 9, 2, 1, '#ffd75e');
  px(x - 2, y - 7, 2, 1, '#6ee7a8');
  px(x + 1, y - 7, 2, 1, '#e8eeff');
  px(x - 3, y - 5, 7, 3, '#2a3050');
  px(x - 1, y - 2, 3, 1, '#12162c');
}

function drawTrafficLight(x, y) {
  px(x - 1, y - 16, 2, 16, '#2a3050');
  px(x - 3, y - 22, 6, 10, '#1a2038');
  px(x - 2, y - 21, 4, 2, '#ff5c6c');
  px(x - 2, y - 18, 4, 2, '#5a5020');
  px(x - 2, y - 15, 4, 2, '#204a30');
  px(x - 1, y - 4, 3, 2, '#1a2038');
}

function drawPuddle(x, y, w, h) {
  px(x, y, w, h, 'rgba(70,110,150,.45)');
  px(x + 1, y - 1, w - 2, 1, 'rgba(70,110,150,.35)');
  px(x + 2, y + h, w - 4, 1, 'rgba(70,110,150,.3)');
  px(x + 2, y, Math.max(2, w - 6), 1, 'rgba(160,210,240,.25)');
}

function drawDrainArt(x, y) {
  px(x - 3, y - 1, 7, 3, '#22283c');
  px(x - 2, y, 5, 1, '#4a5370');
  px(x - 3, y, 1, 1, '#4a5370');
  px(x + 3, y, 1, 1, '#4a5370');
}

function drawPot(x, y) {
  px(x - 2, y - 4, 4, 4, '#7a4a3a');
  px(x - 3, y - 5, 6, 1, '#8f5a46');
  px(x - 2, y - 8, 3, 3, '#2f5a3a');
  px(x, y - 9, 2, 2, '#3d7d4d');
}

function drawLitter(x, y) {
  px(x, y, 2, 1, '#c9d6ff');
  px(x + 1, y + 1, 1, 1, '#9aa3c4');
}

function drawBags(x, y) {
  px(x - 3, y - 3, 5, 4, '#5a5f75');
  px(x - 2, y - 4, 3, 1, '#6d7390');
  px(x + 2, y - 2, 3, 3, '#4a4f64');
}

function drawMailbox(x, y) {
  px(x - 1, y - 6, 1, 6, '#3a3550');
  px(x - 3, y - 10, 6, 4, '#b04158');
  px(x - 2, y - 9, 4, 1, '#e85c6c');
}

function drawBikeArt(x, y) {
  px(x - 4, y - 3, 3, 3, '#2a3050');
  px(x + 2, y - 3, 3, 3, '#2a3050');
  px(x - 2, y - 4, 4, 1, '#7dd3fc');
  px(x - 4, y - 5, 1, 2, '#7dd3fc');
  px(x + 3, y - 5, 1, 2, '#7dd3fc');
  px(x - 1, y - 5, 3, 1, '#7dd3fc');
}

function drawVendorArt(x, y) {
  ctx.globalAlpha = 0.3;
  px(x - 10, y + 1, 20, 2, P.shadow);
  ctx.globalAlpha = 1;
  px(x - 9, y - 7, 18, 8, '#8a6448');
  px(x - 9, y - 9, 18, 3, '#a67c5a');
  px(x - 8, y - 6, 16, 1, 'rgba(0,0,0,.18)');
  px(x - 8, y + 1, 2, 3, '#2a3050');
  px(x + 6, y + 1, 2, 3, '#2a3050');
  px(x - 1, y - 20, 2, 12, '#2a3050');
  // striped umbrella
  for (let i = 0; i < 14; i++) {
    px(x - 14 + i * 2, y - 22, 2, 1, i % 2 ? '#ffd75e' : '#e85c6c');
  }
  for (let i = 0; i < 7; i++) {
    px(x - 12 + i * 2, y - 21, 2, 1, i % 2 ? '#e85c6c' : '#ffd75e');
  }
  // goods
  px(x - 7, y - 11, 3, 2, '#6ee7a8');
  px(x - 3, y - 11, 3, 2, '#ff8fb1');
  px(x + 1, y - 11, 3, 2, '#7dd3fc');
}

/* ==========================================================
   CITY — DYNAMIC ART
   ========================================================== */

function drawCityDynamic(flat) {
  drawPondRipples();
  if (!flat) drawWindowGlow();
  drawLampGlow();
  cars.forEach(drawCarArt);
  peds.forEach(drawPedArt);
}

function drawPondRipples() {
  const x = POND.x * ART;
  const y = POND.y * ART;
  for (let i = 0; i < 3; i++) {
    const yy = y + 9 + i * 7 + Math.round(Math.sin(anim * 1.4 + i) * 1);
    px(x + 6 + i * 8, yy, 12 - i * 2, 1, 'rgba(160,225,255,.35)');
  }
}

function drawWindowGlow() {
  const l = lightState();
  const night = l[1];
  if (night <= 0.15) return;
  ctx.globalAlpha = Math.min(0.85, night * 1.15);
  winGlows.forEach(function (g) {
    px(g[0] + 1, g[1] + 1, g[2] - 2, g[3] - 2, 'rgba(255,226,160,.5)');
    px(g[0] + Math.floor(g[2] / 2) - 1, g[1] + 1, 2, 2, '#fff2c0');
  });
  ctx.globalAlpha = 1;
}

function drawGlowPool(x, y, rx, ry, color, alpha) {
  for (let i = 0; i < ry; i++) {
    const t = i / ry;
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
    ctx.globalAlpha = alpha * (1 - t);
    px(x - w, y + i, w * 2, 1, color);
  }
  ctx.globalAlpha = 1;
}

function drawLampGlow() {
  const l = lightState();
  const night = l[1];
  if (night <= 0.15) return;
  LIGHTS.forEach(function (pt) {
    const x = Math.round(pt[0] * ART);
    const y = Math.round(pt[1] * ART);
    ctx.globalAlpha = Math.min(0.55, night * 0.8);
    px(x + 2, y - 14, 3, 3, '#ffe9a8');
    ctx.globalAlpha = 1;
    drawGlowPool(x + 2, y - 2, 15, 7, '#ffe9a8', Math.min(0.20, night * 0.3));
  });
}

function drawCarArt(c) {
  const x = Math.round(c.x / W2A);
  const y = Math.round(c.y / W2A);
  ctx.globalAlpha = 0.32;
  if (c.axis === 'h') px(x - 9, y - 1, 20, 3, P.shadow);
  else px(x - 3, y - 9, 3, 20, P.shadow);
  ctx.globalAlpha = 1;

  if (c.axis === 'h') {
    px(x - 10, y - 4, 20, 7, c.color);
    px(x - 10, y - 4, 20, 1, 'rgba(255,255,255,.30)');
    px(x - 10, y + 2, 20, 1, 'rgba(0,0,0,.25)');
    px(x - 5, y - 6, 10, 4, '#1a2038');
    px(x - 4, y - 5, 8, 2, '#7dd3fc');
    px(x - 8, y + 1, 2, 2, '#12162c');
    px(x + 6, y + 1, 2, 2, '#12162c');
    if (c.dir > 0) {
      px(x + 9, y - 3, 1, 2, '#fff2b0');
      px(x - 10, y - 3, 1, 2, '#ff5c6c');
    } else {
      px(x - 10, y - 3, 1, 2, '#fff2b0');
      px(x + 9, y - 3, 1, 2, '#ff5c6c');
    }
  } else {
    px(x - 4, y - 10, 7, 20, c.color);
    px(x - 4, y - 10, 1, 20, 'rgba(255,255,255,.30)');
    px(x + 2, y - 10, 1, 20, 'rgba(0,0,0,.25)');
    px(x - 6, y - 5, 4, 10, '#1a2038');
    px(x - 5, y - 4, 2, 8, '#7dd3fc');
    px(x - 4, y - 8, 2, 2, '#12162c');
    px(x + 1, y + 6, 2, 2, '#12162c');
    if (c.dir > 0) {
      px(x - 3, y + 9, 2, 1, '#fff2b0');
      px(x - 3, y - 10, 2, 1, '#ff5c6c');
    } else {
      px(x - 3, y - 10, 2, 1, '#fff2b0');
      px(x - 3, y + 9, 2, 1, '#ff5c6c');
    }
  }
}

function drawPedArt(p) {
  const x = Math.round(p.x / W2A);
  const y = Math.round(p.y / W2A);
  const bob = Math.sin(p.phase) > 0 ? 1 : 0;
  shadowBlob(x, y - 1, 8);

  px(x - 2, y - 6 + bob, 2, 6, '#20263f');
  px(x + 1, y - 6 - bob, 2, 6, '#20263f');
  px(x - 3, y - 13 + bob, 6, 7, p.color);
  px(x - 3, y - 13 + bob, 6, 1, 'rgba(255,255,255,.2)');
  px(x - 4, y - 12 + bob, 1, 4, p.color);
  px(x + 3, y - 12 + bob, 1, 4, p.color);
  px(x - 3, y - 18 + bob, 6, 5, '#f0c9a0');
  px(x - 3, y - 19 + bob, 6, 2, '#161a2e');
  if (p.dir >= 0) px(x + 1, y - 16 + bob, 1, 1, '#12142a');
  else px(x - 2, y - 16 + bob, 1, 1, '#12142a');
  // shoulder bag
  px(x - (p.dir >= 0 ? 5 : 4), y - 11 + bob, 2, 4, '#4a5270');
}

function drawPlayerArt() {
  const x = Math.round(player.x / W2A);
  const y = Math.round(player.y / W2A);
  const moving = player.moving;
  const s = moving ? (Math.sin(player.frame * 3) > 0 ? 1 : -1) : 0;
  const bob = moving ? (Math.abs(Math.sin(player.frame * 3)) > 0.7 ? 1 : 0) : 0;

  shadowBlob(x, y - 1, 10);

  // legs
  px(x - 3 + s, y - 5, 2, 5, '#1b2340');
  px(x + 1 - s, y - 5, 2, 5, '#1b2340');
  px(x - 4 + s, y - 1, 3, 1, '#0f1428');
  px(x + 1 - s, y - 1, 3, 1, '#0f1428');

  // body
  px(x - 4, y - 13 + bob, 8, 8, '#e8eefc');
  px(x - 4, y - 13 + bob, 8, 1, '#b9c6f5');
  px(x - 4, y - 13 + bob, 1, 8, '#cfd8f2');
  px(x + 3, y - 13 + bob, 1, 8, '#cfd8f2');
  px(x - 5, y - 12 + bob, 1, 4, '#dfe6f8');
  px(x + 4, y - 12 + bob, 1, 4, '#dfe6f8');
  px(x - 1, y - 12 + bob, 2, 5, '#e23a50');
  px(x - 1, y - 7 + bob, 2, 1, '#c22a40');

  // head
  px(x - 3, y - 19 + bob, 6, 6, '#f0c9a0');
  px(x - 4, y - 21 + bob, 8, 3, '#161a2e');
  px(x - 4, y - 19 + bob, 1, 4, '#161a2e');
  px(x + 3, y - 19 + bob, 1, 4, '#161a2e');
  if (player.dir === 'up') px(x - 4, y - 17 + bob, 8, 4, '#161a2e');

  if (player.dir === 'down') {
    px(x - 2, y - 16 + bob, 1, 1, '#12142a');
    px(x + 1, y - 16 + bob, 1, 1, '#12142a');
  } else if (player.dir === 'left') {
    px(x - 3, y - 16 + bob, 1, 1, '#12142a');
  } else if (player.dir === 'right') {
    px(x + 2, y - 16 + bob, 1, 1, '#12142a');
  }
}

function drawMapMarker() {
  const x = Math.round(player.x / W2A);
  const y = Math.round(player.y / W2A);
  const pulse = (Math.sin(anim * 2.4) + 1) / 2;

  ctx.globalAlpha = 0.16 + pulse * 0.10;
  px(x - 5, y - 2, 11, 4, '#050817');
  ctx.globalAlpha = 1;

  // locator ring
  px(x - 3, y - 13, 7, 1, '#ffd75e');
  px(x - 3, y - 4, 7, 1, '#ffd75e');
  px(x - 5, y - 11, 1, 7, '#ffd75e');
  px(x + 5, y - 11, 1, 7, '#ffd75e');

  // tiny character head
  px(x - 2, y - 9, 5, 5, '#f0c9a0');
  px(x - 2, y - 10, 5, 2, '#161a2e');
  px(x - 1, y - 8, 1, 1, '#12142a');
  px(x + 1, y - 8, 1, 1, '#12142a');
  px(x - 2, y - 4, 5, 3, '#e8eefc');
  px(x - 1, y - 3, 2, 2, '#e23a50');
}

/* ---------- district labels (DOM overlay, crisp text) ---------- */

const MAP_LABELS = [
  { x: 6.2, y: 11.3, text: 'บางรัก' },
  { x: 18.6, y: 7.7, text: 'สีลม' },
  { x: 8.6, y: 9.3, text: 'สามย่าน' },
  { x: 35.0, y: 6.9, text: 'จุฬาฯ' },
  { x: 6.6, y: 22.8, text: 'สวนลุมพินี' },
  { x: 25.4, y: 26.7, text: 'เยาวราช' },
  { x: 36.4, y: 18.5, text: 'คลองเตย' }
];
let mapLabelEls = [];

function buildMapLabels() {
  const wrap = document.getElementById('mapLabels');
  if (!wrap) return;
  wrap.innerHTML = '';
  mapLabelEls = MAP_LABELS.map(function (l) {
    const d = document.createElement('div');
    d.className = 'map-label';
    d.textContent = l.text;
    wrap.appendChild(d);
    return d;
  });
}

function layoutMapLabels(show) {
  const wrap = document.getElementById('mapLabels');
  if (!wrap) return;
  if (!show) {
    wrap.classList.add('hidden');
    return;
  }
  wrap.classList.remove('hidden');
  const offX = (CITY_AW - AW) / 2;
  const offY = (CITY_AH - AH) / 2;
  MAP_LABELS.forEach(function (l, i) {
    const el = mapLabelEls[i];
    if (!el) return;
    el.style.left = Math.round((l.x * ART - offX) * PIX) + 'px';
    el.style.top = Math.round((l.y * ART - offY) * PIX) + 'px';
  });
}

/* ==========================================================
   INTERIORS
   ========================================================== */

function buildOfficeArt() {
  const W = OFFICE_AW;
  const H = OFFICE_AH;

  // carpet
  px(0, 0, W, H, '#2a3150');
  for (let y = 16; y < H - 16; y += 4) {
    for (let x = 16; x < W - 16; x += 4) {
      if ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0) px(x, y, 3, 3, '#2f3759');
    }
  }
  // coffee stain
  px(7 * ART, 7 * ART, 5, 3, 'rgba(60,40,40,.25)');

  // walls
  px(0, 0, W, 16, '#151b36');
  px(0, H - 16, W, 16, '#151b36');
  px(0, 0, 16, H, '#151b36');
  px(W - 16, 0, 16, H, '#151b36');
  px(16, 14, W - 32, 2, '#232b52');
  px(16, H - 18, W - 32, 2, '#0e1430');

  // windows with town silhouette
  for (let i = 2; i < OFFICE.w - 2; i += 3) {
    const wx = i * ART + 2;
    const wy = 3;
    px(wx - 1, wy - 1, 12, 11, '#0f1428');
    px(wx, wy, 10, 9, '#0b1630');
    px(wx + 1, wy + 1, 8, 7, '#18294f');
    px(wx + 1, wy + 5, 2, 3, '#0d1934');
    px(wx + 4, wy + 4, 2, 4, '#0d1934');
    px(wx + 7, wy + 3, 2, 5, '#0d1934');
    if (i % 2) {
      px(wx + 2, wy + 2, 1, 1, '#c9d6ff');
      px(wx + 6, wy + 2, 1, 1, '#c9d6ff');
    }
    px(wx - 1, wy + 9, 12, 1, '#0f1428');
  }

  // ceiling light panels (inside the room)
  [3, 9, 15].forEach(function (c) {
    const lx = c * ART + 1;
    px(lx - 1, 21, 15, 6, '#10152a');
    px(lx, 22, 13, 4, '#e8eeff');
    px(lx + 1, 23, 11, 2, '#fff7d8');
    ctx.globalAlpha = 0.06;
    px(lx - 4, 26, 21, 5, '#fff3c4');
    ctx.globalAlpha = 1;
  });

  // clock
  px(W - 34, 4, 8, 8, '#0f1428');
  px(W - 33, 5, 6, 6, '#e8eeff');
  px(W - 30, 6, 1, 3, '#1a2038');
  px(W - 30, 8, 2, 1, '#1a2038');

  // door
  px(9 * ART, H - 16, 16, 16, '#2a3150');
  px(9 * ART + 3, H - 16 + 2, 10, 14, '#1a2038');
  px(9 * ART + 4, H - 16 + 3, 8, 11, '#38456b');
  px(9 * ART + 10, H - 16 + 8, 1, 1, '#ffd75e');
  px(9 * ART + 2, H - 3, 12, 2, '#0e1430');

  // desks
  DESKS.forEach(function (d) {
    const x = d[0] * ART;
    const y = d[1] * ART;
    ctx.globalAlpha = 0.3;
    px(x + 2, y + 18, 34, 4, P.shadow);
    ctx.globalAlpha = 1;

    px(x + 1, y + 8, 30, 10, '#6b4a3a');
    px(x + 1, y + 8, 30, 2, '#8a6448');
    px(x + 2, y + 18, 2, 4, '#4a3226');
    px(x + 28, y + 18, 2, 4, '#4a3226');

    // monitor + chart
    px(x + 9, y - 2, 12, 9, '#12162c');
    px(x + 10, y - 1, 10, 7, '#16324a');
    px(x + 11, y + 2, 2, 3, '#7dd3fc');
    px(x + 14, y + 1, 2, 4, '#6ee7a8');
    px(x + 17, y + 3, 2, 2, '#ffd75e');
    px(x + 14, y + 7, 2, 2, '#12162c');

    // keyboard + mug + papers
    px(x + 9, y + 12, 12, 3, '#2a3050');
    px(x + 10, y + 13, 10, 1, '#0e1430');
    px(x + 23, y + 11, 3, 3, '#ffd75e');
    px(x + 26, y + 12, 1, 1, '#ffd75e');
    px(x + 2, y + 13, 4, 2, '#dce4ff');

    // chair
    px(x + 9, y + 22, 12, 4, '#2a3050');
    px(x + 8, y + 26, 14, 3, '#232b52');
    px(x + 13, y + 29, 4, 1, '#12162c');
  });

  // whiteboard / notice board on the right wall
  px(W - 17, 30, 2, 24, '#39304a');
  px(W - 19, 32, 1, 20, '#e8eeff');
  px(W - 19, 36, 1, 1, '#ff8fb1');
  px(W - 19, 40, 1, 1, '#7dd3fc');

  // water cooler
  px(15 * ART, 4 * ART + 2, 9, 14, '#39415e');
  px(15 * ART + 1, 4 * ART - 6, 7, 9, '#7dd3fc');
  px(15 * ART + 2, 4 * ART - 4, 5, 5, '#c9e9ff');
  px(15 * ART + 1, 4 * ART + 14, 7, 2, '#2a3050');

  // filing cabinets along the right wall
  px(257, 32, 13, 26, '#39415e');
  px(258, 33, 11, 7, '#4a5270');
  px(258, 41, 11, 7, '#4a5270');
  px(258, 49, 11, 6, '#4a5270');
  px(262, 45, 2, 1, '#ffd75e');
  px(262, 53, 2, 1, '#ffd75e');

  // meeting table + chairs
  px(96, 100, 48, 16, '#6b4a3a');
  px(96, 100, 48, 3, '#8a6448');
  px(98, 116, 3, 6, '#4a3226');
  px(139, 116, 3, 6, '#4a3226');
  px(104, 90, 10, 6, '#2a3050');
  px(106, 88, 6, 3, '#39415e');
  px(122, 90, 10, 6, '#2a3050');
  px(124, 88, 6, 3, '#39415e');
  px(108, 120, 10, 5, '#2a3050');
  px(122, 120, 10, 5, '#2a3050');
  px(102, 104, 7, 4, '#dce4ff');
  px(124, 105, 5, 3, '#e8eeff');
  px(132, 103, 3, 3, '#ffd75e');
  px(136, 104, 1, 1, '#ffd75e');

  // coat rack near the door
  px(163, 136, 2, 20, '#3a2f28');
  px(158, 136, 12, 2, '#4a3f36');
  px(160, 138, 2, 7, '#7dd3fc');
  px(166, 138, 2, 5, '#ff8fb1');

  // cardboard boxes
  px(252, 146, 8, 8, '#8a6448');
  px(253, 147, 6, 2, '#a67c5a');
  px(254, 150, 4, 1, '#6b4a3a');

  // plants
  [[2, 2], [16, 8], [2, 8]].forEach(function (p) {
    const x = p[0] * ART;
    const y = p[1] * ART;
    px(x + 1, y + 8, 6, 5, '#5a4433');
    px(x + 2, y + 3, 4, 5, '#2f5a3a');
    px(x + 1, y + 4, 2, 3, '#3d7d4d');
    px(x + 5, y + 5, 2, 2, '#3d7d4d');
  });

  // printer + paper stacks
  px(16 * ART + 4, 6 * ART, 10, 8, '#4a5270');
  px(16 * ART + 5, 6 * ART + 1, 8, 2, '#dce4ff');
  px(16 * ART + 5, 6 * ART + 5, 8, 2, '#2a3048');
  px(13 * ART, 8 * ART + 4, 6, 3, '#dce4ff');
  px(13 * ART + 1, 8 * ART + 3, 5, 1, '#e8eeff');
}

function buildHomeArt() {
  const W = HOME_AW;
  const H = HOME_AH;

  // wooden floor — long planks with staggered joints
  px(0, 0, W, H, '#4a3a2c');
  for (let y = 16; y < H - 16; y += 6) {
    px(16, y, W - 32, 1, 'rgba(0,0,0,.22)');
    px(16, y + 1, W - 32, 1, 'rgba(255,255,255,.035)');
    const off = (Math.floor(y / 6) % 2) ? 16 : 0;
    for (let x = 16 + off; x < W - 16; x += 32) {
      px(x, y, 1, 6, 'rgba(0,0,0,.16)');
    }
    for (let x = 20 + off; x < W - 20; x += 11) {
      px(x, y + 3, 4, 1, 'rgba(0,0,0,.07)');
    }
  }
  px(0, 0, W, H, 'rgba(80,52,30,.10)');

  // walls (darker + wallpaper stripes + baseboard)
  px(0, 0, W, 16, '#2e2118');
  px(0, H - 16, W, 16, '#2e2118');
  px(0, 0, 16, H, '#2e2118');
  px(W - 16, 0, 16, H, '#2e2118');
  for (let x = 18; x < W - 18; x += 8) px(x, 1, 3, 13, 'rgba(255,255,255,.035)');
  px(16, 14, W - 32, 2, '#6b5240');
  px(16, H - 18, W - 32, 2, '#6b5240');
  px(14, 16, 2, H - 32, '#6b5240');
  px(W - 18, 16, 2, H - 32, '#6b5240');
  px(16, 16, W - 32, 1, 'rgba(0,0,0,.35)');
  px(16, H - 18, W - 32, 1, 'rgba(0,0,0,.35)');

  // window with curtains
  const wx = 9 * ART + 2;
  px(wx - 3, 2, 16, 12, '#2a1f18');
  px(wx - 2, 3, 14, 10, '#8a4a5a');
  px(wx, 4, 10, 8, '#0b1a36');
  px(wx + 1, 5, 8, 6, '#1b2b52');
  px(wx + 3, 6, 1, 1, '#ffe9a8');
  px(wx + 7, 8, 1, 1, '#ffe9a8');
  px(wx + 5, 4, 1, 8, '#0b1a36');
  px(wx - 3, 3, 2, 10, '#a05a70');
  px(wx + 11, 3, 2, 10, '#a05a70');
  px(wx - 4, 2, 18, 1, '#5a4433');

  // door
  px(7 * ART, H - 16, 16, 16, '#4a3a2c');
  px(7 * ART + 3, H - 16 + 2, 10, 14, '#543c2a');
  px(7 * ART + 4, H - 16 + 3, 8, 11, '#6b4f36');
  px(7 * ART + 10, H - 16 + 8, 1, 1, '#ffd75e');
  px(7 * ART + 2, H - 3, 12, 2, '#2a1f18');

  // rug
  px(5 * ART, 4 * ART, 4 * ART, 2 * ART, '#7a3f58');
  px(5 * ART + 2, 4 * ART + 2, 4 * ART - 4, 2 * ART - 4, '#8f4a66');
  for (let i = 0; i < 5; i++) {
    px(5 * ART + 8 + i * 12, 4 * ART + 8, 4, 4, '#a05a78');
    px(5 * ART + 12 + i * 12, 4 * ART + 16, 4, 4, '#a05a78');
  }
  px(5 * ART + 2, 4 * ART + 2, 4 * ART - 4, 1, 'rgba(255,255,255,.12)');

  // bed
  const bx = 2 * ART;
  const by = 2 * ART;
  px(bx - 2, by - 3, 36, 3, '#5a4433');
  px(bx - 2, by - 3, 3, 36, '#5a4433');
  px(bx, by, 32, 32, '#c9d6ff');
  px(bx + 1, by + 1, 30, 9, '#e8eefc');
  px(bx + 3, by + 2, 26, 6, '#f4f7ff');
  px(bx, by + 12, 32, 20, '#ff8fb1');
  for (let i = 0; i < 3; i++) px(bx + 3 + i * 10, by + 14, 6, 16, '#ff9fbf');
  px(bx, by + 11, 32, 1, '#c95a7f');
  px(bx - 1, by + 31, 34, 2, '#3a2a1e');

  // TV + stand
  px(6 * ART, 1 * ART + 6, 32, 10, '#2a3050');
  px(6 * ART + 2, 1 * ART + 8, 28, 6, '#12162c');
  px(6 * ART + 4, 1 * ART + 9, 24, 4, '#7dd3fc');
  px(6 * ART + 6, 1 * ART + 10, 3, 2, '#c9e9ff');
  px(6 * ART + 4, 1 * ART + 16, 3, 3, '#1a2038');
  px(6 * ART + 25, 1 * ART + 16, 3, 3, '#1a2038');

  // sofa
  px(9 * ART, 5 * ART + 4, 32, 12, '#4a5a7a');
  px(9 * ART + 1, 5 * ART + 5, 30, 5, '#5a6e8f');
  px(9 * ART + 3, 5 * ART + 10, 12, 5, '#63789b');
  px(9 * ART + 17, 5 * ART + 10, 12, 5, '#63789b');
  px(9 * ART - 1, 5 * ART + 4, 2, 12, '#3a4a66');
  px(9 * ART + 31, 5 * ART + 4, 2, 12, '#3a4a66');
  px(9 * ART + 2, 5 * ART + 16, 2, 2, '#2a3048');
  px(9 * ART + 28, 5 * ART + 16, 2, 2, '#2a3048');

  // coffee table
  px(8 * ART + 6, 6 * ART + 10, 20, 6, '#6b4a3a');
  px(8 * ART + 6, 6 * ART + 10, 20, 2, '#8a6448');
  px(8 * ART + 8, 6 * ART + 16, 2, 3, '#4a3226');
  px(8 * ART + 22, 6 * ART + 16, 2, 3, '#4a3226');
  px(8 * ART + 12, 6 * ART + 11, 4, 1, '#dce4ff');

  // kitchen counter + sink + stove
  px(10 * ART, 2 * ART, 3 * ART, 12, '#5a4433');
  px(10 * ART, 2 * ART, 3 * ART, 3, '#8a6448');
  px(11 * ART, 2 * ART + 4, 10, 4, '#39415e');
  px(11 * ART + 2, 2 * ART + 5, 6, 2, '#7dd3fc');
  px(12 * ART + 4, 2 * ART + 4, 8, 4, '#2a3048');
  px(12 * ART + 6, 2 * ART + 6, 4, 1, '#ff5c6c');
  px(11 * ART, 2 * ART + 8, 2, 2, '#a3abcd');
  px(10 * ART + 4, 2 * ART + 12, 8, 1, 'rgba(0,0,0,.2)');

  // fridge with magnets
  px(13 * ART + 2, 2 * ART + 2, 12, 24, '#8a93b8');
  px(13 * ART + 3, 2 * ART + 3, 10, 9, '#a3abcd');
  px(13 * ART + 3, 2 * ART + 13, 10, 11, '#a3abcd');
  px(13 * ART + 11, 2 * ART + 6, 1, 5, '#39415e');
  px(13 * ART + 5, 2 * ART + 14, 1, 1, '#ffd75e');
  px(13 * ART + 8, 2 * ART + 16, 1, 1, '#ff8fb1');
  px(13 * ART + 6, 2 * ART + 19, 2, 1, '#6ee7a8');

  // wall art
  px(3 * ART + 2, 3, 12, 10, '#5a4433');
  px(3 * ART + 3, 4, 10, 8, '#2f5a3a');
  px(3 * ART + 4, 5, 3, 5, '#6b4a3a');
  px(3 * ART + 8, 8, 4, 2, '#3d7d4d');

  // bookshelf
  px(17, 92, 18, 34, '#3a2a1e');
  px(18, 93, 16, 32, '#241a12');
  for (let s = 0; s < 3; s++) {
    px(18, 98 + s * 10, 16, 1, '#5a4433');
    for (let b = 0; b < 4; b++) {
      px(19 + b * 4, 94 + s * 10, 2, 4, ['#ff8fb1', '#7dd3fc', '#ffd75e', '#6ee7a8'][(b + s) % 4]);
    }
  }

  // floor lamp beside the sofa
  px(134, 84, 6, 2, '#2a3050');
  px(136, 72, 1, 12, '#2a3050');
  px(133, 68, 7, 4, '#d8a63a');
  px(134, 69, 5, 2, '#ffe9a8');
  ctx.globalAlpha = 0.18;
  px(131, 74, 11, 8, '#ffe9a8');
  ctx.globalAlpha = 1;

  // plant
  px(W - 30, H - 32, 6, 5, '#5a4433');
  px(W - 29, H - 38, 4, 6, '#2f5a3a');
  px(W - 31, H - 36, 2, 4, '#3d7d4d');
}

function drawOfficeDynamic() {
  const t = (Math.sin(anim * 2.2) + 1) / 2;
  ctx.globalAlpha = 0.05 + t * 0.04;
  px(2 * ART, 16, 3 * ART, 6, '#fff3c4');
  ctx.globalAlpha = 1;
}

function drawHomeDynamic() {
  const t = (Math.sin(anim * 5.3) + Math.sin(anim * 2.1)) * 0.5;
  ctx.globalAlpha = 0.10 + (t + 1) * 0.05;
  px(6 * ART + 4, 1 * ART + 9, 24, 4, '#7dd3fc');
  ctx.globalAlpha = 1;
}

/* ==========================================================
   LIGHTING
   ========================================================== */

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
  const indoor = scene !== 'city' ? 0.4 : 1;
  if (l[1] > 0.01) {
    ctx.globalAlpha = l[1] * indoor;
    px(0, 0, AW, AH, l[0]);
    ctx.globalAlpha = 1;
  }
  const g = ctx.createRadialGradient(AW / 2, AH / 2, AH * 0.30, AW / 2, AH / 2, AH * 0.85);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.72, 'rgba(0,0,0,.10)');
  g.addColorStop(1, 'rgba(0,0,0,.46)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, AW, AH);
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
    // viewport (not meaningful in the zoomed-out map view)
    if (viewMode !== 'map') {
      c.strokeStyle = 'rgba(232,238,255,.5)';
      c.lineWidth = 1;
      c.strokeRect(cam.x / TILE * s, cam.y / TILE * s, VW / TILE * s, VH / TILE * s);
    }
  } else {
    const info = sceneInfo[scene];
    const pad = 8;
    const mw = MW - pad * 2;
    const mh = MH - 20;
    const sx = mw / info.w;
    const sy = mh / info.h;
    const tx = function (v) { return pad + v * sx; };
    const ty = function (v) { return 8 + v * sy; };

    c.fillStyle = '#0b1030';
    c.fillRect(0, 0, MW, MH);
    c.fillStyle = '#232b52';
    c.fillRect(pad, 8, mw, mh);
    c.fillStyle = '#2b3352';
    c.fillRect(pad + 2, 10, mw - 4, mh - 4);
    c.strokeStyle = '#39415e';
    c.lineWidth = 2;
    c.strokeRect(pad + 1, 9, mw - 2, mh - 2);

    if (scene === 'office') {
      c.fillStyle = '#6b4a3a';
      DESKS.forEach(function (d) {
        c.fillRect(tx(d[0] * TILE), ty((d[1] + 0.9) * TILE), 2 * TILE * sx, 10);
      });
      c.fillRect(tx(6 * TILE), ty(6.4 * TILE), 3 * TILE * sx, 12);
      c.fillStyle = '#7dd3fc';
      c.fillRect(tx(15 * TILE), ty(4 * TILE), 6, 8);
      c.fillStyle = '#ffd75e';
      c.fillRect(tx(9 * TILE) + 2, ty(10.5 * TILE), 8, 4);
    } else {
      c.fillStyle = '#c9d6ff';
      c.fillRect(tx(2 * TILE), ty(2 * TILE), 2 * TILE * sx, 2 * TILE * sy);
      c.fillStyle = '#ff8fb1';
      c.fillRect(tx(2 * TILE), ty(3 * TILE), 2 * TILE * sx, 1 * TILE * sy);
      c.fillStyle = '#7a3f58';
      c.fillRect(tx(5 * TILE), ty(4 * TILE), 4 * TILE * sx, 2 * TILE * sy);
      c.fillStyle = '#4a5a7a';
      c.fillRect(tx(9 * TILE), ty(5 * TILE), 2 * TILE * sx, 1 * TILE * sy);
      c.fillStyle = '#8a6448';
      c.fillRect(tx(10 * TILE), ty(2 * TILE), 3 * TILE * sx, 12);
      c.fillStyle = '#a3abcd';
      c.fillRect(tx(13 * TILE), ty(2 * TILE), 12, 20);
      c.fillStyle = '#ffd75e';
      c.fillRect(tx(7 * TILE) + 2, ty(8.6 * TILE), 8, 4);
    }

    c.fillStyle = '#ffd75e';
    c.fillRect(tx(player.x) - 2, ty(player.y) - 2, 4, 4);
  }
}

/* ---------- main render ---------- */

function render() {
  const mapView = scene === 'city' && viewMode === 'map';
  setPixelScale(mapView ? MAP_PIX : STREET_PIX);

  ctx = bctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  px(0, 0, AW, AH, mapView ? '#101c14' : '#080d22');

  let camAx;
  let camAy;
  if (mapView) {
    camAx = Math.round((CITY_AW - AW) / 2);
    camAy = Math.round((CITY_AH - AH) / 2);
  } else {
    camAx = Math.round(cam.x / W2A);
    camAy = Math.round(cam.y / W2A);
  }

  ctx.save();
  ctx.translate(-camAx, -camAy);

  if (scene === 'city') {
    ctx.drawImage(mapView ? cityMapStatic : cityStatic, 0, 0);
    if (mapView) {
      ctx.globalAlpha = 0.04;
      px(0, 0, CITY_AW, CITY_AH, '#e8d9a0');
      ctx.globalAlpha = 1;
      px(-1, 0, 1, CITY_AH, '#33452f');
      px(CITY_AW, 0, 1, CITY_AH, '#33452f');
      px(0, -1, CITY_AW, 1, '#33452f');
      px(0, CITY_AH, CITY_AW, 1, '#33452f');
    }
    drawCityDynamic(mapView);
    if (mapView) drawMapMarker();
    else drawPlayerArt();
  } else if (scene === 'office') {
    ctx.drawImage(officeStatic, 0, 0);
    drawOfficeDynamic();
    drawPlayerArt();
  } else {
    ctx.drawImage(homeStatic, 0, 0);
    drawHomeDynamic();
    drawPlayerArt();
  }

  ctx.restore();

  drawLighting();

  ctx = mainCtx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buffer, 0, 0, AW, AH, 0, 0, VW, VH);

  drawMini();
  layoutMapLabels(mapView);
}

/* ==========================================================
   BOOT
   ========================================================== */

// debug: ?scene=office&x=9&y=9
const bootQuery = new URLSearchParams(location.search);
if (bootQuery.get('new') === '1') clearSave();
const loaded = loadGame();
if (bootQuery.get('scene') && sceneInfo[bootQuery.get('scene')]) scene = bootQuery.get('scene');
if (bootQuery.get('x') && isFinite(Number(bootQuery.get('x')))) player.x = Number(bootQuery.get('x')) * TILE;
if (bootQuery.get('y') && isFinite(Number(bootQuery.get('y')))) player.y = Number(bootQuery.get('y')) * TILE;
if (bootQuery.get('t') !== null && isFinite(Number(bootQuery.get('t')))) world.minutes = Number(bootQuery.get('t'));
if (bootQuery.get('view') === 'street') viewMode = 'street';
else if (bootQuery.get('view') === 'map') viewMode = 'map';

buildStats();
drawPortrait();
setPixelScale(scene === 'city' && viewMode === 'map' ? MAP_PIX : STREET_PIX);
buildStatics();
buildMapLabels();
layoutMapLabels(scene === 'city' && viewMode === 'map');
window.__layoutAudit = auditLayout;
auditLayout();
fitStage();
updateHud();

if (bootQuery.get('adult') === '1') {
  profile.name = 'สมชาย ใจดี';
  life.backgroundId = 'mid';
  life.dreamId = 'free';
  life.gender = 'ชาย';
  life.province = 'กรุงเทพฯ';
  applyBackground('mid');
  enterAdulthood();
  if (bootQuery.get('scene') && sceneInfo[bootQuery.get('scene')]) scene = bootQuery.get('scene');
  if (bootQuery.get('x') && isFinite(Number(bootQuery.get('x')))) player.x = Number(bootQuery.get('x')) * TILE;
  if (bootQuery.get('y') && isFinite(Number(bootQuery.get('y')))) player.y = Number(bootQuery.get('y')) * TILE;
  if (bootQuery.get('t') !== null && isFinite(Number(bootQuery.get('t')))) world.minutes = Number(bootQuery.get('t'));
  updateHud();
} else if (loaded) {
  toast('โหลดเซฟเดิม · ' + dateLabel());
  resumeLife();
} else {
  openLifeCreation();
}

const bootModal = bootQuery.get('modal');
if (life.phase === 'adult') {
  if (bootModal === 'finance') openFinance();
  else if (bootModal === 'bed') openSleep();
  else if (bootModal === 'month') startMonthEnd();
  else if (bootModal === 'payslip') resolveMonth(null);
}

window.addEventListener('pagehide', function () { if (!gameOver) saveGame(); });

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
  sleep: function () { sleep(); },
  save: saveGame,
  clearSave: clearSave,
  endMonth: startMonthEnd,
  finance: openFinance
};

