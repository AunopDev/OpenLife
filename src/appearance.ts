/* OpenLife — character appearance (pixel portrait, 32×32)
   RESEARCH: docs/research/character-creator.md
   หลักการ: preset-first + live preview + randomize/reset, ไม่ล็อกตามเพศ */

export interface Appearance {
  skin: string;
  face: string;
  hair: string;
  hairColor: string;
  eyes: string;
  eyeColor: string;
  brows: string;
  nose: string;
  mouth: string;
  facialHair: string;
  glasses: string;
  hat: string;
  accessory: string;
  outfit: string;
  clothes: string;
  freckles: boolean;
  mole: boolean;
}

export interface Option {
  id: string;
  label: string;
}

export interface ToneOption extends Option {
  base: string;
  shade: string;
  dark: string;
}

export const SKIN_TONES: ToneOption[] = [
  { id: 'fair', label: 'ขาว', base: '#f5d7b8', shade: '#e6bd97', dark: '#c99570' },
  { id: 'light', label: 'ขาวเหลือง', base: '#eec9a4', shade: '#dcae86', dark: '#b98a66' },
  { id: 'medium', label: 'สองสี', base: '#dca97c', shade: '#c78e63', dark: '#a06f4b' },
  { id: 'tan', label: 'แทน', base: '#c98a5c', shade: '#b37448', dark: '#8a5534' },
  { id: 'brown', label: 'น้ำตาล', base: '#a86b45', shade: '#8f5636', dark: '#6b3d24' },
  { id: 'deep', label: 'เข้ม', base: '#7d4b31', shade: '#673b26', dark: '#4a2818' }
];

export const HAIR_COLORS: ToneOption[] = [
  { id: 'black', label: 'ดำ', base: '#181a2c', shade: '#101222', dark: '#080a14' },
  { id: 'darkbrown', label: 'น้ำตาลเข้ม', base: '#3a2418', shade: '#2b1a11', dark: '#1a0f09' },
  { id: 'brown', label: 'น้ำตาล', base: '#5a3a22', shade: '#472c19', dark: '#2f1c10' },
  { id: 'chestnut', label: 'เกาลัด', base: '#7a4a2a', shade: '#633a20', dark: '#432614' },
  { id: 'auburn', label: 'แดงเข้ม', base: '#8a3a2a', shade: '#6f2c1f', dark: '#4c1c13' },
  { id: 'blonde', label: 'ทอง', base: '#d9b45a', shade: '#b8943f', dark: '#8a6b28' },
  { id: 'gray', label: 'เทา', base: '#8a8a96', shade: '#72727e', dark: '#52525c' },
  { id: 'white', label: 'ขาว', base: '#e8e8f0', shade: '#cfcfda', dark: '#a8a8b8' },
  { id: 'blue', label: 'น้ำเงิน', base: '#2a3a6a', shade: '#1f2c52', dark: '#141c38' },
  { id: 'pink', label: 'ชมพู', base: '#c95a8a', shade: '#a8466f', dark: '#7a2f4f' }
];

export const EYE_COLORS: ToneOption[] = [
  { id: 'dark', label: 'ดำ', base: '#1a1a24', shade: '#121218', dark: '#0a0a10' },
  { id: 'brown', label: 'น้ำตาล', base: '#5a3a22', shade: '#472c19', dark: '#2f1c10' },
  { id: 'hazel', label: 'น้ำตาลอ่อน', base: '#9a7a3a', shade: '#7d612c', dark: '#5a451c' },
  { id: 'green', label: 'เขียว', base: '#3d7a4a', shade: '#2f6039', dark: '#1f4227' },
  { id: 'blue', label: 'ฟ้า', base: '#4a7ab8', shade: '#38609a', dark: '#26426b' },
  { id: 'gray', label: 'เทา', base: '#7a8494', shade: '#626c7c', dark: '#464e5c' }
];

