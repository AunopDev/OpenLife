/* OpenLife — อาคาร/บ้านในแผนที่เมือง (2.5D: หลังคาด้านบน + ผนังหน้าด้านล่าง)
   RESEARCH: docs/research/city-streetscape-art.md
   กฎ: ห้ามมีปล่องไฟ · ห้ามตัวอักษร/โลโก้แบรนด์จริง · กลางวันหน้าต่างเป็นกระจกมืด
   ไฟกลางคืนส่งผ่าน emit()/glow() เท่านั้น */
import type { BuildingSpec, HouseSpec, CityStyle } from '../world/district-maps';
import { px, alpha, dither, ellipse, line, shade, pick, Rng } from './pixel';
import { emit, glow, LIGHT } from './night';
import { CITY, FACADES, SIGNS, AWNINGS, ROOF_TILES, HOUSE_WALLS } from './palette';

const ART = 16;

interface Box { x: number; y: number; w: number; h: number; }

function box(t: { x: number; y: number; w: number; h: number }): Box {
  return { x: t.x * ART, y: t.y * ART, w: t.w * ART, h: t.h * ART };
}

function dropShadow(b: Box, a = 0.34): void {
  alpha(a, function () { px(b.x + 3, b.y + 4, b.w, b.h, CITY.shadow); });
}

/* ---------- ชิ้นส่วนพื้นฐาน ---------- */

/** หน้าต่างกระจก (กลางวันมืด) + ไฟกลางคืนตามโอกาส lit */
function windowPane(r: Rng, x: number, y: number, w: number, h: number, lit: number, warm = true, grille = false): void {
  px(x - 1, y - 1, w + 2, h + 2, CITY.frame);
  px(x, y, w, h, CITY.glass);
  px(x, y, w, 1, CITY.glassL);
  px(x, y + 1, 1, Math.max(1, h - 2), CITY.glassL);
  if (grille) for (let xx = 1; xx < w; xx += 2) px(x + xx, y, 1, h, CITY.grille);
  if (r() < lit) {
    const c = warm ? (r() < 0.5 ? LIGHT.warm : LIGHT.warm2) : LIGHT.cool;
    emit(x, y, w, h, c);
    if (grille) for (let xx = 1; xx < w; xx += 2) emit(x + xx, y, 1, h, shade(c, -0.55));
  }
}

function acUnit(x: number, y: number): void {
  px(x, y, 4, 3, '#d8dad6');
  px(x, y + 2, 4, 1, '#a9aca8');
  px(x + 1, y + 1, 1, 1, '#5a5e66');
}

function waterTank(x: number, y: number, steel: boolean): void {
  alpha(0.3, function () { ellipse(x + 1, y + 2, 3, 2, CITY.shadow); });
  ellipse(x, y, 3, 2, steel ? '#c9d0d8' : '#3f74b8');
  px(x - 1, y - 1, 2, 1, steel ? '#f0f4f8' : '#6f9ad6');
}

function roofItems(r: Rng, x: number, y: number, w: number, h: number): void {
  const k = r();
  if (k < 0.32) waterTank(x + 4 + Math.floor(r() * Math.max(1, w - 9)), y + 4, true);
  else if (k < 0.48) waterTank(x + 4 + Math.floor(r() * Math.max(1, w - 9)), y + 4, false);
  else if (k < 0.68) { acUnit(x + 2, y + 3); if (w > 12) acUnit(x + 8, y + 3); }
  else if (k < 0.82) {
    // เพิงหลังคาสังกะสีบนดาดฟ้า
    px(x + 2, y + 2, Math.min(10, w - 4), Math.min(7, h - 4), '#9aa2aa');
    for (let i = 0; i < Math.min(7, h - 4); i += 2) px(x + 2, y + 2 + i, Math.min(10, w - 4), 1, '#7e868e');
  } else {
    // ราวตากผ้า
    line(x + 2, y + 4, x + w - 3, y + 4, '#5a5a5a');
    const cols = ['#c8423a', '#3f6fb0', '#f0f0f0', '#e0a13a', '#3d8a4a'];
    for (let i = 3; i < w - 3; i += 3) px(x + i, y + 5, 2, 2 + (i % 2), pick(r, cols));
  }
  if (r() < 0.35) {
    // กระถางต้นไม้บนดาดฟ้า
    px(x + w - 4, y + h - 5, 2, 2, '#8a5a3a');
    px(x + w - 5, y + h - 7, 4, 2, '#3d7d4d');
  }
}

/** หลังคาคอนกรีตแบน + ขอบกันตก */
function flatRoof(x: number, y: number, w: number, h: number, c: string, r: Rng): void {
  px(x, y, w, h, c);
  dither(x + 1, y + 1, w - 2, h - 2, shade(c, -0.08), 2, 0.25);
  for (let i = 0; i < 3; i++) {
    alpha(0.18, function () { px(x + 1 + Math.floor(r() * (w - 4)), y + 1 + Math.floor(r() * (h - 3)), 3, 2, '#4a4640'); });
  }
  px(x, y, w, 1, shade(c, 0.28));
  px(x, y, 1, h, shade(c, 0.18));
  px(x + w - 1, y, 1, h, shade(c, -0.2));
  px(x, y + h - 1, w, 1, shade(c, -0.35));
}

function signBand(r: Rng, x: number, y: number, w: number, c: string, nightBright = true): void {
  px(x, y, w, 3, c);
  px(x, y, w, 1, shade(c, 0.3));
  for (let i = 3; i < w - 3; i += 3) px(x + i, y + 1, 2, 1, 'rgba(255,255,255,.85)');
  if (nightBright) emit(x, y, w, 3, shade(c, 0.45));
  if (r() < 0.1) px(x + 1, y + 1, 1, 1, '#ffffff');
}

