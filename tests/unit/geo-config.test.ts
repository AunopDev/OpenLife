/* กันแผนที่ "มั่วโดยไม่มีอะไรเตือน" — กฎ: docs/rules/maps.md §2
   1) ทุกจังหวัด/เขตต้องมีค่าตั้งแผนที่ครบและถูกชนิด (ห้ามปล่อยให้ใช้ค่ากรุงเทพฯ โดยไม่ตั้งใจ)
   2) ค่าต้องสอดคล้องกัน (ภาค ↔ แบบวัด ↔ ชุดสี)
   3) จังหวัด/เขตใหม่ต้องมี research card (ของเก่าที่ยังไม่มี = หนี้งานในรายการด้านล่าง)
   4) landmark ต้องเป็นของประจำเขต ไม่ใช่ค่ากลาง (ของเก่า = หนี้งาน)
   5) ตัวคูณค่าเช่า/เงินเดือนอยู่ในช่วงที่สมเหตุสมผล
   6) รายชื่อจังหวัดในเมนูตรงกับ geo.json

   ⚠ รายการ "หนี้งาน" ห้ามเพิ่ม — ทำได้แค่ลบเมื่อแก้แล้ว (test จะเตือนเมื่อรายการไหนแก้แล้วแต่ยังค้างอยู่) */
import { describe, it, expect } from 'vitest';
import { GEO } from '../../src/world/geo';
import provincesList from '../../src/data/provinces.json';

