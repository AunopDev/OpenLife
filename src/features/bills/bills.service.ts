/* bills — ตรรกะ pure: คำนวณยอด จ่าย/ผ่อน/หักอัตโนมัติ (ไม่แตะ DOM)
   state: life.flags.billsPaidTurn / billsPaidMonths / autoBills, stats.money, debts.credit */
import { life, stats, debts } from '../../core/state';
import { clamp, fmt } from '../../core/util';
import { housingCost, livingCost, lifestyleCost } from '../../sim/economy';
import { periodMonths, currentTurnKey } from '../../sim/time';
import { CARD_PENALTY } from './bills.constants';
import type { BillBreakdown, MonthEndBills, PayCashResult } from './bills.types';

/** ยอดบิลของ months เดือน (ค่าเริ่มต้น = ช่วงเวลาที่กำลังจะเดิน) */
export function billBreakdown(months: number = periodMonths()): BillBreakdown {
  const rent = housingCost() * months;
  const utility = livingCost() * months;
  const lifestyle = lifestyleCost() * months;
  return { months: months, rent: rent, utility: utility, lifestyle: lifestyle, total: rent + utility + lifestyle };
}

export function billsPaidThisTurn(): boolean {
  return life.flags.billsPaidTurn === currentTurnKey();
}

export function markBillsPaid(months?: number): void {
  life.flags.billsPaidTurn = currentTurnKey();
  life.flags.billsPaidMonths = Math.max(1, months || periodMonths());
}

export function billsPaidMonthsThisTurn(): number {
  return billsPaidThisTurn() ? (life.flags.billsPaidMonths || 0) : 0;
}

/** จ่ายด้วยเงินสด — เงินไม่พอ = ไม่เปลี่ยนอะไรเลย */
export function payBillsCash(b: BillBreakdown): PayCashResult {
  if (stats.money < b.total) return { ok: false, reason: 'no-money', amount: b.total };
  stats.money -= b.total;
  markBillsPaid(b.months);
  return { ok: true, amount: b.total };
}

function chargeToCard(amount: number): void {
  debts.credit.balance += amount;
  stats.credit = clamp(stats.credit - CARD_PENALTY.credit, 0, 100);
  stats.heart = clamp(stats.heart - CARD_PENALTY.heart, 0, 100);
}

/** ผ่อนเข้าบัตรเครดิต — ได้เสมอ แต่เครดิต/ใจลด */
export function payBillsCard(b: BillBreakdown): number {
  chargeToCard(b.total);
  markBillsPaid(b.months);
  return b.total;
}

/** เปิด/ปิดหักบิลอัตโนมัติ — คืนค่าใหม่ */
export function toggleAutoBills(): boolean {
  life.flags.autoBills = !life.flags.autoBills;
  return !!life.flags.autoBills;
}

/** สิ้นช่วงเวลา: จ่ายเฉพาะเดือนที่ยังไม่ได้จ่าย — หักอัตโนมัติถ้าเปิดไว้และเงินพอ ไม่งั้นทบเข้าบัตร */
export function settleBillsAtMonthEnd(months: number): MonthEndBills {
  const monthly = housingCost() + livingCost() + lifestyleCost();
  const unpaidMonths = Math.max(0, months - billsPaidMonthsThisTurn());
  const amount = Math.round(monthly * unpaidMonths);
  if (unpaidMonths <= 0) return { amount: amount, unpaidMonths: 0, settled: true };
  if (life.flags.autoBills && stats.money >= amount) {
    stats.money -= amount;
    markBillsPaid(unpaidMonths);
    return { amount: amount, unpaidMonths: unpaidMonths, settled: true, note: 'บิลที่อยู่: หักอัตโนมัติ ฿' + fmt(amount) };
  }
  chargeToCard(amount);
  return {
    amount: amount,
    unpaidMonths: unpaidMonths,
    settled: false,
    warning: 'ค้างจ่ายบิลที่อยู่/ค่าครองชีพ ฿' + fmt(amount) + ' (' + unpaidMonths + ' เดือน) — ทบเข้าบัตรเครดิต'
  };
}
