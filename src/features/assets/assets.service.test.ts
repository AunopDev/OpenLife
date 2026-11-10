/* assets.service — unit test (ไม่พึ่งเบราว์เซอร์) */
import { describe, it, expect, beforeEach } from 'vitest';
import { life, stats, debts } from '../../core/state';
import {
  assetPrestige, tripMultiplier, buyHome, buyCar, buyRental, invest, withdraw, donate, takeTrip, buildAssetsViewModel
} from './assets.service';
import { HOME_COSTS, CAR_TIERS, RENTAL_COSTS } from './assets.constants';

function reset() {
  stats.money = 100000000;
  stats.heart = 50;
  life.homeLevel = 0;
  life.assets = { carTier: 0, trips: 0, donated: 0, invest: 0, rentals: 0 };
  life.business = { active: false, type: '', level: 0, monthly: 0, invested: 0 };
  life.collections = { books: 0, food: 0, music: 0, stamps: 0 };
  life.needs = { fun: 50, social: 50, rest: 50, hygiene: 50, hunger: 50 };
  life.skills = { communication: 0, tech: 0, finance: 0, fitness: 0, cooking: 0, creativity: 0 };
  life.ageMonths = 22 * 12;
  life.flags = {};
  debts.car.balance = 0;
}

const effects = {
  addNeed: function (k: string, v: number) { (life.needs as any)[k] += v; },
  gainSkill: function (k: string, v: number) { (life.skills as any)[k] = ((life.skills as any)[k] || 0) + v; }
};

beforeEach(reset);

describe('บ้าน', () => {
  it('ซื้อได้ 3 ระดับ เงินลดตามราคา และได้ achievement', function () {
    const before = stats.money;
    const r1 = buyHome();
    expect(r1.ok).toBe(true);
    expect(stats.money).toBe(before - HOME_COSTS[0]);
    expect(life.homeLevel).toBe(1);
    expect(r1.achievements && r1.achievements.length).toBe(1);
    buyHome(); buyHome();
    expect(life.homeLevel).toBe(3);
    expect(buyHome().ok).toBe(false);
  });
  it('เงินไม่พอ → ไม่เปลี่ยน state', function () {
    stats.money = HOME_COSTS[0] - 1;
    const r = buyHome();
    expect(r.ok).toBe(false);
    expect(life.homeLevel).toBe(0);
    expect(stats.money).toBe(HOME_COSTS[0] - 1);
  });
});

describe('รถ', () => {
  it('มีไฟแนนซ์ค้าง → ซื้อไม่ได้', function () {
    debts.car.balance = 100000;
    const r = buyCar();
    expect(r.ok).toBe(false);
    expect(life.assets!.carTier).toBe(0);
  });
  it('ปิดไฟแนนซ์แล้วซื้อได้ และตั้ง flags.car', function () {
    debts.car.balance = 0;
    const r = buyCar();
    expect(r.ok).toBe(true);
    expect(life.assets!.carTier).toBe(1);
    expect(life.flags.car).toBe(true);
    expect(stats.money).toBe(100000000 - CAR_TIERS[0].cost);
  });
});

describe('ห้องเช่า / ลงทุน / บริจาค', () => {
  it('ซื้อห้องเช่าเพิ่ม rentals และรายได้', function () {
    const r = buyRental();
    expect(r.ok).toBe(true);
    expect(life.assets!.rentals).toBe(1);
    expect(buildAssetsViewModel().rentalIncome).toBeGreaterThan(0);
    expect(stats.money).toBe(100000000 - RENTAL_COSTS[0]);
  });
  it('ลงทุนแล้วถอนคืนได้เท่าเดิม', function () {
    const before = stats.money;
    expect(invest(500000).ok).toBe(true);
    expect(stats.money).toBe(before - 500000);
    expect(life.assets!.invest).toBe(500000);
    expect(withdraw().ok).toBe(true);
    expect(stats.money).toBe(before);
    expect(life.assets!.invest).toBe(0);
  });
  it('ลงทุนจำนวนที่ไม่อยู่ในตัวเลือก → ปฏิเสธ', function () {
    expect(invest(12345).ok).toBe(false);
  });
  it('บริจาค 5 ล้านได้ achievement patron', function () {
    const r = donate(5000000);
    expect(r.ok).toBe(true);
    expect((r.achievements || []).some(function (a) { return a.id === 'patron'; })).toBe(true);
  });
});

describe('ทริป', () => {
  it('ไปครั้งแรกได้ผลเต็ม และเพิ่ม stamps', function () {
    const r = takeTrip(0, effects);
    expect(r.ok).toBe(true);
    expect(life.assets!.trips).toBe(1);
    expect(life.collections!.stamps).toBe(1);
    expect(life.needs!.fun).toBeGreaterThan(50);
  });
  it('ผลตอบแทนลดลงเมื่อไปหลายครั้ง', function () {
    expect(tripMultiplier()).toBe(1);
    life.assets!.trips = 4;
    expect(tripMultiplier()).toBeCloseTo(0.68);
    life.assets!.trips = 20;
    expect(tripMultiplier()).toBe(0.3);
  });
});

describe('prestige', () => {
  it('รวมบ้าน/รถ/ห้องเช่า/ทริป', function () {
    life.homeLevel = 2;
    life.assets!.carTier = 1;
    life.assets!.rentals = 2;
    life.assets!.trips = 3;
    expect(assetPrestige()).toBe(2 * 2 + 1 * 3 + 2 * 4 + 3);
  });
});
