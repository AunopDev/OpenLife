'use strict';

/* ==========================================================
   OPENLIFE — UI MOCKUP v0.1
   ไม่ใช่เกมจริง: เป็นการทดลองหน้าจอ/จังหวะการเล่น
   ========================================================== */

const STAGE_W = 1440;
const STAGE_H = 900;

function fitStage() {
  const stage = document.getElementById('stage');
  const s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  const ox = (window.innerWidth - STAGE_W * s) / 2;
  const oy = (window.innerHeight - STAGE_H * s) / 2;
  stage.style.transform = 'translate(' + ox + 'px,' + oy + 'px) scale(' + s + ')';
}
window.addEventListener('resize', fitStage);

/* ==========================================================
   MAP
   ========================================================== */

const T = 15;
const COLS = 32;
const ROWS = 20;

const mapCanvas = document.getElementById('map');
const mctx = mapCanvas.getContext('2d');

let seed = 20240117;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

function rect(x, y, w, h, c) {
  mctx.fillStyle = c;
  mctx.fillRect(x, y, w, h);
}
function tRect(tx, ty, tw, th, c) {
  rect(tx * T, ty * T, tw * T, th * T, c);
}
function isWater(x, y) {
  return y > 10 + (COLS - x) * 0.5556;
}

function building(tx, ty, tw, th, roof, roofDark, win, opts) {
  opts = opts || {};
  const x = tx * T;
  const y = ty * T;
  const w = tw * T;
  const h = th * T;

  rect(x - 2, y - 2, w + 4, h + 4, '#3F4664');
  rect(x + 2, y + 3, w, h, 'rgba(3,7,22,.5)');
  rect(x, y, w, h, roofDark);
  rect(x + 1, y + 1, w - 2, h - 2, roof);
  rect(x + 1, y + 1, w - 2, 2, 'rgba(255,255,255,.16)');

  for (let wy = y + 5; wy < y + h - 4; wy += 6) {
    for (let wx = x + 4; wx < x + w - 4; wx += 6) {
      if (rnd() < 0.75) rect(wx, wy, 3, 3, win);
    }
  }

  if (opts.cross) {
    rect(x + w / 2 - 1, y + h / 2 - 4, 2, 8, '#FF5C6C');
    rect(x + w / 2 - 4, y + h / 2 - 1, 8, 2, '#FF5C6C');
  }
  if (opts.stripe) {
    rect(x + 1, y + 4, w - 2, 2, '#FF9F4A');
    rect(x + 1, y + 6, w - 2, 2, '#FF5C6C');
  }
}

function tree(tx, ty) {
  const x = tx * T;
  const y = ty * T;
  rect(x + 5, y + 8, 5, 5, '#143024');
  rect(x + 4, y + 5, 7, 6, '#1D3F2A');
  rect(x + 3, y + 4, 9, 5, '#2B5C3D');
  rect(x + 5, y + 3, 5, 3, '#357047');
  rect(x + 6, y + 4, 2, 2, '#3F844F');
}

function car(x, y, c) {
  rect(x, y, 8, 5, c);
  rect(x + 2, y + 1, 3, 2, '#0B1330');
  rect(x + 1, y + 5, 2, 1, '#0A0F1E');
  rect(x + 5, y + 5, 2, 1, '#0A0F1E');
}

