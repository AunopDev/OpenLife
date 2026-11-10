/* OpenLife — palette กลางของฉากเมือง/ภายใน (ย้ายมาจาก game.ts `const P`) */

export const P = {
  grass: '#2a4b34', grassD: '#22402b', grassL: '#33593c', blade: '#3f6f4a',
  flowerA: '#ffd75e', flowerB: '#ff8fb1', flowerC: '#c9d6ff',
  dirt: '#59462f', dirtD: '#463622', dirtL: '#6b5539',
  road: '#333a52', roadD: '#2a3044', roadL: '#3d4560', line: '#d8dfef',
  walk: '#575f7d', walkD: '#4b526d', walkL: '#616a89', curb: '#7b85a8',
  water: '#1d4d75', waterD: '#16405f', waterL: '#2b6791',
  frame: '#141a30', winLit: '#ffe3a0', winLit2: '#ffcf7a', winOff: '#1b2440',
  shadow: '#050817'
};

/* ---------- โทนแผนที่เมืองแบบใหม่ (src/render/city-*.ts) ---------- */

/** พื้นผิวถนน/ทางเท้า/คอนกรีต — โทนกลาง ๆ ไม่ติดน้ำเงิน เพื่อให้กลางวันดูเป็นแดดจริง */
export const CITY = {
  asphalt: '#43444b', asphaltD: '#393a40', asphaltL: '#4e4f56', asphaltPatch: '#3a3b42',
  lineWhite: '#e6e4dc', lineYellow: '#e2b53c',
  walk: '#9d998f', walkL: '#aaa69c', walkD: '#8a867c', walkRed: '#9a6a5a', grout: '#7d7a71',
  curb: '#bdb9ae', curbRed: '#c8423a', curbYellow: '#e0b83a', curbWhite: '#ecebe4',
  concrete: '#8a857b', concreteL: '#958f84', concreteD: '#7a756c', joint: '#716c63',
  dirt: '#8a6e4c', dirtD: '#735a3c', dirtL: '#9c8058',
  canal: '#45695c', canalD: '#365447', canalL: '#5a8070',
  bank: '#a39f94', bankD: '#837f74',
  glass: '#33465c', glassL: '#5a7690', glassD: '#243246',
  frame: '#2a2c32', grille: '#22252b',
  shadow: '#050817'
};

/** สีผนังตึกแถว (ซีดแดด/คราบฝน) */
export const FACADES = [
  '#d9cdb4', '#cfc3a6', '#e2d6b8', '#bfc7c0', '#d8b8a8', '#c9cfd8', '#e0cf9a', '#b9c8b0', '#d6c2c9', '#c4b49a'
];

/** สีแถบป้ายร้าน (ไม่มีตัวอักษร) */
export const SIGNS = ['#c8423a', '#2f6fb0', '#e0a13a', '#3d8a4a', '#8a3a8a', '#d9603a', '#1f7a7a', '#b0303a'];

/** สีกันสาด */
export const AWNINGS = ['#c8423a', '#e0a13a', '#2f7d52', '#3f6fb0', '#d9603a', '#7a4ab0'];

/** สีหลังคากระเบื้องบ้านเดี่ยว (ปั้นหยา) */
export const ROOF_TILES = ['#a8553a', '#8a4a35', '#3f6f8f', '#4f7a4a', '#7a5a3a', '#9a6a4a', '#5a5f7a'];

/** สีผนังบ้านเดี่ยว */
export const HOUSE_WALLS = ['#e6dcc4', '#ece8df', '#dfe6dc', '#e8d8c8', '#d8dfe8', '#efe2b8'];