export const CLOTHES_COLORS: ToneOption[] = [
  { id: 'white', label: 'ขาว', base: '#e8eefc', shade: '#cfd8f2', dark: '#a8b4d8' },
  { id: 'navy', label: 'กรมท่า', base: '#2b3a7a', shade: '#223064', dark: '#162048' },
  { id: 'red', label: 'แดง', base: '#c23a4a', shade: '#a62e3c', dark: '#7a202b' },
  { id: 'green', label: 'เขียว', base: '#3d7a5a', shade: '#2f6247', dark: '#204432' },
  { id: 'yellow', label: 'เหลือง', base: '#d9a441', shade: '#b8862f', dark: '#8a611f' },
  { id: 'black', label: 'ดำ', base: '#20243a', shade: '#171a2c', dark: '#0e101c' },
  { id: 'pink', label: 'ชมพู', base: '#d98aa8', shade: '#b86f8c', dark: '#8a4f66' },
  { id: 'blue', label: 'ฟ้า', base: '#4f7fd6', shade: '#3d68b4', dark: '#284a86' }
];

export const FACE_SHAPES: Option[] = [
  { id: 'round', label: 'กลม' },
  { id: 'oval', label: 'ไข่' },
  { id: 'square', label: 'เหลี่ยม' },
  { id: 'long', label: 'ยาว' },
  { id: 'heart', label: 'สามเหลี่ยม' }
];

export const HAIR_STYLES: Option[] = [
  { id: 'short', label: 'สั้น' },
  { id: 'sidepart', label: 'แสกข้าง' },
  { id: 'bowl', label: 'กะลาครอบ' },
  { id: 'spiky', label: 'ตั้ง' },
  { id: 'long', label: 'ยาว' },
  { id: 'ponytail', label: 'หางม้า' },
  { id: 'bun', label: 'มวย' },
  { id: 'curly', label: 'หยิก' },
  { id: 'undercut', label: 'รองทรง' },
  { id: 'bob', label: 'บ๊อบ' },
  { id: 'bald', label: 'โล้น' }
];

export const EYE_SHAPES: Option[] = [
  { id: 'normal', label: 'ปกติ' },
  { id: 'round', label: 'กลม' },
  { id: 'sharp', label: 'เรียว' },
  { id: 'sleepy', label: 'ปรือ' },
  { id: 'big', label: 'โต' }
];

export const BROW_SHAPES: Option[] = [
  { id: 'straight', label: 'ตรง' },
  { id: 'arched', label: 'โค้ง' },
  { id: 'thick', label: 'หนา' },
  { id: 'thin', label: 'บาง' },
  { id: 'angry', label: 'ดุ' }
];

export const NOSE_SHAPES: Option[] = [
  { id: 'button', label: 'ปุ่ม' },
  { id: 'straight', label: 'โด่ง' },
  { id: 'wide', label: 'กว้าง' },
  { id: 'upturned', label: 'เชิด' },
  { id: 'flat', label: 'แบน' }
];

export const MOUTH_SHAPES: Option[] = [
  { id: 'neutral', label: 'ปกติ' },
  { id: 'smile', label: 'ยิ้ม' },
  { id: 'grin', label: 'ยิ้มกว้าง' },
  { id: 'frown', label: 'บึ้ง' },
  { id: 'full', label: 'ปากเต็ม' }
];

export const FACIAL_HAIR: Option[] = [
  { id: 'none', label: 'ไม่มี' },
  { id: 'stubble', label: 'ตอหนวด' },
  { id: 'mustache', label: 'หนวด' },
  { id: 'goatee', label: 'เคราแพะ' },
  { id: 'beard', label: 'เครา' }
];

export const GLASSES: Option[] = [
  { id: 'none', label: 'ไม่ใส่' },
  { id: 'round', label: 'กลม' },
  { id: 'square', label: 'เหลี่ยม' },
  { id: 'sun', label: 'กันแดด' },
  { id: 'reading', label: 'อ่านหนังสือ' }
];

export const HATS: Option[] = [
  { id: 'none', label: 'ไม่ใส่' },
  { id: 'beanie', label: 'บีนี่' },
  { id: 'cap', label: 'หมวกแก๊ป' },
  { id: 'bucket', label: 'หมวกปีก' }
];

export const ACCESSORIES: Option[] = [
  { id: 'none', label: 'ไม่มี' },
  { id: 'earring', label: 'ต่างหู' },
  { id: 'necklace', label: 'สร้อย' },
  { id: 'scarf', label: 'ผ้าพันคอ' }
];

export const OUTFITS: Option[] = [
  { id: 'tee', label: 'เสื้อยืด' },
  { id: 'shirt', label: 'เชิ้ต (สุภาพ)' },
  { id: 'hoodie', label: 'ฮู้ดดี้' },
  { id: 'blouse', label: 'เบลาส์ (สุภาพ)' }
];