function drawMap() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (isWater(x, y)) {
        tRect(x, y, 1, 1, (x + y) % 2 ? '#16405C' : '#184763');
        for (let i = 0; i < 2; i++) {
          rect(x * T + ((rnd() * 12) | 0), y * T + ((rnd() * 12) | 0), 2, 1, '#27678F');
        }
      } else {
        tRect(x, y, 1, 1, (x + y) % 2 ? '#2C5639' : '#2A5136');
        for (let i = 0; i < 3; i++) {
          rect(x * T + ((rnd() * 13) | 0), y * T + ((rnd() * 13) | 0), 1, 1, '#24482F');
        }
      }
    }
  }

  // roads
  for (let x = 0; x < COLS; x++) {
    tRect(x, 5, 1, 1, '#3A4058');
    tRect(x, 12, 1, 1, '#3A4058');
  }
  for (let y = 0; y < ROWS; y++) tRect(8, y, 1, 1, '#3A4058');
  for (let y = 0; y < 15; y++) tRect(22, y, 1, 1, '#3A4058');

  // lane markings
  for (let x = 1; x < COLS; x += 4) {
    rect(x * T, 5 * T + 7, 6, 1, '#C9CFE8');
    rect(x * T, 12 * T + 7, 6, 1, '#C9CFE8');
  }
  for (let y = 1; y < 14; y += 4) {
    rect(8 * T + 7, y * T, 1, 6, '#C9CFE8');
    rect(22 * T + 7, y * T, 1, 6, '#C9CFE8');
  }

  // park
  rect(24 * T, 3 * T, 3 * T, 2 * T, '#2E6B45');
  rect(24 * T + 8, 3 * T + 20, 30, 4, '#4E6B4A');

  // buildings
  building(2, 2, 3, 2, '#5A6E8A', '#3E4E66', '#DCEAFF');
  building(2, 8, 3, 2, '#6E4A3C', '#4E332A', '#FFD75E');
  building(11, 6, 4, 3, '#39477E', '#28325C', '#BFE0FF');
  building(17, 9, 2, 1, '#2F7D52', '#1F5537', '#FFE9A8', { stripe: true });
  building(9, 3, 2, 1, '#6E7898', '#4C5570', '#9FB6D8');
  building(24, 9, 2, 2, '#4B3A6E', '#33264C', '#C4A7FF');
  building(18, 13, 2, 1, '#6E3A4E', '#4C2736', '#FF9F4A');
  building(13, 14, 3, 2, '#46566E', '#2F3D4E', '#DCEAFF', { cross: true });

  // trees
  tree(24, 3); tree(26, 3); tree(24, 4); tree(26, 4);
  tree(29, 7); tree(6, 15); tree(20, 16);

  // cars
  car(3 * T, 5 * T + 5, '#E85C6C');
  car(14 * T, 5 * T + 5, '#7DD3FC');
  car(25 * T, 12 * T + 5, '#FFD75E');
  car(19 * T, 12 * T + 5, '#6EE7A8');
  car(8 * T + 4, 2 * T, '#FF9F4A');

  // blue night tint
  mctx.fillStyle = 'rgba(10,20,80,.16)';
  mctx.fillRect(0, 0, COLS * T, ROWS * T);
}

/* ---------- map labels ---------- */

const LABELS = [
  { name: 'บ้าน', x: 3.5, y: 10.7, place: true },
  { name: 'ออฟฟิศ', x: 13, y: 9.7, place: true },
  { name: '7-Eleven', x: 18, y: 10.7, place: true },
  { name: 'BTS อโศก', x: 10, y: 4.7, place: true },
  { name: 'ฟิตเนส', x: 25, y: 11.6, place: true },
  { name: 'ร้านเหล้า', x: 19, y: 14.7, place: true },
  { name: 'โรงพยาบาล', x: 14.5, y: 16.8, place: true },
  { name: 'สวนสาธารณะ', x: 25, y: 5.7, place: true },
  { name: 'โรงเรียน', x: 3.5, y: 4.7, place: true },
  { name: 'สุขุมวิท', x: 4, y: 6.4 },
  { name: 'อโศก', x: 20, y: 12.7 },
  { name: 'พระโขนง', x: 18, y: 6.2 }
];

function drawLabels() {
  const wrap = document.getElementById('labels');
  wrap.innerHTML = '';
  LABELS.forEach(function (l) {
    const d = document.createElement('div');
    d.className = 'map-label' + (l.place ? ' place' : '');
    d.textContent = l.name;
    d.style.left = ((l.x * T) / (COLS * T) * 100) + '%';
    d.style.top = ((l.y * T) / (ROWS * T) * 100) + '%';
    wrap.appendChild(d);
  });
}

/* ---------- portrait ---------- */

