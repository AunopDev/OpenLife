/* OpenLife — static art ของแผนที่เมือง (spec จาก city-maps.ts ที่มี spec.style)
   คืน 2 เลเยอร์: day (ฉากเต็ม กระจกมืด) + night (เฉพาะสิ่งเรืองแสง โปร่งใส) + รายการแสงฟุ้ง
   RESEARCH: docs/research/city-streetscape-art.md
   กฎ: โซนต้องมาจาก districtZone() ตัวเดียวกับ audit/collision · ทางม้าลาย/สะพานคำนวณจากจุดตัดจริง
   ห้ามใช้ Math.random — ใช้ rng(hashStr(spec.id)) */
import { districtZone } from '../world/district-maps';
import type { DistrictSpec, CityStyle, Rect, BuildingSpec, HouseSpec } from '../world/district-maps';
import { layer, px, alpha, dither, ellipse, rng, hashStr, shade, pick, Rng } from './pixel';
import { resetNight, takeNight, Glow } from './night';
import { CITY } from './palette';
import { drawCityBuilding, drawHouse } from './city-buildings';
import { drawCityTree, drawCityProp, drawPowerWires } from './city-props';

const ART = 16;

export interface CityMapArt {
  day: HTMLCanvasElement;
  night: HTMLCanvasElement;
  lights: Glow[];
}

function inRect(r: Rect, tx: number, ty: number): boolean {
  return tx >= r.x && ty >= r.y && tx < r.x + r.w && ty < r.y + r.h;
}

function intersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 <= x || y2 <= y) return null;
  return { x: x, y: y, w: x2 - x, h: y2 - y };
}

/* ---------- พื้น ---------- */

function grassTile(r: Rng, x: number, y: number, p: any, lush: boolean): void {
  px(x, y, ART, ART, p.grass);
  if (r() < 0.5) dither(x, y, ART, ART, p.grassDark, 2, 0.28);
  for (let i = 0; i < (lush ? 14 : 9); i++) px(x + Math.floor(r() * ART), y + Math.floor(r() * ART), 1, 1, r() < 0.55 ? p.grassDark : p.grassLight);
  for (let i = 0; i < 3; i++) {
    const bx = x + Math.floor(r() * (ART - 1));
    const by = y + Math.floor(r() * (ART - 2));
    px(bx, by, 1, 2, shade(p.grassLight, 0.1));
  }
  if (lush && r() < 0.25) px(x + Math.floor(r() * ART), y + Math.floor(r() * ART), 1, 1, pick(r, ['#ffd75e', '#ff8fb1', '#f4f0e6']));
}

function concreteTile(r: Rng, x: number, y: number): void {
  const c = shade(CITY.concrete, r() * 0.08 - 0.04);
  px(x, y, ART, ART, c);
  dither(x, y, ART, ART, CITY.concreteD, 2, 0.12);
  px(x, y, ART, 1, CITY.joint);
  px(x, y, 1, ART, CITY.joint);
  if (r() < 0.35) alpha(0.2, function () { ellipse(x + 4 + Math.floor(r() * 8), y + 4 + Math.floor(r() * 8), 2 + Math.floor(r() * 3), 1 + Math.floor(r() * 2), '#3a3630'); });
  if (r() < 0.15) px(x + 2 + Math.floor(r() * 10), y + 3 + Math.floor(r() * 10), 4, 1, CITY.concreteD);
}

function dirtTile(r: Rng, x: number, y: number): void {
  px(x, y, ART, ART, CITY.dirt);
  dither(x, y, ART, ART, CITY.dirtD, 2, 0.3);
  for (let i = 0; i < 6; i++) px(x + Math.floor(r() * ART), y + Math.floor(r() * ART), 1, 1, CITY.dirtL);
}

function parkingTile(r: Rng, x: number, y: number): void {
  concreteTile(r, x, y);
  for (let xx = 1; xx < ART; xx += 5) px(x + xx, y + 2, 1, ART - 4, '#d8d6cc');
  if (r() < 0.6) {
    // รถจอดมองจากด้านบน
    const c = pick(r, ['#c8423a', '#e8e8e8', '#2f2f36', '#3f6fb0', '#9aa2ac']);
    px(x + 2, y + 4, 3, 8, c);
    px(x + 2, y + 6, 3, 2, CITY.glass);
  }
}