export const DEFAULT_APPEARANCE: Appearance = {
  skin: 'medium',
  face: 'oval',
  hair: 'short',
  hairColor: 'black',
  eyes: 'normal',
  eyeColor: 'dark',
  brows: 'straight',
  nose: 'button',
  mouth: 'neutral',
  facialHair: 'none',
  glasses: 'none',
  hat: 'none',
  accessory: 'none',
  outfit: 'tee',
  clothes: 'white',
  freckles: false,
  mole: false
};

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function randomAppearance(): Appearance {
  const skin = pick(SKIN_TONES);
  const hairColor = pick(HAIR_COLORS);
  return {
    skin: skin.id,
    face: pick(FACE_SHAPES).id,
    hair: pick(HAIR_STYLES).id,
    hairColor: hairColor.id,
    eyes: pick(EYE_SHAPES).id,
    eyeColor: pick(EYE_COLORS).id,
    brows: pick(BROW_SHAPES).id,
    nose: pick(NOSE_SHAPES).id,
    mouth: pick(MOUTH_SHAPES).id,
    facialHair: pick(FACIAL_HAIR).id,
    glasses: pick(GLASSES).id,
    hat: pick(HATS).id,
    accessory: pick(ACCESSORIES).id,
    outfit: pick(OUTFITS).id,
    clothes: pick(CLOTHES_COLORS).id,
    freckles: Math.random() < 0.35,
    mole: Math.random() < 0.3
  };
}

export function normaliseAppearance(raw: any): Appearance {
  const out: any = {};
  Object.keys(DEFAULT_APPEARANCE).forEach(function (k) {
    out[k] = raw && raw[k] !== undefined ? raw[k] : (DEFAULT_APPEARANCE as any)[k];
  });
  return out as Appearance;
}

export function appearanceAudit(raw: any): string[] {
  const issues: string[] = [];
  if (!raw) return issues;
  const check = function (field: string, list: Option[]) {
    if (!list.some(function (o) { return o.id === raw[field]; })) {
      issues.push('appearance.' + field + ' ไม่รู้จัก: ' + String(raw[field]));
    }
  };
  check('skin', SKIN_TONES);
  check('face', FACE_SHAPES);
  check('hair', HAIR_STYLES);
  check('hairColor', HAIR_COLORS);
  check('eyes', EYE_SHAPES);
  check('eyeColor', EYE_COLORS);
  check('brows', BROW_SHAPES);
  check('nose', NOSE_SHAPES);
  check('mouth', MOUTH_SHAPES);
  check('facialHair', FACIAL_HAIR);
  check('glasses', GLASSES);
  check('hat', HATS);
  check('accessory', ACCESSORIES);
  check('outfit', OUTFITS);
  check('clothes', CLOTHES_COLORS);
  if (typeof raw.freckles !== 'boolean') issues.push('appearance.freckles ต้องเป็น boolean');
  if (typeof raw.mole !== 'boolean') issues.push('appearance.mole ต้องเป็น boolean');
  return issues;
}

/* ---------- pixel drawing (32×32) ---------- */

function tone(list: ToneOption[], id: string): ToneOption {
  for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return list[0];
}

export function appearanceColors(appRaw: Appearance, age?: number) {
  const app = normaliseAppearance(appRaw);
  const skin = tone(SKIN_TONES, app.skin);
  let hair = tone(HAIR_COLORS, app.hairColor);
  if ((age || 0) >= 58 && hair.id !== 'gray' && hair.id !== 'white') hair = tone(HAIR_COLORS, 'gray');
  const eye = tone(EYE_COLORS, app.eyeColor);
  const clothes = tone(CLOTHES_COLORS, app.clothes);
  return {
    skin: skin.base,
    skinDark: skin.shade,
    skinDeep: skin.dark,
    hair: hair.base,
    hairDark: hair.shade,
    eye: eye.base,
    clothes: clothes.base,
    clothesShade: clothes.shade,
    clothesDark: clothes.dark,
    hat: app.hat !== 'none'
  };
}

function rect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

