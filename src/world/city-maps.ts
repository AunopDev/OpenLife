/* OpenLife — generated city maps per province / district / neighborhood
   ทุกจังหวัด/เขตได้แผนที่ของตัวเอง (seeded) ไม่ใช้ผังกลางร่วมกัน
   RESEARCH: docs/research/geo-hierarchy.md + เขต/จังหวัดใน docs/research */
import {
  DistrictSpec, Rect, BuildingSpec, HouseSpec, TreeSpec, PropSpec, HotspotSpec, WaterRect,
  CityStyle, CityArchetype, CityRegion, WatStyle, HouseKind
} from './district-maps';
import { GEO, geoProvince, geoDistrict, geoNeighborhood } from './geo';

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function blankGrid(w: number, h: number): number[][] {
  const g: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) row.push(0);
    g.push(row);
  }
  return g;
}

/** ทำให้ทุก hotspot เดินถึงได้จาก start: หาเส้นทางที่ต้องรื้อของน้อยที่สุด (0-1 BFS)
    โดยรื้อได้เฉพาะต้นไม้และบ้าน (ไม่แตะอาคารหลัก/น้ำ) — ผลแน่นอนเพราะลำดับคงที่ */
function ensureHotspotAccess(
  grid: number[][], W: number, H: number, start: { x: number; y: number },
  hotspots: HotspotSpec[], trees: TreeSpec[], houses: HouseSpec[]
) {
  const removable = function (x: number, y: number): 'tree' | number | null {
    for (let i = 0; i < trees.length; i++) if (trees[i].x === x && trees[i].y === y) return 'tree';
    for (let i = 0; i < houses.length; i++) {
      const h = houses[i];
      if (x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h) return i;
    }
    return null;
  };
  hotspots.forEach(function (hs) {
    const tx = Math.floor(hs.x);
    const ty = Math.floor(hs.y);
    if (!grid[ty] || grid[ty][tx] !== 0) return;
    const cost: number[] = [];
    const prev: number[] = [];
    for (let i = 0; i < W * H; i++) { cost.push(Infinity); prev.push(-1); }
    const s = start.y * W + start.x;
    cost[s] = 0;
    const dq: number[] = [s];
    while (dq.length) {
      const cur = dq.shift() as number;
      const cx = cur % W;
      const cy = Math.floor(cur / W);
      const nb = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
      for (let k = 0; k < nb.length; k++) {
        const nx = nb[k][0];
        const ny = nb[k][1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        let step = 0;
        if (grid[ny][nx] !== 0) {
          if (removable(nx, ny) === null) continue;
          step = 1;
        }
        const ni = ny * W + nx;
        if (cost[cur] + step < cost[ni]) {
          cost[ni] = cost[cur] + step;
          prev[ni] = cur;
          if (step === 0) dq.unshift(ni); else dq.push(ni);
        }
      }
    }
    const goal = ty * W + tx;
    if (cost[goal] === 0 || cost[goal] === Infinity) return;
    // รื้อของที่ขวางตามเส้นทาง
    for (let at = goal; at !== -1 && at !== s; at = prev[at]) {
      const x = at % W;
      const y = Math.floor(at / W);
      if (grid[y][x] === 0) continue;
      const what = removable(x, y);
      if (what === 'tree') {
        for (let i = trees.length - 1; i >= 0; i--) if (trees[i].x === x && trees[i].y === y) trees.splice(i, 1);
        grid[y][x] = 0;
      } else if (typeof what === 'number') {
        const h = houses[what];
        fill(grid, h, 0);
        houses.splice(what, 1);
      }
    }
  });
}

function fill(g: number[][], r: Rect, v: number) {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      if (g[y] && g[y][x] !== undefined) g[y][x] = v;
    }
  }
}

