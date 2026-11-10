/* OpenLife — geographic hierarchy: province → district (เขต/อำเภอ) → neighborhood (ย่าน)
   RESEARCH: docs/research/geo-hierarchy.md */
import geoData from '../data/geo.json';
import provincesList from '../data/provinces.json';
import type { CityArchetype, CityRegion, WatStyle } from './district-maps';

export interface GeoNeighborhood {
  id: string;
  name: string;
  vibe: string;
  zone: string;
  rent: number;
  salary: number;
  tags: string[];
  mapId?: string;
}

/** ค่าตั้งแผนที่ระดับจังหวัด — บังคับทุกจังหวัด (tests/unit/geo-config.test.ts) · กฎ: docs/rules/maps.md §2 */
export interface ProvinceMapConfig {
  /** ชุดสีพื้น/หลังคาตามภาค (key ใน PALETTES ของ city-maps.ts) */
  palette: 'bangkok' | 'central' | 'north' | 'isan' | 'east' | 'south';
  region: CityRegion;
  /** แหล่งน้ำในเมืองสำหรับอำเภอที่ไม่ติดทะเล */
  inlandWater: 'canal' | 'pond';
  /** โครงถนน: grid = ครบ 4 เส้น · no-* = ตัดเส้นนั้นออก · seeded = สุ่มตาม seed ของพื้นที่ */
  roadLayout: 'grid' | 'no-east' | 'no-west' | 'no-east-west' | 'no-south' | 'seeded';
}

export interface LandmarkConfig { name: string; roof: string; sign: string; }

/** ค่าตั้งแผนที่ระดับเขต/อำเภอ — บังคับทุกเขต ห้ามปล่อยให้ใช้ค่าเริ่มต้นโดยไม่ตั้งใจ */
export interface DistrictMapConfig {
  archetype: CityArchetype;
  coastal: boolean;
  wat: WatStyle;
  landmark: LandmarkConfig;
  /** สีหลังคาหลักเฉพาะถิ่น (เช่น ย่านจีน) — ไม่ใส่ = ใช้สีจาก palette */
  roof?: string;
  /** สีหลังคาบ้านรองเฉพาะถิ่น */
  houseRoof?: string;
}

export interface GeoDistrict {
  id: string;
  name: string;
  vibe: string;
  map: DistrictMapConfig;
  neighborhoods: GeoNeighborhood[];
}

export interface GeoProvince {
  id: string;
  name: string;
  unit: string;
  region: string;
  salary: number;
  rent: number;
  map: ProvinceMapConfig;
  districts: GeoDistrict[];
}

export const GEO: GeoProvince[] = geoData as GeoProvince[];

export function geoProvince(name: string): GeoProvince | null {
  for (let i = 0; i < GEO.length; i++) {
    if (GEO[i].name === name || GEO[i].id === name) return GEO[i];
  }
  return null;
}

export function geoDistricts(provinceName: string): GeoDistrict[] {
  const p = geoProvince(provinceName);
  return p ? p.districts : [];
}

export function geoDistrict(provinceName: string, districtId: string): GeoDistrict | null {
  const list = geoDistricts(provinceName);
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === districtId) return list[i];
  }
  return null;
}

export function geoNeighborhood(provinceName: string, hoodId: string): GeoNeighborhood | null {
  const list = geoDistricts(provinceName);
  for (let i = 0; i < list.length; i++) {
    const hoods = list[i].neighborhoods;
    for (let j = 0; j < hoods.length; j++) {
      if (hoods[j].id === hoodId) return hoods[j];
    }
  }
  return null;
}

/** หาเขตจาก neighborhood id (ใช้ตอนโหลดเซฟ/ย้าย) */
export function geoDistrictOfHood(provinceName: string, hoodId: string): GeoDistrict | null {
  const list = geoDistricts(provinceName);
  for (let i = 0; i < list.length; i++) {
    const hoods = list[i].neighborhoods;
    for (let j = 0; j < hoods.length; j++) {
      if (hoods[j].id === hoodId) return list[i];
    }
  }
  return null;
}

/** หาเขต/ย่านจาก zone เดิม (ใช้ migrate เซฟเก่า) */
export function geoFindByZone(provinceName: string, zone: string): { district: GeoDistrict; neighborhood: GeoNeighborhood } | null {
  const list = geoDistricts(provinceName);
  for (let i = 0; i < list.length; i++) {
    for (let j = 0; j < list[i].neighborhoods.length; j++) {
      if (list[i].neighborhoods[j].zone === zone) {
        return { district: list[i], neighborhood: list[i].neighborhoods[j] };
      }
    }
  }
  return null;
}

/** ค่าเช่า/เงินเดือนที่ปรับตามจังหวัดและย่าน */
export function geoFinance(provinceName: string, hoodId: string): { rent: number; salary: number } {
  const p = geoProvince(provinceName);
  const hood = p ? geoNeighborhood(provinceName, hoodId) : null;
  if (!p) return { rent: 1, salary: 1 };
  return {
    rent: p.rent * (hood ? hood.rent : 1),
    salary: p.salary * (hood ? hood.salary : 1)
  };
}

export function geoLabel(provinceName: string, districtId: string, hoodId: string): string {
  const p = geoProvince(provinceName);
  const d = p ? geoDistrict(provinceName, districtId) : null;
  const h = p ? geoNeighborhood(provinceName, hoodId) : null;
  return [h ? h.name : '', d ? d.name : '', p ? p.name : ''].filter(function (x) { return !!x; }).join(' · ');
}

/** audit ข้อมูล geo: id ไม่ซ้ำ, ย่านมี zone ที่มีอยู่จริงถ้าระบุ */
export function geoAudit(validZones: string[]): string[] {
  const issues: string[] = [];
  const provIds: { [k: string]: boolean } = {};
  GEO.forEach(function (p) {
    if (provIds[p.id]) issues.push('province id ซ้ำ: ' + p.id);
    provIds[p.id] = true;
    if (!p.districts.length) issues.push('province ไม่มีเขต: ' + p.name);
    const distIds: { [k: string]: boolean } = {};
    const hoodIds: { [k: string]: boolean } = {};
    p.districts.forEach(function (d) {
      const key = p.id + '/' + d.id;
      if (distIds[d.id]) issues.push('district id ซ้ำ: ' + key);
      distIds[d.id] = true;
      if (!d.neighborhoods.length) issues.push('district ไม่มีย่าน: ' + key);
      d.neighborhoods.forEach(function (h) {
        if (hoodIds[h.id]) issues.push('hood id ซ้ำในจังหวัด: ' + p.id + '/' + h.id);
        hoodIds[h.id] = true;
        if (h.zone && validZones.indexOf(h.zone) === -1) {
          issues.push('hood zone ไม่รู้จัก: ' + key + '/' + h.id + ' → ' + h.zone);
        }
        if (!(h.rent > 0) || !(h.salary > 0)) issues.push('hood factor ผิด: ' + key + '/' + h.id);
      });
    });
  });
  // รายชื่อจังหวัดในเมนู (provinces.json) ต้องตรงกับ geo.json ทั้งสองทาง
  (provincesList as string[]).forEach(function (name) {
    if (!geoProvince(name)) issues.push('ขาดจังหวัดใน geo.json: ' + name);
  });
  GEO.forEach(function (p) {
    if ((provincesList as string[]).indexOf(p.name) === -1) issues.push('จังหวัดไม่อยู่ใน provinces.json (ไม่โผล่ในเมนู): ' + p.name);
  });
  return issues;
}