function drawPortrait() {
  const p = document.getElementById('portrait');
  const c = p.getContext('2d');
  c.fillStyle = '#2A2F5C';
  c.fillRect(0, 0, 24, 24);

  // neck
  c.fillStyle = '#E0B48C';
  c.fillRect(10, 16, 4, 3);
  // face
  c.fillStyle = '#F0C9A0';
  c.fillRect(7, 6, 10, 11);
  // ears
  c.fillRect(6, 10, 1, 3);
  c.fillRect(17, 10, 1, 3);
  // hair
  c.fillStyle = '#161A2E';
  c.fillRect(5, 4, 14, 4);
  c.fillRect(5, 8, 2, 4);
  c.fillRect(17, 8, 2, 4);
  // brows
  c.fillRect(8, 9, 3, 1);
  c.fillRect(13, 9, 3, 1);
  // eyes
  c.fillStyle = '#12142A';
  c.fillRect(9, 11, 2, 2);
  c.fillRect(14, 11, 2, 2);
  // mouth
  c.fillRect(11, 15, 3, 1);
  // shirt
  c.fillStyle = '#E8EEFC';
  c.fillRect(5, 18, 14, 6);
  c.fillStyle = '#2B3A7A';
  c.fillRect(11, 18, 2, 6);
  // tie
  c.fillStyle = '#FF5C6C';
  c.fillRect(11, 19, 2, 5);
}

/* ---------- minimap ---------- */

const TH_POINTS = [
  [52, 6], [60, 10], [64, 18], [61, 25], [66, 30], [70, 38], [76, 42],
  [74, 50], [69, 54], [66, 63], [61, 72], [57, 82], [53, 92], [49, 96],
  [45, 90], [44, 80], [41, 72], [35, 68], [29, 63], [24, 56], [21, 48],
  [25, 40], [28, 33], [27, 25], [31, 17], [39, 11], [46, 8]
];

function drawMini() {
  const el = document.getElementById('mini');
  const c = el.getContext('2d');
  const W2 = el.width;
  const H2 = el.height;

  c.fillStyle = '#0C1638';
  c.fillRect(0, 0, W2, H2);

  // faint grid
  c.strokeStyle = 'rgba(90,120,220,.14)';
  c.lineWidth = 1;
  for (let gx = 0; gx < W2; gx += 16) {
    c.beginPath(); c.moveTo(gx + 0.5, 0); c.lineTo(gx + 0.5, H2); c.stroke();
  }
  for (let gy = 0; gy < H2; gy += 16) {
    c.beginPath(); c.moveTo(0, gy + 0.5); c.lineTo(W2, gy + 0.5); c.stroke();
  }

  // thailand
  c.beginPath();
  TH_POINTS.forEach(function (pt, i) {
    const x = pt[0] * 1.5;
    const y = pt[1] * 1.8;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  });
  c.closePath();
  c.fillStyle = '#2E6B3F';
  c.fill();
  c.strokeStyle = '#8FB6A0';
  c.lineWidth = 1.5;
  c.stroke();

  // other cities
  const dots = [[52, 30], [44, 52], [72, 40], [58, 84], [62, 62]];
  dots.forEach(function (d) {
    c.fillStyle = '#FF5C6C';
    c.fillRect(d[0] * 1.5 - 1.5, d[1] * 1.8 - 1.5, 3, 3);
  });

  // bangkok highlight
  c.strokeStyle = '#E8EEFF';
  c.lineWidth = 1;
  c.strokeRect(78, 104, 27, 21);
  c.fillStyle = '#FFD75E';
  c.fillRect(88, 112, 4, 4);
}

/* ==========================================================
   GAME STATE (mock)
   ========================================================== */

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const START_YEAR = 2569;

const S = {
  money: 4500,
  energy: 62,
  heart: 41,
  kpi: 54,
  salary: 22000,
  monthIndex: 0,
  planned: []
};

const ACTS = [
  { id: 'ot', name: 'รับ OT', money: 3000, energy: -18, heart: -12, kpi: 6, tag: '+เงิน · −ใจ' },
  { id: 'gym', name: 'ออกกำลังกาย', money: -300, energy: -6, heart: 8, kpi: 0, tag: '+ใจ · +สุขภาพ' },
  { id: 'family', name: 'ไปบ้านพ่อแม่', money: -500, energy: -4, heart: 14, kpi: 0, tag: '+ใจ · +ครอบครัว' },
  { id: 'side', name: 'อาชีพเสริม', money: 2500, energy: -14, heart: -4, kpi: 0, tag: '+เงิน · −แรง' },
  { id: 'rest', name: 'พักผ่อน', money: -200, energy: 22, heart: 6, kpi: 0, tag: '+แรง · +ใจ' },
  { id: 'study', name: 'เรียนเสริม', money: -2000, energy: -10, heart: -2, kpi: 5, tag: '+ผลงาน · −เงิน' }
];

