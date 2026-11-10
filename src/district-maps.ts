/* OpenLife — district map data (mapSpec → grid / zones / hotspots)
   RESEARCH: docs/research/bangkok-bang-khun-thian.md
   กฎ: พิกัดฐาน object ต้องอยู่โซนที่ถูกต้อง และต้องถูก audit
   พิกัดทั้งหมดเป็น tile (จำนวนเต็ม) ยกเว้น prop ตกแต่งที่ใช้ทศนิยมได้ */

export type Zone = 'water' | 'road' | 'sidewalk' | 'sand' | 'mangrove' | 'building' | 'green' | 'edge';

export interface Rect { x: number; y: number; w: number; h: number; }
export interface WaterRect extends Rect { type: 'sea' | 'canal' | 'pond'; }
export interface BuildingSpec extends Rect {
  id: string;
  name: string;
  door: number;
  roof: string;
  roofDark: string;
  wall: string;
  sign: string;
}
export interface HouseSpec extends Rect { roof: string; roofDark: string; wall?: string; }
export interface TreeSpec { x: number; y: number; v: number; }
export interface PropSpec { type: string; x: number; y: number; v?: number; }
export interface HotspotSpec { id: string; x: number; y: number; r: number; label: string; act: string; }

export interface DistrictSpec {
  id: string;
  name: string;
  province: string;
  w: number;
  h: number;
  grid: number[][];
  buildings: BuildingSpec[];
  houses: HouseSpec[];
  roads: Rect[];
  sidewalks: Rect[];
  water: WaterRect[];
  sand: Rect[];
  mangroveZones: Rect[];
  trees: TreeSpec[];
  mangroves: PropSpec[];
  props: PropSpec[];
  hotspots: HotspotSpec[];
  spawn: { x: number; y: number };
  palette: any;
  pier?: Rect;
  /** ใช้ตัดสินโซนสำหรับ audit */
  zoneRects: { water: Rect[]; road: Rect[]; sidewalk: Rect[]; sand: Rect[]; mangrove: Rect[] };
}

/* ---------- helpers ---------- */

function blankGrid(w: number, h: number): number[][] {
  const g: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) row.push(0);
    g.push(row);
  }
  return g;
}

function fill(g: number[][], r: Rect, v: number) {
  for (let ty = r.y; ty < r.y + r.h; ty++) {
    for (let tx = r.x; tx < r.x + r.w; tx++) {
      if (g[ty] && g[ty][tx] !== undefined) g[ty][tx] = v;
    }
  }
}

function inside(r: Rect, tx: number, ty: number): boolean {
  return tx >= r.x && ty >= r.y && tx < r.x + r.w && ty < r.y + r.h;
}

function anyInside(list: Rect[], tx: number, ty: number): boolean {
  for (let i = 0; i < list.length; i++) if (inside(list[i], tx, ty)) return true;
  return false;
}

/** โซนของ tile ในแผนที่เขต — ใช้ทั้ง audit และ art */
export function districtZone(spec: DistrictSpec, tx: number, ty: number): Zone {
  if (tx < 0 || ty < 0 || tx >= spec.w || ty >= spec.h) return 'edge';
  // น้ำ/ถนน/ทางเท้ามีลำดับความสำคัญก่อน เพื่อจับ object ที่วางทับ
  if (anyInside(spec.zoneRects.water, tx, ty)) return 'water';
  if (anyInside(spec.zoneRects.road, tx, ty)) return 'road';
  if (anyInside(spec.zoneRects.sidewalk, tx, ty)) return 'sidewalk';
  if (anyInside(spec.zoneRects.sand, tx, ty)) return 'sand';
  if (anyInside(spec.zoneRects.mangrove, tx, ty)) return 'mangrove';
  for (let i = 0; i < spec.buildings.length; i++) {
    if (inside(spec.buildings[i], tx, ty)) return 'building';
  }
  for (let i = 0; i < spec.houses.length; i++) {
    if (inside(spec.houses[i], tx, ty)) return 'building';
  }
  return 'green';
}

/* ==========================================================
   BANG KHUN THIAN — coastal + canal + community (48×32)
   ข้อเท็จจริง: ติดอ่าวไทยด้านใต้, คลองจำนวนมาก, ป่าชายเลน,
   บ่อกุ้ง, โรงงาน, ตลาดอาหารทะเล, ชุมชน/ศาลเจ้า
   ========================================================== */