function awning(r: Rng, x: number, y: number, w: number): string {
  const c = pick(r, AWNINGS);
  px(x, y, w, 2, c);
  for (let i = 0; i < w; i += 4) px(x + i, y, 2, 2, '#ece8df');
  px(x, y + 2, w, 1, 'rgba(0,0,0,.28)');
  return c;
}

function shutter(x: number, y: number, w: number, h: number): void {
  px(x, y, w, h, '#8e9299');
  for (let yy = 1; yy < h; yy += 2) px(x, y + yy, w, 1, '#767a82');
  px(x, y, w, 1, '#5e6168');
}

function shopInterior(r: Rng, x: number, y: number, w: number, h: number, warm = true): void {
  px(x, y, w, h, '#3c2c24');
  const goods = ['#e0a13a', '#c8423a', '#3d8a4a', '#3f6fb0', '#ece8df', '#d9603a'];
  for (let i = 1; i < w - 1; i += 2) {
    px(x + i, y + 1 + Math.floor(r() * Math.max(1, h - 2)), 1, 1, pick(r, goods));
  }
  emit(x, y, w, h, warm ? '#6b4a32' : '#4a5a6a');
  for (let i = 1; i < w - 1; i += 2) emit(x + i, y + 1 + (i % Math.max(1, h - 2)), 1, 1, warm ? LIGHT.warm : LIGHT.cool);
}

/* ---------- ตึกแถว ---------- */

export function drawShophouseRow(h: HouseSpec, r: Rng): void {
  const b = box(h);
  const roofH = 14;
  const wallY = b.y + roofH;
  const wallH = b.h - roofH;
  dropShadow(b);
  const units = Math.max(1, Math.round(b.w / ART));
  for (let u = 0; u < units; u++) {
    const ux = b.x + u * ART;
    const col = pick(r, FACADES);
    // ดาดฟ้า
    flatRoof(ux, b.y, ART, roofH, shade('#9a968e', r() * 0.12 - 0.06), r);
    roofItems(r, ux, b.y, ART, roofH);
    // ผนังหน้า
    px(ux, wallY, ART, wallH, col);
    px(ux, wallY, ART, 1, shade(col, 0.2));
    // ชั้นบน: หน้าต่างเหล็กดัด 2 บาน + แอร์แขวน + คราบฝน
    windowPane(r, ux + 2, wallY + 2, 5, 4, 0.55, true, true);
    windowPane(r, ux + 9, wallY + 2, 5, 4, 0.45, true, true);
    if (r() < 0.6) acUnit(ux + (r() < 0.5 ? 2 : 10), wallY + 6);
    alpha(0.2, function () { px(ux + 4, wallY + 7, 1, 3, '#3a3530'); px(ux + 11, wallY + 7, 1, 2, '#3a3530'); });
    // แถบป้าย + ชั้นล่าง
    const shop = r() < 0.6;
    if (shop) {
      signBand(r, ux + 1, wallY + 8, ART - 2, pick(r, SIGNS));
      awning(r, ux, wallY + 11, ART);
      shopInterior(r, ux + 2, wallY + 13, ART - 4, wallH - 14);
      glow(ux + 8, b.y + b.h + 2, 16, LIGHT.warm, 0.18);
    } else {
      px(ux + 1, wallY + 8, ART - 2, 2, shade(col, -0.12));
      shutter(ux + 2, wallY + 11, ART - 4, wallH - 12);
    }
    // เสาแบ่งห้อง + ธรณีประตู
    px(ux, wallY, 1, wallH, shade(col, -0.28));
    px(ux, b.y + b.h - 1, ART, 1, '#5b5852');
  }
  px(b.x + b.w - 1, wallY, 1, wallH, shade('#c4b49a', -0.3));
}

/* ---------- บ้านเดี่ยว หลังคาปั้นหยา (ไม่มีปล่องไฟ) ---------- */

function hipRoof(x: number, y: number, w: number, h: number, c: string): void {
  const dark = shade(c, -0.25);
  for (let i = 0; i < h; i++) {
    const t = h > 1 ? i / (h - 1) : 1;
    const inset = Math.round((1 - t) * Math.min(6, w / 4));
    px(x - 2 + inset, y + i, w + 4 - inset * 2, 1, i % 3 === 0 ? dark : c);
  }
  // สันหลังคา + ตะเข้สัน
  const inset0 = Math.round(Math.min(6, w / 4));
  px(x - 2 + inset0, y, w + 4 - inset0 * 2, 1, shade(c, 0.3));
  line(x - 2 + inset0, y, x - 2, y + h - 1, shade(c, 0.15));
  line(x + w + 1 - inset0, y, x + w + 1, y + h - 1, dark);
  // ชายคาเงา
  px(x - 2, y + h, w + 4, 1, 'rgba(0,0,0,.35)');
}