const COSTS = [
  { name: 'ค่าเช่าห้อง', amount: 5500 },
  { name: 'อาหาร', amount: 6000 },
  { name: 'เดินทาง', amount: 3000 },
  { name: 'ผ่อนรถ', amount: 6500 },
  { name: 'หนี้บัตรเครดิต (ขั้นต่ำ)', amount: 1500 }
];

const EVENTS = [
  {
    chip: 'เหตุการณ์ · 17:55',
    title: 'งานด่วนก่อนเลิกงาน',
    text: 'หัวหน้าเดินมาที่โต๊ะตอน 17:55 — “น้อง ช่วยทำสไลด์ชุดนี้ให้พี่ก่อนพรุ่งนี้เช้านะ” ทั้งที่คุณนัดเพื่อนไว้แล้ว',
    choices: [
      { label: 'นั่งทำต่อจนเสร็จ', hint: [['up', 'ผลงาน +'], ['down', 'ใจ −'], ['down', 'พลังงาน −']], fx: { kpi: 6, heart: -10, energy: -12 } },
      { label: 'บอกว่ามีนัดสำคัญ', hint: [['up', 'ใจ +'], ['down', 'หัวหน้า −'], ['down', 'ผลงาน −']], fx: { heart: 5, kpi: -2 } },
      { label: 'ขอให้เพื่อนช่วยแบ่งงาน', hint: [['req', 'ต้องมีมนุษยสัมพันธ์ 50']], locked: true, fx: {} }
    ]
  },
  {
    chip: 'เหตุการณ์ · ประชุมทีม',
    title: 'เครดิตที่หายไป',
    text: 'โปรเจกต์ที่คุณทำคนเดียวทั้งเดือน ถูกนำเสนอในที่ประชุมโดยเพื่อนร่วมงาน — และบนสไลด์ไม่มีชื่อคุณอยู่เลย',
    choices: [
      { label: 'เงียบไว้ เก็บไว้ในใจ', hint: [['down', 'ใจ −'], ['up', 'มนุษยสัมพันธ์ +']], fx: { heart: -9 } },
      { label: 'พูดขึ้นในที่ประชุม', hint: [['up', 'ผลงาน +'], ['down', 'เพื่อนร่วมงาน −']], fx: { kpi: 5, heart: 2 } },
      { label: 'ไปคุยกับหัวหน้าเป็นการส่วนตัว', hint: [['up', 'ผลงาน +'], ['up', 'หัวหน้า +']], fx: { kpi: 3, heart: -2 } }
    ]
  },
  {
    chip: 'เหตุการณ์ · ประกาศจาก HR',
    title: 'ปรับโครงสร้างองค์กร',
    text: 'อีเมลจาก HR เรื่อง “ปรับโครงสร้างเพื่อความคล่องตัว” — รายชื่อคนที่จะถูกเลย์ออฟจะประกาศสิ้นเดือนนี้',
    choices: [
      { label: 'ทำงานหนักขึ้นเพื่อความปลอดภัย', hint: [['up', 'ผลงาน +'], ['down', 'พลังงาน −'], ['down', 'ใจ −']], fx: { kpi: 8, energy: -16, heart: -8 } },
      { label: 'อัปเดตเรซูเม่ เตรียมทางออก', hint: [['up', 'ใจ +'], ['down', 'ผลงาน −']], fx: { heart: 6, kpi: -3 } },
      { label: 'ไปถามหัวหน้าตรง ๆ', hint: [['up', 'หัวหน้า +'], ['down', 'ใจ −']], fx: { heart: -4 } }
    ]
  }
];

const TICKERS = [
  'HR ประกาศปรับโครงสร้างองค์กร · โบนัสปีนี้ล่าช้า · หัวหน้าทีมลาออกกะทันหัน · ใครวางแก้วกาแฟไว้บนโต๊ะประชุมอีกแล้ว',
  'เงินเดือนออกวันที่ 25 · ค่าข้าวเที่ยงขึ้นอีก 5 บาท · ทีมบิลดิ้งวันเสาร์หน้า “ไม่บังคับ” · มีคนใช้ไมโครเวฟอุ่นปลาทู',
  'บริษัทเปิดรับสมัครตำแหน่งใหม่ · เพื่อนร่วมงานลาป่วย 3 วันติด · แอร์ชั้น 7 ยังไม่ซ่อม · ประชุม 9:00 เลื่อนเป็น 9:30'
];

