/* OpenLife — เวลาชีวิต (pure: อ่านจาก state กลางเท่านั้น) */
import { life } from '../core/state';

/** อายุเป็นปีเต็ม */
export function ageYears(): number {
  return Math.floor(life.ageMonths / 12);
}

/** จำนวนเดือนของช่วงเวลาที่กำลังจะเดิน (อย่างน้อย 1) */
export function periodMonths(): number {
  return Math.max(1, life.plannedMonths || 1);
}

/** key ของเทิร์นปัจจุบัน ใช้กันทำซ้ำในเทิร์นเดียว (เช่น จ่ายบิลแล้ว) */
export function currentTurnKey(): string {
  return life.chapter + ':' + life.turn;
}