function nearBuilt(spec: DistrictSpec, tx: number, ty: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (districtZone(spec, tx + dx, ty + dy) === 'building') return true;
    }
  }
  return false;
}

function drawGround(spec: DistrictSpec, style: CityStyle, r: Rng): void {
  const p = spec.palette;
  for (let ty = 0; ty < spec.h; ty++) {
    for (let tx = 0; tx < spec.w; tx++) {
      const x = tx * ART;
      const y = ty * ART;
      const zone = districtZone(spec, tx, ty);
      if (style.archetype === 'urban') {
        if (zone === 'green' && r() < 0.1 && !nearBuilt(spec, tx, ty)) parkingTile(r, x, y);
        else concreteTile(r, x, y);
      } else if (style.archetype === 'town') {
        if (zone === 'green' && nearBuilt(spec, tx, ty) && r() < 0.55) {
          if (r() < 0.6) concreteTile(r, x, y); else dirtTile(r, x, y);
        } else grassTile(r, x, y, p, false);
      } else {
        if (zone === 'green' && r() < 0.08) dirtTile(r, x, y);
        else grassTile(r, x, y, p, true);
      }
    }
  }
}

/* ---------- น้ำ ---------- */

function drawWater(spec: DistrictSpec, style: CityStyle, r: Rng): void {
  const p = spec.palette;
  spec.sand.forEach(function (s) {
    const x = s.x * ART;
    const y = s.y * ART;
    const w = s.w * ART;
    const h = s.h * ART;
    px(x, y, w, h, p.sand);
    for (let i = 0; i < (w * h) / 12; i++) px(x + Math.floor(r() * w), y + Math.floor(r() * h), 1, 1, r() < 0.5 ? p.sandDark : p.sandLight);
    for (let xx = 0; xx < w; xx += 2) px(x + xx, y, 2, 1 + Math.floor(Math.abs(Math.sin(xx * 0.1)) * 3), p.sandDark);
  });
  spec.water.forEach(function (wr) {
    const x = wr.x * ART;
    const y = wr.y * ART;
    const w = wr.w * ART;
    const h = wr.h * ART;
    if (wr.type === 'sea') {
      px(x, y, w, h, p.sea);
      for (let i = 0; i < h; i++) alpha((i / h) * 0.5, function () { px(x, y + i, w, 1, p.seaDeep); });
      for (let i = 0; i < (w * h) / 40; i++) px(x + Math.floor(r() * w), y + Math.floor(r() * h), 2 + Math.floor(r() * 3), 1, r() < 0.6 ? 'rgba(150,215,220,.35)' : 'rgba(255,255,255,.22)');
      for (let xx = 0; xx < w; xx += 2) px(x + xx, y + Math.round(Math.sin(xx * 0.11) * 1.5), 3, 1, 'rgba(238,246,244,.75)');
      return;
    }
    const urban = style.archetype === 'urban';
    // ตลิ่ง: เขื่อนคอนกรีต+ราว (เมือง) / ดินโคลน (ชนบท)
    if (urban || style.archetype === 'town') {
      px(x - 2, y - 2, w + 4, h + 4, CITY.bank);
      px(x - 2, y - 2, w + 4, 1, shade(CITY.bank, 0.2));
      px(x - 1, y - 1, w + 2, h + 2, CITY.bankD);
      if (urban) {
        for (let xx = x - 2; xx < x + w + 2; xx += 4) { px(xx, y - 3, 1, 2, '#c4c0b6'); px(xx, y + h + 1, 1, 2, '#c4c0b6'); }
        for (let yy = y - 2; yy < y + h + 2; yy += 4) { px(x - 3, yy, 2, 1, '#c4c0b6'); px(x + w + 1, yy, 2, 1, '#c4c0b6'); }
      }
    } else {
      px(x - 2, y - 2, w + 4, h + 4, p.mud);
      px(x - 1, y - 1, w + 2, h + 2, shade(p.mud, -0.15));
    }
    px(x, y, w, h, CITY.canal);
    for (let i = 0; i < h; i += 2) alpha(0.2, function () { px(x, y + i, w, 1, i % 4 === 0 ? CITY.canalL : CITY.canalD); });
    for (let i = 0; i < (w * h) / 36; i++) {
      px(x + Math.floor(r() * w), y + Math.floor(r() * h), 2 + Math.floor(r() * 4), 1, r() < 0.5 ? 'rgba(170,210,190,.25)' : 'rgba(20,40,30,.28)');
    }
    // ผักตบชวาลอยริมตลิ่ง
    const clumps = Math.round((w + h) / (urban ? 40 : 18));
    for (let i = 0; i < clumps; i++) {
      const vertical = h > w;
      const cx = vertical ? x + (r() < 0.5 ? 2 : w - 4) : x + Math.floor(r() * (w - 4));
      const cy = vertical ? y + Math.floor(r() * (h - 4)) : y + (r() < 0.5 ? 1 : h - 4);
      px(cx, cy, 3, 2, '#3d7a3a');
      px(cx + 1, cy - 1, 2, 1, '#5a9a4a');
      if (r() < 0.3) px(cx + 1, cy, 1, 1, '#b08ad0');
    }
  });
}