/* ---------- helpers ---------- */

function fmt(n) {
  return Math.round(n).toLocaleString('en-US');
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function monthLabel(idx) {
  return TH_MONTHS[idx % 12] + ' ' + (START_YEAR + Math.floor(idx / 12));
}

/* ---------- render ---------- */

function renderStats() {
  document.getElementById('vMoney').textContent = fmt(S.money);
  document.getElementById('vEnergy').textContent = Math.round(S.energy);
  document.getElementById('vHeart').textContent = Math.round(S.heart);
  document.getElementById('vKpi').textContent = Math.round(S.kpi);

  document.getElementById('bMoney').style.width = clamp(S.money / 50000 * 100, 2, 100) + '%';
  document.getElementById('bEnergy').style.width = clamp(S.energy, 2, 100) + '%';
  document.getElementById('bHeart').style.width = clamp(S.heart, 2, 100) + '%';
  document.getElementById('bKpi').style.width = clamp(S.kpi, 2, 100) + '%';
}

function renderSlots() {
  const wrap = document.getElementById('slots');
  wrap.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const id = S.planned[i];
    const act = id ? ACTS.find(function (a) { return a.id === id; }) : null;
    const d = document.createElement('div');
    d.className = 'slot' + (act ? ' filled' : '');
    if (act) {
      d.innerHTML = '<span style="opacity:.6">' + (i + 1) + '</span> ' + act.name;
      d.title = 'คลิกเพื่อเอาออก';
      d.addEventListener('click', function () {
        S.planned.splice(i, 1);
        renderAll();
      });
    } else {
      d.innerHTML = '<span style="opacity:.6">' + (i + 1) + '</span> ว่าง';
    }
    wrap.appendChild(d);
  }
}

function renderChips() {
  const wrap = document.getElementById('chips');
  wrap.innerHTML = '';
  ACTS.forEach(function (a) {
    const b = document.createElement('button');
    b.className = 'chip' + (S.planned.indexOf(a.id) >= 0 ? ' active' : '');
    b.innerHTML = a.name + ' <span style="opacity:.65">' + a.tag + '</span>';
    b.addEventListener('click', function () {
      const i = S.planned.indexOf(a.id);
      if (i >= 0) S.planned.splice(i, 1);
      else if (S.planned.length < 3) S.planned.push(a.id);
      renderAll();
    });
    wrap.appendChild(b);
  });
}

function renderHeader() {
  document.getElementById('monthText').textContent = monthLabel(S.monthIndex);
  document.getElementById('dateText').textContent = '1 ' + monthLabel(S.monthIndex);
  document.getElementById('endMonth').disabled = S.planned.length !== 3;
}

function renderAll() {
  renderStats();
  renderSlots();
  renderChips();
  renderHeader();
}

/* ---------- toast ---------- */

function toast(items) {
  const wrap = document.getElementById('toast');
  items.forEach(function (t) {
    const d = document.createElement('div');
    d.className = 'toast-item';
    d.innerHTML = t;
    wrap.appendChild(d);
    setTimeout(function () { d.remove(); }, 2400);
  });
}

function applyFx(fx) {
  const out = [];
  if (fx.money) { S.money += fx.money; out.push('เงิน ' + (fx.money > 0 ? '+' : '') + fmt(fx.money)); }
  if (fx.energy) { S.energy = clamp(S.energy + fx.energy, 0, 100); out.push('พลังงาน ' + (fx.energy > 0 ? '+' : '') + fx.energy); }
  if (fx.heart) { S.heart = clamp(S.heart + fx.heart, 0, 100); out.push('ใจ ' + (fx.heart > 0 ? '+' : '') + fx.heart); }
  if (fx.kpi) { S.kpi = clamp(S.kpi + fx.kpi, 0, 100); out.push('ผลงาน ' + (fx.kpi > 0 ? '+' : '') + fx.kpi); }
  renderStats();
  return out;
}

/* ---------- modals ---------- */

const overlay = document.getElementById('overlay');
const modal = document.getElementById('modal');