export function drawDetachedHouse(h: HouseSpec | BuildingSpec, r: Rng, porchLight = false): void {
  const b = box(h);
  const roofH = Math.round(b.h * 0.5);
  const wallY = b.y + roofH;
  const wallH = b.h - roofH;
  const wall = pick(r, HOUSE_WALLS);
  const roofC = pick(r, ROOF_TILES);
  dropShadow(b, 0.3);
  px(b.x, wallY, b.w, wallH, wall);
  px(b.x, wallY + wallH - 2, b.w, 2, shade(wall, -0.18));
  const cx = Math.round(b.x + b.w / 2);
  // หน้าต่างอะลูมิเนียม
  for (let wx = b.x + 3; wx < b.x + b.w - 6; wx += 10) {
    if (Math.abs(wx + 3 - cx) < 6) continue;
    px(wx - 1, wallY + 3, 8, 7, '#a9aeb4');
    windowPane(r, wx, wallY + 4, 6, 5, 0.6);
  }
  // ประตูไม้ + ชานหน้าบ้าน
  px(cx - 4, wallY + 4, 8, wallH - 4, '#5a3a24');
  px(cx - 3, wallY + 5, 6, wallH - 5, '#7a4e2e');
  px(cx + 1, wallY + 9, 1, 1, '#e0c070');
  px(cx - 6, b.y + b.h - 1, 12, 1, '#b5b0a5');
  // กระถางหน้าบ้าน
  px(b.x + 1, b.y + b.h - 3, 3, 2, '#8a5a3a');
  px(b.x + 1, b.y + b.h - 5, 3, 2, '#3d7d4d');
  if (porchLight) {
    px(cx - 1, wallY + 2, 2, 1, '#fff2c0');
    emit(cx - 1, wallY + 2, 2, 1, LIGHT.warm);
    glow(cx, wallY + 4, 14, LIGHT.warm, 0.22);
  }
  hipRoof(b.x, b.y, b.w, roofH, roofC);
}

/* ---------- บ้านไม้ยกใต้ถุน (เหนือ/อีสาน/ใต้) ---------- */

export function drawStiltHouse(h: HouseSpec, r: Rng): void {
  const b = box(h);
  const roofH = 13;
  const floorH = 9;
  const wallY = b.y + roofH;
  const underY = wallY + floorH;
  const underH = b.h - roofH - floorH;
  dropShadow(b, 0.28);
  // ใต้ถุน: เงามืด + เสา + โอ่ง + แคร่
  alpha(0.55, function () { px(b.x + 1, underY, b.w - 2, underH, '#2a2218'); });
  for (let x = b.x + 1; x < b.x + b.w; x += 7) px(x, underY, 2, underH, '#5a3e28');
  ellipse(b.x + 5, b.y + b.h - 4, 2, 2, '#7a3e22');
  px(b.x + 4, b.y + b.h - 6, 2, 1, '#a35a32');
  px(b.x + b.w - 14, b.y + b.h - 4, 9, 2, '#a07a4a');
  px(b.x + b.w - 14, b.y + b.h - 2, 1, 2, '#6a4a2a');
  px(b.x + b.w - 6, b.y + b.h - 2, 1, 2, '#6a4a2a');
  // ผนังไม้กระดาน
  px(b.x, wallY, b.w, floorH, '#8a5e3a');
  for (let x = b.x + 1; x < b.x + b.w; x += 2) px(x, wallY, 1, floorH, '#76502f');
  px(b.x, wallY + floorH - 1, b.w, 1, '#4a3220');
  for (let wx = b.x + 4; wx < b.x + b.w - 5; wx += 11) {
    px(wx, wallY + 2, 5, 5, '#2a1f17');
    px(wx - 2, wallY + 2, 2, 5, '#9a6a42');
    px(wx + 5, wallY + 2, 2, 5, '#9a6a42');
    if (r() < 0.55) emit(wx, wallY + 2, 5, 5, LIGHT.warm2);
  }
  // บันไดข้างบ้าน
  for (let i = 0; i < underH; i += 2) px(b.x + b.w - 3 + Math.floor(i / 3), underY + i, 3, 1, '#9a7048');
  // หลังคาจั่ว: สังกะสี หรือ กระเบื้องไม้
  const zinc = r() < 0.55;
  const back = zinc ? '#a4acb4' : '#6a4630';
  const front = zinc ? '#88909a' : '#553624';
  const ridge = Math.round(roofH * 0.45);
  px(b.x - 2, b.y, b.w + 4, ridge, back);
  px(b.x - 3, b.y + ridge, b.w + 6, roofH - ridge, front);
  if (zinc) for (let x = b.x - 2; x < b.x + b.w + 3; x += 2) px(x, b.y, 1, roofH, 'rgba(0,0,0,.12)');
  else for (let y = b.y + 1; y < b.y + roofH; y += 2) px(b.x - 2, y, b.w + 4, 1, 'rgba(0,0,0,.14)');
  px(b.x - 2, b.y + ridge, b.w + 4, 1, shade(back, 0.3));
  px(b.x - 3, b.y + roofH, b.w + 6, 1, 'rgba(0,0,0,.35)');
}

export function drawHouse(h: HouseSpec, r: Rng): void {
  if (h.kind === 'shophouse') drawShophouseRow(h, r);
  else if (h.kind === 'stilt') drawStiltHouse(h, r);
  else drawDetachedHouse(h, r);
}

/* ---------- อาคารหลักตาม id ---------- */

