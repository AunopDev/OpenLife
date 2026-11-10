/* render/scale — แปลงหน่วย world ↔ art ↔ screen แบบเป็นระบบ
   ใช้ร่วมทุกชั้นวาดภาพ เพื่อให้การย้าย 16px → 32px ทำได้โดยเปลี่ยนสเปกเดียว
   สูตร: worldPerArt = tilePx / artPx · screen = (art - camArt) × screenPx */

export interface ArtScale {
  /** ขนาด tile ในหน่วย world px (ตอนนี้ 64) */
  tilePx: number;
  /** จำนวน art px ต่อ tile (16 = เลกาซี, 32 = มาตรฐานใหม่) */
  artPx: number;
  /** จำนวน screen px ต่อ 1 art px (ซูม) */
  screenPx: number;
}

export function worldPerArt(s: ArtScale): number {
  return s.tilePx / s.artPx;
}

export function worldToArt(world: number, s: ArtScale): number {
  return world / worldPerArt(s);
}

export function artToWorld(art: number, s: ArtScale): number {
  return art * worldPerArt(s);
}

/** screen px (ใน viewport) → art px (พร้อม offset กล้อง) */
export function screenToArt(screen: number, camArt: number, s: ArtScale): number {
  return screen / s.screenPx + camArt;
}

/** art px → screen px */
export function artToScreen(art: number, camArt: number, s: ArtScale): number {
  return (art - camArt) * s.screenPx;
}

/** ขนาด viewport เป็น art px (ceil เพื่อกันขอบขาด) */
export function viewportArt(width: number, height: number, s: ArtScale): { w: number; h: number } {
  return { w: Math.ceil(width / s.screenPx), h: Math.ceil(height / s.screenPx) };
}

/** จำนวน screen px ต่อ tile (ใช้ตรวจสเกลภาพ) */
export function screenPxPerTile(s: ArtScale): number {
  return s.screenPx * s.artPx;
}
