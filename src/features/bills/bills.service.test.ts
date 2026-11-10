import { describe, it, expect, beforeEach } from 'vitest';
import { life, stats, finance, debts } from '../../core/state';
import { housingCost, livingCost, lifestyleCost } from '../../sim/economy';
import {
  billBreakdown, billsPaidThisTurn, billsPaidMonthsThisTurn, payBillsCash, payBillsCard,
  toggleAutoBills, settleBillsAtMonthEnd
} from './bills.service';
import { CARD_PENALTY } from './bills.constants';

beforeEach(function () {
  life.ageMonths = 22 * 12;
  life.chapter = 5;
  life.turn = 1;
  life.plannedMonths = 1;
  life.flags = {};
  finance.salary = 22000;
  finance.rent = 5500;
  stats.money = 50000;
  stats.credit = 60;
  stats.heart = 50;
  debts.credit.balance = 0;
});

describe('billBreakdown', function () {
  it('รวม ค่าเช่า + ค่าครองชีพ + lifestyle คูณจำนวนเดือน', function () {
    const perMonth = housingCost() + livingCost() + lifestyleCost();
    const b = billBreakdown(3);
    expect(b.months).toBe(3);
    expect(b.total).toBe(perMonth * 3);
    expect(b.rent + b.utility + b.lifestyle).toBe(b.total);
  });
  it('ค่าเริ่มต้นใช้ช่วงเวลาที่กำลังจะเดิน', function () {
    life.plannedMonths = 6;
    expect(billBreakdown().months).toBe(6);
  });
});

describe('จ่ายเงินสด', function () {
  it('เงินพอ → หักเงินและบันทึกว่าจ่ายแล้ว', function () {
    const b = billBreakdown(1);
    const r = payBillsCash(b);
    expect(r.ok).toBe(true);
    expect(stats.money).toBe(50000 - b.total);
    expect(billsPaidThisTurn()).toBe(true);
    expect(billsPaidMonthsThisTurn()).toBe(1);
  });
  it('เงินไม่พอ → ไม่เปลี่ยนอะไรเลย', function () {
    stats.money = 10;
    const r = payBillsCash(billBreakdown(1));
    expect(r.ok).toBe(false);
    expect(stats.money).toBe(10);
    expect(billsPaidThisTurn()).toBe(false);
  });
  it('เทิร์นใหม่ → สถานะจ่ายแล้วหายไป', function () {
    payBillsCash(billBreakdown(1));
    life.turn = 2;
    expect(billsPaidThisTurn()).toBe(false);
    expect(billsPaidMonthsThisTurn()).toBe(0);
  });
});

describe('ผ่อนเข้าบัตร', function () {
  it('เพิ่มหนี้บัตร + เครดิต/ใจลดตามค่าคงที่ และนับว่าจ่ายแล้ว', function () {
    const b = billBreakdown(1);
    payBillsCard(b);
    expect(debts.credit.balance).toBe(b.total);
    expect(stats.credit).toBe(60 - CARD_PENALTY.credit);
    expect(stats.heart).toBe(50 - CARD_PENALTY.heart);
    expect(stats.money).toBe(50000);
    expect(billsPaidThisTurn()).toBe(true);
  });
  it('เครดิตไม่ติดลบ', function () {
    stats.credit = 1;
    payBillsCard(billBreakdown(1));
    expect(stats.credit).toBe(0);
  });
});

describe('หักอัตโนมัติ', function () {
  it('toggle สลับค่า', function () {
    expect(toggleAutoBills()).toBe(true);
    expect(toggleAutoBills()).toBe(false);
  });
});

describe('สิ้นช่วงเวลา', function () {
  it('จ่ายครบแล้ว → ไม่เก็บเพิ่ม', function () {
    payBillsCash(billBreakdown(3));
    const money = stats.money;
    const r = settleBillsAtMonthEnd(3);
    expect(r).toEqual({ amount: 0, unpaidMonths: 0, settled: true });
    expect(stats.money).toBe(money);
  });
  it('จ่ายไป 1 จาก 3 เดือน + เปิดอัตโนมัติ + เงินพอ → หักเฉพาะ 2 เดือนที่เหลือ', function () {
    payBillsCash(billBreakdown(1));
    life.flags.autoBills = true;
    const money = stats.money;
    const perMonth = housingCost() + livingCost() + lifestyleCost();
    const r = settleBillsAtMonthEnd(3);
    expect(r.unpaidMonths).toBe(2);
    expect(r.amount).toBe(perMonth * 2);
    expect(r.settled).toBe(true);
    expect(r.note).toContain('หักอัตโนมัติ');
    expect(stats.money).toBe(money - perMonth * 2);
  });
  it('ไม่เปิดอัตโนมัติ → ทบเข้าบัตร + คำเตือน + เครดิตลด', function () {
    const r = settleBillsAtMonthEnd(1);
    expect(r.settled).toBe(false);
    expect(r.warning).toContain('ทบเข้าบัตรเครดิต');
    expect(debts.credit.balance).toBe(r.amount);
    expect(stats.credit).toBe(60 - CARD_PENALTY.credit);
  });
  it('เปิดอัตโนมัติแต่เงินไม่พอ → ทบเข้าบัตร (เงินไม่ติดลบ)', function () {
    life.flags.autoBills = true;
    stats.money = 100;
    const r = settleBillsAtMonthEnd(1);
    expect(r.settled).toBe(false);
    expect(stats.money).toBe(100);
  });
});