function glassTower(b: Box, r: Rng, roofH: number, tint: string): void {
  const wallY = b.y + roofH;
  const wallH = b.h - roofH;
  // ผนังกระจก + เส้นพื้น/ม่านกระจก
  px(b.x, wallY, b.w, wallH, tint);
  for (let y = wallY + 3; y < b.y + b.h - 7; y += 4) px(b.x, y, b.w, 1, shade(tint, -0.35));
  for (let x = b.x + 3; x < b.x + b.w; x += 4) px(x, wallY, 1, wallH - 7, shade(tint, -0.25));
  alpha(0.22, function () {
    for (let i = 0; i < 3; i++) line(b.x + 6 + i * 14, b.y + b.h - 8, b.x + 14 + i * 14, wallY + 1, '#ffffff');
  });
  for (let y = wallY + 1; y < b.y + b.h - 8; y += 4) {
    for (let x = b.x + 1; x < b.x + b.w - 2; x += 4) {
      if (r() < 0.5) emit(x, y, 2, 2, r() < 0.7 ? LIGHT.cool : LIGHT.warm);
    }
  }
  // ล็อบบี้
  px(b.x + 2, b.y + b.h - 7, b.w - 4, 7, '#5a7a96');
  px(b.x + 2, b.y + b.h - 7, b.w - 4, 1, '#8aa6c0');
  const cx = Math.round(b.x + b.w / 2);
  px(cx - 5, b.y + b.h - 6, 10, 6, '#22344a');
  px(cx - 7, b.y + b.h - 9, 14, 2, '#c9cdd2');
  emit(b.x + 2, b.y + b.h - 6, b.w - 4, 5, '#9ab8d4');
  glow(cx, b.y + b.h + 2, 26, LIGHT.cool, 0.22);
  // หลังคา + ห้องเครื่อง
  flatRoof(b.x, b.y, b.w, roofH, '#5a616c', r);
  px(b.x + Math.round(b.w / 2) - 10, b.y + 3, 20, 9, '#757d88');
  px(b.x + Math.round(b.w / 2) - 10, b.y + 3, 20, 1, '#9aa2ac');
  for (let i = 0; i < 4; i++) acUnit(b.x + 4 + i * 6, b.y + roofH - 6);
  if (b.w >= 64) {
    ellipse(b.x + b.w - 12, b.y + 8, 6, 4, '#3d434c');
    px(b.x + b.w - 14, b.y + 6, 1, 5, '#e8e8e8');
    px(b.x + b.w - 11, b.y + 6, 1, 5, '#e8e8e8');
    px(b.x + b.w - 13, b.y + 8, 2, 1, '#e8e8e8');
    emit(b.x + b.w - 18, b.y + 8, 1, 1, LIGHT.red);
    emit(b.x + b.w - 6, b.y + 8, 1, 1, LIGHT.red);
  }
}

function apartment(b: Box, r: Rng): void {
  const roofH = 14;
  const wallY = b.y + roofH;
  const wallH = b.h - roofH;
  const wall = pick(r, ['#d8cfc0', '#cfd4cc', '#e0d4bc']);
  px(b.x, wallY, b.w, wallH, wall);
  for (let x = b.x + 2; x < b.x + b.w - 6; x += 8) {
    for (let y = wallY + 1; y < b.y + b.h - 8; y += 6) {
      windowPane(r, x, y, 4, 3, 0.6);
      px(x - 1, y + 4, 7, 1, '#7a7e86');
      if (r() < 0.5) acUnit(x + 4, y + 1);
      if (r() < 0.35) px(x + 1, y + 3, 3, 1, pick(r, ['#c8423a', '#3f6fb0', '#f0f0f0']));
    }
  }
  const cx = Math.round(b.x + b.w / 2);
  px(cx - 5, b.y + b.h - 7, 10, 7, '#3a3028');
  px(cx - 4, b.y + b.h - 6, 8, 6, '#6a5a48');
  emit(cx - 4, b.y + b.h - 6, 8, 6, '#c8a878');
  px(cx - 1, b.y + b.h - 9, 2, 1, '#fff2c0');
  emit(cx - 1, b.y + b.h - 9, 2, 1, LIGHT.warm);
  glow(cx, b.y + b.h - 4, 16, LIGHT.warm, 0.2);
  px(b.x, wallY, 1, wallH, shade(wall, -0.25));
  flatRoof(b.x, b.y, b.w, roofH, '#97938b', r);
  waterTank(b.x + 6, b.y + 5, true);
  waterTank(b.x + 13, b.y + 5, false);
  acUnit(b.x + b.w - 8, b.y + 4);
}

