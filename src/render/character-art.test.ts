/* character-art — unit test ด้วย ctx ปลอม (ไม่พึ่งเบราว์เซอร์) */
import { describe, it, expect } from 'vitest';
import { drawHuman32, drawAnimal32, HumanLook, HUMAN_H, HUMAN_W } from './character-art';

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

const look: HumanLook = {
  skin: '#f0c9a0', skinDark: '#d9a97c', hair: '#161a2e', hairDark: '#0e1120',
  clothes: '#e8eefc', clothesShade: '#dfe6f8', clothesDark: '#20263f',
  eye: '#12142a', pants: '#2b3350'
};

describe('drawHuman32', function () {
  it('วาดหลายชิ้นและอยู่ในกรอบสไปรต์', function () {
    const ctx = fakeCtx();
    const X = 100;
    const Y = 200;
    drawHuman32(ctx, X, Y, look, { dir: 'down', moving: false, phase: 0 });
    expect(ctx.calls.length).toBeGreaterThan(25);
    ctx.calls.forEach(function (r) {
      expect(r.x).toBeGreaterThanOrEqual(X - HUMAN_W);
      expect(r.x).toBeLessThanOrEqual(X + HUMAN_W);
      expect(r.y).toBeGreaterThanOrEqual(Y - HUMAN_H - 8);
      expect(r.y).toBeLessThanOrEqual(Y + 6);
      expect(r.w).toBeGreaterThan(0);
      expect(r.h).toBeGreaterThan(0);
    });
  });
  it('ใช้สีเสื้อผ้าที่ส่งเข้ามา', function () {
    const ctx = fakeCtx();
    drawHuman32(ctx, 0, 0, look, { dir: 'down', moving: false, phase: 0 });
    expect(ctx.calls.some(function (r) { return r.c === look.clothes; })).toBe(true);
    expect(ctx.calls.some(function (r) { return r.c === look.skin; })).toBe(true);
  });
  it('หันหลังไม่วาดตา', function () {
    const ctx = fakeCtx();
    drawHuman32(ctx, 0, 0, look, { dir: 'up', moving: false, phase: 0 });
    expect(ctx.calls.some(function (r) { return r.c === look.eye; })).toBe(false);
  });
  it('เดินแล้วมีการขยับ (ผลลัพธ์ต่างจากยืนนิ่ง)', function () {
    const a = fakeCtx();
    const b = fakeCtx();
    drawHuman32(a, 0, 0, look, { dir: 'down', moving: false, phase: 0 });
    drawHuman32(b, 0, 0, look, { dir: 'down', moving: true, phase: 1.2 });
    expect(JSON.stringify(a.calls)).not.toBe(JSON.stringify(b.calls));
  });
});

describe('drawAnimal32', function () {
  it('วาดได้ทุกชนิด', function () {
    (['dog', 'cat', 'wild'] as const).forEach(function (k) {
      const ctx = fakeCtx();
      drawAnimal32(ctx, 50, 50, k, 0.5);
      expect(ctx.calls.length).toBeGreaterThan(6);
    });
  });
});
