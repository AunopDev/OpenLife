/* render/character-art — อาร์ตตัวละคร/NPC/สัตว์ ที่ความละเอียด 32px art (Phase 2)
   วาดด้วย fillRect เท่านั้น (พิกเซลล้วน) · พิกัดเป็น art px 32/tile · เท้าอยู่ที่ (x, y)
   สัดส่วน: ผู้ใหญ่สูง ~56 art px (~1.75 tile ที่ 1 tile = 1 ม.) ตาม docs/rules/characters.md */

export interface HumanLook {
  skin: string;
  skinDark: string;
  hair: string;
  hairDark: string;
  clothes: string;
  clothesShade: string;
  clothesDark: string;
  eye: string;
  pants: string;
  hat?: boolean;
  glasses?: boolean;
  hairStyle?: string;
}

export interface HumanPose {
  dir: 'up' | 'down' | 'left' | 'right';
  moving: boolean;
  /** เฟสการเดิน (rad) */
  phase: number;
}

export type AnimalKind = 'dog' | 'cat' | 'wild';

/** ความสูง/กว้างโดยประมาณของ sprite ผู้ใหญ่ (art px) */
export const HUMAN_H = 58;
export const HUMAN_W = 26;

function r(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** เงาใต้ตัว */
export function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.fillStyle = 'rgba(0,0,0,.30)';
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** วาดตัวละครมนุษย์ 32px */
export function drawHuman32(ctx: CanvasRenderingContext2D, x: number, y: number, look: HumanLook, pose: HumanPose): void {
  const swing = pose.moving ? Math.sin(pose.phase) : 0;
  const bob = pose.moving ? (Math.abs(swing) > 0.6 ? 1 : 0) : 0;
  const legA = Math.round(swing * 2);
  const legB = -legA;
  const armA = Math.round(swing * 2);
  const armB = -armA;
  const dir = pose.dir;
  const back = dir === 'up';

  drawShadow(ctx, x, y - 1, 12, 5);

  // ---- ขา + รองเท้า
  r(ctx, x - 7 + legA, y - 18, 6, 16, look.pants);
  r(ctx, x + 1 + legB, y - 18, 6, 16, look.pants);
  r(ctx, x - 8 + legA, y - 2, 8, 4, look.clothesDark);
  r(ctx, x + 0 + legB, y - 2, 8, 4, look.clothesDark);

  // ---- ลำตัว (เสื้อ) 20×18
  r(ctx, x - 10, y - 36 + bob, 20, 18, look.clothes);
  r(ctx, x - 10, y - 36 + bob, 20, 2, look.clothesShade);
  r(ctx, x - 10, y - 36 + bob, 2, 18, look.clothesShade);
  r(ctx, x + 8, y - 36 + bob, 2, 18, look.clothesShade);
  r(ctx, x - 10, y - 20 + bob, 20, 2, look.clothesDark);   // เข็มขัด
  if (!back) {
    r(ctx, x - 2, y - 35 + bob, 4, 12, look.clothesDark);   // กระดุม/เสื้อใน
    r(ctx, x - 3, y - 36 + bob, 6, 3, look.clothesDark);    // คอเสื้อ
  }

  // ---- แขน
  r(ctx, x - 13, y - 34 + bob + armA, 4, 15, look.clothes);
  r(ctx, x + 9, y - 34 + bob + armB, 4, 15, look.clothes);
  r(ctx, x - 13, y - 20 + bob + armA, 4, 3, look.skin);      // มือ
  r(ctx, x + 9, y - 20 + bob + armB, 4, 3, look.skin);

  // ---- คอ + หัว
  r(ctx, x - 3, y - 41 + bob, 6, 5, look.skinDark);
  r(ctx, x - 7, y - 55 + bob, 14, 14, look.skin);
  r(ctx, x - 8, y - 52 + bob, 1, 4, look.skin);              // หู
  r(ctx, x + 7, y - 52 + bob, 1, 4, look.skin);
  r(ctx, x + 5, y - 51 + bob, 2, 5, look.skinDark);          // เงาแก้ม

  // ---- ผม
  const longHair = look.hairStyle === 'long' || look.hairStyle === 'bob';
  if (look.hat) {
    r(ctx, x - 11, y - 57 + bob, 22, 4, look.clothesDark);
    r(ctx, x - 8, y - 63 + bob, 16, 6, look.clothes);
    r(ctx, x - 8, y - 63 + bob, 16, 2, look.clothesShade);
  } else if (back) {
    r(ctx, x - 8, y - 58 + bob, 16, 17, look.hair);
    r(ctx, x - 8, y - 58 + bob, 16, 3, look.hairDark);
  } else {
    r(ctx, x - 8, y - 58 + bob, 16, 6, look.hair);
    r(ctx, x - 8, y - 58 + bob, 16, 2, look.hairDark);
    r(ctx, x - 8, y - 54 + bob, 2, 6, look.hair);
    r(ctx, x + 6, y - 54 + bob, 2, 6, look.hair);
    if (longHair) {
      r(ctx, x - 10, y - 53 + bob, 2, 10, look.hairDark);
      r(ctx, x + 8, y - 53 + bob, 2, 10, look.hairDark);
    }
  }

  // ---- ใบหน้า
  if (!back) {
    const ex = dir === 'left' ? -4 : dir === 'right' ? 4 : 0;
    if (dir === 'down' || dir === 'left' || dir === 'right') {
      r(ctx, x - 4 + ex, y - 50 + bob, 2, 2, look.eye);
      r(ctx, x + 2 + ex, y - 50 + bob, 2, 2, look.eye);
      r(ctx, x - 5 + ex, y - 52 + bob, 3, 1, look.hairDark);  // คิ้ว
      r(ctx, x + 2 + ex, y - 52 + bob, 3, 1, look.hairDark);
    }
    if (dir === 'down') r(ctx, x - 2, y - 45 + bob, 4, 1, look.skinDark);
    if (look.glasses) {
      r(ctx, x - 7 + ex, y - 51 + bob, 14, 1, '#2a2a3a');
      r(ctx, x - 7 + ex, y - 50 + bob, 1, 3, '#2a2a3a');
      r(ctx, x + 6 + ex, y - 50 + bob, 1, 3, '#2a2a3a');
      r(ctx, x - 1 + ex, y - 50 + bob, 2, 1, '#2a2a3a');
    }
  }
}

/** วาดสัตว์ 32px (dog/cat/wild) */
export function drawAnimal32(ctx: CanvasRenderingContext2D, x: number, y: number, kind: AnimalKind, phase: number): void {
  const bob = Math.sin(phase) > 0 ? 1 : 0;
  if (kind === 'wild') {
    drawShadow(ctx, x, y - 1, 15, 6);
    r(ctx, x - 14, y - 16 + bob, 26, 14, '#6a5240');
    r(ctx, x - 14, y - 16 + bob, 26, 3, '#7d634c');
    r(ctx, x + 10, y - 18 + bob, 11, 11, '#5c4736');
    r(ctx, x + 18, y - 15 + bob, 3, 3, '#2a2018');            // จมูก
    r(ctx, x + 20, y - 11 + bob, 3, 2, '#f2f2f8');            // เขี้ยว
    r(ctx, x - 12, y - 3, 5, 5, '#3a2a1e');
    r(ctx, x + 2, y - 3, 5, 5, '#3a2a1e');
    r(ctx, x - 16, y - 14 + bob, 3, 3, '#4a3a2c');
    r(ctx, x - 6, y - 20 + bob, 4, 4, '#4a3a2c');             // หู
  } else if (kind === 'cat') {
    drawShadow(ctx, x, y - 1, 9, 4);
    r(ctx, x - 8, y - 10 + bob, 16, 8, '#c9a27a');
    r(ctx, x - 8, y - 10 + bob, 16, 2, '#d8b48c');
    r(ctx, x + 7, y - 14 + bob, 8, 8, '#c9a27a');
    r(ctx, x + 8, y - 17 + bob, 3, 4, '#c9a27a');             // หู
    r(ctx, x + 13, y - 17 + bob, 3, 4, '#c9a27a');
    r(ctx, x + 11, y - 11 + bob, 2, 2, '#2a2018');
    r(ctx, x - 3, y - 3, 3, 3, '#a8815c');
    r(ctx, x + 3, y - 3, 3, 3, '#a8815c');
    r(ctx, x - 12, y - 9 + bob, 5, 2, '#c9a27a');             // หาง
  } else {
    drawShadow(ctx, x, y - 1, 12, 5);
    r(ctx, x - 11, y - 13 + bob, 22, 11, '#a07a52');
    r(ctx, x - 11, y - 13 + bob, 22, 2, '#b58a5e');
    r(ctx, x + 9, y - 16 + bob, 9, 9, '#a07a52');
    r(ctx, x + 15, y - 13 + bob, 3, 3, '#2a2018');
    r(ctx, x + 9, y - 19 + bob, 3, 4, '#8a6743');
    r(ctx, x - 9, y - 3, 4, 4, '#3a2a1e');
    r(ctx, x + 3, y - 3, 4, 4, '#3a2a1e');
    r(ctx, x - 14, y - 12 + bob, 4, 3, '#8a6743');            // หาง
  }
}
