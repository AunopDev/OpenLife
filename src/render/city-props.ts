/* OpenLife — ต้นไม้และของประกอบฉากในแผนที่เมือง
   RESEARCH: docs/research/city-streetscape-art.md (เสาไฟ/สายไฟ, ศาลพระภูมิ, วินเสื้อกั๊กส้ม)
   ตำแหน่งฐานต้องผ่าน districtAudit() — ไฟล์นี้วาดอย่างเดียว ไม่ตัดสินโซน */
import type { PropSpec, CityStyle } from '../world/district-maps';
import { px, alpha, shadow, ellipse, wire, shade, pick, Rng } from './pixel';
import { emit, glow, LIGHT } from './night';
import { AWNINGS } from './palette';

const ART = 16;

/* ---------- ต้นไม้ ---------- */

/** ทรงพุ่มเป็นก้อน ๆ (clumps) ให้ดูมีมิติ: เงา → ฐาน → ไฮไลต์ */
function canopy(r: Rng, cx: number, cy: number, rx: number, ry: number, base: string): void {
  const dark = shade(base, -0.3);
  const light = shade(base, 0.22);
  const hi = shade(base, 0.4);
  ellipse(cx, cy + 1, rx, ry, dark);
  for (let i = 0; i < 7; i++) {
    const ox = Math.round((r() - 0.5) * rx * 1.2);
    const oy = Math.round((r() - 0.5) * ry * 0.9);
    ellipse(cx + ox, cy + oy - 1, Math.max(2, Math.round(rx * 0.45)), Math.max(2, Math.round(ry * 0.45)), base);
  }
  for (let i = 0; i < 5; i++) {
    const ox = Math.round((r() - 0.6) * rx);
    const oy = Math.round(-r() * ry * 0.8);
    ellipse(cx + ox, cy + oy - 1, Math.max(1, Math.round(rx * 0.25)), Math.max(1, Math.round(ry * 0.25)), light);
  }
  for (let i = 0; i < 6; i++) px(cx - rx + Math.floor(r() * rx * 1.4), cy - ry + Math.floor(r() * ry), 1, 1, hi);
}

function trunk(x: number, y: number, h: number, w = 2): void {
  px(x - Math.floor(w / 2), y - h, w, h, '#5a4030');
  px(x - Math.floor(w / 2), y - h, 1, h, '#74543c');
}

/** จามจุรี: เรือนยอดแผ่กว้างแบน */
function rainTree(r: Rng, x: number, y: number): void {
  shadow(x, y - 1, 22, 0.32);
  trunk(x, y, 11, 3);
  px(x - 5, y - 10, 4, 1, '#5a4030');
  px(x + 2, y - 9, 4, 1, '#5a4030');
  canopy(r, x, y - 17, 13, 7, '#3f7444');
}

/** ลีลาวดี: ต้นเล็ก กิ่งแตกเป็นง่าม ดอกขาว-เหลือง */
function frangipani(r: Rng, x: number, y: number): void {
  shadow(x, y - 1, 14, 0.3);
  trunk(x, y, 7, 2);
  px(x - 4, y - 9, 4, 1, '#7a6a5a');
  px(x + 1, y - 10, 4, 1, '#7a6a5a');
  canopy(r, x, y - 13, 8, 5, '#4f8a4a');
  for (let i = 0; i < 9; i++) {
    const fx = x - 7 + Math.floor(r() * 14);
    const fy = y - 17 + Math.floor(r() * 8);
    px(fx, fy, 1, 1, '#fbf6e8');
    px(fx + 1, fy, 1, 1, '#f2d060');
  }
}

/** ต้นไม้ทรงกลมทั่วไป (มะม่วง/ไทร) */
function roundTree(r: Rng, x: number, y: number): void {
  shadow(x, y - 1, 16, 0.3);
  trunk(x, y, 9, 2);
  canopy(r, x, y - 15, 9, 7, '#356b40');
}

/** มะพร้าว (ภาคใต้/ภาคตะวันออก/ชายทะเล) */
function coconut(r: Rng, x: number, y: number): void {
  shadow(x, y - 1, 18, 0.28);
  const lean = r() < 0.5 ? -1 : 1;
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    px(x + Math.round(lean * t * t * 6), y - i, 2, 1, i % 4 === 0 ? '#6b5539' : '#8a7350');
  }
  const tx = x + lean * 6;
  const ty = y - 24;
  const fronds = [[-12, -3], [-9, -8], [-3, -11], [3, -11], [9, -8], [12, -3], [-10, 3], [10, 3]];
  fronds.forEach(function (f, i) {
    for (let k = 1; k <= 6; k++) {
      px(tx + Math.round(f[0] * k / 6), ty + Math.round(f[1] * k / 6) + (k > 3 ? 1 : 0), 2, 1, (i + k) % 3 === 0 ? '#2f6a3a' : '#3d8a4a');
    }
  });
  px(tx - 1, ty, 3, 2, '#3d8a4a');
  px(tx + 1, ty + 2, 2, 2, '#6b5539');
}