const RESEARCH = import.meta.glob('../../docs/research/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

const PALETTES = ['bangkok', 'central', 'north', 'isan', 'east', 'south'];
const REGIONS = ['bangkok', 'central', 'north', 'isan', 'east', 'south'];
const WATER = ['canal', 'pond'];
const ROADS = ['grid', 'no-east', 'no-west', 'no-east-west', 'no-south', 'seeded'];
const ARCHETYPES = ['urban', 'town', 'rural'];
const WATS = ['thai', 'lanna', 'chinese'];
const HEX = /^#[0-9a-f]{6}$/i;
const GENERIC_LANDMARK = 'อนุสาวรีย์ประจำเมือง';

/** ภาคในข้อมูลภาษาไทย → region ของแผนที่ที่ยอมรับ */
const REGION_OF: Record<string, string[]> = {
  'กลาง': ['bangkok', 'central'],
  'เหนือ': ['north'],
  'อีสาน': ['isan'],
  'ตะวันออก': ['east'],
  'ใต้': ['south']
};

/** หนี้งาน: จังหวัดที่ยังไม่มี research card ระดับจังหวัด (ห้ามเพิ่ม) */
const PROVINCE_RESEARCH_DEBT = ['bangkok', 'nonthaburi', 'pathum-thani', 'samut-prakan', 'chiang-mai', 'khon-kaen', 'chonburi', 'songkhla'];

/** หนี้งาน: เขต/อำเภอที่ยังไม่มี research card (ห้ามเพิ่ม) */
const DISTRICT_RESEARCH_DEBT = [
  'bangkok/pathumwan', 'bangkok/khlongtoei', 'bangkok/sathorn', 'bangkok/watthana', 'bangkok/chatuchak',
  'nonthaburi/mueang-nonthaburi', 'nonthaburi/pak-kret', 'nonthaburi/bang-yai', 'nonthaburi/bang-bua-thong',
  'pathum-thani/mueang-pathum-thani', 'pathum-thani/khlong-luang', 'pathum-thani/thanyaburi', 'pathum-thani/lam-luk-ka',
  'samut-prakan/mueang-samut-prakan', 'samut-prakan/bang-phli', 'samut-prakan/phra-pradaeng', 'samut-prakan/bang-sao-thong',
  'chiang-mai/mueang-chiang-mai', 'chiang-mai/san-sai', 'chiang-mai/hang-dong', 'chiang-mai/mae-rim',
  'khon-kaen/mueang-khon-kaen', 'khon-kaen/ban-phai', 'khon-kaen/chum-phae', 'khon-kaen/nam-phong',
  'chonburi/mueang-chonburi', 'chonburi/bang-lamung', 'chonburi/si-racha', 'chonburi/sattahip',
  'songkhla/mueang-songkhla', 'songkhla/hat-yai', 'songkhla/sadao', 'songkhla/na-thawi'
];

/** หนี้งาน: เขตที่ยังใช้ landmark กลาง "อนุสาวรีย์ประจำเมือง" (ห้ามเพิ่ม) */
const GENERIC_LANDMARK_DEBT = [
  'bangkok/watthana', 'bangkok/chatuchak',
  'nonthaburi/mueang-nonthaburi', 'nonthaburi/pak-kret', 'nonthaburi/bang-yai', 'nonthaburi/bang-bua-thong',
  'pathum-thani/mueang-pathum-thani', 'pathum-thani/khlong-luang', 'pathum-thani/thanyaburi', 'pathum-thani/lam-luk-ka',
  'samut-prakan/mueang-samut-prakan', 'samut-prakan/bang-phli', 'samut-prakan/phra-pradaeng', 'samut-prakan/bang-sao-thong',
  'chiang-mai/mueang-chiang-mai', 'chiang-mai/san-sai', 'chiang-mai/hang-dong', 'chiang-mai/mae-rim',
  'khon-kaen/mueang-khon-kaen', 'khon-kaen/ban-phai', 'khon-kaen/chum-phae', 'khon-kaen/nam-phong',
  'chonburi/mueang-chonburi', 'chonburi/bang-lamung', 'chonburi/si-racha', 'chonburi/sattahip',
  'songkhla/mueang-songkhla', 'songkhla/hat-yai', 'songkhla/sadao', 'songkhla/na-thawi'
];

/** research card ประกาศพื้นที่ที่ครอบคลุมด้วยบรรทัด `geo: <province-id>` หรือ `geo: <province-id>/<district-id>` */
function covered(key: string): boolean {
  const re = new RegExp('(^|\\s)geo:\\s*' + key.replace(/[-/]/g, '\\$&') + '(\\s|$)', 'm');
  return Object.keys(RESEARCH).some(function (f) { return re.test(RESEARCH[f]); });
}

describe('ค่าตั้งแผนที่ระดับจังหวัด', function () {
  GEO.forEach(function (p) {
    it(p.id + ' มี map ครบและถูกชนิด', function () {
      const m: any = (p as any).map;
      expect(m, 'ขาด map ใน geo.json').toBeTruthy();
      expect(PALETTES).toContain(m.palette);
      expect(REGIONS).toContain(m.region);
      expect(WATER).toContain(m.inlandWater);
      expect(ROADS).toContain(m.roadLayout);
    });
    it(p.id + ' ภาคตรงกับ region/palette', function () {
      const allowed = REGION_OF[p.region];
      expect(allowed, 'ภาคไม่รู้จัก: ' + p.region).toBeTruthy();
      expect(allowed).toContain(p.map.region);
      expect(p.map.palette).toBe(p.map.region);
    });
  });
});

describe('ค่าตั้งแผนที่ระดับเขต/อำเภอ', function () {
  GEO.forEach(function (p) {
    p.districts.forEach(function (d) {
      const key = p.id + '/' + d.id;
      it(key + ' มี map ครบและถูกชนิด', function () {
        const m: any = (d as any).map;
        expect(m, 'ขาด map ใน geo.json').toBeTruthy();
        expect(ARCHETYPES).toContain(m.archetype);
        expect(typeof m.coastal).toBe('boolean');
        expect(WATS).toContain(m.wat);
        expect(m.landmark && typeof m.landmark.name === 'string' && m.landmark.name.length > 0).toBe(true);
        expect(m.landmark.roof).toMatch(HEX);
        expect(m.landmark.sign).toMatch(HEX);
        if (m.roof !== undefined) expect(m.roof).toMatch(HEX);
        if (m.houseRoof !== undefined) expect(m.houseRoof).toMatch(HEX);
      });
      it(key + ' แบบวัดสอดคล้องกับภาค', function () {
        if (d.map.wat === 'lanna') expect(p.map.region).toBe('north');
        if (p.map.region === 'north') expect(d.map.wat === 'lanna' || d.map.wat === 'chinese').toBe(true);
      });
    });
  });
});

describe('research card (จังหวัด/เขตใหม่ต้องมี)', function () {
  it('จังหวัดที่ไม่มี card ต้องอยู่ในรายการหนี้งานเท่านั้น', function () {
    const missing = GEO.filter(function (p) { return !covered(p.id); }).map(function (p) { return p.id; });
    expect(missing.filter(function (k) { return PROVINCE_RESEARCH_DEBT.indexOf(k) === -1; })).toEqual([]);
  });
  it('เขตที่ไม่มี card ต้องอยู่ในรายการหนี้งานเท่านั้น', function () {
    const missing: string[] = [];
    GEO.forEach(function (p) { p.districts.forEach(function (d) { if (!covered(p.id + '/' + d.id)) missing.push(p.id + '/' + d.id); }); });
    expect(missing.filter(function (k) { return DISTRICT_RESEARCH_DEBT.indexOf(k) === -1; })).toEqual([]);
  });
  it('หนี้งานที่แก้แล้วต้องถูกลบออกจากรายการ', function () {
    expect(PROVINCE_RESEARCH_DEBT.filter(covered)).toEqual([]);
    expect(DISTRICT_RESEARCH_DEBT.filter(covered)).toEqual([]);
  });
});

describe('landmark ประจำเขต', function () {
  it('เขตที่ใช้ landmark กลางต้องอยู่ในรายการหนี้งานเท่านั้น', function () {
    const generic: string[] = [];
    GEO.forEach(function (p) { p.districts.forEach(function (d) { if (d.map.landmark.name === GENERIC_LANDMARK) generic.push(p.id + '/' + d.id); }); });
    expect(generic.filter(function (k) { return GENERIC_LANDMARK_DEBT.indexOf(k) === -1; })).toEqual([]);
    expect(GENERIC_LANDMARK_DEBT.filter(function (k) { return generic.indexOf(k) === -1; }), 'แก้แล้ว — ลบออกจากรายการหนี้งาน').toEqual([]);
  });
});

describe('ตัวเลขเงินของพื้นที่ (ช่วงสมเหตุสมผล — ตัวเลขจริงต้องมีแหล่งใน research card)', function () {
  it('ตัวคูณระดับจังหวัด 0.4–1.5 (กรุงเทพฯ = 1)', function () {
    GEO.forEach(function (p) {
      expect(p.rent).toBeGreaterThanOrEqual(0.4); expect(p.rent).toBeLessThanOrEqual(1.5);
      expect(p.salary).toBeGreaterThanOrEqual(0.4); expect(p.salary).toBeLessThanOrEqual(1.5);
    });
  });
  it('ตัวคูณระดับย่าน ค่าเช่า 0.4–2.5 เงินเดือน 0.5–2.0', function () {
    const bad: string[] = [];
    GEO.forEach(function (p) {
      p.districts.forEach(function (d) {
        d.neighborhoods.forEach(function (h) {
          if (h.rent < 0.4 || h.rent > 2.5 || h.salary < 0.5 || h.salary > 2.0) bad.push(p.id + '/' + d.id + '/' + h.id);
        });
      });
    });
    expect(bad).toEqual([]);
  });
});

describe('รายชื่อจังหวัดในเมนู', function () {
  it('provinces.json ตรงกับ geo.json ทุกชื่อและลำดับเดียวกัน', function () {
    expect(provincesList).toEqual(GEO.map(function (p) { return p.name; }));
  });
});