function storefront(b: Box, r: Rng, sign: string, kind: string): void {
  const roofH = Math.round(b.h * 0.42);
  const wallY = b.y + roofH;
  const wallH = b.h - roofH;
  const wall = kind === 'gym' ? '#2c2a3a' : kind === 'seven' ? '#eceae4' : pick(r, FACADES);
  px(b.x, wallY, b.w, wallH, wall);
  px(b.x, wallY, b.w, 1, shade(wall, 0.2));
  // ชั้นบน
  for (let x = b.x + 3; x < b.x + b.w - 5; x += 8) windowPane(r, x, wallY + 2, 5, 3, 0.4, true, kind !== 'seven' && kind !== 'gym');
  // แถบป้าย (ไม่มีตัวอักษร) — ร้านสะดวกซื้อใช้สีเดียวเรียบ ไม่ใช้ลายแถบของแบรนด์จริง
  signBand(r, b.x + 1, wallY + 7, b.w - 2, sign);
  // หน้าร้านกระจก
  const fy = wallY + 11;
  const fh = b.y + b.h - fy - 1;
  const cool = kind === 'seven' || kind === 'gym';
  px(b.x + 2, fy, b.w - 4, fh, CITY.glassD);
  px(b.x + 2, fy, b.w - 4, 1, CITY.glassL);
  const fill = cool ? '#cfe2f0' : '#f0d0a0';
  emit(b.x + 2, fy, b.w - 4, fh, cool ? '#a8c4dc' : '#c89a64');
  if (kind === 'seven') {
    for (let x = b.x + 4; x < b.x + b.w - 4; x += 3) {
      px(x, fy + 1, 2, fh - 2, '#5a6470');
      for (let y = fy + 1; y < fy + fh - 1; y += 2) px(x, y, 2, 1, pick(r, ['#e0a13a', '#c8423a', '#3d8a4a', '#3f6fb0']));
    }
    glow(b.x + b.w / 2, b.y + b.h + 3, 30, LIGHT.white, 0.3);
  } else if (kind === 'gym') {
    for (let x = b.x + 5; x < b.x + b.w - 5; x += 7) {
      px(x, fy + fh - 3, 5, 1, '#9aa2ac');
      px(x, fy + fh - 4, 1, 2, '#222');
      px(x + 4, fy + fh - 4, 1, 2, '#222');
    }
    emit(b.x + 1, wallY + 7, b.w - 2, 1, LIGHT.neonPink);
    glow(b.x + b.w / 2, wallY + 8, 22, LIGHT.neonPink, 0.2);
  } else if (kind === 'clothes') {
    for (let x = b.x + 5; x < b.x + b.w - 4; x += 6) {
      px(x, fy + 1, 3, 2, '#e8d0b8');
      px(x - 1, fy + 3, 5, fh - 4, pick(r, ['#c8423a', '#3f6fb0', '#e0a13a', '#7a4ab0', '#3d8a4a']));
    }
  } else if (kind === 'salon') {
    for (let x = b.x + 5; x < b.x + b.w - 5; x += 8) {
      px(x, fy + 1, 4, 3, '#cfe2f0');
      px(x, fy + fh - 4, 4, 3, '#2a2a30');
    }
    // เสาร้านตัดผม
    const bx = b.x + b.w - 3;
    px(bx, fy - 2, 2, fh + 1, '#ece8df');
    for (let y = fy - 2; y < fy + fh; y += 3) { px(bx, y, 2, 1, '#c8423a'); px(bx, y + 1, 2, 1, '#2f4bb0'); }
    emit(bx, fy - 2, 2, fh + 1, '#ffffff');
  } else if (kind === 'bar') {
    px(b.x + 2, fy, b.w - 4, fh, '#3c2620');
    for (let x = b.x + 4; x < b.x + b.w - 4; x += 7) {
      px(x, fy + fh - 3, 4, 2, '#8a5a3a');
      px(x - 1, fy + fh - 1, 1, 1, '#c8423a');
      px(x + 4, fy + fh - 1, 1, 1, '#c8423a');
    }
    for (let x = b.x + 2; x < b.x + b.w - 2; x += 3) {
      px(x, fy - 1 + (x % 2), 1, 1, '#ffe0a0');
      emit(x, fy - 1 + (x % 2), 1, 1, LIGHT.warm);
    }
    glow(b.x + b.w / 2, b.y + b.h, 26, LIGHT.warm2, 0.28);
  } else {
    for (let x = b.x + 4; x < b.x + b.w - 4; x += 4) px(x, fy + 2, 2, fh - 3, fill);
  }
  const cx = Math.round(b.x + b.w / 2);
  px(cx - 4, fy + 1, 8, fh - 1, shade(CITY.glassD, -0.3));
  px(cx, fy + 1, 1, fh - 1, '#9aa2ac');
  px(b.x, wallY, 1, wallH, shade(wall, -0.25));
  px(b.x + b.w - 1, wallY, 1, wallH, shade(wall, -0.3));
  flatRoof(b.x, b.y, b.w, roofH, shade('#9a968e', r() * 0.1 - 0.05), r);
  roofItems(r, b.x, b.y, b.w, roofH);
  if (kind !== 'seven' && kind !== 'gym' && kind !== 'bar') glow(cx, b.y + b.h + 2, 18, LIGHT.warm, 0.2);
}

function marketHall(b: Box, r: Rng): void {
  const roofH = Math.round(b.h * 0.55);
  const wallY = b.y + roofH;
  const wallH = b.h - roofH;
  // ใต้หลังคาเปิดโล่ง: แผงสินค้า + กันสาด
  px(b.x, wallY, b.w, wallH, '#2e2620');
  for (let x = b.x + 1; x < b.x + b.w - 6; x += 9) {
    const c = pick(r, AWNINGS);
    px(x, wallY + 1, 8, 2, c);
    px(x, wallY + 1, 8, 1, shade(c, 0.3));
    px(x, wallY + 4, 8, 3, '#8a6448');
    for (let i = 0; i < 4; i++) px(x + 1 + i * 2, wallY + 3, 1, 1, pick(r, ['#e0a13a', '#c8423a', '#3d8a4a', '#ece8df']));
  }
  for (let x = b.x; x < b.x + b.w; x += 12) px(x, wallY, 2, wallH, '#6a6e76');
  emit(b.x + 1, wallY + 1, b.w - 2, wallH - 2, '#7a5838');
  for (let x = b.x + 4; x < b.x + b.w - 2; x += 6) emit(x, wallY, 1, 1, LIGHT.warm);
  glow(b.x + b.w / 2, b.y + b.h, 44, LIGHT.warm2, 0.3);
  // หลังคาสังกะสี + สนิม
  for (let y = 0; y < roofH; y++) px(b.x - 2, b.y + y, b.w + 4, 1, y % 2 ? '#8a9098' : '#a2a8b0');
  px(b.x - 2, b.y + Math.round(roofH / 2), b.w + 4, 1, '#c4cad2');
  for (let i = 0; i < 5; i++) dither(b.x + Math.floor(r() * (b.w - 10)), b.y + Math.floor(r() * (roofH - 4)), 8, 4, '#8a5a3a', 1, 0.35);
  px(b.x - 2, b.y + roofH, b.w + 4, 1, 'rgba(0,0,0,.4)');
}

