/* OpenLife — start menu with animated pixel-art Bangkok skyline
   RESEARCH: docs/research/ui-main-menu.md
   หลักการ: Continue มาก่อนถ้ามีเซฟ, เริ่มเกมได้เร็ว, พื้นหลังเคลื่อนไหวแบบ parallax */
import { isSoundEnabled, toggleSound, playSfx, unlockAudio } from './audio';

export interface StartMenuOptions {
  hasSave: boolean;
  saveInfo?: string;
  onNew: () => void;
  onContinue: () => void;
}

let menuEl: HTMLElement | null = null;
let rafId = 0;
let lastDraw = 0;
let cleanup: (() => void) | null = null;

/* ---------- helpers ---------- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mix(a: number[], b: number[], t: number): number[] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

function rgb(c: number[]): string {
  return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
}

function rgba(c: number[], a: number): string {
  return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
}

/* ---------- skyline data ---------- */

interface Bldg {
  x: number;
  w: number;
  h: number;
  seed: number;
  kind: number;
}

interface LayerSpec {
  seed: number;
  count: number;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  speed: number;
}

function makeLayer(spec: LayerSpec): Bldg[] {
  const r = mulberry32(spec.seed);
  const list: Bldg[] = [];
  let x = -20;
  for (let i = 0; i < spec.count + 1; i++) {
    const w = spec.minW + r() * (spec.maxW - spec.minW);
    const h = spec.minH + r() * (spec.maxH - spec.minH);
    list.push({ x: x, w: Math.round(w), h: Math.round(h), seed: Math.floor(r() * 100000), kind: Math.floor(r() * 5) });
    x += w + 3 + r() * 10;
  }
  return list;
}

const W = 480;
const H = 270;
const FAR = makeLayer({ seed: 1201, count: 34, minW: 14, maxW: 30, minH: 30, maxH: 86, speed: 3 });
const MID = makeLayer({ seed: 4407, count: 26, minW: 18, maxW: 38, minH: 40, maxH: 104, speed: 7 });
const NEAR = makeLayer({ seed: 8891, count: 22, minW: 22, maxW: 46, minH: 20, maxH: 46, speed: 14 });

const CLOUDS = (function () {
  const r = mulberry32(777);
  const out: { x: number; y: number; w: number; s: number; v: number }[] = [];
  for (let i = 0; i < 7; i++) {
    out.push({ x: r() * W, y: 18 + r() * 70, w: 26 + r() * 46, s: 0.6 + r() * 0.7, v: 3 + r() * 6 });
  }
  return out;
})();

const CARS = (function () {
  const r = mulberry32(3121);
  const out: { x: number; lane: number; v: number; kind: number; c: number }[] = [];
  for (let i = 0; i < 9; i++) {
    out.push({
      x: r() * W,
      lane: i % 2,
      v: 26 + r() * 46,
      kind: Math.floor(r() * 3),
      c: Math.floor(r() * 4)
    });
  }
  return out;
})();

const PEOPLE = (function () {
  const r = mulberry32(9042);
  const out: { x: number; v: number; off: number }[] = [];
  for (let i = 0; i < 7; i++) out.push({ x: r() * W, v: 7 + r() * 8, off: r() * 6 });
  return out;
})();

const STARS = (function () {
  const r = mulberry32(6001);
  const out: { x: number; y: number; p: number }[] = [];
  for (let i = 0; i < 70; i++) out.push({ x: r() * W, y: r() * 130, p: r() * 6.28 });
  return out;
})();

const CAR_COLORS = ['#ffd75e', '#ff8f3f', '#7dd3fc', '#e05a72'];

/* ---------- drawing ---------- */

function drawPixelDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const hw = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
    if (hw <= 0) continue;
    ctx.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2, 1);
  }
}

