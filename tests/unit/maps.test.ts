/* แผนที่: ทุก จังหวัด × เขต/อำเภอ × ย่าน ต้องผ่าน audit, เหมือนเดิมทุกครั้ง (seeded) และมีจุดโต้ตอบครบ
   กฎ: docs/rules/maps.md */
import { describe, it, expect } from 'vitest';
import { GEO } from '../../src/world/geo';
import { getCityMap } from '../../src/world/city-maps';
import { getDistrictMap } from '../../src/world/district-maps';
import { auditDistrictSpec } from '../../src/world/map-audit';

/** อาคารหลักที่ทุกแผนที่เมืองต้องมี (maps.md §3) */
const REQUIRED_BUILDINGS = ['home', 'office', 'seven', 'market', 'hospital', 'salon', 'clothes', 'gym', 'station', 'bar', 'temple', 'landmark'];

interface Place { province: string; khet: string; hood: string; label: string; }

function allPlaces(): Place[] {
  const out: Place[] = [];
  GEO.forEach(function (p) {
    p.districts.forEach(function (d) {
      d.neighborhoods.forEach(function (h) {
        out.push({ province: p.name, khet: d.id, hood: h.id, label: p.id + '/' + d.id + '/' + h.id });
      });
    });
  });
  return out;
}

const places = allPlaces();

describe('แผนที่เมืองที่สร้างอัตโนมัติ', function () {
  it('มีพื้นที่ให้ทดสอบ', function () {
    expect(places.length).toBeGreaterThan(0);
  });

  places.forEach(function (pl) {
    describe(pl.label, function () {
      const spec = getCityMap(pl.province, pl.khet, pl.hood);

      it('ผ่าน audit โซน/การบล็อก/การเดินถึง', function () {
        expect(auditDistrictSpec(spec)).toEqual([]);
      });

      it('สร้างซ้ำได้ผลเดิม (seeded)', function () {
        const again = getCityMap(pl.province, pl.khet, pl.hood);
        expect(JSON.stringify(again)).toBe(JSON.stringify(spec));
      });

      it('มีอาคารหลักครบ', function () {
        const ids = spec.buildings.map(function (b) { return b.id; });
        const missing = REQUIRED_BUILDINGS.filter(function (id) { return ids.indexOf(id) === -1; });
        expect(missing).toEqual([]);
      });

      it('มีจุดสวนหรือหาด', function () {
        const ids = spec.hotspots.map(function (h) { return h.id; });
        expect(ids.indexOf('park') >= 0 || ids.indexOf('beach') >= 0).toBe(true);
      });
    });
  });
});

describe('แผนที่เฉพาะเขต', function () {
  it('บางขุนเทียนผ่าน audit', function () {
    const spec = getDistrictMap('bangkhunthian');
    expect(spec).toBeTruthy();
    if (spec) expect(auditDistrictSpec(spec)).toEqual([]);
  });
});
