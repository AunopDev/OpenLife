/* OpenLife — audit แผนที่แบบ spec (pure: ไม่แตะ DOM/state ของเกม)
   ใช้ทั้งใน game.ts (__districtAudit) และ unit test (tests/unit)
   กฎ: docs/rules/maps.md §4 */
import { DistrictSpec, Rect, Zone, districtZone } from './district-maps';

/** โซนที่ prop แต่ละชนิดวางได้ — prop ชนิดใหม่ต้องเพิ่มที่นี่ (ไม่งั้น audit แจ้ง unknown) */
export const PROP_ZONES: Record<string, Zone[]> = {
  stall: ['sidewalk', 'green', 'sand'],
  seafood: ['sidewalk', 'green'],
  crate: ['sidewalk', 'green', 'sand'],
  sign: ['sidewalk'],
  lamp: ['sidewalk', 'green', 'sand'],
  bin: ['sidewalk'],
  bench: ['sidewalk', 'sand', 'green'],
  power: ['sidewalk', 'green'],
  dog: ['sidewalk', 'green', 'sand'],
  fishnet: ['sand'],
  crab: ['sand'],
  palm: ['sand'],
  boat: ['water'],
  buoy: ['water'],
  tank: ['green'],
  truck: ['green'],
  incense: ['green'],
  lantern: ['green'],
  barber: ['green', 'sidewalk'],
  pier: ['sand', 'water'],
  spirit: ['green'],
  moto: ['sidewalk'],
  win: ['sidewalk'],
  cart: ['sidewalk']
};

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** tile ที่เดินถึงได้จาก spawn (4 ทิศ บน grid === 0) */
export function reachableTiles(spec: DistrictSpec): boolean[][] {
  const seen: boolean[][] = [];
  for (let y = 0; y < spec.h; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < spec.w; x++) row.push(false);
    seen.push(row);
  }
  const sx = Math.floor(spec.spawn.x);
  const sy = Math.floor(spec.spawn.y);
  if (!spec.grid[sy] || spec.grid[sy][sx] !== 0) return seen;
  const queue: number[] = [sx, sy];
  seen[sy][sx] = true;
  for (let i = 0; i < queue.length; i += 2) {
    const x = queue[i];
    const y = queue[i + 1];
    const next = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (let k = 0; k < next.length; k++) {
      const nx = next[k][0];
      const ny = next[k][1];
      if (nx < 0 || ny < 0 || nx >= spec.w || ny >= spec.h) continue;
      if (seen[ny][nx] || spec.grid[ny][nx] !== 0) continue;
      seen[ny][nx] = true;
      queue.push(nx, ny);
    }
  }
  return seen;
}

