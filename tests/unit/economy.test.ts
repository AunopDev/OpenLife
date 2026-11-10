/* สูตรเงิน (src/sim/economy.ts) — ตัวเลขต้องตรงกับ GDD §6 / economy.md
   ถ้าเปลี่ยนสูตรโดยตั้งใจ ให้แก้ค่าที่คาดหวังที่นี่พร้อมอัปเดต GDD */
import { describe, it, expect, beforeEach } from 'vitest';
import { life, finance, debts } from '../../src/core/state';
import {
  taxPerMonth, socialSecurityPerMonth, costInflation, housingCost, familyCost,
  billsTotalPerTurn, totalDebt, debtMinPerMonth, lifestyleCost, livingCost
} from '../../src/sim/economy';
import { ageYears, periodMonths } from '../../src/sim/time';
import { childAgeYears, familyTick } from '../../src/sim/family';

beforeEach(function () {
  life.ageMonths = 22 * 12;
  life.flags = {};
  life.plannedMonths = 1;
  life.child.ageMonths = -1;
  life.parents.alive = true;
  life.parents.health = 75;
  finance.salary = 22000;
  finance.rent = 5500;
  Object.keys(debts).forEach(function (k) { debts[k].balance = 0; });
});

describe('ภาษีขั้นบันไดแบบย่อ 5/8/12/17%', function () {
  it('เงินเดือน 22,000 → 5%', function () {
    finance.salary = 22000;
    expect(taxPerMonth()).toBe(1100);
  });
  it('เงินเดือน 50,000 → 30,000×5% + 20,000×8%', function () {
    finance.salary = 50000;
    expect(taxPerMonth()).toBe(1500 + 1600);
  });
  it('เงินเดือน 150,000 ครบทุกขั้น', function () {
    finance.salary = 150000;
    expect(taxPerMonth()).toBe(1500 + 2400 + 4800 + 8500);
  });
  it('ไม่มีเงินเดือน → 0', function () {
    finance.salary = 0;
    expect(taxPerMonth()).toBe(0);
  });
});

describe('ประกันสังคม', function () {
  it('5% ของเงินเดือน', function () {
    finance.salary = 10000;
    expect(socialSecurityPerMonth()).toBe(500);
  });
  it('เพดาน 750', function () {
    finance.salary = 80000;
    expect(socialSecurityPerMonth()).toBe(750);
  });
  it('ตกงาน → 0', function () {
    finance.salary = 0;
    expect(socialSecurityPerMonth()).toBe(0);
  });
});

describe('เงินเฟ้อและค่าครองชีพ', function () {
  it('อายุ 22 → ×1.00, อายุ 32 → ×1.20', function () {
    expect(costInflation()).toBe(1);
    life.ageMonths = 32 * 12;
    expect(costInflation()).toBeCloseTo(1.2);
    expect(ageYears()).toBe(32);
  });
  it('ค่าเช่าคูณเงินเฟ้อ / มีบ้านแล้วใช้ 1,500', function () {
    life.ageMonths = 32 * 12;
    expect(housingCost()).toBe(Math.round(5500 * 1.2));
    life.flags.house = true;
    expect(housingCost()).toBe(Math.round(1500 * 1.2));
  });
  it('ครอบครัว: แต่งงาน +3,000, มีลูกต่ำกว่า 22 ปี +8,000', function () {
    expect(familyCost()).toBe(0);
    life.flags.married = true;
    life.flags.kid = true;
    life.child.ageMonths = 5 * 12;
    expect(familyCost()).toBe(11000);
    life.child.ageMonths = 22 * 12;
    expect(familyCost()).toBe(3000);
  });
  it('บิลต่อช่วง = (ที่อยู่ + ค่าครองชีพ + lifestyle) × จำนวนเดือน', function () {
    const perMonth = housingCost() + livingCost() + lifestyleCost();
    life.plannedMonths = 3;
    expect(periodMonths()).toBe(3);
    expect(billsTotalPerTurn()).toBe(perMonth * 3);
  });
});

describe('ค่าครองชีพตามรายได้ (progressive lifestyle)', function () {
  it('≤40k คิด 12%', function () {
    finance.salary = 22000;
    expect(lifestyleCost()).toBe(2640);
    finance.salary = 40000;
    expect(lifestyleCost()).toBe(4800);
  });
  it('ขั้นบันได 12/18/25/30%', function () {
    finance.salary = 80000;
    expect(lifestyleCost()).toBe(4800 + 7200);
    finance.salary = 150000;
    expect(lifestyleCost()).toBe(4800 + 7200 + 17500);
    finance.salary = 300000;
    expect(lifestyleCost()).toBe(4800 + 7200 + 17500 + 45000);
  });
  it('รวมรายได้พาสซีฟเป็นฐานคิด', function () {
    finance.salary = 40000;
    life.flags.condo = true; // +3,000/เดือน
    expect(lifestyleCost()).toBe(4800 + Math.round(3000 * 0.18));
  });
  it('ไม่มีรายได้ → 0', function () {
    finance.salary = 0;
    expect(lifestyleCost()).toBe(0);
  });
});

describe('หนี้', function () {
  it('รวมหนี้และขั้นต่ำเฉพาะก้อนที่ยังค้าง', function () {
    debts.credit.balance = 10000;
    debts.student.balance = 5000;
    expect(totalDebt()).toBe(15000);
    expect(debtMinPerMonth()).toBe(debts.credit.min + debts.student.min);
  });
});

describe('ครอบครัว', function () {
  it('อายุลูก −1 เมื่อยังไม่มีลูก', function () {
    expect(childAgeYears()).toBe(-1);
  });
  it('พ่อแม่สุขภาพหมด → เสียชีวิต + มรดกครั้งเดียว', function () {
    life.ageMonths = 40 * 12;
    life.parents.health = 0.5;
    const notes = familyTick(12);
    expect(life.parents.alive).toBe(false);
    expect(life.flags.inheritance).toBe(true);
    expect(notes.length).toBe(1);
    expect(familyTick(12).length).toBe(0);
  });
});
