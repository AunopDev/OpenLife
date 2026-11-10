/* business.service — unit test (ไม่พึ่งเบราว์เซอร์) */
import { describe, it, expect, beforeEach } from 'vitest';
import { life, stats } from '../../core/state';
import { startBusiness, upgradeBusiness, upgradeCost, businessState, buildBusinessViewModel } from './business.service';
import { BUSINESS_OPTIONS, BUSINESS_MAX_LEVEL, UPGRADE_COST_PER_LEVEL } from './business.constants';

function reset() {
  stats.money = 10000000;
  life.business = { active: false, type: '', level: 0, monthly: 0, invested: 0 };
  life.flags = {};
  life.rel = { family: 70, friend: 50, love: 0, boss: 50 };
}

beforeEach(reset);

describe('เปิดธุรกิจ', () => {
  it('เปิดร้านกาแฟได้ เงินลด และตั้ง flags/rel', function () {
    const r = startBusiness(0);
    expect(r.ok).toBe(true);
    expect(stats.money).toBe(10000000 - BUSINESS_OPTIONS[0].cost);
    const b = businessState();
    expect(b.active).toBe(true);
    expect(b.level).toBe(1);
    expect(b.monthly).toBe(BUSINESS_OPTIONS[0].monthly);
    expect(life.flags.business).toBe(true);
    expect(life.rel.friend).toBe(53);
    expect(r.achievement && r.achievement.id).toBe('business');
  });
  it('เงินไม่พอ → ไม่เปลี่ยน state', function () {
    stats.money = 1000;
    const r = startBusiness(0);
    expect(r.ok).toBe(false);
    expect(businessState().active).toBe(false);
  });
  it('index ที่ไม่มี → ปฏิเสธ', function () {
    expect(startBusiness(9).ok).toBe(false);
  });
});

describe('อัปเกรดธุรกิจ', () => {
  it('ต้นทุน = level × 400,000 และรายได้ +40%', function () {
    startBusiness(1);
    const b = businessState();
    const cost = upgradeCost(b);
    expect(cost).toBe(1 * UPGRADE_COST_PER_LEVEL);
    const before = stats.money;
    const r = upgradeBusiness();
    expect(r.ok).toBe(true);
    expect(stats.money).toBe(before - cost);
    expect(b.level).toBe(2);
    expect(b.monthly).toBe(Math.round(BUSINESS_OPTIONS[1].monthly * 1.4));
  });
  it('ถึงระดับสูงสุด → ปฏิเสธ', function () {
    startBusiness(2);
    const b = businessState();
    while (b.level < BUSINESS_MAX_LEVEL) { stats.money = 10000000; upgradeBusiness(); }
    expect(b.level).toBe(BUSINESS_MAX_LEVEL);
    expect(upgradeBusiness().ok).toBe(false);
  });
  it('ยังไม่มีธุรกิจ → ปฏิเสธ', function () {
    expect(upgradeBusiness().ok).toBe(false);
  });
});

describe('view model', () => {
  it('ส่งข้อมูลครบตาม state', function () {
    startBusiness(0);
    const vm = buildBusinessViewModel();
    expect(vm.active).toBe(true);
    expect(vm.level).toBe(1);
    expect(vm.upgradeCost).toBe(UPGRADE_COST_PER_LEVEL);
    expect(vm.money).toBe(stats.money);
  });
});
