/* job-search — สูตรหางาน (pure: รับค่าอินพุตคืนผล ไม่แตะ state/DOM)
   ตัวเลข: GDD §5.3/§6.5 — อาชีพสายบันเทิงต้อง grooming ≥55 และ social ≥40 */
import { clamp } from '../../core/util';
import type { JobSearchInput, JobSearchOptions } from './job-search.types';

/** โอกาสผ่านสัมภาษณ์ออฟฟิศ (%) */
export function officeChance(input: JobSearchInput): number {
  let chance = 45 + (input.smarts - 50) * 0.4 + (input.social - 50) * 0.4 - Math.max(0, input.age - 40) * 1.2;
  chance += (input.grooming - 50) * 0.18;
  chance += input.formal ? 8 : -2;
  if (input.connection) chance += 10;
  chance += Math.min(20, input.communication * 0.2);
  return clamp(Math.round(chance), 10, 90);
}

/** เงินเดือนงานออฟฟิศ */
export function officeSalary(input: JobSearchInput): number {
  return Math.max(15000,
    16000 + Math.round(input.smarts * 80) + Math.round(input.social * 40) -
    Math.max(0, input.age - 40) * 150 + (input.connection ? 2000 : 0) +
    Math.round(input.tech * 30));
}

/** เงินเดือนฟรีแลนซ์ (ได้งานแน่) */
export function freeSalary(input: JobSearchInput): number {
  return Math.max(8000, 7000 + Math.round(input.social * 50) + Math.round(input.smarts * 30));
}

/** เข้าสายบันเทิงได้ไหม */
export function looksEligible(input: JobSearchInput): boolean {
  return input.grooming >= 55 && input.social >= 40;
}

/** เงินเดือนสายบันเทิง */
export function looksSalary(input: JobSearchInput): number {
  return Math.max(12000,
    9000 + Math.round(input.grooming * 140) + Math.round(input.social * 60) +
    Math.round(input.creativity * 90));
}

/** โอกาสผ่านแคสติ้ง (%) */
export function looksChance(input: JobSearchInput): number {
  return clamp(Math.round(
    30 + (input.grooming - 50) * 0.5 + (input.social - 50) * 0.3 +
    input.creativity * 0.2 - Math.max(0, input.age - 35) * 0.6
  ), 10, 90);
}

export function evaluateJobSearch(input: JobSearchInput): JobSearchOptions {
  return {
    chance: officeChance(input),
    officeSalary: officeSalary(input),
    freeSalary: freeSalary(input),
    looksOk: looksEligible(input),
    looksSalary: looksSalary(input),
    looksChance: looksChance(input)
  };
}

/** ทอยผล: ผ่านถ้า rng < chance/100 */
export function rollPass(chance: number, rng: number): boolean {
  return rng < chance / 100;
}