/* ---------- ทางเข้าอาคาร ---------- */

function drawDriveways(spec: DistrictSpec): void {
  const starts: number[][] = [];
  spec.buildings.forEach(function (b) { starts.push([b.door, b.y + b.h]); });
  spec.houses.forEach(function (h) { if (h.kind !== 'shophouse') starts.push([h.x + Math.floor(h.w / 2), h.y + h.h]); });
  starts.forEach(function (s) {
    for (let ty = s[1]; ty < s[1] + 5; ty++) {
      if (districtZone(spec, s[0], ty) !== 'green') break;
      const x = s[0] * ART + 4;
      const y = ty * ART;
      px(x, y, 8, ART, CITY.concreteL);
      px(x, y, 1, ART, CITY.concreteD);
      px(x + 7, y, 1, ART, CITY.concreteD);
      for (let yy = 4; yy < ART; yy += 8) px(x + 1, y + yy, 6, 1, CITY.joint);
    }
  });
}

/* ---------- ทางเท้า + ขอบทาง ---------- */

function drawSidewalks(spec: DistrictSpec, style: CityStyle, r: Rng, inters: Rect[]): void {
  const busStops = spec.props.filter(function (p) { return p.type === 'sign'; });
  const markets = spec.buildings.filter(function (b) { return b.id === 'market' || b.id === 'station'; });
  const nearInter = function (tx: number, ty: number) {
    return inters.some(function (i) { return tx >= i.x - 2 && tx < i.x + i.w + 2 && ty >= i.y - 2 && ty < i.y + i.h + 2; });
  };
  const nearStop = function (tx: number, ty: number) {
    return busStops.some(function (p) { return Math.abs(p.x - 0.5 - tx) <= 1 && Math.abs(p.y - 0.5 - ty) <= 1; }) ||
      markets.some(function (b) { return Math.abs(b.door - tx) <= 1 && ty >= b.y + b.h && ty <= b.y + b.h + 2; });
  };
  spec.sidewalks.forEach(function (s) {
    for (let ty = s.y; ty < s.y + s.h; ty++) {
      for (let tx = s.x; tx < s.x + s.w; tx++) {
        if (districtZone(spec, tx, ty) !== 'sidewalk') continue;
        const x = tx * ART;
        const y = ty * ART;
        if (style.archetype === 'rural') {
          // ชนบท: ไหล่ทางคอนกรีตเรียบ ไม่ปูกระเบื้อง ขอบแดง-ขาวเฉพาะใกล้แยก
          px(x, y, ART, ART, CITY.concreteL);
          dither(x, y, ART, ART, CITY.concrete, 2, 0.25);
          if (s.h === 1) px(x, y, 1, ART, CITY.joint); else px(x, y, ART, 1, CITY.joint);
          if (r() < 0.2) px(x + Math.floor(r() * 12), y + Math.floor(r() * 12), 2, 2, CITY.dirt);
          if (!nearInter(tx, ty)) continue;
        } else {
        px(x, y, ART, ART, CITY.grout);
        for (let yy = 0; yy < ART; yy += 4) {
          for (let xx = 0; xx < ART; xx += 4) {
            const k = r();
            const c = k < 0.06 ? CITY.walkRed : k < 0.5 ? CITY.walk : k < 0.9 ? CITY.walkL : CITY.walkD;
            px(x + xx, y + yy, 3, 3, c);
          }
        }
        if (r() < 0.12) px(x + Math.floor(r() * 12), y + Math.floor(r() * 12), 3, 1, '#5e5a52');
        // แผ่นนำทางคนพิการ (urban) TODO(research) ตำแหน่งจริงไม่สม่ำเสมอ
        if (style.archetype === 'urban') {
          if (s.h === 1) px(x, y + 7, ART, 2, '#d8b03a');
          else px(x + 7, y, 2, ART, '#d8b03a');
        }
        }
        // ขอบทาง: เฉพาะด้านที่ติดถนน
        const sides: number[][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        sides.forEach(function (d) {
          if (districtZone(spec, tx + d[0], ty + d[1]) !== 'road') return;
          const red = nearInter(tx, ty);
          const yellow = !red && nearStop(tx, ty);
          const ex = d[0] === 1 ? x + ART - 2 : x;
          const ey = d[1] === 1 ? y + ART - 2 : y;
          const horiz = d[0] === 0;
          for (let i = 0; i < ART; i += 2) {
            const seg = (i / 2) % 2 === 0;
            const c = red ? (seg ? CITY.curbRed : CITY.curbWhite) : yellow ? (seg ? CITY.curbYellow : CITY.curbWhite) : CITY.curb;
            if (horiz) px(x + i, ey, 2, 2, c); else px(ex, y + i, 2, 2, c);
          }
        });
      }
    }
  });
}

/* ---------- ถนน ---------- */

function drawRoads(spec: DistrictSpec, r: Rng, inters: Rect[]): void {
  const inInter = function (tx: number, ty: number) { return inters.some(function (i) { return inRect(i, tx, ty); }); };
  spec.roads.forEach(function (rd) {
    const x = rd.x * ART;
    const y = rd.y * ART;
    const w = rd.w * ART;
    const h = rd.h * ART;
    px(x, y, w, h, CITY.asphalt);
    for (let i = 0; i < (w * h) / 30; i++) {
      const k = r();
      px(x + Math.floor(r() * w), y + Math.floor(r() * h), 1, 1, k < 0.5 ? CITY.asphaltD : CITY.asphaltL);
    }
    for (let i = 0; i < Math.max(2, Math.round((w + h) / 90)); i++) {
      const pw = 6 + Math.floor(r() * 14);
      const ph = 3 + Math.floor(r() * 6);
      px(x + Math.floor(r() * Math.max(1, w - pw)), y + Math.floor(r() * Math.max(1, h - ph)), pw, ph, CITY.asphaltPatch);
    }
    const horiz = rd.w > rd.h;
    // รอยล้อ
    alpha(0.1, function () {
      if (horiz) { px(x, y + 6, w, 2, '#d8d4c8'); px(x, y + h - 8, w, 2, '#d8d4c8'); }
      else { px(x + 6, y, 2, h, '#d8d4c8'); px(x + w - 8, y, 2, h, '#d8d4c8'); }
    });
    // คราบน้ำมันกลางเลน
    for (let i = 0; i < Math.round((w + h) / 60); i++) {
      alpha(0.25, function () {
        ellipse(x + (horiz ? Math.floor(r() * w) : Math.round(w / 4) + Math.floor(r() * 2) * Math.round(w / 2)),
          y + (horiz ? Math.round(h / 4) + Math.floor(r() * 2) * Math.round(h / 2) : Math.floor(r() * h)), 2, 1, '#202126');
      });
    }
    // เส้นจราจร: กลางเหลืองประ, ขอบขาว — เว้นในแยก
    const len = horiz ? rd.w : rd.h;
    for (let t = 0; t < len; t++) {
      const tx = horiz ? rd.x + t : rd.x;
      const ty = horiz ? rd.y : rd.y + t;
      if (inInter(tx, ty)) continue;
      if (horiz) {
        const lx = tx * ART;
        px(lx + 2, y + Math.round(h / 2) - 1, 6, 1, CITY.lineYellow);
        px(lx + 10, y + Math.round(h / 2) - 1, 4, 1, CITY.lineYellow);
        px(lx, y + 2, ART, 1, CITY.lineWhite);
        px(lx, y + h - 3, ART, 1, CITY.lineWhite);
      } else {
        const ly = ty * ART;
        px(x + Math.round(w / 2) - 1, ly + 2, 1, 6, CITY.lineYellow);
        px(x + Math.round(w / 2) - 1, ly + 10, 1, 4, CITY.lineYellow);
        px(x + 2, ly, 1, ART, CITY.lineWhite);
        px(x + w - 3, ly, 1, ART, CITY.lineWhite);
      }
    }
    // ฝาท่อ + ตะแกรงระบายน้ำริมขอบ
    for (let t = 2; t < len - 1; t += 5 + Math.floor(r() * 4)) {
      const tx = horiz ? rd.x + t : rd.x;
      const ty = horiz ? rd.y : rd.y + t;
      if (inInter(tx, ty)) continue;
      const mx = horiz ? tx * ART + 6 : x + 10;
      const my = horiz ? y + 10 : ty * ART + 6;
      ellipse(mx, my, 2, 1, '#2a2b30');
      px(mx - 1, my, 3, 1, '#55565c');
      const gx = horiz ? tx * ART + 2 : x + 3;
      const gy = horiz ? y + 3 : ty * ART + 2;
      px(gx, gy, horiz ? 5 : 2, horiz ? 2 : 5, '#25262a');
    }
  });
}

/** ทางม้าลาย + เส้นหยุดบนแขนถนนรอบทุกแยก */
function drawCrosswalks(spec: DistrictSpec, inters: Rect[]): void {
  const isRoad = function (tx: number, ty: number) { return districtZone(spec, tx, ty) === 'road'; };
  inters.forEach(function (it) {
    const ix = it.x * ART;
    const iy = it.y * ART;
    const iw = it.w * ART;
    const ih = it.h * ART;
    if (isRoad(it.x - 1, it.y) && !inters.some(function (o) { return inRect(o, it.x - 1, it.y); })) {
      for (let yy = 2; yy < ih - 1; yy += 4) px(ix - 8, iy + yy, 7, 2, CITY.lineWhite);
      px(ix - 10, iy + Math.round(ih / 2), 1, Math.round(ih / 2) - 1, CITY.lineWhite);
    }
    if (isRoad(it.x + it.w, it.y) && !inters.some(function (o) { return inRect(o, it.x + it.w, it.y); })) {
      for (let yy = 2; yy < ih - 1; yy += 4) px(ix + iw + 1, iy + yy, 7, 2, CITY.lineWhite);
      px(ix + iw + 9, iy + 1, 1, Math.round(ih / 2) - 1, CITY.lineWhite);
    }
    if (isRoad(it.x, it.y - 1) && !inters.some(function (o) { return inRect(o, it.x, it.y - 1); })) {
      for (let xx = 2; xx < iw - 1; xx += 4) px(ix + xx, iy - 8, 2, 7, CITY.lineWhite);
      px(ix + 1, iy - 10, Math.round(iw / 2) - 1, 1, CITY.lineWhite);
    }
    if (isRoad(it.x, it.y + it.h) && !inters.some(function (o) { return inRect(o, it.x, it.y + it.h); })) {
      for (let xx = 2; xx < iw - 1; xx += 4) px(ix + xx, iy + ih + 1, 2, 7, CITY.lineWhite);
      px(ix + Math.round(iw / 2), iy + ih + 9, Math.round(iw / 2) - 1, 1, CITY.lineWhite);
    }
  });
}

/** สะพานตรงที่ถนนข้ามน้ำ */
function drawBridges(spec: DistrictSpec): void {
  spec.roads.forEach(function (rd) {
    spec.water.forEach(function (wr) {
      if (wr.type === 'sea') return;
      const it = intersect(rd, wr);
      if (!it) return;
      const x = it.x * ART;
      const y = it.y * ART;
      const w = it.w * ART;
      const h = it.h * ART;
      const horiz = rd.w > rd.h;
      // เงาสะพานบนน้ำ + ราวสะพาน
      if (horiz) {
        alpha(0.4, function () { px(x, y + h, w, 3, '#1a2a22'); });
        px(x - 2, y - 2, w + 4, 2, '#c4c0b6');
        px(x - 2, y + h, w + 4, 2, '#a39f94');
        for (let xx = x - 2; xx < x + w + 2; xx += 3) { px(xx, y - 3, 1, 1, '#e0dcd2'); px(xx, y + h + 1, 1, 1, '#8a867c'); }
      } else {
        alpha(0.4, function () { px(x + w, y, 3, h, '#1a2a22'); });
        px(x - 2, y - 2, 2, h + 4, '#c4c0b6');
        px(x + w, y - 2, 2, h + 4, '#a39f94');
      }
    });
  });
}

/** หลุมปลูกต้นไม้กลางลานคอนกรีต (urban) */
function drawTreePits(spec: DistrictSpec, style: CityStyle, r: Rng): void {
  if (style.archetype !== 'urban') return;
  const p = spec.palette;
  spec.trees.forEach(function (t) {
    const x = t.x * ART + 1;
    const y = t.y * ART + 3;
    px(x - 1, y - 1, 16, 13, '#b5b1a7');
    px(x, y, 14, 11, p.grassDark);
    for (let i = 0; i < 12; i++) px(x + Math.floor(r() * 14), y + Math.floor(r() * 11), 1, 1, p.grassLight);
  });
}

/* ---------- ประกอบฉาก ---------- */

export function buildCityMapArt(spec: DistrictSpec): CityMapArt {
  const style = spec.style as CityStyle;
  const W = spec.w * ART;
  const H = spec.h * ART;
  resetNight();
  const r = rng(hashStr(spec.id + ':art'));

  const hRoads = spec.roads.filter(function (rd) { return rd.w > rd.h; });
  const vRoads = spec.roads.filter(function (rd) { return rd.h >= rd.w; });
  const inters: Rect[] = [];
  hRoads.forEach(function (a) { vRoads.forEach(function (b) { const it = intersect(a, b); if (it) inters.push(it); }); });

  const day = layer(W, H, function () {
    drawGround(spec, style, r);
    drawWater(spec, style, r);
    drawDriveways(spec);
    drawSidewalks(spec, style, r, inters);
    drawRoads(spec, r, inters);
    drawCrosswalks(spec, inters);
    drawBridges(spec);
    drawTreePits(spec, style, r);

    // อาคาร/บ้าน เรียงจากเหนือลงใต้ (ขอบล่าง) เพื่อให้ตัวหน้าทับตัวหลัง
    const built: { bottom: number; draw: () => void }[] = [];
    spec.buildings.forEach(function (b: BuildingSpec) {
      built.push({ bottom: b.y + b.h, draw: function () { drawCityBuilding(b, style, r); } });
    });
    spec.houses.forEach(function (h: HouseSpec) {
      built.push({ bottom: h.y + h.h, draw: function () { drawHouse(h, r); } });
    });
    built.sort(function (a, b) { return a.bottom - b.bottom; }).forEach(function (e) { e.draw(); });

    // ต้นไม้ + props เรียงตามฐาน y
    const items: { y: number; draw: () => void }[] = [];
    spec.trees.forEach(function (t) {
      items.push({ y: t.y + 0.92, draw: function () { drawCityTree(r, t.x, t.y, t.v, style); } });
    });
    spec.props.forEach(function (pr) {
      items.push({ y: pr.y, draw: function () { drawCityProp(r, pr, style); } });
    });
    items.sort(function (a, b) { return a.y - b.y; }).forEach(function (e) { e.draw(); });

    drawPowerWires(r, spec.props);
  });

  const n = takeNight();
  const night = layer(W, H, function () {
    n.emits.forEach(function (e) { px(e.x, e.y, e.w, e.h, e.c); });
  });
  return { day: day, night: night, lights: n.glows };
}