function hospital(b: Box, r: Rng, sign: string): void {
  const roofH = Math.round(b.h * 0.42);
  const wallY = b.y + roofH;
  const wallH = b.h - roofH;
  px(b.x, wallY, b.w, wallH, '#e8eaec');
  for (let y = wallY + 2; y < b.y + b.h - 9; y += 5) {
    for (let x = b.x + 3; x < b.x + b.w - 4; x += 6) {
      px(x, y, 4, 3, '#4a7aa8');
      px(x, y, 4, 1, '#8ab0d0');
      if (r() < 0.65) emit(x, y, 4, 3, LIGHT.cool);
    }
  }
  const cx = Math.round(b.x + b.w / 2);
  // ทางเข้า + หลังคากันสาดรถพยาบาล
  px(cx - 9, b.y + b.h - 10, 18, 2, '#c9cdd2');
  px(cx - 5, b.y + b.h - 8, 10, 8, '#5a7a96');
  emit(cx - 5, b.y + b.h - 8, 10, 8, '#bcd8f0');
  px(cx - 3, b.y + b.h - 14, 6, 2, '#ffffff');
  px(cx - 1, b.y + b.h - 16, 2, 6, sign);
  px(cx - 3, b.y + b.h - 14, 6, 2, sign);
  emit(cx - 3, b.y + b.h - 14, 6, 2, LIGHT.red);
  emit(cx - 1, b.y + b.h - 16, 2, 6, LIGHT.red);
  glow(cx, b.y + b.h, 24, LIGHT.cool, 0.24);
  flatRoof(b.x, b.y, b.w, roofH, '#d8dadc', r);
  ellipse(cx, b.y + Math.round(roofH / 2), 7, 6, '#f4f4f4');
  px(cx - 1, b.y + Math.round(roofH / 2) - 4, 3, 9, '#d64b4b');
  px(cx - 4, b.y + Math.round(roofH / 2) - 1, 9, 3, '#d64b4b');
}

function busTerminal(b: Box, r: Rng, rail: boolean): void {
  const roofH = Math.round(b.h * 0.45);
  const wallY = b.y + roofH;
  const wallH = b.h - roofH;
  px(b.x, wallY, b.w, wallH, '#4a4c52');
  if (rail) {
    px(b.x, b.y + b.h - 4, b.w, 1, '#8a8a8a');
    px(b.x, b.y + b.h - 2, b.w, 1, '#8a8a8a');
    for (let x = b.x; x < b.x + b.w; x += 3) px(x, b.y + b.h - 4, 1, 3, '#6a4a30');
  }
  // รถบัส/รถไฟจอดในชานชาลา
  const vy = wallY + 2;
  px(b.x + 3, vy, b.w - 10, 7, rail ? '#3f6fb0' : '#e8ecf0');
  px(b.x + 3, vy + 5, b.w - 10, 1, rail ? '#e8ecf0' : '#2f6fb0');
  for (let x = b.x + 5; x < b.x + b.w - 9; x += 4) {
    px(x, vy + 1, 3, 3, CITY.glass);
    if (r() < 0.7) emit(x, vy + 1, 3, 3, LIGHT.warm);
  }
  for (let x = b.x; x < b.x + b.w; x += 10) px(x, wallY, 2, wallH, '#9aa2ac');
  emit(b.x + 1, wallY, b.w - 2, 1, LIGHT.cool);
  glow(b.x + b.w / 2, b.y + b.h, 34, LIGHT.cool, 0.22);
  // หลังคาโครงเหล็ก canopy
  for (let y = 0; y < roofH; y++) px(b.x - 2, b.y + y, b.w + 4, 1, y % 3 === 0 ? '#4f7f90' : '#6a9aaa');
  for (let x = b.x + 4; x < b.x + b.w; x += 12) alpha(0.5, function () { px(x, b.y + 2, 6, roofH - 4, '#cfe8ee'); });
  px(b.x - 2, b.y + roofH, b.w + 4, 1, 'rgba(0,0,0,.4)');
}

/* ---------- วัด / ศาลเจ้า ---------- */

