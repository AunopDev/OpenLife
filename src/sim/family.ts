/* OpenLife — ครอบครัว: อายุลูก, สุขภาพพ่อแม่ (pure: state กลางเท่านั้น) */
import { life, stats } from '../core/state';
import { clamp } from '../core/util';
import { ageYears } from './time';

/** อายุลูกเป็นปี (−1 = ยังไม่มีลูก) */
export function childAgeYears(): number {
  return life.child.ageMonths >= 0 ? Math.floor(life.child.ageMonths / 12) : -1;
}

/** เดินเวลาครอบครัว months เดือน — คืนข้อความเหตุการณ์ (เช่น พ่อแม่เสีย) */
export function familyTick(months: number): string[] {
  const notes: string[] = [];
  if (life.flags.kid && life.child.ageMonths >= 0) {
    life.child.ageMonths += months;
  }
  if (life.parents.alive) {
    const parentAge = ageYears() + 25;
    if (parentAge >= 60) {
      life.parents.health = clamp(life.parents.health - 0.2 * months, 0, 100);
    }
    if (life.parents.health <= 0) {
      life.parents.alive = false;
      life.parents.health = 0;
      stats.heart = clamp(stats.heart - 15, 0, 100);
      stats.money += 100000;
      life.flags.inheritance = true;
      notes.push('พ่อแม่จากไป — ได้รับมรดก ฿100,000');
    }
  }
  return notes;
}