const PALETTES: { [k: string]: any } = {
  bangkok: {
    grass: '#3b593c', grassDark: '#2c4530', grassLight: '#4b6b46',
    sand: '#c8b07a', sandDark: '#a88f5c', sandLight: '#e0cb98',
    sea: '#1f5560', seaDeep: '#153d49', seaLight: '#3d7d82',
    mud: '#5a4a34', mangrove: '#2c5537', mangroveDark: '#1d3b28',
    roof: '#7a4a3a', roofDark: '#553227', wall: '#8a7a63',
    factory: '#5a5f70', factoryDark: '#3a3f4e', factoryLight: '#8a90a2'
  },
  central: {
    grass: '#3f5c3e', grassDark: '#2f4530', grassLight: '#52704a',
    sand: '#c2ae7e', sandDark: '#a08a5e', sandLight: '#ddc99a',
    sea: '#2a6470', seaDeep: '#1b4a55', seaLight: '#4a8a92',
    mud: '#5d4c34', mangrove: '#2e5638', mangroveDark: '#1f3d29',
    roof: '#7d4b3d', roofDark: '#573328', wall: '#8d7c66',
    factory: '#5c6274', factoryDark: '#3c4252', factoryLight: '#8b92a4'
  },
  north: {
    grass: '#4a5a34', grassDark: '#374626', grassLight: '#5f7244',
    sand: '#c9b184', sandDark: '#a88f62', sandLight: '#e2cc9e',
    sea: '#2f6a70', seaDeep: '#1e4d54', seaLight: '#4f8f92',
    mud: '#5a4830', mangrove: '#31583a', mangroveDark: '#203f29',
    roof: '#7b4e38', roofDark: '#563426', wall: '#8f7d66',
    factory: '#666056', factoryDark: '#46423a', factoryLight: '#948c7e'
  },
  isan: {
    grass: '#5b5c38', grassDark: '#464728', grassLight: '#707246',
    sand: '#cbb07a', sandDark: '#aa8f5c', sandLight: '#e3ca96',
    sea: '#2f6a70', seaDeep: '#1e4d54', seaLight: '#4f8f92',
    mud: '#5e4a30', mangrove: '#36583a', mangroveDark: '#223f29',
    roof: '#8a5038', roofDark: '#5f3626', wall: '#94806a',
    factory: '#5f6470', factoryDark: '#40454f', factoryLight: '#8b92a0'
  },
  east: {
    grass: '#3c5a42', grassDark: '#2c4432', grassLight: '#4d6e52',
    sand: '#d0b884', sandDark: '#ad9663', sandLight: '#e8d3a0',
    sea: '#1f5e6e', seaDeep: '#144350', seaLight: '#3f8794',
    mud: '#5c4a34', mangrove: '#2d5537', mangroveDark: '#1d3b28',
    roof: '#7a4d3e', roofDark: '#553428', wall: '#8c7b66',
    factory: '#586070', factoryDark: '#3a404c', factoryLight: '#8790a2'
  },
  south: {
    grass: '#31583f', grassDark: '#22402e', grassLight: '#427050',
    sand: '#d6c08c', sandDark: '#b29a68', sandLight: '#ecdaac',
    sea: '#1c5f6c', seaDeep: '#124550', seaLight: '#3b8a96',
    mud: '#594932', mangrove: '#2a5536', mangroveDark: '#1a3a27',
    roof: '#7c4a3a', roofDark: '#573126', wall: '#8e7a63',
    factory: '#56606e', factoryDark: '#383f4b', factoryLight: '#858fa0'
  }
};


