/* เนื้อหาและกฎโค้ดที่ตรวจด้วยเครื่องได้
   - ภูมิศาสตร์ (geoAudit)
   - คำต้องห้ามตาม content-safety.md §1, §3 ในข้อมูลเกม
   - ห้าม Math.random ในงานภาพ/แผนที่ (code.md §5)
   หมายเหตุ: รายการคำนี้เป็นตาข่ายขั้นต่ำ ไม่ได้แทนการอ่านตรวจด้วยคน */
import { describe, it, expect } from 'vitest';
import { geoAudit } from '../../src/world/geo';
import { DISTRICTS } from '../../src/world/districts';

const DATA_FILES = import.meta.glob('../../src/data/*.json', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const SEEDED_SOURCES = import.meta.glob(
  ['../../src/render/**/*.ts', '../../src/world/city-maps.ts', '../../src/world/district-maps.ts', '../../src/world/map-audit.ts'],
  { eager: true, query: '?raw', import: 'default' }
) as Record<string, string>;

/** คำที่อ้างถึงสถาบันพระมหากษัตริย์ — ห้ามมีในข้อมูลเกม (content-safety.md §1.1) */
const ROYAL_TERMS = ['ในหลวง', 'พระบาทสมเด็จ', 'พระราชินี', 'สมเด็จพระ', 'เฉลิมพระเกียรติ', 'พระบรม', 'พระราชทาน', 'รัชกาล', 'ราชวงศ์', 'เพลงสรรเสริญ'];

/** แบรนด์จริงที่พบบ่อย — ใช้ชื่อกลาง ๆ แทน (content-safety.md §3) */
const BRAND_TERMS = ['7-eleven', 'เซเว่น', 'grab', 'lineman', 'foodpanda', 'shopee', 'lazada', 'big c', 'บิ๊กซี', 'โลตัส', 'lotus', 'แม็คโคร', 'makro', 'เซ็นทรัล', 'central', 'starbucks', 'สตาร์บัคส์', 'kfc', 'mcdonald', 'แมคโดนัลด์', 'iphone', 'samsung', 'tiktok', 'facebook', 'เฟซบุ๊ก'];

/** ดึงเฉพาะ "ข้อความที่ผู้เล่นเห็น" = string value ที่มีอักษรไทยหรือช่องว่าง
    (ข้าม key และ id ภาษาอังกฤษล้วน เช่น "central", "bts" เพื่อไม่ให้จับผิด) */
function playerText(raw: string): string {
  const out: string[] = [];
  const walk = function (v: unknown) {
    if (typeof v === 'string') { if (/[฀-๿\s]/.test(v)) out.push(v); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (v && typeof v === 'object') Object.keys(v as object).forEach(function (k) { walk((v as Record<string, unknown>)[k]); });
  };
  walk(JSON.parse(raw));
  return out.join('\n').toLowerCase();
}

function hits(terms: string[]): string[] {
  const found: string[] = [];
  Object.keys(DATA_FILES).forEach(function (file) {
    const text = playerText(DATA_FILES[file]);
    terms.forEach(function (t) {
      if (text.indexOf(t.toLowerCase()) >= 0) found.push(file.replace('../../', '') + ': ' + t);
    });
  });
  return found;
}

describe('ภูมิศาสตร์', function () {
  it('geoAudit ผ่าน', function () {
    expect(geoAudit(DISTRICTS.map(function (d) { return d.id; }))).toEqual([]);
  });
});

describe('content-safety (ตรวจคำ)', function () {
  it('มีไฟล์ข้อมูลให้ตรวจ', function () {
    expect(Object.keys(DATA_FILES).length).toBeGreaterThan(5);
  });
  it('ไม่มีคำที่อ้างถึงสถาบันฯ', function () {
    expect(hits(ROYAL_TERMS)).toEqual([]);
  });
  it('ไม่มีชื่อแบรนด์จริง', function () {
    expect(hits(BRAND_TERMS)).toEqual([]);
  });
});

describe('กฎโค้ด', function () {
  it('งานภาพ/แผนที่ไม่ใช้ Math.random (ต้อง seeded)', function () {
    const bad = Object.keys(SEEDED_SOURCES).filter(function (f) {
      return /Math\.random\s*\(/.test(SEEDED_SOURCES[f]);
    });
    expect(bad).toEqual([]);
  });
});
