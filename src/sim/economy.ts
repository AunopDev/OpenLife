/* OpenLife — สูตรเงินรายเดือน (pure: อ่าน/เขียนเฉพาะ state กลาง ไม่แตะ DOM)
   ตัวเลขและแหล่งที่มา: docs/GDD.md §6, docs/rules/economy.md
   ⚠ ตัวเลขบางตัวย่อเพื่อเกม (ภาษี/ประกันสังคม) — ดู TODO(research) ใน economy.md */
import { life, finance, debts } from '../core/state';
import { ageYears, periodMonths } from './time';

/** รายได้ค่าเช่าต่อห้อง (ห้องที่ 1, 2, 3) ต่อเดือน ก่อนเงินเฟ้อ */
export const RENTAL_INCOME = [30000, 45000, 70000];

export function totalDebt(): number {
  return Object.keys(debts).reduce(function (a, k) { return a + Math.max(0, debts[k].balance); }, 0);
}

export function debtMinPerMonth(): number {
  return Object.keys(debts).reduce(function (a, k) {
    return a + (debts[k].balance > 0 ? debts[k].min : 0);
  }, 0);
}

/** ตัวคูณเงินเฟ้อ +2%/ปี หลังอายุ 22 */
export function costInflation(): number {
  return 1 + Math.max(0, ageYears() - 22) * 0.02;
}

export function housingCost(): number {
  const base = life.flags.house ? 1500 : finance.rent;
  return Math.round(base * costInflation());
}

export function transportCost(): number {
  let base;
  if (life.flags.car === false || debts.car.repossessed) base = 1200;
  else if (debts.car.balance <= 0) base = 2000;
  else base = finance.transport;
  return Math.round(base * costInflation());
}

export function familyCost(): number {
  let c = 0;
  if (life.flags.married) c += 3000;
  if (life.flags.kid && life.child.ageMonths >= 0 && life.child.ageMonths < 22 * 12) c += 8000;
  return Math.round(c * costInflation());
}

export function assetUpkeep(): number {
  const a = life.assets || ({} as any);
  const home = (life.homeLevel || 0) * 1500;
  const car = (a.carTier || 0) * 800;
  const rentals = (a.rentals || 0) * 3000;
  return Math.round((home + car + rentals) * costInflation());
}

export function rentalIncome(): number {
  const a = life.assets || ({} as any);
  let sum = 0;
  for (let i = 0; i < (a.rentals || 0); i++) sum += RENTAL_INCOME[i] || 0;
  return Math.round(sum * costInflation());
}

export function livingCost(): number {
  return Math.round(1800 * costInflation());
}

/** ภาษีแบบขั้นบันไดย่อ 5/8/12/17% (ไม่ใช่อัตราจริง — economy.md §1) */
export function taxPerMonth(): number {
  const brackets: [number, number][] = [[30000, 0.05], [60000, 0.08], [100000, 0.12], [Infinity, 0.17]];
  const salary = finance.salary;
  let prev = 0;
  let tax = 0;
  brackets.forEach(function (b) {
    const part = Math.max(0, Math.min(salary, b[0]) - prev);
    tax += part * b[1];
    prev = b[0];
  });
  return Math.round(tax);
}

/** ประกันสังคมลูกจ้าง 5% เพดาน 750 บาท/เดือน (TODO(research): เพดานปีปัจจุบัน) */
export function socialSecurityPerMonth(): number {
  if (finance.salary <= 0) return 0;
  return Math.min(750, Math.round(finance.salary * 0.05));
}

export function fixedPerMonth(): number {
  return familyCost() + assetUpkeep();
}

export function lifestyleCost(): number {
  return Math.round(finance.salary * 0.12);
}

export function billsTotalPerTurn(): number {
  return Math.round((housingCost() + livingCost() + lifestyleCost()) * periodMonths());
}

export function passiveIncomePerMonth(): number {
  let x = 0;
  if (life.flags.condo) x += 3000;
  if (life.flags.sideBiz) x += 2000;
  if (life.business && life.business.active) x += life.business.monthly || 0;
  x += rentalIncome();
  return x;
}
