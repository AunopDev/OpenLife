/* business — ค่าคงที่ของธุรกิจ (ตัวเลขเกม — ดู GDD §6.4) */
import type { BusinessOption } from './business.types';

/** ตัวเลือกเปิดธุรกิจ (ลงทุนครั้งเดียว) */
export const BUSINESS_OPTIONS: BusinessOption[] = [
  { type: 'ร้านกาแฟเล็ก ๆ', cost: 600000, monthly: 30000 },
  { type: 'ร้านค้าออนไลน์', cost: 300000, monthly: 18000 },
  { type: 'สวนผัก/ฟาร์มเล็ก', cost: 400000, monthly: 22000 }
];

/** อัปเกรด: ต้นทุน = level × 400,000 และรายได้ +40% ต่อระดับ */
export const UPGRADE_COST_PER_LEVEL = 400000;
export const UPGRADE_GROWTH = 1.4;
export const BUSINESS_MAX_LEVEL = 3;