/** กล้วย (ชนบท/บ้านสวน) */
function banana(r: Rng, x: number, y: number): void {
  shadow(x, y - 1, 12, 0.28);
  px(x - 1, y - 8, 2, 8, '#7a8a4a');
  const leaves = [[-8, -12], [-6, -16], [0, -18], [6, -16], [8, -11]];
  leaves.forEach(function (l) {
    for (let k = 0; k < 5; k++) px(x + Math.round(l[0] * k / 4), y - 8 + Math.round((l[1] + 8) * k / 4), 3, 2, k % 2 ? '#5aa04a' : '#4a8a3c');
  });
  px(x + 2, y - 9, 2, 3, '#5a3a5a');
}

export function drawCityTree(r: Rng, tx: number, ty: number, v: number, style: CityStyle): void {
  const x = Math.round((tx + 0.5) * ART);
  const y = Math.round((ty + 0.92) * ART);
  const tropical = style.region === 'south' || style.region === 'east' || style.coastal;
  if (v === 3 && tropical) coconut(r, x, y);
  else if (v === 3 && style.archetype === 'rural') banana(r, x, y);
  else if (v === 2) frangipani(r, x, y);
  else if (v === 1 || style.archetype === 'urban') rainTree(r, x, y);
  else roundTree(r, x, y);
}

/* ---------- ของประกอบฉาก ---------- */

/** เสาไฟฟ้าคอนกรีต — คืนตำแหน่งหัวเสาให้ลากสาย */
function powerPole(r: Rng, x: number, y: number): void {
  shadow(x, y, 6, 0.3);
  px(x - 1, y - 30, 3, 30, '#a4a29c');
  px(x - 1, y - 30, 1, 30, '#c4c2bc');
  px(x + 1, y - 30, 1, 30, '#7e7c76');
  px(x - 7, y - 28, 15, 2, '#8a8882');
  px(x - 5, y - 23, 11, 1, '#8a8882');
  for (let i = -6; i <= 6; i += 4) px(x + i, y - 30, 1, 2, '#d8dee8');
  if (r() < 0.35) {
    // หม้อแปลง
    px(x + 2, y - 21, 5, 6, '#6a7078');
    px(x + 2, y - 21, 5, 1, '#9aa0a8');
  }
  if (r() < 0.45) {
    // ม้วนสายสื่อสารเก็บค้างบนเสา
    ellipse(x - 3, y - 17, 2, 2, '#1c1f26');
    px(x - 4, y - 18, 1, 1, '#3a3e48');
  }
  px(x - 2, y - 8, 5, 1, '#e0b83a');
}

function lampPost(x: number, y: number): void {
  shadow(x, y, 5, 0.28);
  px(x - 1, y - 22, 2, 22, '#5a5e66');
  px(x, y - 22, 1, 22, '#7a7e86');
  px(x - 1, y - 23, 7, 2, '#5a5e66');
  px(x + 4, y - 22, 3, 2, '#3a3e46');
  px(x + 4, y - 21, 3, 1, '#fff4c8');
  emit(x + 4, y - 21, 3, 1, LIGHT.white);
}

function spiritHouse(x: number, y: number): void {
  shadow(x, y, 8, 0.3);
  px(x - 1, y - 9, 2, 9, '#e8e2d4');
  px(x - 4, y - 11, 8, 2, '#d8d0be');
  px(x - 3, y - 16, 6, 5, '#e0b040');
  px(x - 2, y - 15, 4, 3, '#9a2a24');
  px(x - 4, y - 18, 8, 2, '#c8642f');
  px(x - 2, y - 20, 4, 2, '#c8642f');
  px(x, y - 22, 1, 2, '#f0d060');
  px(x - 5, y - 18, 1, 1, '#f0d060');
  px(x + 4, y - 18, 1, 1, '#f0d060');
  // พวงมาลัย + น้ำแดง
  px(x - 3, y - 11, 1, 1, '#fbf6e8');
  px(x + 2, y - 11, 1, 1, '#ff8fb1');
  px(x + 3, y - 11, 1, 2, '#d64b4b');
  emit(x - 2, y - 15, 4, 3, '#ffcf70');
  glow(x, y - 13, 10, LIGHT.gold, 0.22);
}