function drawSky(ctx: CanvasRenderingContext2D, t: number) {
  const blend = (Math.sin(t * 0.000045) + 1) / 2;
  const top = mix([38, 30, 82], [5, 8, 26], blend);
  const mid = mix([122, 70, 118], [14, 22, 58], blend);
  const low = mix([240, 164, 104], [44, 60, 96], blend);

  const g = ctx.createLinearGradient(0, 0, 0, 200);
  g.addColorStop(0, rgb(top));
  g.addColorStop(0.58, rgb(mid));
  g.addColorStop(1, rgb(low));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 210);

  // stars
  if (blend > 0.18) {
    STARS.forEach(function (s, i) {
      const tw = (Math.sin(t * 0.0012 + s.p) + 1) / 2;
      ctx.globalAlpha = (blend - 0.18) * (0.3 + tw * 0.5);
      ctx.fillStyle = i % 9 === 0 ? '#ffe9a8' : '#e8eeff';
      ctx.fillRect(Math.round(s.x - (t * 0.006) % W + W) % W, Math.round(s.y), 1, 1);
    });
    ctx.globalAlpha = 1;
  }

  // warm horizon glow
  const glow = ctx.createLinearGradient(0, 148, 0, 216);
  glow.addColorStop(0, 'rgba(255,164,96,0)');
  glow.addColorStop(1, rgba([255, 150, 90], 0.05 + (1 - blend) * 0.16));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 148, W, 68);

  // sun sinking
  const sunY = 118 + blend * 62;
  const sunA = Math.max(0, 1 - blend * 1.15);
  if (sunA > 0.02) {
    ctx.globalAlpha = 0.16 * sunA;
    drawPixelDisc(ctx, W * 0.78, sunY, 30, '#ffb45c');
    ctx.globalAlpha = sunA;
    drawPixelDisc(ctx, W * 0.78, sunY, 14, '#ffd98a');
    ctx.globalAlpha = 1;
  }

  // moon
  if (blend > 0.25) {
    ctx.globalAlpha = (blend - 0.25) * 0.95;
    drawPixelDisc(ctx, W * 0.46, 48 + (1 - blend) * 16, 8, '#f2f4ff');
    ctx.globalAlpha = (blend - 0.25) * 0.22;
    drawPixelDisc(ctx, W * 0.46, 48 + (1 - blend) * 16, 12, '#c9d6ff');
    ctx.globalAlpha = 1;
  }

  // clouds
  CLOUDS.forEach(function (c) {
    const x = ((c.x - t * 0.001 * c.v) % (W + 120) + W + 120) % (W + 120) - 60;
    const col = mix([255, 190, 180], [110, 130, 180], blend);
    ctx.globalAlpha = 0.22 + 0.1 * c.s;
    ctx.fillStyle = rgb(col);
    const yy = Math.round(c.y);
    ctx.fillRect(Math.round(x), yy, Math.round(c.w), 3);
    ctx.fillRect(Math.round(x + 6), yy - 3, Math.round(c.w * 0.62), 3);
    ctx.fillRect(Math.round(x + 12), yy - 6, Math.round(c.w * 0.34), 3);
    ctx.globalAlpha = 1;
  });

  return blend;
}

function drawWindows(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  seed: number,
  night: number,
  warm: boolean
) {
  const cols = Math.max(1, Math.floor((bw - 4) / 5));
  const rows = Math.max(1, Math.floor((bh - 6) / 6));
  for (let ry = 0; ry < rows; ry++) {
    for (let cx = 0; cx < cols; cx++) {
      const n = (seed + ry * 31 + cx * 17) % 100;
      if (n > 58) continue;
      const on = (n + Math.floor(seed / 7)) % 5 !== 0;
      if (!on) continue;
      const wx = Math.round(bx + 3 + cx * 5);
      const wy = Math.round(by + 4 + ry * 6);
      ctx.globalAlpha = 0.35 + night * 0.6;
      ctx.fillStyle = warm ? (n % 3 === 0 ? '#ffd98a' : '#ffe9c0') : '#9fd6ff';
      ctx.fillRect(wx, wy, 2, 2);
      ctx.globalAlpha = 1;
    }
  }
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  list: Bldg[],
  speed: number,
  t: number,
  baseY: number,
  color: string,
  night: number,
  warm: boolean,
  detail: boolean
) {
  const off = (t * 0.001 * speed) % W;
  list.forEach(function (b) {
    let x = b.x - off;
    if (x < -60) x += W + 60;
    if (x > W + 60) return;
    const by = baseY - b.h;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), by, b.w, b.h);
    // roof silhouette
    if (b.kind === 0) {
      ctx.fillRect(Math.round(x + 2), by - 3, b.w - 4, 3);
    } else if (b.kind === 1) {
      ctx.fillRect(Math.round(x + b.w * 0.3), by - 5, Math.round(b.w * 0.25), 5);
    } else if (b.kind === 2 && detail) {
      // antenna
      ctx.fillRect(Math.round(x + b.w * 0.68), by - 9, 1, 9);
      ctx.fillStyle = night > 0.4 ? '#ff5c6c' : 'rgba(255,92,108,.7)';
      ctx.fillRect(Math.round(x + b.w * 0.68), by - 10, 1, 1);
    }
    if (detail) {
      drawWindows(ctx, x, by, b.w, b.h, b.seed, night, warm);
      // vertical edge highlight
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#c9d6ff';
      ctx.fillRect(Math.round(x), by, 1, b.h);
      ctx.globalAlpha = 1;
    }
  });
}