function headProfile(shape: string): number[] {
  // half-width ต่อแถว y=6..20 (15 แถว)
  if (shape === 'round') return [4, 5, 6, 7, 7, 7, 7, 7, 7, 7, 7, 6, 5, 4, 3];
  if (shape === 'square') return [5, 6, 7, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 6, 5];
  if (shape === 'long') return [4, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 3];
  if (shape === 'heart') return [6, 7, 7, 6, 6, 5, 5, 5, 5, 5, 4, 4, 3, 2, 1];
  return [4, 5, 6, 6, 7, 7, 7, 7, 7, 7, 6, 6, 5, 4, 3]; // oval
}

function drawHairBack(c: CanvasRenderingContext2D, app: Appearance, hair: ToneOption) {
  if (app.hat !== 'none' && app.hat !== 'beanie') { /* hat covers top only */ }
  if (app.hair === 'long' || app.hair === 'bob' || app.hair === 'curly') {
    const bottom = app.hair === 'long' ? 23 : 18;
    rect(c, 6, 9, 4, bottom - 9, hair.base);
    rect(c, 22, 9, 4, bottom - 9, hair.base);
    rect(c, 6, 9, 1, bottom - 9, hair.shade);
    rect(c, 25, 9, 1, bottom - 9, hair.dark);
    if (app.hair === 'long') {
      rect(c, 7, 23, 3, 3, hair.base);
      rect(c, 22, 23, 3, 3, hair.base);
    }
  }
  if (app.hair === 'ponytail') {
    rect(c, 23, 10, 3, 10, hair.base);
    rect(c, 24, 12, 3, 8, hair.shade);
    rect(c, 25, 20, 2, 4, hair.dark);
  }
}

function drawOutfit(c: CanvasRenderingContext2D, app: Appearance, clothes: ToneOption) {
  // shoulders
  rect(c, 4, 24, 24, 8, clothes.base);
  rect(c, 4, 24, 24, 1, clothes.shade);
  rect(c, 4, 30, 24, 2, clothes.dark);
  if (app.outfit === 'shirt') {
    rect(c, 14, 24, 4, 8, '#f2f5ff');
    rect(c, 15, 25, 2, 5, clothes.shade);
    rect(c, 11, 25, 3, 1, clothes.shade);
    rect(c, 18, 25, 3, 1, clothes.shade);
  } else if (app.outfit === 'hoodie') {
    rect(c, 9, 24, 14, 2, clothes.shade);
    rect(c, 10, 26, 1, 3, '#e8eefc');
    rect(c, 21, 26, 1, 3, '#e8eefc');
    rect(c, 12, 24, 8, 1, clothes.dark);
  } else if (app.outfit === 'blouse') {
    rect(c, 12, 24, 8, 2, clothes.shade);
    rect(c, 15, 25, 2, 6, clothes.dark);
    rect(c, 11, 26, 3, 1, '#f2f5ff');
    rect(c, 18, 26, 3, 1, '#f2f5ff');
  } else {
    rect(c, 15, 24, 2, 3, clothes.shade);
  }
}

function drawFace(c: CanvasRenderingContext2D, app: Appearance, skin: ToneOption) {
  const profile = headProfile(app.face);
  for (let i = 0; i < profile.length; i++) {
    const hw = profile[i];
    rect(c, 16 - hw, 6 + i, hw * 2, 1, skin.base);
  }
  // ears
  rect(c, 16 - profile[7] - 1, 13, 1, 3, skin.base);
  rect(c, 16 + profile[7], 13, 1, 3, skin.base);
  rect(c, 16 - profile[7] - 1, 15, 1, 1, skin.dark);
  rect(c, 16 + profile[7], 15, 1, 1, skin.dark);
  // neck
  rect(c, 13, 20, 6, 4, skin.shade);
  rect(c, 13, 20, 6, 1, skin.base);
  rect(c, 13, 23, 6, 1, skin.dark);
  // cheek shading
  rect(c, 9, 17, 2, 1, skin.shade);
  rect(c, 21, 17, 2, 1, skin.shade);
  rect(c, 15, 19, 2, 1, skin.shade);
}

