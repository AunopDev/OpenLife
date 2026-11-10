/* building-art-32 — unit test ด้วย ctx ปลอม */
import { describe, it, expect } from 'vitest';
import { drawBuilding32, drawHouse32, BuildingLike } from './building-art-32';

interface Rect { x: number; y: number; w: number; h: number; c: string; }

function fakeCtx() {
  const calls: Rect[] = [];
  const ctx: any = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect: function (x: number, y: number, w: number, h: number) {
      calls.push({ x: x, y: y, w: w, h: h, c: String(this.fillStyle) });
    },
    strokeRect: function () {},
    calls: calls
  };
  return ctx;
}

const office: BuildingLike = {
  id: 'office', name: 'ออฟฟิศ', x: 4, y: 2, w: 4, h: 3,
  roof: '#39477e', roofDark: '#28325c', wall: '#232b52', sign: '#2f4bb0', door: 6
};

describe('drawBuilding32', () => {
  it('มุมถนน: วาดในกรอบ footprint + ชายคา', function () {
    const ctx = fakeCtx();
    drawBuilding32(ctx, office, false);
    expect(ctx.calls.length).toBeGreaterThan(30);
    ctx.calls.forEach(function (r) {
      expect(r.x).toBeGreaterThanOrEqual(office.x * 32 - 8);
      expect(r.x).toBeLessThanOrEqual((office.x + office.w) * 32 + 8);
      expect(r.y).toBeGreaterThanOrEqual(office.y * 32 - 8);
      expect(r.y).toBeLessThanOrEqual((office.y + office.h) * 32 + 10);
    });
  });
  it('ใช้สีหลังคา/ผนัง/ป้ายที่ส่งมา', function () {
    const ctx = fakeCtx();
    drawBuilding32(ctx, office, false);
    const colors = ctx.calls.map(function (r) { return r.c; });
    expect(colors.indexOf('#39477e')).toBeGreaterThanOrEqual(0);
    expect(colors.indexOf('#232b52')).toBeGreaterThanOrEqual(0);
  });
  it('แบบแผนที่ (flat) วาดน้อยกว่าแบบมีหน้าอาคาร', function () {
    const a = fakeCtx();
    const b = fakeCtx();
    drawBuilding32(a, office, true);
    drawBuilding32(b, office, false);
    expect(a.calls.length).toBeLessThan(b.calls.length);
  });
});

describe('drawHouse32', () => {
  it('วาดได้ทั้ง flat และมีหน้าอาคาร', function () {
    const house: BuildingLike = { x: 1, y: 1, w: 2, h: 2, roof: '#7a5240', roofDark: '#553327', wall: '#3d2419' };
    const a = fakeCtx();
    const b = fakeCtx();
    drawHouse32(a, house, true);
    drawHouse32(b, house, false);
    expect(a.calls.length).toBeGreaterThan(4);
    expect(b.calls.length).toBeGreaterThan(10);
  });
});