function motorbike(x: number, y: number, c: string, flip: boolean): void {
  shadow(x, y + 1, 9, 0.3);
  const d = flip ? -1 : 1;
  px(x - 4, y - 1, 3, 2, '#1c1f26');
  px(x + 2, y - 1, 3, 2, '#1c1f26');
  px(x - 3, y - 5, 7, 4, c);
  px(x - 3, y - 5, 7, 1, shade(c, 0.35));
  px(x - 2 * d - 1, y - 6, 4, 1, '#2a2a2e');
  px(x + 3 * d, y - 8, 1, 3, '#9aa2ac');
  px(x + 2 * d, y - 8, 3, 1, '#2a2a2e');
}

function motoRow(r: Rng, x: number, y: number): void {
  const cols = ['#c8423a', '#2f2f36', '#3f6fb0', '#e8e8e8', '#7a4ab0', '#d9a03a'];
  const n = 2 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) motorbike(x - 6 + i * 5, y - (i % 2), pick(r, cols), r() < 0.5);
}

function winStand(r: Rng, x: number, y: number): void {
  // ป้ายวิน + มอเตอร์ไซค์ + คนขับเสื้อกั๊กส้ม
  px(x - 9, y - 18, 1, 18, '#5a5e66');
  px(x - 12, y - 21, 8, 4, '#2f6fb0');
  px(x - 11, y - 20, 6, 1, '#ffffff');
  px(x - 11, y - 18, 4, 1, '#ffffff');
  motorbike(x - 2, y, '#2f2f36', false);
  motorbike(x + 5, y - 1, '#c8423a', true);
  // คนขับนั่งรอ
  shadow(x + 10, y + 1, 6, 0.3);
  px(x + 9, y - 4, 3, 4, '#2a3048');
  px(x + 8, y - 9, 5, 5, '#f07a2a');
  px(x + 9, y - 8, 3, 1, '#ffd060');
  px(x + 9, y - 12, 3, 3, '#c89a72');
  px(x + 9, y - 13, 3, 1, '#1c1c22');
}

function foodCart(r: Rng, x: number, y: number): void {
  shadow(x, y + 1, 18, 0.3);
  px(x - 7, y - 1, 2, 2, '#1c1f26');
  px(x + 5, y - 1, 2, 2, '#1c1f26');
  px(x - 8, y - 8, 16, 7, '#c9ced4');
  px(x - 7, y - 7, 14, 4, '#8ab0c8');
  px(x - 6, y - 6, 2, 2, '#e0a13a');
  px(x - 2, y - 6, 3, 2, '#c8423a');
  px(x + 3, y - 6, 2, 2, '#3d8a4a');
  px(x + 8, y - 6, 1, 4, '#5a5e66');
  emit(x - 7, y - 7, 14, 4, '#e8d8a8');
  // ร่มใหญ่ลายสี
  px(x, y - 20, 1, 12, '#5a5e66');
  const c = pick(r, AWNINGS);
  ellipse(x, y - 21, 11, 4, c);
  for (let i = -10; i <= 10; i += 5) px(x + i, y - 23, 2, 5, '#ece8df');
  px(x - 10, y - 18, 21, 1, 'rgba(0,0,0,.25)');
  glow(x, y - 6, 16, LIGHT.warm, 0.26);
}

function stall(r: Rng, x: number, y: number, v: number): void {
  const awn = AWNINGS[v % AWNINGS.length];
  shadow(x, y - 1, 22, 0.3);
  px(x - 9, y - 8, 18, 5, '#8a6448');
  px(x - 9, y - 8, 18, 1, '#a87c58');
  px(x - 8, y - 3, 2, 3, '#5a4630');
  px(x + 6, y - 3, 2, 3, '#5a4630');
  for (let i = 0; i < 6; i++) px(x - 7 + i * 3, y - 10, 2, 2, pick(r, ['#e0a13a', '#c8423a', '#3d8a4a', '#ece8df']));
  px(x - 11, y - 20, 22, 3, awn);
  for (let i = 0; i < 22; i += 6) px(x - 11 + i, y - 20, 3, 3, '#ece8df');
  px(x - 10, y - 17, 1, 9, '#5a4630');
  px(x + 9, y - 17, 1, 9, '#5a4630');
  emit(x - 8, y - 10, 16, 2, '#e8c890');
}

function bin(x: number, y: number): void {
  shadow(x, y + 1, 8, 0.3);
  px(x - 3, y - 6, 7, 7, '#2f7d52');
  px(x - 4, y - 7, 9, 2, '#3d9a68');
  px(x - 1, y - 4, 3, 2, '#e8e8e8');
}