function drawEyes(c: CanvasRenderingContext2D, app: Appearance, eye: ToneOption) {
  const lx = 11;
  const rx = 19;
  const white = '#f2f2f8';
  if (app.eyes === 'big') {
    rect(c, lx, 13, 3, 3, white);
    rect(c, rx - 1, 13, 3, 3, white);
    rect(c, lx + 1, 14, 1, 2, eye.base);
    rect(c, rx, 14, 1, 2, eye.base);
  } else if (app.eyes === 'round') {
    rect(c, lx, 13, 3, 2, white);
    rect(c, rx - 1, 13, 3, 2, white);
    rect(c, lx + 1, 13, 1, 2, eye.base);
    rect(c, rx, 13, 1, 2, eye.base);
  } else if (app.eyes === 'sharp') {
    rect(c, lx - 1, 14, 4, 1, white);
    rect(c, rx - 1, 14, 4, 1, white);
    rect(c, lx + 1, 14, 1, 1, eye.base);
    rect(c, rx, 14, 1, 1, eye.base);
  } else if (app.eyes === 'sleepy') {
    rect(c, lx, 15, 3, 1, white);
    rect(c, rx - 1, 15, 3, 1, white);
    rect(c, lx, 14, 3, 1, eye.shade);
    rect(c, rx - 1, 14, 3, 1, eye.shade);
    rect(c, lx + 1, 15, 1, 1, eye.base);
    rect(c, rx, 15, 1, 1, eye.base);
  } else {
    rect(c, lx + 1, 14, 2, 2, white);
    rect(c, rx - 1, 14, 2, 2, white);
    rect(c, lx + 1, 14, 1, 2, eye.base);
    rect(c, rx, 14, 1, 2, eye.base);
  }
  // highlights
  rect(c, lx + 2, 14, 1, 1, 'rgba(255,255,255,.55)');
  rect(c, rx + 1, 14, 1, 1, 'rgba(255,255,255,.55)');
}

function drawBrows(c: CanvasRenderingContext2D, app: Appearance, hair: ToneOption) {
  const lx = 10;
  const rx = 19;
  const col = hair.shade;
  if (app.brows === 'thick') {
    rect(c, lx, 11, 4, 2, col);
    rect(c, rx, 11, 4, 2, col);
  } else if (app.brows === 'thin') {
    rect(c, lx, 11, 4, 1, col);
    rect(c, rx, 11, 4, 1, col);
  } else if (app.brows === 'arched') {
    rect(c, lx, 11, 2, 1, col);
    rect(c, lx + 2, 10, 2, 1, col);
    rect(c, rx, 10, 2, 1, col);
    rect(c, rx + 2, 11, 2, 1, col);
  } else if (app.brows === 'angry') {
    rect(c, lx, 10, 2, 1, col);
    rect(c, lx + 2, 11, 2, 1, col);
    rect(c, rx, 11, 2, 1, col);
    rect(c, rx + 2, 10, 2, 1, col);
  } else {
    rect(c, lx, 11, 4, 1, col);
    rect(c, rx, 11, 4, 1, col);
  }
}

function drawNose(c: CanvasRenderingContext2D, app: Appearance, skin: ToneOption) {
  if (app.nose === 'straight') {
    rect(c, 16, 14, 1, 3, skin.shade);
    rect(c, 15, 17, 3, 1, skin.shade);
  } else if (app.nose === 'wide') {
    rect(c, 15, 16, 1, 1, skin.shade);
    rect(c, 16, 15, 1, 2, skin.shade);
    rect(c, 17, 16, 1, 1, skin.shade);
    rect(c, 14, 17, 5, 1, skin.shade);
  } else if (app.nose === 'upturned') {
    rect(c, 15, 16, 3, 1, skin.shade);
    rect(c, 16, 17, 2, 1, skin.base);
    rect(c, 15, 17, 1, 1, skin.shade);
  } else if (app.nose === 'flat') {
    rect(c, 15, 16, 3, 1, skin.shade);
  } else {
    rect(c, 15, 15, 2, 1, skin.shade);
    rect(c, 15, 16, 3, 1, skin.shade);
  }
}

function drawMouth(c: CanvasRenderingContext2D, app: Appearance, skin: ToneOption) {
  const lip = '#b0555a';
  if (app.mouth === 'smile') {
    rect(c, 14, 18, 4, 1, lip);
    rect(c, 13, 17, 1, 1, lip);
    rect(c, 18, 17, 1, 1, lip);
  } else if (app.mouth === 'grin') {
    rect(c, 13, 18, 6, 1, lip);
    rect(c, 14, 19, 4, 1, '#7a2f3a');
    rect(c, 14, 18, 4, 1, '#f2f2f8');
  } else if (app.mouth === 'frown') {
    rect(c, 14, 18, 4, 1, lip);
    rect(c, 13, 19, 1, 1, lip);
    rect(c, 18, 19, 1, 1, lip);
  } else if (app.mouth === 'full') {
    rect(c, 14, 17, 4, 1, lip);
    rect(c, 14, 18, 4, 1, '#8e4248');
    rect(c, 15, 19, 2, 1, lip);
  } else {
    rect(c, 15, 18, 2, 1, lip);
  }
}