function closeModal() {
  overlay.classList.add('hidden');
  modal.innerHTML = '';
}

function openEvent() {
  const ev = EVENTS[S.monthIndex % EVENTS.length];
  let html = '<div class="ev-head"><span class="ev-chip">' + ev.chip + '</span><span>' + monthLabel(S.monthIndex) + '</span></div>';
  html += '<div class="ev-title">' + ev.title + '</div>';
  html += '<div class="ev-text">' + ev.text + '</div>';
  html += '<div class="choices">';

  ev.choices.forEach(function (c, i) {
    const hints = c.hint.map(function (h) {
      return '<span class="hint ' + h[0] + '">' + h[1] + '</span>';
    }).join('');
    html += '<button class="choice" data-i="' + i + '"' + (c.locked ? ' disabled' : '') + '>'
      + '<span class="c-label">' + (i + 1) + '. ' + c.label + '</span>'
      + '<span class="c-hint">' + hints + '</span>'
      + '</button>';
  });

  html += '</div>';
  modal.innerHTML = html;
  overlay.classList.remove('hidden');

  modal.querySelectorAll('.choice').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const i = Number(btn.getAttribute('data-i'));
      const c = ev.choices[i];
      if (c.locked) return;
      const out = applyFx(c.fx);
      closeModal();
      if (out.length) toast(out);
      setTimeout(showPayday, 420);
    });
  });
}

function showPayday() {
  document.getElementById('toast').innerHTML = '';
  const acts = S.planned.map(function (id) {
    return ACTS.find(function (a) { return a.id === id; });
  }).filter(Boolean);

  const actMoney = acts.reduce(function (sum, a) { return sum + (a.money || 0); }, 0);
  const totalCost = COSTS.reduce(function (sum, c) { return sum + c.amount; }, 0);
  const net = S.salary + actMoney - totalCost;

  let html = '<div class="ev-head"><span class="ev-chip">สลิปเงินเดือน</span><span>' + monthLabel(S.monthIndex) + '</span></div>';
  html += '<div class="ev-title">สิ้นเดือนแล้ว</div>';
  html += '<div class="pay-list">';
  html += '<div class="pay-row"><span>เงินเดือน</span><span class="pos">+' + fmt(S.salary) + '</span></div>';

  acts.forEach(function (a) {
    if (!a.money) return;
    html += '<div class="pay-row"><span>' + a.name + '</span><span class="' + (a.money > 0 ? 'pos' : 'neg') + '">'
      + (a.money > 0 ? '+' : '') + fmt(a.money) + '</span></div>';
  });

  COSTS.forEach(function (c) {
    html += '<div class="pay-row"><span>' + c.name + '</span><span class="neg">−' + fmt(c.amount) + '</span></div>';
  });

  html += '<div class="pay-row total"><span>คงเหลือเดือนนี้</span><span class="' + (net >= 0 ? 'pos' : 'neg') + '">'
    + (net >= 0 ? '+' : '') + fmt(net) + '</span></div>';
  html += '</div>';

  S.money += net;

  html += '<div class="balance-box"><span>เงินในบัญชี</span><b>' + fmt(S.money) + ' ฿</b></div>';
  html += '<div class="choices"><button class="choice" id="nextMonth"><span class="c-label">เริ่มเดือนถัดไป ▶</span>'
    + '<span class="c-hint">ทุกเดือนมี 3 กิจกรรม และทุกอย่างมีราคา</span></button></div>';

  modal.innerHTML = html;
  overlay.classList.remove('hidden');
  renderStats();

  document.getElementById('nextMonth').addEventListener('click', function () {
    closeModal();
    S.monthIndex += 1;
    S.planned = [];
    renderAll();
    const tick = TICKERS[S.monthIndex % TICKERS.length];
    document.getElementById('tickerText').textContent = tick;
    const t = document.getElementById('tickerText');
    t.style.animation = 'none';
    void t.offsetWidth;
    t.style.animation = '';
  });
}

document.getElementById('endMonth').addEventListener('click', function () {
  if (S.planned.length !== 3) return;
  openEvent();
});

/* ==========================================================
   BOOT
   ========================================================== */

drawMap();
drawLabels();
drawPortrait();
drawMini();
renderAll();
fitStage();
