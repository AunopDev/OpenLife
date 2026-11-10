/* render/scale — unit test (แปลงหน่วยภาพ) */
import { describe, it, expect } from 'vitest';
import { ArtScale, worldPerArt, worldToArt, artToWorld, screenToArt, artToScreen, viewportArt, screenPxPerTile } from './scale';

const legacy: ArtScale = { tilePx: 64, artPx: 16, screenPx: 5 };
const next32: ArtScale = { tilePx: 64, artPx: 32, screenPx: 2.5 };

describe('สเกลเลกาซี 16px', function () {
  it('1 tile = 16 art px = 80 screen px (PIX 5)', function () {
    expect(worldPerArt(legacy)).toBe(4);
    expect(worldToArt(64, legacy)).toBe(16);
    expect(artToWorld(16, legacy)).toBe(64);
    expect(screenPxPerTile(legacy)).toBe(80);
  });
  it('screen → art → world ไปกลับได้', function () {
    const art = screenToArt(100, 10, legacy);
    expect(art).toBe(30);
    expect(artToScreen(art, 10, legacy)).toBe(100);
    expect(artToWorld(art, legacy)).toBe(120);
  });
  it('viewport 1440×900 → 288×180 art px', function () {
    expect(viewportArt(1440, 900, legacy)).toEqual({ w: 288, h: 180 });
  });
});

describe('สเกลใหม่ 32px', function () {
  it('1 tile = 32 art px และ worldPerArt = 2', function () {
    expect(worldPerArt(next32)).toBe(2);
    expect(worldToArt(64, next32)).toBe(32);
    expect(artToWorld(32, next32)).toBe(64);
  });
  it('PIX 2.5 ให้ 80 screen px ต่อ tile เท่าเดิม (ภาพไม่กระโดด)', function () {
    expect(screenPxPerTile(next32)).toBe(80);
  });
  it('viewport ที่ PIX 2.5 = 576×360 art px (ละเอียดขึ้น 2 เท่า)', function () {
    expect(viewportArt(1440, 900, next32)).toEqual({ w: 576, h: 360 });
  });
});