function drawFacialHair(c: CanvasRenderingContext2D, app: Appearance, hair: ToneOption) {
  if (app.facialHair === 'none') return;
  if (app.facialHair === 'stubble') {
    for (let i = 0; i < 8; i++) {
      rect(c, 12 + (i % 4) * 2, 18 + Math.floor(i / 4) * 2, 1, 1, 'rgba(60,40,30,.35)');
    }
  } else if (app.facialHair === 'mustache') {
    rect(c, 13, 17, 6, 1, hair.base);
    rect(c, 12, 17, 1, 1, hair.shade);
    rect(c, 19, 17, 1, 1, hair.shade);
  } else if (app.facialHair === 'goatee') {
    rect(c, 14, 19, 4, 2, hair.base);
    rect(c, 15, 20, 2, 2, hair.shade);
    rect(c, 14, 17, 1, 1, hair.base);
    rect(c, 17, 17, 1, 1, hair.base);
  } else if (app.facialHair === 'beard') {
    rect(c, 9, 15, 2, 6, hair.base);
    rect(c, 21, 15, 2, 6, hair.base);
    rect(c, 10, 19, 12, 4, hair.base);
    rect(c, 12, 23, 8, 2, hair.base);
    rect(c, 10, 19, 12, 1, hair.shade);
    rect(c, 14, 18, 4, 1, hair.shade);
  }
}

function drawHairFront(c: CanvasRenderingContext2D, app: Appearance, hair: ToneOption) {
  if (app.hair === 'bald') {
    rect(c, 11, 7, 10, 1, 'rgba(255,255,255,.12)');
    return;
  }
  const col = hair.base;
  const sh = hair.shade;
  if (app.hair === 'short') {
    rect(c, 9, 6, 14, 4, col);
    rect(c, 8, 8, 1, 5, col);
    rect(c, 23, 8, 1, 5, col);
    rect(c, 9, 6, 14, 1, sh);
    rect(c, 10, 8, 3, 1, sh);
  } else if (app.hair === 'sidepart') {
    rect(c, 8, 5, 16, 5, col);
    rect(c, 8, 8, 2, 6, col);
    rect(c, 22, 8, 2, 4, col);
    rect(c, 9, 5, 10, 2, sh);
    rect(c, 19, 6, 5, 2, col);
    rect(c, 13, 7, 6, 1, sh);
  } else if (app.hair === 'bowl') {
    rect(c, 7, 5, 18, 6, col);
    rect(c, 7, 9, 3, 4, col);
    rect(c, 22, 9, 3, 4, col);
    rect(c, 8, 5, 16, 1, sh);
    rect(c, 10, 10, 12, 1, sh);
  } else if (app.hair === 'spiky') {
    rect(c, 9, 6, 14, 4, col);
    const spikes = [8, 11, 14, 17, 20, 23];
    spikes.forEach(function (x, i) {
      rect(c, x, 3 + (i % 2), 2, 4, i % 2 ? sh : col);
    });
    rect(c, 8, 8, 1, 5, col);
    rect(c, 23, 8, 1, 5, col);
  } else if (app.hair === 'long') {
    rect(c, 7, 5, 18, 6, col);
    rect(c, 7, 9, 3, 8, col);
    rect(c, 22, 9, 3, 8, col);
    rect(c, 8, 5, 16, 1, sh);
    rect(c, 10, 9, 2, 3, sh);
  } else if (app.hair === 'ponytail') {
    rect(c, 9, 6, 14, 4, col);
    rect(c, 8, 8, 1, 4, col);
    rect(c, 22, 8, 1, 4, col);
    rect(c, 10, 6, 4, 1, sh);
    rect(c, 24, 10, 2, 2, col);
  } else if (app.hair === 'bun') {
    rect(c, 9, 6, 14, 4, col);
    rect(c, 8, 8, 1, 4, col);
    rect(c, 23, 8, 1, 4, col);
    rect(c, 14, 1, 5, 5, col);
    rect(c, 15, 2, 3, 2, sh);
  } else if (app.hair === 'curly') {
    rect(c, 8, 5, 16, 5, col);
    for (let i = 0; i < 7; i++) {
      rect(c, 7 + i * 3, 4 + (i % 2), 3, 3, i % 2 ? sh : col);
    }
    rect(c, 7, 8, 2, 6, col);
    rect(c, 23, 8, 2, 6, col);
  } else if (app.hair === 'undercut') {
    rect(c, 7, 8, 18, 2, sh);
    rect(c, 9, 4, 14, 4, col);
    rect(c, 10, 4, 12, 1, sh);
    rect(c, 8, 10, 1, 2, sh);
    rect(c, 23, 10, 1, 2, sh);
  } else if (app.hair === 'bob') {
    rect(c, 7, 5, 18, 6, col);
    rect(c, 6, 9, 3, 6, col);
    rect(c, 23, 9, 3, 6, col);
    rect(c, 8, 5, 16, 1, sh);
    rect(c, 9, 10, 14, 1, sh);
  }
}