function watThai(b: Box, r: Rng, lanna: boolean): void {
  // ลานวัด + กำแพงแก้ว
  px(b.x, b.y, b.w, b.h, '#d9d2c2');
  dither(b.x, b.y, b.w, b.h, '#cbc3b1', 2, 0.35);
  px(b.x, b.y, b.w, 2, '#efe9dc');
  px(b.x, b.y, 2, b.h, '#efe9dc');
  px(b.x + b.w - 2, b.y, 2, b.h, '#e2dccd');
  const cx = Math.round(b.x + b.w / 2);
  px(b.x, b.y + b.h - 2, cx - 6 - b.x, 2, '#e2dccd');
  px(cx + 6, b.y + b.h - 2, b.x + b.w - cx - 6, 2, '#e2dccd');
  // อุโบสถ
  const bw = Math.round(b.w * 0.52);
  const ox = cx - Math.round(bw / 2);
  const top = b.y + 5;
  const roofEnd = b.y + Math.round(b.h * (lanna ? 0.74 : 0.64));
  const baseY = b.y + b.h - 6;
  alpha(0.3, function () { px(ox + 3, top + 4, bw, baseY - top, CITY.shadow); });
  // ผนังขาว + ประตูแดงทอง
  px(ox, roofEnd, bw, baseY - roofEnd, '#f2eee4');
  for (let x = ox + 2; x < ox + bw - 1; x += 5) px(x, roofEnd, 1, baseY - roofEnd, '#d8d2c2');
  px(cx - 3, roofEnd + 2, 6, baseY - roofEnd - 2, '#9a2a24');
  px(cx - 3, roofEnd + 2, 6, 1, '#e0b040');
  px(cx, roofEnd + 2, 1, baseY - roofEnd - 2, '#e0b040');
  emit(cx - 3, roofEnd + 2, 6, baseY - roofEnd - 2, '#c89040');
  // บันได + ราวนาค
  px(cx - 6, baseY, 12, 4, '#e6e0d2');
  for (let i = 0; i < 4; i += 2) px(cx - 6, baseY + i, 12, 1, '#cfc8b8');
  px(cx - 7, baseY - 1, 1, 5, '#3f7a4a');
  px(cx + 6, baseY - 1, 1, 5, '#3f7a4a');
  px(cx - 7, baseY + 3, 2, 1, '#e0b040');
  px(cx + 5, baseY + 3, 2, 1, '#e0b040');
  // หลังคาซ้อนชั้น (ภาคกลาง 3 ชั้น / ล้านนาต่ำกว้าง)
  const main = lanna ? '#7a3a24' : '#c8642f';
  const edge = lanna ? '#4a2216' : '#2f6a44';
  const tiers = lanna ? 4 : 3;
  for (let t = 0; t < tiers; t++) {
    const inset = t * (lanna ? 2 : 3) - (lanna ? 3 : 1);
    const ty = top + t * 2;
    const th = roofEnd - ty - t * 3;
    px(ox + inset - 1, ty, bw - inset * 2 + 2, th, edge);
    px(ox + inset, ty, Math.round((bw - inset * 2) / 2), th - 1, shade(main, -0.12));
    px(ox + inset + Math.round((bw - inset * 2) / 2), ty, Math.round((bw - inset * 2) / 2), th - 1, main);
    for (let y = ty + 2; y < ty + th - 1; y += 3) px(ox + inset, y, bw - inset * 2, 1, 'rgba(0,0,0,.12)');
    px(ox + inset - 1, ty + th - 1, bw - inset * 2 + 2, 1, '#e0b040');
  }
  px(cx, top - 1, 1, roofEnd - top - 4, '#e8c050');
  // หน้าบันทอง + ช่อฟ้า
  for (let i = 0; i < 6; i++) px(cx - i, roofEnd - 6 + i, i * 2 + 1, 1, i % 2 ? '#e0b040' : '#a8342c');
  px(cx, roofEnd - 9, 1, 3, '#f0d060');
  px(cx - 1, roofEnd - 10, 3, 1, '#f0d060');
  px(ox - 2, roofEnd - 2, 2, 2, '#f0d060');
  px(ox + bw, roofEnd - 2, 2, 2, '#f0d060');
  emit(cx - 5, roofEnd - 6, 11, 6, '#e8b850');
  // เจดีย์เล็กมุมลาน
  const sx = b.x + 6;
  const sy = b.y + b.h - 8;
  px(sx - 3, sy, 7, 3, '#efe9dc');
  px(sx - 2, sy - 3, 5, 3, '#f4f0e6');
  px(sx - 1, sy - 6, 3, 3, '#f4f0e6');
  px(sx, sy - 9, 1, 3, '#e0b040');
  glow(cx, roofEnd, 48, LIGHT.gold, 0.32);
}

function chineseShrine(b: Box, r: Rng): void {
  px(b.x, b.y, b.w, b.h, '#cfc6b4');
  dither(b.x, b.y, b.w, b.h, '#bfb6a2', 2, 0.35);
  const roofH = Math.round(b.h * 0.5);
  const wallY = b.y + roofH;
  const cx = Math.round(b.x + b.w / 2);
  const ox = b.x + 4;
  const w = b.w - 8;
  px(ox, wallY, w, b.h - roofH - 5, '#b03a32');
  for (let x = ox + 3; x < ox + w; x += 7) px(x, wallY, 2, b.h - roofH - 5, '#7a2620');
  px(cx - 4, wallY + 3, 8, b.h - roofH - 8, '#5a1f1f');
  px(cx - 5, wallY + 1, 10, 2, '#e0a13a');
  emit(cx - 4, wallY + 3, 8, b.h - roofH - 8, '#c86a30');
  // หลังคากระเบื้องเคลือบ ปลายงอน
  px(ox - 4, b.y + 4, w + 8, roofH - 4, '#2f7a5a');
  for (let y = b.y + 5; y < wallY; y += 2) px(ox - 3, y, w + 6, 1, '#3d8a68');
  px(ox - 6, b.y + 3, w + 12, 2, '#e0a13a');
  px(ox - 8, b.y + 1, 3, 2, '#e0a13a');
  px(ox + w + 5, b.y + 1, 3, 2, '#e0a13a');
  px(cx - 4, b.y + 1, 8, 2, '#d64b4b');
  px(ox - 4, wallY - 1, w + 8, 1, 'rgba(0,0,0,.35)');
  // โคมแดง + กระถางธูป
  [ox + 1, ox + w - 4].forEach(function (lx) {
    px(lx, wallY + 1, 4, 4, '#d64b4b');
    px(lx, wallY + 1, 4, 1, '#ff8f3f');
    emit(lx, wallY + 1, 4, 4, LIGHT.red);
    glow(lx + 2, wallY + 3, 12, LIGHT.red, 0.3);
  });
  px(cx - 3, b.y + b.h - 4, 6, 3, '#8a7350');
  px(cx - 2, b.y + b.h - 7, 1, 3, '#c9a06a');
  px(cx + 1, b.y + b.h - 7, 1, 3, '#c9a06a');
  glow(cx, wallY + 6, 34, LIGHT.gold, 0.26);
}

/* ---------- แลนด์มาร์ค ---------- */