function drawTemple(ctx: CanvasRenderingContext2D, x: number, baseY: number, night: number) {
  // prang / wat silhouette
  const gold = mix([168, 132, 70], [120, 96, 52], night);
  ctx.fillStyle = rgb(gold);
  for (let i = 0; i < 34; i++) {
    const half = Math.max(1, Math.round((34 - i) * 0.62));
    ctx.globalAlpha = 0.9;
    ctx.fillRect(x - half, baseY - i, half * 2, 1);
  }
  ctx.globalAlpha = 1;
  // spire
  ctx.fillRect(x - 1, baseY - 46, 2, 12);
  ctx.fillRect(x - 4, baseY - 40, 8, 2);
  ctx.fillRect(x - 6, baseY - 34, 12, 2);
  // warm lights
  ctx.globalAlpha = 0.3 + night * 0.5;
  ctx.fillStyle = '#ffcf5e';
  ctx.fillRect(x - 5, baseY - 4, 2, 2);
  ctx.fillRect(x + 3, baseY - 4, 2, 2);
  ctx.globalAlpha = 1;
}

function drawBts(ctx: CanvasRenderingContext2D, t: number, night: number) {
  const railY = 186;
  ctx.fillStyle = rgb(mix([46, 48, 74], [20, 24, 44], night));
  ctx.fillRect(0, railY, W, 4);
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = rgb(mix([70, 72, 98], [30, 34, 58], night));
  for (let x = 0; x < W; x += 34) {
    ctx.fillRect(x, railY + 4, 3, 190 - railY - 4);
  }
  ctx.globalAlpha = 1;

  // train passes every ~16s
  const period = 16000;
  const phase = (t % period) / period;
  const tx = -140 + phase * (W + 280);
  if (tx > -120 && tx < W + 120) {
    const cars = 4;
    for (let i = 0; i < cars; i++) {
      const x = Math.round(tx + i * 34);
      ctx.fillStyle = rgb(mix([220, 228, 240], [120, 136, 170], night));
      ctx.fillRect(x, railY - 16, 30, 14);
      ctx.fillStyle = rgb(mix([60, 68, 96], [30, 36, 58], night));
      ctx.fillRect(x, railY - 2, 30, 2);
      ctx.fillStyle = night > 0.3 ? '#ffe9a8' : '#7dd3fc';
      for (let k = 0; k < 5; k++) {
        ctx.globalAlpha = 0.55 + night * 0.4;
        ctx.fillRect(x + 2 + k * 5, railY - 13, 3, 4);
        ctx.globalAlpha = 1;
      }
    }
  }
}