function drawHat(c: CanvasRenderingContext2D, app: Appearance) {
  if (app.hat === 'none') return;
  if (app.hat === 'beanie') {
    rect(c, 8, 3, 16, 5, '#3d7a5a');
    rect(c, 8, 7, 16, 1, '#2f6247');
    rect(c, 9, 2, 14, 1, '#4a9a6a');
    rect(c, 7, 7, 18, 1, '#204432');
  } else if (app.hat === 'cap') {
    rect(c, 8, 3, 16, 4, '#2b3a7a');
    rect(c, 8, 6, 16, 1, '#223064');
    rect(c, 6, 7, 16, 2, '#223064');
    rect(c, 9, 3, 14, 1, '#3d5ab8');
    rect(c, 15, 2, 2, 1, '#ffd75e');
  } else if (app.hat === 'bucket') {
    rect(c, 9, 3, 14, 4, '#8a6448');
    rect(c, 7, 6, 18, 2, '#6b4a30');
    rect(c, 8, 8, 16, 1, '#4a3226');
    rect(c, 10, 3, 12, 1, '#a87c58');
  }
}

function drawGlasses(c: CanvasRenderingContext2D, app: Appearance) {
  if (app.glasses === 'none') return;
  // กรอบแว่นพอดีหน้า (หน้า x 9–23, ตา 11–21)
  if (app.glasses === 'round') {
    rect(c, 9, 13, 7, 1, '#2a2a3a');
    rect(c, 9, 17, 7, 1, '#2a2a3a');
    rect(c, 9, 14, 1, 3, '#2a2a3a');
    rect(c, 15, 14, 1, 3, '#2a2a3a');
    rect(c, 17, 13, 7, 1, '#2a2a3a');
    rect(c, 17, 17, 7, 1, '#2a2a3a');
    rect(c, 17, 14, 1, 3, '#2a2a3a');
    rect(c, 23, 14, 1, 3, '#2a2a3a');
    rect(c, 16, 15, 1, 1, '#2a2a3a');
  } else if (app.glasses === 'square') {
    rect(c, 9, 12, 7, 1, '#2a2a3a');
    rect(c, 9, 17, 7, 1, '#2a2a3a');
    rect(c, 9, 13, 1, 4, '#2a2a3a');
    rect(c, 15, 13, 1, 4, '#2a2a3a');
    rect(c, 17, 12, 7, 1, '#2a2a3a');
    rect(c, 17, 17, 7, 1, '#2a2a3a');
    rect(c, 17, 13, 1, 4, '#2a2a3a');
    rect(c, 23, 13, 1, 4, '#2a2a3a');
    rect(c, 16, 14, 1, 1, '#2a2a3a');
  } else if (app.glasses === 'sun') {
    rect(c, 9, 12, 7, 5, '#16161e');
    rect(c, 17, 12, 7, 5, '#16161e');
    rect(c, 10, 13, 3, 1, 'rgba(255,255,255,.25)');
    rect(c, 18, 13, 3, 1, 'rgba(255,255,255,.25)');
    rect(c, 16, 14, 1, 1, '#16161e');
  } else if (app.glasses === 'reading') {
    rect(c, 9, 16, 6, 1, '#8a6448');
    rect(c, 17, 16, 6, 1, '#8a6448');
    rect(c, 9, 15, 1, 1, '#8a6448');
    rect(c, 14, 15, 1, 1, '#8a6448');
    rect(c, 17, 15, 1, 1, '#8a6448');
    rect(c, 22, 15, 1, 1, '#8a6448');
  }
}