function bench(x: number, y: number): void {
  alpha(0.3, function () { px(x - 9, y + 2, 18, 2, '#050817'); });
  px(x - 9, y - 3, 18, 2, '#9a7048');
  px(x - 9, y - 1, 18, 1, '#7a5638');
  px(x - 8, y - 6, 16, 2, '#9a7048');
  px(x - 8, y, 2, 4, '#4a4e56');
  px(x + 6, y, 2, 4, '#4a4e56');
}

function crate(x: number, y: number): void {
  px(x - 5, y - 8, 11, 8, '#2f6fb0');
  px(x - 5, y - 8, 11, 1, '#5a90d0');
  for (let i = -4; i < 6; i += 3) px(x + i, y - 7, 1, 7, '#24578a');
}

function signPost(x: number, y: number): void {
  // ป้ายรถเมล์ (ไม่มีตัวอักษร)
  px(x - 1, y - 20, 2, 20, '#5a5e66');
  px(x - 6, y - 26, 12, 7, '#2f6fb0');
  px(x - 5, y - 25, 10, 1, '#ffffff');
  px(x - 5, y - 23, 6, 2, '#ffffff');
  px(x + 2, y - 23, 3, 2, '#e0b83a');
}

function fishnet(x: number, y: number): void {
  for (let i = 0; i < 5; i++) {
    px(x - 8 + i * 3, y - 6 + (i % 2), 2, 1, '#8a93b8');
    px(x - 8 + i * 3, y - 3 + (i % 2), 2, 1, '#8a93b8');
  }
  px(x - 9, y - 8, 3, 3, '#d64b4b');
  px(x + 5, y - 8, 3, 3, '#e0a13a');
}

function buoy(x: number, y: number): void {
  px(x - 3, y - 4, 6, 4, '#d64b4b');
  px(x - 3, y - 4, 6, 1, '#ff8f3f');
  px(x - 1, y - 6, 2, 2, '#3a2f28');
}

export function drawCityProp(r: Rng, p: PropSpec, style: CityStyle): void {
  const x = Math.round(p.x * ART);
  const y = Math.round(p.y * ART);
  switch (p.type) {
    case 'power': powerPole(r, x, y); break;
    case 'lamp': lampPost(x, y); break;
    case 'spirit': spiritHouse(x, y); break;
    case 'moto': motoRow(r, x, y); break;
    case 'win': winStand(r, x, y); break;
    case 'cart': foodCart(r, x, y); break;
    case 'stall': stall(r, x, y, p.v || 0); break;
    case 'bin': bin(x, y); break;
    case 'bench': bench(x, y); break;
    case 'crate': crate(x, y); break;
    case 'sign': signPost(x, y); break;
    case 'palm': coconut(r, x, y); break;
    case 'fishnet': fishnet(x, y); break;
    case 'buoy': buoy(x, y); break;
    default: px(x - 2, y - 4, 4, 4, '#8a8a8a'); break;
  }
}

/** มัดสายไฟ/สายสื่อสารระหว่างเสาที่อยู่แถวเดียวกัน (วาดเป็นชั้นบนสุด) */
export function drawPowerWires(r: Rng, props: PropSpec[]): void {
  const poles = props.filter(function (p) { return p.type === 'power'; });
  const rows: { [k: string]: PropSpec[] } = {};
  poles.forEach(function (p) {
    const k = String(Math.floor(p.y));
    (rows[k] = rows[k] || []).push(p);
  });
  Object.keys(rows).forEach(function (k) {
    const row = rows[k].sort(function (a, b) { return a.x - b.x; });
    for (let i = 0; i < row.length - 1; i++) {
      const a = row[i];
      const b = row[i + 1];
      if (b.x - a.x > 8) continue;
      const ax = Math.round(a.x * ART);
      const bx = Math.round(b.x * ART);
      const ay = Math.round(a.y * ART) - 29;
      const by = Math.round(b.y * ART) - 29;
      // สายไฟฟ้า 2 เส้นบนคานเสา + มัดสายสื่อสารหย่อนต่ำ 1–2 เส้น (บางและโปร่งพอไม่บังหน้าร้าน)
      alpha(0.75, function () {
        wire(ax - 6, ay, bx - 6, by, 3, '#23262e');
        wire(ax + 6, ay, bx + 6, by, 3, '#23262e');
      });
      const bundle = 1 + Math.floor(r() * 2);
      alpha(0.85, function () {
        for (let j = 0; j < bundle; j++) {
          wire(ax - 1, ay + 6 + j, bx - 1, by + 6 + j, 6 + j * 2 + Math.floor(r() * 3), '#16181d');
        }
      });
    }
  });
}
