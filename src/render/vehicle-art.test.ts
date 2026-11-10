/* vehicle-art — unit test ด้วย ctx ปลอม */
import { describe, it, expect } from 'vitest';
import { drawCar32, CAR_LEN, CAR_WID } from './vehicle-art';

interface Rect { x: number; y: number; w: number; h: number; c: string; }

function fakeCtx() {
  const calls: Rect[] = [];
  const ctx: any = {
    fillStyle: '',
    fillRect: function (x: number, y: number, w: number, h: number) {
      calls.push({ x: x, y: y, w: w, h: h, c: String(this.fillStyle) });
    },
    beginPath: function () {},
    ellipse: function () {},
    fill: function () {},
    calls: calls
  };
  return ctx;
}

describe('drawCar32', () => {
  it('แนวนอน: วาดหลายชิ้นและอยู่ในกรอบรถ', function () {
    const ctx = fakeCtx();
    drawCar32(ctx, 100, 100, { color: '#e85c6c', axis: 'h', dir: 1 });
    expect(ctx.calls.length).toBeGreaterThan(15);
    ctx.calls.forEach(function (r) {
      expect(r.x).toBeGreaterThanOrEqual(100 - CAR_LEN / 2 - 6);
      expect(r.x).toBeLessThanOrEqual(100 + CAR_LEN / 2 + 6);
      expect(r.y).toBeGreaterThanOrEqual(100 - CAR_WID / 2 - 6);
      expect(r.y).toBeLessThanOrEqual(100 + CAR_WID / 2 + 6);
      expect(r.w).toBeGreaterThan(0);
      expect(r.h).toBeGreaterThan(0);
    });
  });
  it('แนวตั้ง: สลับแกนความยาว/กว้าง', function () {
    const ctx = fakeCtx();
    drawCar32(ctx, 0, 0, { color: '#7dd3fc', axis: 'v', dir: -1 });
    const maxH = Math.max.apply(null, ctx.calls.map(function (r) { return r.h; }));
    const maxW = Math.max.apply(null, ctx.calls.map(function (r) { return r.w; }));
    expect(maxH).toBeGreaterThan(maxW);
  });
  it('ทิศต่างกันให้ตำแหน่งไฟต่างกัน', function () {
    const a = fakeCtx();
    const b = fakeCtx();
    drawCar32(a, 0, 0, { color: '#ffd75e', axis: 'h', dir: 1 });
    drawCar32(b, 0, 0, { color: '#ffd75e', axis: 'h', dir: -1 });
    expect(JSON.stringify(a.calls)).not.toBe(JSON.stringify(b.calls));
  });
});
