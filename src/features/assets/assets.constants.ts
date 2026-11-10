/* assets — ค่าคงที่ของทรัพย์สิน/ไลฟ์สไตล์ (ตัวเลขเกม — ดู GDD §6.4/ภาคผนวก) */

/** ราคาอัปเกรดบ้าน 3 ระดับ */
export const HOME_COSTS = [500000, 1500000, 4000000];
/** รถ 3 ระดับ (ต้องปิดไฟแนนซ์ก่อนอัปเกรด) */
export const CAR_TIERS = [
  { name: 'รถยนต์ครอบครัว', cost: 600000 },
  { name: 'SUV', cost: 1800000 },
  { name: 'รถหรู', cost: 5000000 }
];
/** ทริป/ประสบการณ์ — ผลตอบแทนลดลงถ้าไปบ่อย (diminishing) */
export const ASSET_TRIPS = [
  { name: 'พักผ่อนในประเทศ', cost: 50000, heart: 6, fun: 20, rest: 15, stamp: 1 },
  { name: 'ทริปญี่ปุ่น', cost: 250000, heart: 9, fun: 30, rest: 20, stamp: 1, skill: 'creativity' },
  { name: 'ทริปยุโรป', cost: 800000, heart: 12, fun: 40, rest: 25, stamp: 1, skill: 'communication' }
];
/** ราคาห้องเช่า 3 ระดับ (รายได้ต่อเดือนดู RENTAL_INCOME ใน sim/economy) */
export const RENTAL_COSTS = [3000000, 5000000, 8000000];

export const HOME_MAX = 3;
export const CAR_MAX = 3;
export const RENTAL_MAX = 3;

/** ตัวเลือกจำนวนเงินลงทุน */
export const INVEST_OPTIONS = [100000, 500000, 1000000];
export const INVEST_1M = 1000000;
/** ทางเลือกบริจาค */
export const DONATE_SMALL = 1000000;
export const DONATE_BIG = 5000000;

/** ค่าดูแลต่อเดือน */
export const HOME_UPKEEP_PER_LEVEL = 1500;
export const CAR_UPKEEP_PER_TIER = 800;
export const RENTAL_UPKEEP_PER_UNIT = 3000;
/** โบนัสใจเมื่ออัปเกรด */
export const HOME_HEART = 8;
export const CAR_HEART = 6;