export function getCityMap(provinceName: string, khetId?: string, hoodId?: string): DistrictSpec {
  const p = geoProvince(provinceName);
  const provinceId = p ? p.id : 'bangkok';
  const d = p && khetId ? geoDistrict(provinceName, khetId) : (p ? p.districts[0] : null);
  // ค่าตั้งแผนที่มาจาก geo.json ทั้งหมด (docs/rules/maps.md §2) — ห้ามเช็กชื่อจังหวัด/เขตในโค้ดนี้
  const pm = (p ? p.map : GEO[0].map);
  const dm = (d ? d.map : GEO[0].districts[0].map);
  const hood = p && hoodId ? geoNeighborhood(provinceName, hoodId) : null;
  const id = 'city-' + provinceId + '-' + (d ? d.id : 'center');
  const seed = hashStr(id + (hood ? hood.id : ''));
  const r = rng(seed);
  const W = 40;
  const H = 28;
  const grid = blankGrid(W, H);

  const baseRoads: Rect[] = [
    { x: 0, y: 9, w: 40, h: 2 },
    { x: 0, y: 21, w: 40, h: 2 },
    { x: 13, y: 0, w: 2, h: 23 },
    { x: 27, y: 0, w: 2, h: 23 }
  ];
  const baseSidewalks: Rect[] = [
    { x: 0, y: 8, w: 40, h: 1 },
    { x: 0, y: 11, w: 40, h: 1 },
    { x: 0, y: 20, w: 40, h: 1 },
    { x: 12, y: 0, w: 1, h: 23 },
    { x: 15, y: 0, w: 1, h: 23 },
    { x: 26, y: 0, w: 1, h: 23 },
    { x: 29, y: 0, w: 1, h: 23 }
  ];

  const coastal = dm.coastal;
  const water: WaterRect[] = [];
  const sand: Rect[] = [];
  if (coastal) {
    baseSidewalks.push({ x: 0, y: 23, w: 40, h: 1 });
    water.push({ type: 'sea', x: 0, y: 25, w: 40, h: 3 });
    sand.push({ x: 0, y: 24, w: 40, h: 1 });
  } else {
    baseSidewalks.push({ x: 0, y: 24, w: 40, h: 1 });
    if (pm.inlandWater === 'canal') {
      water.push({ type: 'canal', x: 1, y: 0, w: 2, h: 21 });
      water.push({ type: 'pond', x: 33, y: 24, w: 4, h: 3 });
    } else {
      water.push({ type: 'pond', x: 20, y: 24, w: 7, h: 3 });
    }
  }

  // แต่ละจังหวัด/เขตใช้โครงถนนไม่เหมือนกัน
  let keepWest = true;
  let keepEast = true;
  let keepSouth = true;
  if (pm.roadLayout === 'no-east') keepEast = false;
  else if (pm.roadLayout === 'no-west') keepWest = false;
  else if (pm.roadLayout === 'no-east-west') { keepWest = false; keepEast = false; }
  else if (pm.roadLayout === 'no-south') keepSouth = false;
  else if (pm.roadLayout === 'seeded') {
    const variant = seed % 4;
    if (variant === 1) keepEast = false;
    else if (variant === 2) keepWest = false;
    else if (variant === 3) keepSouth = false;
  }
  const roads = baseRoads.filter(function (r) {
    if (r.x === 27 && !keepEast) return false;
    if (r.x === 13 && !keepWest) return false;
    if (r.y === 21 && !keepSouth) return false;
    return true;
  });
  const sidewalks = baseSidewalks.filter(function (r) {
    if ((r.x === 26 || r.x === 29) && !keepEast) return false;
    if ((r.x === 12 || r.x === 15) && !keepWest) return false;
    return true;
  });

  const pal = PALETTES[pm.palette];

  /* ---------- style: ความหนาแน่น/ภาค/แบบวัด (ดู docs/research/city-streetscape-art.md) ---------- */
  const region: CityRegion = pm.region;
  const archetype: CityArchetype = dm.archetype;
  const wat: WatStyle = dm.wat;
  const style: CityStyle = { archetype: archetype, region: region, wat: wat, coastal: coastal };

  const roofA = dm.roof || pal.roof;
  const roofB = dm.houseRoof || '#6e5a3a';

  const mk = function (
    bid: string, name: string, x: number, y: number, w: number, h: number, door: number,
    roof: string, roofDark: string, wall: string, sign: string
  ): BuildingSpec {
    return { id: bid, name: name, x: x, y: y, w: w, h: h, door: door, roof: roof, roofDark: roofDark, wall: wall, sign: sign };
  };

  /* ---------- block layout + seeded placement ---------- */
  const blocks: Rect[] = [
    { x: 1, y: 1, w: 11, h: 7 }, { x: 16, y: 1, w: 10, h: 7 }, { x: 30, y: 1, w: 9, h: 7 },
    { x: 1, y: 12, w: 11, h: 8 }, { x: 16, y: 12, w: 10, h: 8 }, { x: 30, y: 12, w: 9, h: 8 },
    { x: 1, y: 24, w: 11, h: 3 }, { x: 16, y: 24, w: 10, h: 3 }, { x: 30, y: 24, w: 9, h: 3 }
  ];
  const noBuild: boolean[][] = [];
  for (let y = 0; y < H; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < W; x++) row.push(false);
    noBuild.push(row);
  }
  const mark = function (rect: Rect) {
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        if (noBuild[y] && noBuild[y][x] !== undefined) noBuild[y][x] = true;
      }
    }
  };
  roads.forEach(mark);
  sidewalks.forEach(mark);
  water.forEach(mark);
  sand.forEach(mark);

  const buildings: BuildingSpec[] = [];
  const houses: HouseSpec[] = [];

  const freeAt = function (x: number, y: number, w: number, h: number) {
    if (x < 1 || y < 1 || x + w > W - 1 || y + h > H - 1) return false;
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (noBuild[yy][xx]) return false;
        for (let i = 0; i < buildings.length; i++) {
          const b = buildings[i];
          if (xx >= b.x && xx < b.x + b.w && yy >= b.y && yy < b.y + b.h) return false;
        }
        for (let i = 0; i < houses.length; i++) {
          const b = houses[i];
          if (xx >= b.x && xx < b.x + b.w && yy >= b.y && yy < b.y + b.h) return false;
        }
      }
    }
    // ต้องไม่ทับประตูของอาคารที่วางไว้แล้ว
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (b.door >= x && b.door < x + w && b.y + b.h >= y && b.y + b.h < y + h) return false;
    }
    // ประตูของอาคารใหม่ต้องไม่ไปอยู่ใต้ตัวอาคารอื่น
    const ndx = x + Math.floor(w / 2);
    const ndy = y + h;
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (ndx >= b.x && ndx < b.x + b.w && ndy >= b.y && ndy < b.y + b.h) return false;
    }
    return true;
  };

  /** ประตูทุกหลังเดินถึงได้จากทางเท้าหลัก (15,8) ไหม — นับเฉพาะอาคาร+น้ำ (ต้นไม้/บ้านรื้อทีหลังได้) */
  const doorsReachable = function (): boolean {
    const blocked = function (x: number, y: number): boolean {
      if (x < 0 || y < 0 || x >= W || y >= H) return true;
      for (let i = 0; i < buildings.length; i++) {
        const b = buildings[i];
        if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return true;
      }
      const inWater = water.some(function (w) { return x >= w.x && x < w.x + w.w && y >= w.y && y < w.y + w.h; });
      const onRoad = roads.some(function (rd) { return x >= rd.x && x < rd.x + rd.w && y >= rd.y && y < rd.y + rd.h; });
      return inWater && !onRoad;
    };
    const seen: boolean[] = [];
    for (let i = 0; i < W * H; i++) seen.push(false);
    const q: number[] = [8 * W + 15];
    seen[8 * W + 15] = true;
    for (let i = 0; i < q.length; i++) {
      const cx = q[i] % W;
      const cy = Math.floor(q[i] / W);
      const nb = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
      for (let k = 0; k < nb.length; k++) {
        const nx = nb[k][0];
        const ny = nb[k][1];
        if (blocked(nx, ny) || seen[ny * W + nx]) continue;
        seen[ny * W + nx] = true;
        q.push(ny * W + nx);
      }
    }
    return buildings.every(function (b) {
      const dy = b.y + b.h;
      return dy < H && seen[dy * W + b.door];
    });
  };

  const addBuilding = function (id: string, name: string, w: number, h: number,
    pref: number[], roof: string, roofDark: string, wall: string, sign: string) {
    const order = pref.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }
    for (let k = 0; k < order.length; k++) {
      const blk = blocks[order[k]];
      if (!blk || w > blk.w || h > blk.h) continue;
      for (let attempt = 0; attempt < 34; attempt++) {
        const x = blk.x + Math.floor(r() * (blk.w - w + 1));
        const y = blk.y + Math.floor(r() * (blk.h - h + 1));
        if (!freeAt(x, y, w, h)) continue;
        const b: BuildingSpec = {
          id: id, name: name, x: x, y: y, w: w, h: h,
          door: x + Math.floor(w / 2),
          roof: roof, roofDark: roofDark, wall: wall, sign: sign
        };
        buildings.push(b);
        // ห้ามวางจนประตูของอาคารใด ๆ (รวมตัวเอง) กลายเป็นช่องปิดตาย
        if (!doorsReachable()) { buildings.pop(); continue; }
        return b;
      }
    }
    return null;
  };

  /* ---------- landmark ประจำเขต (ตำแหน่งตายตัว) ---------- */
  const lm = dm.landmark;
  const lmSpot = { x: 30, y: 2, w: 3, h: 3 };
  if (freeAt(lmSpot.x, lmSpot.y, lmSpot.w, lmSpot.h)) {
    buildings.push({
      id: 'landmark', name: lm.name,
      x: lmSpot.x, y: lmSpot.y, w: lmSpot.w, h: lmSpot.h,
      door: lmSpot.x + 1,
      roof: lm.roof, roofDark: '#3a2e24', wall: '#6a5a4a', sign: lm.sign
    });
  }

  /* ---------- อาคารหลัก (สุ่มตำแหน่ง ยกเว้นบ้าน/ออฟฟิศให้ห่างกัน) ---------- */
  const marketName = 'ตลาด' + (hood ? ' ' + hood.name : '');
  const homeB = addBuilding('home', 'บ้าน', 3, 2, [3, 4, 6, 7], roofA, pal.roofDark, pal.wall, '#8a5f47');
  const officeB = addBuilding('office', 'ออฟฟิศ',
    4, 3, [1, 2, 0],
    '#39477e', '#28325c', '#232b52', '#2f4bb0');
  addBuilding('seven', 'ร้านสะดวกซื้อ', 3, 2, [0, 4, 1, 3, 5], '#2f7d52', '#1f5537', '#1d3d2c', '#2f9d62');
  addBuilding('market', marketName, 4, 2, [4, 5, 1, 2], '#8a5a3a', '#5a3622', '#7a6a52', '#ffb45c');
  addBuilding('hospital', 'โรงพยาบาล', 3, 3, [2, 0, 5], '#8a4a5a', '#5e2f3d', '#7a6a70', '#e05a72');
  addBuilding('salon', 'ร้านตัดผม', 3, 2, [3, 4, 6, 7], '#6e4a5a', '#4c2736', '#8a7078', '#ff8fb1');
  addBuilding('clothes', 'ร้านเสื้อผ้า', 3, 2, [4, 3, 5], '#b06fd6', '#7a4a9a', '#8a7a9a', '#d9a8ff');
  addBuilding('gym', 'ฟิตเนส', 3, 2, [5, 4, 1], '#4b3a6e', '#33264c', '#241a3a', '#6b4fb0');
  addBuilding('station', 'สถานีขนส่ง', 4, 2, [6, 7, 8, 3], '#4f7f9a', '#325466', '#8a8a7a', '#6fb3d6');
  addBuilding('bar', 'ร้านอาหาร/บาร์', 3, 2, [7, 8, 4], '#6e3a4e', '#4c2736', '#33202a', '#b04158');
  addBuilding('temple', 'วัด/ศาลเจ้า', 3, 3, [0, 2, 5], '#b8862f', '#7a5418', '#8a6a3a', '#ffd75e');

  /* ---------- กันบ้านไปทับประตู/จุดเกิดของอาคารหลัก ---------- */
  buildings.forEach(function (b) {
    for (let dy = b.y + b.h; dy <= b.y + b.h + 1; dy++) {
      for (let dx = b.door - 1; dx <= b.door + 1; dx++) {
        if (noBuild[dy] && noBuild[dy][dx] !== undefined) noBuild[dy][dx] = true;
      }
    }
  });

  /* ---------- บ้านเรือน: ตึกแถวเรียงหน้าถนน + บ้านเดี่ยว/บ้านไม้ตาม archetype ---------- */
  const houseRoofs = [roofA, roofB, '#5a6e8a', '#6e5a3a', '#7a5240', '#4b5a7a'];
  const pushHouse = function (x: number, y: number, w: number, h: number, kind: HouseKind) {
    const concrete = kind === 'shophouse';
    houses.push({
      x: x, y: y, w: w, h: h, kind: kind,
      roof: concrete ? '#8f8b84' : houseRoofs[houses.length % houseRoofs.length],
      roofDark: concrete ? '#6a675f' : '#3a2a1e',
      wall: '#8a7a63'
    });
  };
  const looseKind = function (): HouseKind {
    if (archetype === 'urban') return 'shophouse';
    const woody = region === 'north' || region === 'isan' || region === 'south';
    if (archetype === 'rural') return woody && r() < 0.45 ? 'stilt' : 'house';
    return woody && r() < 0.15 ? 'stilt' : 'house';
  };

  // ตึกแถวหันหน้าเข้าทางเท้าแนวนอน (ด้านล่างของห้องแถวชนทางเท้า) เว้นซอยเป็นระยะ
  if (archetype !== 'rural') {
    sidewalks.forEach(function (s) {
      if (s.h !== 1 || s.w < 4) return;
      const y = s.y - 2;
      if (y < 1) return;
      if (archetype === 'town' && s.y !== 8 && s.y !== 20) return;
      let x = 1;
      while (x < W - 2) {
        const sw = 2 + Math.floor(r() * 3);
        if (archetype === 'town' && r() < 0.35) { x += sw; continue; }
        if (freeAt(x, y, sw, 2)) {
          pushHouse(x, y, sw, 2, 'shophouse');
          x += sw + (r() < 0.3 ? 1 : 0);
        } else {
          x += 1;
        }
      }
    });
  }

  // เติมช่องว่างแบบสุ่ม (seeded)
  const houseTarget = archetype === 'urban' ? 30 : archetype === 'town' ? 22 : 12;
  let houseTries = 0;
  while (houses.length < houseTarget && houseTries < 320) {
    houseTries++;
    const kind = looseKind();
    const w = kind === 'shophouse' ? 2 + Math.floor(r() * 3) : 2 + Math.floor(r() * 2);
    const h = 2;
    const blk = blocks[Math.floor(r() * blocks.length)];
    if (!blk || w > blk.w || h > blk.h) continue;
    const x = blk.x + Math.floor(r() * (blk.w - w + 1));
    const y = blk.y + Math.floor(r() * (blk.h - h + 1));
    if (!freeAt(x, y, w, h)) continue;
    pushHouse(x, y, w, h, kind);
  }

  /* ---------- ลง grid / collision ---------- */
  sidewalks.forEach(function (s) { fill(grid, s, 0); });
  roads.forEach(function (s) { fill(grid, s, 0); });
  buildings.forEach(function (b) { fill(grid, b, 1); });
  houses.forEach(function (b) { fill(grid, b, 1); });
  water.forEach(function (w) { fill(grid, w, 1); });

  if (!coastal) {
    fill(grid, { x: 1, y: 9, w: 2, h: 2 }, 0);
    fill(grid, { x: 1, y: 21, w: 2, h: 2 }, 0);
  }

  const inRect = function (rect: Rect, x: number, y: number) {
    return x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h;
  };
  const isGreen = function (x: number, y: number) {
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return false;
    if (water.some(function (w) { return inRect(w, x, y); })) return false;
    if (sand.some(function (w) { return inRect(w, x, y); })) return false;
    if (roads.some(function (w) { return inRect(w, x, y); })) return false;
    if (sidewalks.some(function (w) { return inRect(w, x, y); })) return false;
    if (buildings.some(function (b) { return inRect(b, x, y); })) return false;
    if (houses.some(function (b) { return inRect(b, x, y); })) return false;
    return true;
  };

  // ประตูอาคารหลัก (tile ใต้ประตู) — ห้ามต้นไม้/prop ไปบัง
  const doorTiles: { [k: string]: boolean } = {};
  buildings.forEach(function (b) {
    doorTiles[b.door + ',' + (b.y + b.h)] = true;
    doorTiles[b.door + ',' + (b.y + b.h + 1)] = true;
  });

  const trees: TreeSpec[] = [];
  const treeCap = archetype === 'urban' ? 14 : archetype === 'town' ? 34 : 60;
  for (let i = 0; i < 260 && trees.length < treeCap; i++) {
    const x = 2 + Math.floor(r() * 36);
    const y = 2 + Math.floor(r() * 23);
    if (!isGreen(x, y)) continue;
    if (grid[y][x] === 1 || doorTiles[x + ',' + y]) continue;
    trees.push({ x: x, y: y, v: Math.floor(r() * 4) });
    grid[y][x] = 1;
  }

  /* ---------- props ---------- */
  // โซนตามลำดับเดียวกับ districtZone(): น้ำ > ถนน > ทางเท้า > ทราย > อาคาร > เขียว
  const zoneOf = function (tx: number, ty: number): string {
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return 'edge';
    if (water.some(function (w) { return inRect(w, tx, ty); })) return 'water';
    if (roads.some(function (w) { return inRect(w, tx, ty); })) return 'road';
    if (sidewalks.some(function (w) { return inRect(w, tx, ty); })) return 'sidewalk';
    if (sand.some(function (w) { return inRect(w, tx, ty); })) return 'sand';
    if (buildings.some(function (b) { return inRect(b, tx, ty); })) return 'building';
    if (houses.some(function (b) { return inRect(b, tx, ty); })) return 'building';
    return 'green';
  };
  const used: { [k: string]: boolean } = {};
  Object.keys(doorTiles).forEach(function (k) { used[k] = true; });

  const fixed: PropSpec[] = [
    { type: 'lamp', x: 5.5, y: 8.4 }, { type: 'lamp', x: 18.5, y: 8.4 },
    { type: 'lamp', x: 31.5, y: 8.4 }, { type: 'lamp', x: 8.5, y: 11.4 },
    { type: 'lamp', x: 22.5, y: 11.4 }, { type: 'lamp', x: 33.5, y: 11.4 },
    { type: 'lamp', x: 10.5, y: 20.4 }, { type: 'lamp', x: 25.5, y: 20.4 },
    { type: 'bin', x: 12.5, y: 8.4 }, { type: 'bin', x: 26.5, y: 20.4 },
    { type: 'bench', x: 7.5, y: 11.4 }, { type: 'bench', x: 23.5, y: 20.4 },
    { type: 'stall', x: 20.5, y: 8.4, v: 0 }, { type: 'stall', x: 21.5, y: 11.4, v: 1 },
    { type: 'crate', x: 19.5, y: 8.4 }, { type: 'crate', x: 24.5, y: 11.4 },
    { type: 'sign', x: 12.5, y: 11.4 }
  ];
  if (coastal) {
    fixed.push({ type: 'palm', x: 6.5, y: 24.5 }, { type: 'palm', x: 18.5, y: 24.5 });
    fixed.push({ type: 'fishnet', x: 11.5, y: 24.5 }, { type: 'buoy', x: 24.5, y: 26.5 });
  } else {
    fixed.push({ type: 'bench', x: 8.5, y: 24.5 }, { type: 'bin', x: 10.5, y: 24.5 });
  }
  const props: PropSpec[] = [];
  const SIDEWALK_ONLY = ['lamp', 'bin', 'sign', 'crate', 'stall', 'bench'];
  fixed.forEach(function (p) {
    const tx = Math.floor(p.x);
    const ty = Math.floor(p.y);
    const z = zoneOf(tx, ty);
    // ถนนสายรองที่ถูกตัดออกทำให้บางตำแหน่งกลายเป็นพื้นเขียว — ของริมทางเท้าต้องอยู่บนทางเท้าเท่านั้น
    if (SIDEWALK_ONLY.indexOf(p.type) >= 0 && z !== 'sidewalk' && !(z === 'green' && p.type === 'bench')) return;
    if (used[tx + ',' + ty]) return;
    used[tx + ',' + ty] = true;
    props.push(p);
  });

  // เสาไฟฟ้าคอนกรีตเรียงตามทางเท้าแนวนอน (ทุก ~5 tile) → art ลากสายระหว่างเสา
  sidewalks.forEach(function (s) {
    if (s.h !== 1) return;
    for (let x = 2 + (s.y % 3); x < W - 1; x += 5) {
      let tx = x;
      if (zoneOf(tx, s.y) !== 'sidewalk' || used[tx + ',' + s.y]) tx = x + 1;
      if (zoneOf(tx, s.y) !== 'sidewalk' || used[tx + ',' + s.y]) continue;
      used[tx + ',' + s.y] = true;
      props.push({ type: 'power', x: tx + 0.5, y: s.y + 0.35 });
    }
  });

  // tile ทางเท้าที่ว่าง (seeded shuffle) สำหรับมอเตอร์ไซค์/รถเข็น/วิน
  const walkTiles: number[][] = [];
  sidewalks.forEach(function (s) {
    for (let ty = s.y; ty < s.y + s.h; ty++) {
      for (let tx = s.x; tx < s.x + s.w; tx++) {
        if (zoneOf(tx, ty) === 'sidewalk' && tx > 0 && tx < W - 1 && ty > 0 && ty < H - 1) walkTiles.push([tx, ty]);
      }
    }
  });
  for (let i = walkTiles.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = walkTiles[i]; walkTiles[i] = walkTiles[j]; walkTiles[j] = t;
  }
  const takeWalk = function (type: string, count: number, v?: (k: number) => number) {
    let k = 0;
    for (let i = 0; i < walkTiles.length && k < count; i++) {
      const tx = walkTiles[i][0];
      const ty = walkTiles[i][1];
      if (used[tx + ',' + ty]) continue;
      used[tx + ',' + ty] = true;
      props.push({ type: type, x: tx + 0.5, y: ty + 0.6, v: v ? v(k) : Math.floor(r() * 6) });
      k++;
    }
  };
  // วินมอเตอร์ไซค์ 1 จุด ใกล้ตลาด/สถานี
  const hub = buildings.filter(function (b) { return b.id === 'market' || b.id === 'station'; })[0];
  if (hub) {
    let best: number[] | null = null;
    let bestD = 99;
    walkTiles.forEach(function (t) {
      if (used[t[0] + ',' + t[1]]) return;
      const dd = Math.abs(t[0] - hub.door) + Math.abs(t[1] - (hub.y + hub.h));
      if (dd >= 2 && dd < bestD) { bestD = dd; best = t; }
    });
    if (best && bestD <= 6) {
      used[best[0] + ',' + best[1]] = true;
      props.push({ type: 'win', x: best[0] + 0.5, y: best[1] + 0.6 });
    }
  }
  takeWalk('moto', archetype === 'urban' ? 9 : archetype === 'town' ? 5 : 2);
  takeWalk('cart', archetype === 'urban' ? 5 : archetype === 'town' ? 3 : 1);

  // ศาลพระภูมิ: ลานหญ้าข้างบ้าน/อาคาร (ไม่บังประตู ไม่ทับต้นไม้)
  const spiritCap = archetype === 'urban' ? 4 : 9;
  let spirits = 0;
  const owners: Rect[] = (buildings as Rect[]).filter(function (bb) { const b = bb as BuildingSpec;
    return b.id === 'home' || b.id === 'office' || b.id === 'hospital' || b.id === 'market' || b.id === 'seven';
  }).concat(houses.filter(function (h) { return h.kind !== 'shophouse'; }));
  owners.forEach(function (o) {
    if (spirits >= spiritCap) return;
    const spots = [[o.x - 1, o.y + o.h - 1], [o.x + o.w, o.y + o.h - 1]];
    for (let i = 0; i < spots.length; i++) {
      const tx = spots[i][0];
      const ty = spots[i][1];
      if (zoneOf(tx, ty) !== 'green' || grid[ty][tx] === 1 || used[tx + ',' + ty]) continue;
      used[tx + ',' + ty] = true;
      props.push({ type: 'spirit', x: tx + 0.5, y: ty + 0.75 });
      spirits++;
      return;
    }
  });

  /* ---------- hotspots จากตำแหน่งจริงของอาคาร ---------- */
  const HOT: { [k: string]: string[] } = {
    home: ['เข้าบ้าน', 'home'],
    office: ['เข้าออฟฟิศ', 'office'],
    seven: ['ซื้อของที่ร้านสะดวกซื้อ', 'foodshop'],
    market: ['เดินตลาด', 'market'],
    hospital: ['ตรวจสุขภาพ', 'hospital'],
    salon: ['ตัดผม', 'salon'],
    clothes: ['ซื้อเสื้อผ้า', 'shop'],
    gym: ['เข้ายิม', 'gym'],
    station: ['เข้าสถานีขนส่ง', 'station'],
    bar: ['นั่งร้านอาหาร', 'bar'],
    temple: ['ไหว้วัด/ศาลเจ้า', 'temple'],
    landmark: ['ชมแลนด์มาร์ค', 'landmark']
  };
  const hotspots: HotspotSpec[] = buildings.map(function (b) {
    const def = HOT[b.id] || ['เข้าอาคาร', 'landmark'];
    return {
      id: b.id,
      x: b.door + 0.5,
      y: b.y + b.h + 0.4,
      r: 96,
      label: def[0],
      act: def[1]
    };
  });
  if (coastal) {
    hotspots.push({ id: 'beach', x: 20.5, y: 24.5, r: 90, label: 'เดินริมทะเล', act: 'beach' });
  } else {
    hotspots.push({ id: 'park', x: 7.5, y: 24.5, r: 90, label: 'เดินสวน', act: 'park' });
  }

  const spawn = homeB
    ? { x: homeB.door + 0.5, y: homeB.y + homeB.h + 1.1 }
    : { x: 15.5, y: 8.4 };

  // ต้นไม้/บ้านที่สุ่มวางอาจล้อมจุดโต้ตอบจนเดินไม่ถึง → เปิดทางโดยเอาต้นไม้/บ้านที่ขวางออก
  ensureHotspotAccess(grid, W, H, { x: 15, y: 8 }, hotspots, trees, houses);

  const name = (d ? d.name : (p ? p.name : 'เมือง')) + (hood ? ' · ' + hood.name : '') + ' · ' + (p ? p.name : '');

  return {
    id: id,
    name: name,
    province: p ? p.name : 'กรุงเทพฯ',
    w: W,
    h: H,
    grid: grid,
    buildings: buildings,
    houses: houses,
    roads: roads,
    sidewalks: sidewalks,
    water: water,
    sand: sand,
    mangroveZones: [],
    trees: trees,
    mangroves: [],
    props: props,
    hotspots: hotspots,
    spawn: { x: 15.5, y: 8.4 },
    palette: pal,
    style: style,
    zoneRects: { water: water, road: roads, sidewalk: sidewalks, sand: sand, mangrove: [], park: [] } as any
  };
}