function warehouse(b: Box, r: Rng): void {
  const roofH = Math.round(b.h * 0.55);
  const wallY = b.y + roofH;
  px(b.x, wallY, b.w, b.h - roofH, '#7a8496');
  for (let x = b.x + 3; x < b.x + b.w - 8; x += 12) shutter(x, wallY + 3, 9, b.h - roofH - 3);
  for (let y = 0; y < roofH; y++) px(b.x - 1, b.y + y, b.w + 2, 1, y % 2 ? '#4f6a8a' : '#5f7c9c');
  px(b.x - 1, b.y + roofH, b.w + 2, 1, 'rgba(0,0,0,.4)');
  // ตู้คอนเทนเนอร์หน้าโกดัง
  px(b.x + 2, b.y + b.h - 6, 12, 5, '#c8423a');
  px(b.x + 15, b.y + b.h - 6, 12, 5, '#3f6fb0');
  for (let x = b.x + 3; x < b.x + 27; x += 2) px(x, b.y + b.h - 6, 1, 5, 'rgba(0,0,0,.18)');
  emit(b.x + 2, wallY + 1, 2, 2, LIGHT.warm);
  glow(b.x + b.w / 2, b.y + b.h, 24, LIGHT.warm2, 0.16);
}

function mall(b: Box, r: Rng, sign: string): void {
  const roofH = Math.round(b.h * 0.45);
  const wallY = b.y + roofH;
  const wallH = b.h - roofH;
  px(b.x, wallY, b.w, wallH, '#d8dce2');
  px(b.x + 2, wallY + 2, b.w - 4, wallH - 4, CITY.glassD);
  for (let x = b.x + 4; x < b.x + b.w - 4; x += 7) {
    const c = pick(r, SIGNS);
    px(x, wallY + 3, 4, wallH - 9, c);
    emit(x, wallY + 3, 4, wallH - 9, shade(c, 0.4));
  }
  const cx = Math.round(b.x + b.w / 2);
  px(cx - 7, b.y + b.h - 6, 14, 6, '#5a7a96');
  emit(cx - 7, b.y + b.h - 6, 14, 6, '#d0e4f4');
  signBand(r, b.x + 4, wallY - 1, b.w - 8, sign);
  glow(cx, b.y + b.h, 40, LIGHT.cool, 0.3);
  flatRoof(b.x, b.y, b.w, roofH, '#a7acb2', r);
  for (let x = b.x + 6; x < b.x + b.w - 8; x += 10) {
    px(x, b.y + 4, 6, roofH - 8, '#6a8aa6');
    px(x, b.y + 4, 6, 1, '#a8c4dc');
  }
}

function monument(b: Box, r: Rng): void {
  // ลานกลางเมือง + แปลงดอกไม้ + เสาอนุสาวรีย์
  px(b.x, b.y, b.w, b.h, '#cfc8b6');
  dither(b.x, b.y, b.w, b.h, '#bfb8a6', 2, 0.4);
  const cx = Math.round(b.x + b.w / 2);
  const cy = Math.round(b.y + b.h / 2) + 6;
  ellipse(cx, cy, 16, 9, '#3d7d4d');
  for (let i = 0; i < 26; i++) px(cx - 14 + Math.floor(r() * 28), cy - 7 + Math.floor(r() * 14), 1, 1, pick(r, ['#ffd75e', '#ff8fb1', '#ffffff', '#e05a3a']));
  ellipse(cx, cy, 6, 4, '#e6e0d2');
  alpha(0.35, function () { px(cx + 1, cy - 2, 10, 3, CITY.shadow); });
  px(cx - 2, cy - 26, 5, 26, '#ece6d8');
  px(cx + 2, cy - 26, 1, 26, '#c8c0ae');
  px(cx - 3, cy - 28, 7, 2, '#e0b040');
  px(cx - 1, cy - 31, 3, 3, '#f0d060');
  emit(cx - 2, cy - 26, 5, 26, '#fff0c8');
  glow(cx, cy - 10, 36, LIGHT.gold, 0.3);
}

export function drawCityBuilding(bs: BuildingSpec, style: CityStyle, r: Rng): void {
  const b = box(bs);
  if (bs.id === 'temple') {
    if (style.wat === 'chinese') chineseShrine(b, r);
    else watThai(b, r, style.wat === 'lanna');
    return;
  }
  if (bs.id === 'landmark') {
    const n = bs.name;
    if (n.indexOf('ศาลเจ้า') >= 0) chineseShrine(b, r);
    else if (n.indexOf('ท่าเรือ') >= 0) warehouse(b, r);
    else if (n.indexOf('ศูนย์การค้า') >= 0) mall(b, r, bs.sign);
    else if (n.indexOf('สถานีรถไฟ') >= 0) busTerminal(b, r, true);
    else if (n.indexOf('โรงแรม') >= 0 || n.indexOf('ตึก') >= 0) { dropShadow(b); glassTower(b, r, 16, '#3a5a7a'); }
    else monument(b, r);
    return;
  }
  dropShadow(b);
  switch (bs.id) {
    case 'office': glassTower(b, r, Math.round(b.h * 0.42), '#2c4a6a'); break;
    case 'home':
      if (style.archetype === 'urban') apartment(b, r);
      else drawDetachedHouse(bs, r, true);
      break;
    case 'market': marketHall(b, r); break;
    case 'hospital': hospital(b, r, bs.sign); break;
    case 'station': busTerminal(b, r, false); break;
    case 'seven': storefront(b, r, bs.sign, 'seven'); break;
    case 'gym': storefront(b, r, bs.sign, 'gym'); break;
    case 'clothes': storefront(b, r, bs.sign, 'clothes'); break;
    case 'salon': storefront(b, r, bs.sign, 'salon'); break;
    case 'bar': storefront(b, r, bs.sign, 'bar'); break;
    default: storefront(b, r, bs.sign, 'shop'); break;
  }
}
