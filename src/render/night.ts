/* OpenLife — เก็บ "สิ่งที่เรืองแสงตอนกลางคืน" ระหว่างวาดเลเยอร์กลางวัน
   แล้วนำไปวาดเป็นเลเยอร์กลางคืน (โปร่งใส) ที่ game.ts วางทับหลัง night tint
   ทำให้หน้าต่าง/ป้าย/ร้านไม่จมความมืด และกลางวันไม่มีไฟเปิดค้าง */

/** สี่เหลี่ยมเรืองแสง (หน้าต่าง/ป้าย/หน้าร้าน) หน่วย art px */
export interface Emit { x: number; y: number; w: number; h: number; c: string; }

/** แสงฟุ้งแบบ radial สำหรับ drawLightBlob() ใน game.ts หน่วย art px */
export interface Glow { x: number; y: number; r: number; c: string; a: number; }

let emits: Emit[] = [];
let glows: Glow[] = [];

export function resetNight(): void {
  emits = [];
  glows = [];
}

export function emit(x: number, y: number, w: number, h: number, c: string): void {
  emits.push({ x: Math.round(x), y: Math.round(y), w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)), c: c });
}

export function glow(x: number, y: number, r: number, c: string, a: number): void {
  glows.push({ x: Math.round(x), y: Math.round(y), r: r, c: c, a: a });
}

export function takeNight(): { emits: Emit[]; glows: Glow[] } {
  const out = { emits: emits, glows: glows };
  resetNight();
  return out;
}

/* สีไฟที่ใช้ร่วมกัน */
export const LIGHT = {
  warm: '#ffd88a',
  warm2: '#ffc56a',
  cool: '#d6ecff',
  white: '#f4f8ff',
  neonPink: '#ff6fae',
  neonCyan: '#6fe6ff',
  gold: '#ffcf5e',
  red: '#ff5c5c'
};