function drawBillboard(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const hue = (t * 0.02) % 360;
  // โครงป้าย
  ctx.fillStyle = '#0d1024';
  ctx.fillRect(x - 22, y - 22, 44, 24);
  ctx.fillStyle = '#20264a';
  ctx.fillRect(x - 20, y - 20, 40, 20);
  // จอไฟ
  const g = ctx.createLinearGradient(x - 18, y - 18, x + 18, y - 4);
  g.addColorStop(0, 'hsl(' + hue + ',72%,58%)');
  g.addColorStop(0.5, 'hsl(' + ((hue + 60) % 360) + ',72%,52%)');
  g.addColorStop(1, 'hsl(' + ((hue + 150) % 360) + ',72%,48%)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 18, y - 18, 36, 10);
  // ตัวอักษรจำลอง
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.fillRect(x - 14, y - 15, 12, 2);
  ctx.fillRect(x - 14, y - 11, 20, 1);
  ctx.fillStyle = 'rgba(10,12,30,.55)';
  ctx.fillRect(x - 18, y - 6, 36, 4);
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  for (let i = 0; i < 4; i++) ctx.fillRect(x - 16 + i * 9, y - 5, 5, 1);
  // ขารอง + ไฟสปอตไลต์
  ctx.fillStyle = '#0d1024';
  ctx.fillRect(x - 1, y + 2, 3, 20);
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#9fd6ff';
  ctx.fillRect(x - 26, y + 8, 52, 10);
  ctx.globalAlpha = 1;
}

function drawCars(ctx: CanvasRenderingContext2D, t: number, night: number) {
  const laneY = [246, 258];
  CARS.forEach(function (c) {
    const dir = c.lane === 0 ? 1 : -1;
    const span = W + 80;
    let x = ((c.x + dir * t * 0.001 * c.v) % span + span) % span - 40;
    const y = laneY[c.lane];
    const col = CAR_COLORS[c.c % CAR_COLORS.length];
    // body
    ctx.fillStyle = col;
    if (c.kind === 0) {
      ctx.fillRect(Math.round(x), y, 16, 6);
      ctx.fillRect(Math.round(x + 4), y - 3, 8, 3);
      ctx.fillStyle = night > 0.3 ? '#ffe9a8' : 'rgba(255,255,255,.55)';
      ctx.fillRect(Math.round(x + 5), y - 2, 5, 2);
    } else if (c.kind === 1) {
      // tuk-tuk
      ctx.fillRect(Math.round(x + 2), y - 4, 10, 8);
      ctx.fillStyle = '#2a2030';
      ctx.fillRect(Math.round(x), y + 2, 14, 3);
      ctx.fillStyle = night > 0.3 ? '#ffd75e' : '#ffd75e';
      ctx.fillRect(Math.round(x + 10), y - 2, 3, 2);
    } else {
      ctx.fillRect(Math.round(x), y, 20, 6);
      ctx.fillRect(Math.round(x + 3), y - 4, 10, 4);
      ctx.fillStyle = night > 0.3 ? '#ffe9a8' : 'rgba(255,255,255,.5)';
      ctx.fillRect(Math.round(x + 4), y - 3, 7, 2);
    }
    // lights
    const nose = dir > 0 ? x + (c.kind === 2 ? 20 : 16) : x;
    const tail = dir > 0 ? x : x + (c.kind === 2 ? 20 : 16);
    ctx.globalAlpha = 0.5 + night * 0.5;
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(Math.round(nose), y + (dir > 0 ? 1 : 1), 3, 2);
    ctx.fillStyle = '#ff5c6c';
    ctx.fillRect(Math.round(tail), y + 2, 2, 2);
    // beam
    ctx.globalAlpha = 0.05 + night * 0.09;
    ctx.fillStyle = '#ffe9a8';
    if (dir > 0) ctx.fillRect(Math.round(x + 18), y + 1, 14, 2);
    else ctx.fillRect(Math.round(x - 14), y + 1, 14, 2);
    ctx.globalAlpha = 1;
  });
}

function drawPeople(ctx: CanvasRenderingContext2D, t: number, night: number) {
  const y = 240;
  PEOPLE.forEach(function (p) {
    const span = W + 20;
    let x = ((p.x + t * 0.001 * p.v) % span + span) % span - 10;
    const bob = Math.abs(Math.sin(t * 0.004 + p.off)) > 0.6 ? 1 : 0;
    ctx.fillStyle = rgb(mix([30, 26, 44], [12, 12, 26], night));
    ctx.fillRect(Math.round(x), y - 6 - bob, 2, 4);
    ctx.fillRect(Math.round(x), y - 2, 2, 3);
    ctx.fillRect(Math.round(x - 1), y - 1, 1, 2);
    ctx.fillRect(Math.round(x + 2), y - 1, 1, 2);
  });
}

function drawRoad(ctx: CanvasRenderingContext2D, t: number, night: number) {
  ctx.fillStyle = rgb(mix([46, 48, 66], [16, 18, 32], night));
  ctx.fillRect(0, 244, W, H - 244);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.fillRect(0, 244, W, 1);
  // lane dashes
  const off = (t * 0.02) % 18;
  ctx.fillStyle = 'rgba(220,228,255,.34)';
  for (let x = -18; x < W + 18; x += 18) {
    ctx.fillRect(Math.round(x - off), 253, 9, 1);
  }
  // curb
  ctx.fillStyle = rgb(mix([60, 62, 82], [24, 26, 42], night));
  ctx.fillRect(0, 242, W, 2);
}

function drawVignette(ctx: CanvasRenderingContext2D) {
  const g = ctx.createRadialGradient(W * 0.5, H * 0.45, 40, W * 0.5, H * 0.5, W * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.7, 'rgba(0,0,0,.18)');
  g.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawFrame(ctx: CanvasRenderingContext2D, t: number) {
  const night = drawSky(ctx, t);

  // far skyline
  drawLayer(ctx, FAR, 3, t, 208, rgb(mix([58, 52, 92], [12, 14, 36], night)), night, false, false);
  // mid skyline
  drawLayer(ctx, MID, 7, t, 218, rgb(mix([38, 34, 70], [9, 12, 30], night)), night, true, true);

  // temple landmark (fixed-ish)
  drawTemple(ctx, 300 - ((t * 0.0007) % 60) + 20, 218, night);

  // BTS + billboard
  drawBts(ctx, t, night);
  drawBillboard(ctx, 436, 176, t);

  // near shophouses
  drawLayer(ctx, NEAR, 14, t, 236, rgb(mix([26, 24, 48], [6, 8, 22], night)), night, true, true);

  // street
  drawPeople(ctx, t, night);
  drawRoad(ctx, t, night);
  drawCars(ctx, t, night);

  // drifting fireflies / dust
  for (let i = 0; i < 18; i++) {
    const p = (t * 0.00012 + i * 0.137) % 1;
    const x = ((i * 53 + Math.sin(t * 0.0009 + i) * 18) % W + W) % W;
    const y = 200 + Math.sin(t * 0.0011 + i * 1.7) * 12 + (i % 5) * 6;
    ctx.globalAlpha = (night > 0.3 ? 0.35 : 0.12) * (0.4 + 0.6 * (1 - p));
    ctx.fillStyle = i % 3 === 0 ? '#ffd98a' : '#bfeef0';
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    ctx.globalAlpha = 1;
  }

  drawVignette(ctx);
}

/* ---------- menu UI ---------- */

function menuHelpHtml(): string {
  return (
    '<div class="menu-help-card" role="dialog" aria-modal="true" aria-label="วิธีเล่น">' +
    '<div class="menu-help-title">หนึ่งชีวิต · เริ่มยังไง</div>' +
    '<div class="menu-help-text">' +
    '<p>คุณจะใช้ชีวิตหนึ่งชีวิตตั้งแต่เกิดจนถึงบั้นปลาย — เลือกครอบครัว ความฝัน และทางเดินของตัวเอง</p>' +
    '<p><b>เดินและโต้ตอบ:</b> แตะ/คลิกพื้นเพื่อเดิน แตะอาคารหรือจุดสนใจเพื่อเดินไปใช้งาน</p>' +
    '<p><b>เวลา:</b> แตะนาฬิกา (หรือกด N) เพื่อเดิน +1/+3/+6/+12 เดือน แต่ละช่วงมีกิจกรรมจำกัด 3/5/7/9 ครั้ง</p>' +
    '<p><b>เงินและหนี้:</b> แตะตัวเลขเงิน (หรือกด F) เพื่อจ่ายบิล/หนี้ มีผลจริงถ้าค้างชำระ</p>' +
    '<p><b>โลก:</b> เดินไปป้ายรถเมล์สายใต้เพื่อเข้าเขตบางขุนเทียน (ทะเล คลอง ป่าชายเลน)</p>' +
    '<p class="menu-help-note">เคล็ดลับ: ใช้ปุ่ม ? ในเกมเพื่อเปิดคู่มือและทัวร์สอนเล่นอีกครั้ง</p>' +
    '</div>' +
    '<button class="menu-btn primary" type="button" data-menu="help-close">เข้าใจแล้ว</button>' +
    '</div>'
  );
}

export function openStartMenu(opts: StartMenuOptions): void {
  closeStartMenu();
  unlockAudio();

  const root = document.createElement('div');
  root.className = 'start-menu';
  root.id = 'startMenu';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'เมนูหลัก OpenLife');

  const saveLine = opts.hasSave && opts.saveInfo
    ? '<span class="menu-save">เซฟล่าสุด · ' + escapeHtml(opts.saveInfo) + '</span>'
    : '<span class="menu-save dim">ยังไม่มีเซฟ</span>';

  const primary = opts.hasSave ? 'continue' : 'new';
  const continueBtn = opts.hasSave
    ? '<button class="menu-btn primary" type="button" data-menu="continue">เล่นต่อ' +
      '<span class="menu-btn-sub">' + escapeHtml(opts.saveInfo || 'ชีวิตเดิม') + '</span></button>'
    : '';
  const newBtn = '<button class="menu-btn' + (primary === 'new' ? ' primary' : '') + '" type="button" data-menu="new">' +
    (opts.hasSave ? 'เริ่มชีวิตใหม่' : 'เริ่มชีวิตใหม่') +
    '<span class="menu-btn-sub">' + (opts.hasSave ? 'เขียนทับเซฟเดิม' : 'เกิดมาเป็นใคร?') + '</span></button>';

  root.innerHTML =
    '<canvas id="menuBg" width="480" height="270" aria-hidden="true"></canvas>' +
    '<div class="menu-scan" aria-hidden="true"></div>' +
    '<div class="menu-side" aria-hidden="true">BANGKOK · 2547—</div>' +
    '<div class="menu-card">' +
    '<div class="menu-eyebrow">ชีวิตหนึ่ง · ตั้งแต่เกิดจนตาย</div>' +
    '<div class="menu-logo" aria-label="OpenLife"><span>OPEN</span>LIFE</div>' +
    '<div class="menu-tag">เกมจำลองชีวิตคนไทย · 4–6 ชั่วโมงต่อหนึ่งชีวิต</div>' +
    '<div class="menu-save-row">' + saveLine + '</div>' +
    '<div class="menu-buttons">' + continueBtn + newBtn +
    '<button class="menu-btn" type="button" data-menu="help">วิธีเล่น</button>' +
    '<button class="menu-btn" type="button" data-menu="sound">เสียง: ' + (isSoundEnabled() ? 'เปิด' : 'ปิด') + '</button>' +
    '</div>' +
    '<div class="menu-foot"><span>v0.2 · research-first life sim</span><span>แตะเพื่อเริ่ม</span></div>' +
    '</div>' +
    '<div class="menu-help hidden" id="menuHelp">' + menuHelpHtml() + '</div>';

  document.body.appendChild(root);
  document.body.classList.add('menu-open');
  menuEl = root;

  const canvas = root.querySelector('#menuBg') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.imageSmoothingEnabled = false;

  const help = root.querySelector('#menuHelp') as HTMLElement;
  const soundBtn = root.querySelector('[data-menu="sound"]') as HTMLButtonElement;

  root.addEventListener('click', function (ev) {
    const el = (ev.target as HTMLElement).closest('[data-menu]') as HTMLElement | null;
    if (!el) return;
    const act = el.getAttribute('data-menu');
    playSfx('click');
    if (act === 'new') {
      closeStartMenu();
      opts.onNew();
      return;
    }
    if (act === 'continue') {
      closeStartMenu();
      opts.onContinue();
      return;
    }
    if (act === 'help') {
      help.classList.remove('hidden');
      const hb = help.querySelector('[data-menu="help-close"]') as HTMLButtonElement | null;
      if (hb) hb.focus();
      return;
    }
    if (act === 'help-close') {
      help.classList.add('hidden');
      return;
    }
    if (act === 'sound') {
      const on = toggleSound();
      soundBtn.textContent = 'เสียง: ' + (on ? 'เปิด' : 'ปิด');
      return;
    }
  });

  const onKey = function (ev: KeyboardEvent) {
    if (ev.key === 'Escape' && !help.classList.contains('hidden')) {
      help.classList.add('hidden');
      ev.preventDefault();
    }
  };
  window.addEventListener('keydown', onKey);

  // animation loop (throttled, pauses when tab hidden)
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const speed = reduced ? 0.25 : 1;
  let t0 = 0;

  const tick = function (ts: number) {
    rafId = requestAnimationFrame(tick);
    if (document.hidden) return;
    if (!t0) t0 = ts;
    const t = (ts - t0) * speed;
    if (ts - lastDraw < 33) return;
    lastDraw = ts;
    if (!ctx) return;
    drawFrame(ctx, t);
  };
  rafId = requestAnimationFrame(tick);

  // focus first action for keyboard users
  const first = root.querySelector('.menu-btn.primary') as HTMLButtonElement | null;
  if (first) first.focus();

  cleanup = function () {
    cancelAnimationFrame(rafId);
    window.removeEventListener('keydown', onKey);
  };

  // preview one frame immediately so there is no flash
  if (ctx) drawFrame(ctx, 0);
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function closeStartMenu(): void {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
  cancelAnimationFrame(rafId);
  if (menuEl && menuEl.parentNode) menuEl.parentNode.removeChild(menuEl);
  menuEl = null;
  document.body.classList.remove('menu-open');
}
