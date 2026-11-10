/* OpenLife — pixel-art primitives (typed) สำหรับโมดูลวาดภาพใหม่
   กฎ: วาดที่ art px จำนวนเต็มเสมอ (Math.round) · ไม่เปิด imageSmoothing
   โมดูลนี้มี ctx ของตัวเอง — ใช้ผ่าน layer() เท่านั้น ไม่แตะ ctx ของ game.ts */

let ctx: CanvasRenderingContext2D | null = null;

/** ctx ปัจจุบันของ layer ที่กำลังวาด */
export function g(): CanvasRenderingContext2D {
  if (!ctx) throw new Error('pixel: no active layer');
  return ctx;
}

/** สร้าง canvas ขนาด w×h แล้ววาดด้วย fn (ซ้อนกันได้) */
export function layer(w: number, h: number, fn: () => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const prev = ctx;
  ctx = c.getContext('2d');
  if (!ctx) throw new Error('pixel: 2d context unavailable');
  ctx.imageSmoothingEnabled = false;
  try {
    fn();
  } finally {
    ctx = prev;
  }
  return c;
}

export function px(x: number, y: number, w: number, h: number, c: string): void {
  const k = g();
  k.fillStyle = c;
  k.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

/** วาดใน fn ด้วยความโปร่งใส a แล้วคืนค่าเดิม */
export function alpha(a: number, fn: () => void): void {
  const k = g();
  const prev = k.globalAlpha;
  k.globalAlpha = prev * a;
  try {
    fn();
  } finally {
    k.globalAlpha = prev;
  }
}

/** ลายตารางหมากรุก step px — ให้พื้นผิวแบบ dither */
export function dither(x: number, y: number, w: number, h: number, c: string, step: number, a = 1): void {
  alpha(a, function () {
    for (let yy = 0; yy < h; yy += step) {
      const off = (Math.floor(yy / step) % 2) * step;
      for (let xx = off; xx < w; xx += step * 2) px(x + xx, y + yy, Math.min(step, w - xx), Math.min(step, h - yy), c);
    }
  });
}

/** เงาวงรีแบนใต้ object (กว้าง w) */
export function shadow(x: number, y: number, w: number, a = 0.3): void {
  alpha(a, function () {
    px(x - w / 2, y, w, 1, '#050817');
    px(x - w / 2 + 1, y + 1, w - 2, 1, '#050817');
    if (w > 8) px(x - w / 2 + 3, y + 2, w - 6, 1, '#050817');
  });
}

/** เส้นตรงแบบพิกเซล (Bresenham) หนา 1px */
export function line(x0: number, y0: number, x1: number, y1: number, c: string): void {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let guard = 0; guard < 4096; guard++) {
    px(x0, y0, 1, 1, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/** สายไฟหย่อนระหว่างสองจุด (parabola) */
export function wire(x0: number, y0: number, x1: number, y1: number, sag: number, c: string): void {
  const n = Math.max(2, Math.round(Math.abs(x1 - x0) + Math.abs(y1 - y0)));
  let lx = Math.round(x0);
  let ly = Math.round(y0);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t + sag * 4 * t * (1 - t));
    if (x !== lx || y !== ly) px(x, y, 1, 1, c);
    lx = x;
    ly = y;
  }
}

/** วงรีเต็ม (ใช้กับร่ม/ทรงพุ่ม/ถังน้ำมุมบน) */
export function ellipse(cx: number, cy: number, rx: number, ry: number, c: string): void {
  for (let yy = -ry; yy <= ry; yy++) {
    const t = 1 - (yy * yy) / (ry * ry + 0.0001);
    if (t < 0) continue;
    const half = Math.round(rx * Math.sqrt(t));
    px(cx - half, cy + yy, half * 2 + 1, 1, c);
  }
}

/* ---------- seeded randomness (ห้ามใช้ Math.random ในงานภาพ) ---------- */

export type Rng = () => number;

export function rng(seed: number): Rng {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pick<T>(r: Rng, list: T[]): T {
  return list[Math.floor(r() * list.length) % list.length];
}

/** ปรับสี hex ให้สว่าง (+) / มืด (−) ตาม amt (-1..1) */
export function shade(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = function (v: number) {
    const out = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt);
    return Math.max(0, Math.min(255, Math.round(out)));
  };
  const r = f((n >> 16) & 255);
  const gg = f((n >> 8) & 255);
  const b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (gg << 8) | b).toString(16).slice(1);
}