/** ตรวจ spec ตาม maps.md §4 — คืนรายการปัญหา ([] = ผ่าน) */
export function auditDistrictSpec(spec: DistrictSpec): string[] {
  const issues: string[] = [];
  const z = function (x: number, y: number) { return districtZone(spec, Math.floor(x), Math.floor(y)); };

  if (spec.grid.length !== spec.h || spec.grid.some(function (r) { return r.length !== spec.w; })) {
    issues.push('grid size ≠ ' + spec.w + '×' + spec.h);
    return issues;
  }

  spec.trees.forEach(function (t) {
    if (t.x !== Math.floor(t.x) || t.y !== Math.floor(t.y)) issues.push('tree not integer @' + t.x + ',' + t.y);
    const zone = z(t.x + 0.5, t.y + 0.5);
    if (zone !== 'green' && zone !== 'mangrove') issues.push('tree @' + t.x + ',' + t.y + ' → ' + zone);
    if (!spec.grid[t.y] || spec.grid[t.y][t.x] !== 1) issues.push('tree not blocking @' + t.x + ',' + t.y);
  });

  spec.mangroves.forEach(function (p) {
    const zone = z(p.x, p.y);
    if (zone !== 'mangrove' && zone !== 'green') issues.push('mangrove @' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ' → ' + zone);
  });

  spec.props.forEach(function (p) {
    const list = PROP_ZONES[p.type];
    const where = p.type + ' @' + p.x.toFixed(1) + ',' + p.y.toFixed(1);
    if (!list) { issues.push('unknown prop type ' + where + ' (เพิ่มใน PROP_ZONES)'); return; }
    const zone = z(p.x, p.y);
    if (list.indexOf(zone) === -1) issues.push(where + ' → ' + zone);
  });

  const solids: { id: string; r: Rect }[] = [];
  spec.buildings.forEach(function (b) {
    const zone = z(b.x + b.w / 2, b.y + b.h / 2);
    if (zone !== 'building') issues.push('building ' + b.id + ' → ' + zone);
    for (let ty = b.y; ty < b.y + b.h; ty++) {
      for (let tx = b.x; tx < b.x + b.w; tx++) {
        if (!spec.grid[ty] || spec.grid[ty][tx] !== 1) issues.push('building not blocking ' + b.id + ' @' + tx + ',' + ty);
      }
    }
    solids.push({ id: 'building ' + b.id, r: b });
  });

  spec.houses.forEach(function (b, i) {
    const zone = z(b.x + b.w / 2, b.y + b.h / 2);
    if (zone !== 'building') issues.push('house → ' + zone + ' @' + b.x + ',' + b.y);
    solids.push({ id: 'house#' + i, r: b });
  });

  // อาคาร/บ้านห้ามทับกันเอง และห้ามทับถนน/ทางเท้า/น้ำ
  for (let i = 0; i < solids.length; i++) {
    for (let j = i + 1; j < solids.length; j++) {
      if (overlaps(solids[i].r, solids[j].r)) issues.push(solids[i].id + ' overlaps ' + solids[j].id);
    }
    const blockers = ([] as Rect[]).concat(spec.roads, spec.sidewalks, spec.water);
    if (blockers.some(function (r) { return overlaps(r, solids[i].r); })) issues.push(solids[i].id + ' overlaps road/sidewalk/water');
  }

  // น้ำต้องบล็อก เว้นสะพาน/ท่าเรือ
  spec.water.forEach(function (w) {
    for (let ty = w.y; ty < w.y + w.h; ty++) {
      for (let tx = w.x; tx < w.x + w.w; tx++) {
        const isRoad = spec.roads.some(function (r) {
          return tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h;
        });
        const isPier = !!spec.pier && tx >= spec.pier.x && tx < spec.pier.x + spec.pier.w && ty >= spec.pier.y && ty < spec.pier.y + spec.pier.h;
        if (!isRoad && !isPier && spec.grid[ty] && spec.grid[ty][tx] !== 1) issues.push('water not blocking @' + tx + ',' + ty);
      }
    }
  });

  const sx = Math.floor(spec.spawn.x);
  const sy = Math.floor(spec.spawn.y);
  if (!spec.grid[sy] || spec.grid[sy][sx] === 1) issues.push('spawn blocked');

  // hotspot ต้องอยู่บนพื้นที่เดินได้ และเดินไปถึงได้จาก spawn
  const reach = reachableTiles(spec);
  const ids: Record<string, boolean> = {};
  spec.hotspots.forEach(function (h) {
    if (ids[h.id]) issues.push('hotspot id ซ้ำ ' + h.id);
    ids[h.id] = true;
    const zone = z(h.x, h.y);
    if (zone === 'water' || zone === 'building' || zone === 'edge') issues.push('hotspot ' + h.id + ' → ' + zone);
    const tx = Math.floor(h.x);
    const ty = Math.floor(h.y);
    if (spec.grid[ty] && spec.grid[ty][tx] === 1) issues.push('hotspot blocked ' + h.id + ' @' + tx + ',' + ty);
    else if (reach[ty] && !reach[ty][tx]) issues.push('hotspot unreachable ' + h.id + ' @' + tx + ',' + ty);
  });

  return issues;
}