function drawAccessory(c: CanvasRenderingContext2D, app: Appearance) {
  if (app.accessory === 'earring') {
    rect(c, 24, 17, 1, 2, '#ffd75e');
  } else if (app.accessory === 'necklace') {
    rect(c, 13, 24, 6, 1, '#e0a13a');
    rect(c, 15, 25, 2, 2, '#ffd75e');
  } else if (app.accessory === 'scarf') {
    rect(c, 9, 23, 14, 3, '#c23a4a');
    rect(c, 10, 24, 12, 1, '#a62e3c');
    rect(c, 18, 25, 2, 5, '#c23a4a');
  }
}

/** วาดตัวละคร 32×32 ลง canvas (ไม่ล้างพื้นหลัง) */
export function drawAppearance(c: CanvasRenderingContext2D, appRaw: Appearance, age?: number) {
  const app = normaliseAppearance(appRaw);
  const skin = tone(SKIN_TONES, app.skin);
  let hair = tone(HAIR_COLORS, app.hairColor);
  if ((age || 0) >= 58 && hair.id !== 'gray' && hair.id !== 'white') hair = tone(HAIR_COLORS, 'gray');
  const eye = tone(EYE_COLORS, app.eyeColor);
  const clothes = tone(CLOTHES_COLORS, app.clothes);

  drawHairBack(c, app, hair);
  drawOutfit(c, app, clothes);
  drawFace(c, app, skin);
  drawFreckles(c, app, skin);
  drawEyes(c, app, eye);
  drawBrows(c, app, hair);
  drawNose(c, app, skin);
  drawMouth(c, app, skin);
  drawAgeDetails(c, app, skin, age || 0);
  drawFacialHair(c, app, hair);
  drawHairFront(c, app, hair);
  drawHat(c, app);
  drawGlasses(c, app);
  drawAccessory(c, app);
}

function drawAgeDetails(c: CanvasRenderingContext2D, app: Appearance, skin: ToneOption, age: number) {
  if (age < 42) return;
  const line = skin.shade;
  // รอยตีนกา
  rect(c, 9, 14, 1, 1, line);
  rect(c, 22, 14, 1, 1, line);
  rect(c, 9, 17, 1, 1, line);
  rect(c, 22, 17, 1, 1, line);
  if (age >= 55) {
    // ร่องแก้ม/หน้าผาก
    rect(c, 10, 12, 2, 1, line);
    rect(c, 20, 12, 2, 1, line);
    rect(c, 12, 19, 1, 1, line);
    rect(c, 19, 19, 1, 1, line);
  }
  if (age >= 68) {
    rect(c, 11, 10, 3, 1, line);
    rect(c, 18, 10, 3, 1, line);
    rect(c, 14, 21, 4, 1, line);
    rect(c, 8, 16, 1, 2, line);
    rect(c, 23, 16, 1, 2, line);
  }
}

function drawFreckles(c: CanvasRenderingContext2D, app: Appearance, skin: ToneOption) {
  if (app.freckles) {
    const dots = [[11, 16], [13, 17], [10, 17], [20, 16], [22, 17], [19, 17]];
    dots.forEach(function (d) { rect(c, d[0], d[1], 1, 1, skin.dark); });
  }
  if (app.mole) {
    rect(c, 21, 15, 1, 1, '#4a2818');
  }
}

/** วาด portrait ลง canvas ขนาด 32×32 พร้อมพื้นหลัง */
export function paintPortrait(canvas: HTMLCanvasElement, app: Appearance, bg?: string, age?: number) {
  const c = canvas.getContext('2d');
  if (!c) return;
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, 32, 32);
  c.fillStyle = bg || '#2a2f5c';
  c.fillRect(0, 0, 32, 32);
  // subtle backdrop stripe
  c.fillStyle = 'rgba(255,255,255,.05)';
  c.fillRect(0, 0, 32, 2);
  drawAppearance(c, app, age);
}