function bangKhunThian(): DistrictSpec {
  const W = 48;
  const H = 32;
  const grid = blankGrid(W, H);

  const water: WaterRect[] = [
    { type: 'sea', x: 0, y: 28, w: 48, h: 4 },
    { type: 'canal', x: 0, y: 16, w: 48, h: 2 },
    { type: 'canal', x: 8, y: 0, w: 2, h: 16 },
    { type: 'pond', x: 28, y: 18, w: 3, h: 2 },
    { type: 'pond', x: 33, y: 18, w: 3, h: 2 }
  ];

  const roads: Rect[] = [
    { x: 0, y: 9, w: 48, h: 2 },
    { x: 0, y: 22, w: 48, h: 2 },
    { x: 24, y: 0, w: 2, h: 24 },
    { x: 40, y: 0, w: 2, h: 24 }
  ];

  const sidewalks: Rect[] = [
    { x: 0, y: 8, w: 48, h: 1 },
    { x: 0, y: 11, w: 48, h: 1 },
    { x: 0, y: 21, w: 48, h: 1 },
    { x: 0, y: 24, w: 48, h: 1 },
    { x: 23, y: 0, w: 1, h: 24 },
    { x: 26, y: 0, w: 1, h: 24 },
    { x: 39, y: 0, w: 1, h: 24 },
    { x: 42, y: 0, w: 1, h: 24 },
    { x: 7, y: 0, w: 1, h: 9 },
    { x: 10, y: 0, w: 1, h: 9 },
    { x: 7, y: 11, w: 1, h: 5 },
    { x: 10, y: 11, w: 1, h: 5 }
  ];

  const sand: Rect[] = [{ x: 0, y: 25, w: 48, h: 3 }];
  const mangroveZones: Rect[] = [{ x: 27, y: 18, w: 12, h: 3 }];

  const buildings: BuildingSpec[] = [
    { id: 'market', name: 'ตลาดอาหารทะเล', x: 12, y: 12, w: 5, h: 3, door: 14, roof: '#8a5a3a', roofDark: '#5a3622', wall: '#7a6a52', sign: '#ffb45c' },
    { id: 'health', name: 'อนามัยบางขุนเทียน', x: 19, y: 12, w: 3, h: 3, door: 20, roof: '#8a4a5a', roofDark: '#5e2f3d', wall: '#7a6a70', sign: '#e05a72' },
    { id: 'school', name: 'โรงเรียนชุมชน', x: 30, y: 12, w: 4, h: 3, door: 31, roof: '#4f7f9a', roofDark: '#325466', wall: '#8a8a7a', sign: '#6fb3d6' },
    { id: 'temple', name: 'ศาลเจ้า', x: 35, y: 12, w: 3, h: 3, door: 36, roof: '#b8862f', roofDark: '#7a5418', wall: '#8a6a3a', sign: '#ffd75e' },
    { id: 'factory', name: 'โรงงานอาหารทะเล', x: 43, y: 2, w: 5, h: 5, door: 45, roof: '#5a5f70', roofDark: '#3a3f4e', wall: '#7a8092', sign: '#ff9f4a' },
    { id: 'coldstorage', name: 'ห้องเย็น', x: 43, y: 12, w: 5, h: 3, door: 45, roof: '#5d6a7a', roofDark: '#3c4655', wall: '#7a8694', sign: '#8fd6ff' },
    { id: 'warehouse', name: 'โกดังท่าเรือ', x: 43, y: 18, w: 5, h: 2, door: 45, roof: '#6a5a4a', roofDark: '#463a2e', wall: '#8a7a62', sign: '#c9a06a' }
  ];

  const houses: HouseSpec[] = [
    { x: 1, y: 2, w: 2, h: 2, roof: '#7a4a3a', roofDark: '#553227', wall: '#8a7a63' },
    { x: 4, y: 2, w: 2, h: 2, roof: '#5a6e8a', roofDark: '#3e4e66', wall: '#7a7a82' },
    { x: 1, y: 5, w: 2, h: 2, roof: '#6e5a3a', roofDark: '#4a3c26', wall: '#8a7a5a' },
    { x: 4, y: 5, w: 2, h: 2, roof: '#4b5a7a', roofDark: '#333f58', wall: '#7a7a82' },

    { x: 11, y: 2, w: 3, h: 2, roof: '#7a5240', roofDark: '#553327', wall: '#8a7a63' },
    { x: 15, y: 2, w: 3, h: 2, roof: '#6e4a5a', roofDark: '#4c2736', wall: '#8a7078' },
    { x: 19, y: 2, w: 3, h: 2, roof: '#5a6e8a', roofDark: '#3e4e66', wall: '#7a7a82' },
    { x: 11, y: 5, w: 3, h: 2, roof: '#6e5a3a', roofDark: '#4a3c26', wall: '#8a7a5a' },
    { x: 15, y: 5, w: 3, h: 2, roof: '#7a4a3a', roofDark: '#553227', wall: '#8a7a63' },
    { x: 19, y: 5, w: 3, h: 2, roof: '#5a6e8a', roofDark: '#3e4e66', wall: '#7a7a82' },

    { x: 27, y: 2, w: 3, h: 2, roof: '#7a4a3a', roofDark: '#553227', wall: '#8a7a63' },
    { x: 31, y: 2, w: 3, h: 2, roof: '#5a6e8a', roofDark: '#3e4e66', wall: '#7a7a82' },
    { x: 35, y: 2, w: 3, h: 2, roof: '#6e5a3a', roofDark: '#4a3c26', wall: '#8a7a5a' },
    { x: 27, y: 5, w: 3, h: 2, roof: '#6e4a5a', roofDark: '#4c2736', wall: '#8a7078' },
    { x: 31, y: 5, w: 3, h: 2, roof: '#4b5a7a', roofDark: '#333f58', wall: '#7a7a82' },
    { x: 35, y: 5, w: 3, h: 2, roof: '#7a5240', roofDark: '#553327', wall: '#8a7a63' },

    { x: 1, y: 12, w: 2, h: 2, roof: '#7a4a3a', roofDark: '#553227', wall: '#8a7a63' },
    { x: 4, y: 12, w: 2, h: 2, roof: '#5a6e8a', roofDark: '#3e4e66', wall: '#7a7a82' },
    { x: 1, y: 14, w: 2, h: 2, roof: '#6e5a3a', roofDark: '#4a3c26', wall: '#8a7a5a' },
    { x: 4, y: 14, w: 2, h: 2, roof: '#4b5a7a', roofDark: '#333f58', wall: '#7a7a82' },

    { x: 1, y: 18, w: 3, h: 2, roof: '#7a4a3a', roofDark: '#553227', wall: '#8a7a63' },
    { x: 5, y: 18, w: 3, h: 2, roof: '#5a6e8a', roofDark: '#3e4e66', wall: '#7a7a82' },
    { x: 9, y: 18, w: 3, h: 2, roof: '#6e5a3a', roofDark: '#4a3c26', wall: '#8a7a5a' },
    { x: 13, y: 18, w: 3, h: 2, roof: '#4b5a7a', roofDark: '#333f58', wall: '#7a7a82' },
    { x: 17, y: 18, w: 3, h: 2, roof: '#7a5240', roofDark: '#553327', wall: '#8a7a63' }
  ];

  /* --- grid: sidewalk/road first, buildings, then water, then bridges/pier --- */
  sidewalks.forEach(function (r) { fill(grid, r, 0); });
  roads.forEach(function (r) { fill(grid, r, 0); });
  buildings.concat(houses as any).forEach(function (b) { fill(grid, b, 1); });
  water.forEach(function (r) { fill(grid, r, 1); });

  // สะพาน: ถนนตัดคลอง
  fill(grid, { x: 24, y: 16, w: 2, h: 2 }, 0);
  fill(grid, { x: 40, y: 16, w: 2, h: 2 }, 0);
  fill(grid, { x: 8, y: 9, w: 2, h: 2 }, 0);

  // ท่าเทียบเรือ (ไม้กระดาน) ยื่นจากถนนลงทะเล
  fill(grid, { x: 24, y: 24, w: 2, h: 6 }, 0);

  // ป่าชายเลน: กระจุกที่เดินผ่านไม่ได้ เว้นทางเดินกลาง
  const mangroveBlocks: Rect[] = [
    { x: 27, y: 20, w: 3, h: 1 },
    { x: 35, y: 20, w: 3, h: 1 },
    { x: 27, y: 19, w: 1, h: 1 },
    { x: 31, y: 19, w: 1, h: 1 },
    { x: 36, y: 19, w: 1, h: 1 },
    { x: 38, y: 19, w: 1, h: 1 }
  ];
  mangroveBlocks.forEach(function (r) { fill(grid, r, 1); });

  const mangroves: PropSpec[] = [];
  const mangroveSpots = [
    [27.4, 20.5], [28.3, 20.4], [29.2, 20.6],
    [35.3, 20.4], [36.2, 20.6], [37.1, 20.4],
    [27.4, 19.4], [31.4, 19.4], [36.4, 19.4], [38.2, 19.4]
  ];
  mangroveSpots.forEach(function (p, i) { mangroves.push({ type: 'mangrove', x: p[0], y: p[1], v: i % 3 }); });

  const trees: TreeSpec[] = [
    { x: 6, y: 1, v: 0 }, { x: 21, y: 1, v: 1 }, { x: 6, y: 7, v: 2 },
    { x: 21, y: 7, v: 0 }, { x: 38, y: 7, v: 1 }, { x: 22, y: 14, v: 2 },
    { x: 37, y: 15, v: 0 }, { x: 0, y: 20, v: 1 }, { x: 22, y: 20, v: 2 },
    { x: 47, y: 7, v: 0 }
  ];
  trees.forEach(function (t) { fill(grid, { x: t.x, y: t.y, w: 1, h: 1 }, 1); });

  const props: PropSpec[] = [
    // ตลาด/ทางเท้า
    { type: 'stall', x: 11.4, y: 11.36, v: 0 },
    { type: 'stall', x: 17.6, y: 11.36, v: 1 },
    { type: 'stall', x: 19.8, y: 11.36, v: 2 },
    { type: 'stall', x: 12.5, y: 15.4, v: 3 },
    { type: 'stall', x: 15.5, y: 15.4, v: 4 },
    { type: 'seafood', x: 11.6, y: 14.5 },
    { type: 'crate', x: 10.6, y: 15.5 },
    { type: 'crate', x: 17.2, y: 15.5 },
    { type: 'sign', x: 23.5, y: 12.6 },
    // ทางเท้าริมทะเล
    { type: 'lamp', x: 10.5, y: 24.4 },
    { type: 'lamp', x: 23.5, y: 11.3 },
    { type: 'lamp', x: 26.5, y: 18.3 },
    { type: 'lamp', x: 42.5, y: 11.3 },
    { type: 'lamp', x: 42.5, y: 20.3 },
    { type: 'lamp', x: 7.5, y: 11.3 },
    { type: 'bin', x: 26.6, y: 11.5 },
    { type: 'bin', x: 26.6, y: 20.6 },
    { type: 'bench', x: 11.4, y: 24.6 },
    { type: 'power', x: 23.5, y: 7.3 },
    { type: 'power', x: 42.5, y: 7.3 },
    { type: 'dog', x: 21.5, y: 20.4 },
    // หาด/ทะเล
    { type: 'fishnet', x: 8.2, y: 26.3 },
    { type: 'crab', x: 9.4, y: 26.8 },
    { type: 'crab', x: 10.1, y: 27.2 },
    { type: 'palm', x: 5.5, y: 26.2 },
    { type: 'palm', x: 15.5, y: 26.5 },
    { type: 'palm', x: 30.5, y: 26.3 },
    { type: 'palm', x: 37.5, y: 26.6 },
    { type: 'boat', x: 19.5, y: 29.3, v: 0 },
    { type: 'boat', x: 31.5, y: 30.1, v: 1 },
    { type: 'boat', x: 28.5, y: 29.4, v: 2 },
    { type: 'buoy', x: 22.5, y: 28.6 },
    { type: 'buoy', x: 35.5, y: 29.3 },
    // โรงงาน/โกดัง
    { type: 'tank', x: 44.7, y: 7.3 },
    { type: 'tank', x: 46.2, y: 7.3 },
    { type: 'truck', x: 43.6, y: 7.5 },
    { type: 'crate', x: 42.5, y: 20.5 },
    { type: 'crate', x: 42.5, y: 19.5 },
    // ลานศาลเจ้า
    { type: 'incense', x: 34.5, y: 15.4 },
    { type: 'lantern', x: 34.6, y: 14.4, v: 0 },
    { type: 'lantern', x: 38.4, y: 14.4, v: 1 },
    { type: 'barber', x: 18.2, y: 15.4 }
  ];

  const hotspots: HotspotSpec[] = [
    { id: 'market', x: 14.5, y: 15.3, r: 92, label: 'ตลาดอาหารทะเล', act: 'seafood' },
    { id: 'health', x: 20.5, y: 15.3, r: 88, label: 'อนามัยบางขุนเทียน', act: 'health' },
    { id: 'school', x: 32.0, y: 15.3, r: 88, label: 'โรงเรียนชุมชน', act: 'school' },
    { id: 'temple', x: 36.5, y: 15.3, r: 88, label: 'ไหว้ศาลเจ้า', act: 'temple' },
    { id: 'factory', x: 45.0, y: 7.4, r: 92, label: 'สมัครงานโรงงาน', act: 'factory' },
    { id: 'coldstorage', x: 45.0, y: 15.3, r: 88, label: 'ห้องเย็นท่าเรือ', act: 'coldstorage' },
    { id: 'warehouse', x: 45.0, y: 20.4, r: 88, label: 'โกดังท่าเรือ', act: 'warehouse' },
    { id: 'pier', x: 24.5, y: 27.4, r: 90, label: 'ท่าเทียบเรือ', act: 'pier' },
    { id: 'beach', x: 33.5, y: 26.2, r: 90, label: 'นั่งหาดบางขุนเทียน', act: 'beach' },
    { id: 'mangrove', x: 31.0, y: 20.4, r: 92, label: 'เดินป่าชายเลน', act: 'mangrove' },
    { id: 'pond', x: 30.5, y: 20.4, r: 86, label: 'บ่อกุ้งชุมชน', act: 'pond' },
    { id: 'food', x: 13.5, y: 24.4, r: 86, label: 'ร้านอาหารทะเล', act: 'food' },
    { id: 'salon', x: 18.5, y: 15.3, r: 86, label: 'ร้านตัดผมชุมชน · ฿150', act: 'salon150' },
    { id: 'exit', x: 23.5, y: 8.4, r: 88, label: 'กลับเขตลุง', act: 'exit' }
  ];

  const palette = {
    grass: '#3b593c', grassDark: '#2c4530', grassLight: '#4b6b46',
    sand: '#c8b07a', sandDark: '#a88f5c', sandLight: '#e0cb98',
    sea: '#1f5560', seaDeep: '#153d49', seaLight: '#3d7d82',
    mud: '#5a4a34', mangrove: '#2c5537', mangroveDark: '#1d3b28',
    roof: '#7a4a3a', roofDark: '#553227', wall: '#8a7a63',
    factory: '#5a5f70', factoryDark: '#3a3f4e', factoryLight: '#8a90a2'
  };

  return {
    id: 'bangkhunthian',
    name: 'บางขุนเทียน · กรุงเทพฯ',
    province: 'กรุงเทพฯ',
    w: W,
    h: H,
    grid: grid,
    buildings: buildings,
    houses: houses,
    roads: roads,
    sidewalks: sidewalks,
    water: water,
    sand: sand,
    mangroveZones: mangroveZones,
    trees: trees,
    mangroves: mangroves,
    props: props,
    hotspots: hotspots,
    spawn: { x: 23.5, y: 8.4 },
    palette: palette,
    pier: { x: 24, y: 24, w: 2, h: 6 },
    zoneRects: {
      water: water,
      road: roads,
      sidewalk: sidewalks,
      sand: sand,
      mangrove: mangroveBlocks
    }
  };
}

/* ==========================================================
   REGISTRY
   ========================================================== */

const BUILDERS: { [id: string]: () => DistrictSpec } = {
  bangkhunthian: bangKhunThian
};

export function getDistrictMap(id: string): DistrictSpec | null {
  const fn = BUILDERS[id];
  return fn ? fn() : null;
}

export const PILOT_DISTRICTS = [
  { id: 'bangkhunthian', name: 'บางขุนเทียน', province: 'กรุงเทพฯ', ready: true, vibe: 'ทะเล คลอง ป่าชายเลน โรงงาน' },
  { id: 'yaowarat', name: 'เยาวราช', province: 'กรุงเทพฯ', ready: false, vibe: 'ตลาดเก่า ร้านทอง ศาลเจ้า' },
  { id: 'silom', name: 'สีลม', province: 'กรุงเทพฯ', ready: false, vibe: 'CBD ตึกสูง สกายวอล์ก' }
];
