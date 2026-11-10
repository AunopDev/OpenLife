/* render/building-art-32 — อาคาร/บ้าน ที่ 32px art (Phase 3)
   วาดทับเลเยอร์ 16px ที่ขยายแล้ว (ทับตำแหน่งเดิมพอดี) เพื่อให้รายละเอียดคมขึ้น
   พิกัด (x, y) = มุมซ้ายบนของ footprint (tile) · 1 tile = 32 art px */

export interface BuildingLike {
  id?: string;
  name?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  roof: string;
  roofDark: string;
  wall?: string;
  sign?: string;
  door?: number;
}

const T = 32;

function r(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function shade(hex: string, f: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
    return Math.max(0, Math.min(255, Math.round(v * f)));
  });
  return '#' + ch.map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
}

/** หลังคา + กระเบื้อง + ขอบชายคา */
function roofBlock(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, b: BuildingLike): void {
  r(ctx, x, y, w, h, b.roof);
  // กระเบื้องแนวนอน
  for (let yy = y + 4; yy < y + h - 2; yy += 5) {
    r(ctx, x + 1, yy, w - 2, 1, 'rgba(0,0,0,.16)');
    r(ctx, x + 1, yy + 1, w - 2, 1, 'rgba(255,255,255,.06)');
  }
  // รอยต่อแนวตั้งตาม tile
  for (let i = 1; i < Math.max(1, Math.round(w / T)); i++) {
    r(ctx, x + i * T, y + 1, 1, h - 2, 'rgba(0,0,0,.10)');
  }
  // แสงบน-เงาล่าง
  r(ctx, x, y, w, 3, shade(b.roof, 1.22));
  r(ctx, x, y + h - 3, w, 3, shade(b.roof, 0.82));
  // ขอบหลังคา
  ctx.strokeStyle = shade(b.roofDark, 0.9);
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

/** ของบนดาดฟ้า: แอร์ + ถังน้ำ + ท่อระบาย */
function rooftopKit(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, b: BuildingLike): void {
  const acW = 20;
  const acH = 14;
  const ax = x + 8;
  const ay = y + 8;
  if (w > acW + 20 && h > acH + 20) {
    r(ctx, ax + 2, ay + 3, acW, acH, 'rgba(0,0,0,.30)');
    r(ctx, ax, ay, acW, acH, '#6b7492');
    r(ctx, ax + 2, ay + 2, acW - 4, acH - 4, '#8a93b8');
    r(ctx, ax + 4, ay + 5, 5, 5, '#3a4058');
    r(ctx, ax + 11, ay + 5, 5, 5, '#3a4058');
  }
  if (w >= 3 * T && h >= 3 * T) {
    const tx = x + w - 34;
    const ty = y + 12;
    r(ctx, tx + 2, ty + 3, 24, 24, 'rgba(0,0,0,.30)');
    r(ctx, tx, ty, 24, 24, '#7d86a8');
    r(ctx, tx + 3, ty + 3, 18, 8, '#a3abcd');
    r(ctx, tx + 3, ty + 14, 18, 2, 'rgba(0,0,0,.18)');
  }
  if (h >= 2 * T) {
    const vx = x + w - 14;
    const vy = y + h - 26;
    r(ctx, vx, vy, 8, 12, '#5a6280');
    r(ctx, vx + 1, vy + 1, 6, 3, '#2a3050');
  }
}

/** ป้ายร้าน: กรอบขาว + แท่งตัวอักษร (ไม่ใช้ตัวอักษรจริงในโลกเกม) */
function signBoard(ctx: CanvasRenderingContext2D, cx: number, y: number, w: number, h: number, color: string): void {
  const x = cx - w / 2;
  r(ctx, x + 2, y + 2, w, h, 'rgba(0,0,0,.35)');
  r(ctx, x, y, w, h, color);
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const bars = Math.max(2, Math.floor(w / 14));
  const bw = Math.floor((w - 10) / bars) - 3;
  for (let i = 0; i < bars; i++) {
    r(ctx, x + 6 + i * (bw + 3), y + h / 2 - 2, bw, 4, 'rgba(255,255,255,.85)');
  }
}

/** หน้าต่าง (กรอบ + กระจก + สะท้อนแสง) */
function window32(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, wall: string): void {
  r(ctx, x, y, w, h, shade(wall, 0.7));
  r(ctx, x + 2, y + 2, w - 4, h - 4, '#26324e');
  r(ctx, x + 3, y + 3, w - 6, h - 6, '#7fb2d8');
  r(ctx, x + 3, y + 3, w - 6, 2, '#cfe8ff');
  r(ctx, x + Math.floor(w / 2) - 1, y + 2, 2, h - 4, '#26324e');
  r(ctx, x + 2, y + Math.floor(h / 2) - 1, w - 4, 2, '#26324e');
}

/** อาคารหลัก: flat = แผนที่ (เห็นหลังคา) · ไม่ flat = มุมถนน (เห็นหน้าอาคาร) */
export function drawBuilding32(ctx: CanvasRenderingContext2D, b: BuildingLike, flat: boolean): void {
  const x = b.x * T;
  const y = b.y * T;
  const w = b.w * T;
  const h = b.h * T;
  const wall = b.wall || shade(b.roof, 0.6);
  const sign = b.sign || b.roof;

  r(ctx, x + 5, y + 7, w, h, 'rgba(0,0,0,.35)');

  if (flat) {
    roofBlock(ctx, x, y, w, h, b);
    rooftopKit(ctx, x, y, w, h, b);
    signBoard(ctx, x + w / 2, y + h - 16, Math.min(w - 16, 76), 12, sign);
    return;
  }

  const facade = Math.min(Math.round(h * 0.42), 46);
  const roofH = h - facade;

  // หลังคา (ยื่นชายคา)
  roofBlock(ctx, x - 3, y - 3, w + 6, roofH + 6, b);
  rooftopKit(ctx, x, y, w, roofH, b);

  // ผนัง
  r(ctx, x, y + roofH, w, facade, wall);
  r(ctx, x, y + roofH, w, 3, shade(wall, 1.25));
  r(ctx, x, y + h - 4, w, 4, shade(wall, 0.7));
  r(ctx, x, y + roofH, 3, facade, shade(wall, 0.8));
  r(ctx, x + w - 3, y + roofH, 3, facade, shade(wall, 1.12));

  // หน้าต่างตามจำนวน tile
  const winW = 18;
  const winH = 15;
  const winY = y + roofH + Math.round(facade * 0.34);
  for (let i = 0; i < b.w; i++) {
    const wx = x + i * T + Math.round((T - winW) / 2);
    if (Math.abs(wx + winW / 2 - (x + w / 2)) < 16) continue; // เว้นช่องประตู
    window32(ctx, wx, winY, winW, winH, wall);
  }

  // ประตู + กันสาด
  const dw = 22;
  const dh = Math.min(28, facade - 10);
  const dx = x + w / 2 - dw / 2;
  const dy = y + h - dh;
  r(ctx, dx - 2, dy - 2, dw + 4, dh + 2, shade(wall, 0.6));
  r(ctx, dx, dy, dw, dh, '#141a30');
  r(ctx, dx + 3, dy + 3, dw - 6, dh - 6, '#26304e');
  r(ctx, dx + dw - 8, dy + dh / 2, 3, 3, '#ffd75e');
  r(ctx, dx - 6, dy - 8, dw + 12, 6, sign);
  r(ctx, dx - 6, dy - 2, dw + 12, 2, 'rgba(0,0,0,.25)');

  // ป้ายร้าน (บนขอบหลังคา ไม่ทับหน้าต่าง)
  signBoard(ctx, x + w / 2, y + roofH - 15, Math.min(w - 18, 92), 15, sign);
}

/** บ้าน/ตึกแถวเล็ก */
export function drawHouse32(ctx: CanvasRenderingContext2D, hh: BuildingLike, flat: boolean): void {
  const x = hh.x * T;
  const y = hh.y * T;
  const w = hh.w * T;
  const h = hh.h * T;
  const wall = hh.wall || shade(hh.roof, 0.62);

  r(ctx, x + 4, y + 6, w, h, 'rgba(0,0,0,.32)');

  if (flat) {
    roofBlock(ctx, x, y, w, h, hh);
    if (w >= 2 * T) {
      r(ctx, x + 10, y + 10, 16, 12, '#6b7492');
      r(ctx, x + 12, y + 12, 12, 8, '#8a93b8');
    }
    return;
  }

  const facade = Math.min(Math.round(h * 0.45), 34);
  const roofH = h - facade;

  roofBlock(ctx, x - 3, y - 3, w + 6, roofH + 6, hh);

  r(ctx, x, y + roofH, w, facade, wall);
  r(ctx, x, y + roofH, w, 3, shade(wall, 1.25));
  r(ctx, x, y + h - 3, w, 3, shade(wall, 0.7));

  // หน้าต่างข้างประตู
  for (let i = 0; i < hh.w; i++) {
    const wx = x + i * T + 8;
    if (i === Math.floor(hh.w / 2)) continue;
    window32(ctx, wx, y + roofH + 6, 16, 14, wall);
  }

  // ประตู
  const dw = 18;
  const dh = Math.min(24, facade - 4);
  const dx = x + w / 2 - dw / 2;
  const dy = y + h - dh;
  r(ctx, dx - 2, dy - 2, dw + 4, dh + 2, shade(wall, 0.6));
  r(ctx, dx, dy, dw, dh, '#141a30');
  r(ctx, dx + 3, dy + 4, dw - 6, dh - 8, '#26304e');
}

/** สร้างเลเยอร์อาคาร 32px ทั้งแผนที่ (โปร่งใส) */
export function buildBuildingsLayer32(
  cols: number,
  rows: number,
  buildings: BuildingLike[],
  houses: BuildingLike[],
  flat: boolean
): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cols * T;
  cv.height = rows * T;
  const ctx = cv.getContext('2d');
  if (!ctx) return cv;
  ctx.imageSmoothingEnabled = false;
  houses.forEach(function (h) { drawHouse32(ctx, h, flat); });
  buildings.forEach(function (b) { drawBuilding32(ctx, b, flat); });
  return cv;
}
