/* business — ตรรกะธุรกิจ (อ่าน/เขียน core/state, ไม่แตะ DOM) */
import { life, stats } from '../../core/state';
import { clamp, fmt } from '../../core/util';
import { BUSINESS_OPTIONS, UPGRADE_COST_PER_LEVEL, UPGRADE_GROWTH, BUSINESS_MAX_LEVEL } from './business.constants';
import type { BusinessActionResult, BusinessState, BusinessViewModel } from './business.types';

export function businessState(): BusinessState {
  if (!life.business) life.business = { active: false, type: '', level: 0, monthly: 0, invested: 0 };
  return life.business as BusinessState;
}

export function upgradeCost(b: BusinessState): number {
  return (b.level || 0) * UPGRADE_COST_PER_LEVEL;
}

export function startBusiness(index: number): BusinessActionResult {
  const o = BUSINESS_OPTIONS[index];
  if (!o) return { ok: false, message: 'ไม่พบธุรกิจนี้' };
  if (stats.money < o.cost) return { ok: false, message: 'เงินไม่พอลงทุน ฿' + fmt(o.cost) };
  stats.money -= o.cost;
  life.business = { active: true, type: o.type, level: 1, monthly: o.monthly, invested: o.cost };
  life.flags.business = true;
  life.rel.friend = clamp((life.rel.friend || 0) + 3, 0, 100);
  return {
    ok: true,
    message: 'เปิด ' + o.type + ' แล้ว · +฿' + fmt(o.monthly) + '/เดือน',
    achievement: { id: 'business', label: 'เปิดธุรกิจ' }
  };
}

export function upgradeBusiness(): BusinessActionResult {
  const b = businessState();
  if (!b.active) return { ok: false, message: 'ยังไม่มีธุรกิจ' };
  if (b.level >= BUSINESS_MAX_LEVEL) return { ok: false, message: 'ธุรกิจถึงระดับสูงสุดแล้ว' };
  const cost = upgradeCost(b);
  if (stats.money < cost) return { ok: false, message: 'เงินไม่พออัปเกรด ฿' + fmt(cost) };
  stats.money -= cost;
  b.invested += cost;
  b.level += 1;
  b.monthly = Math.round(b.monthly * UPGRADE_GROWTH);
  return { ok: true, message: 'อัปเกรดธุรกิจเป็นระดับ ' + b.level + ' · +฿' + fmt(b.monthly) + '/เดือน' };
}

export function buildBusinessViewModel(): BusinessViewModel {
  const b = businessState();
  return {
    active: !!b.active,
    type: b.type,
    level: b.level || 0,
    monthly: b.monthly || 0,
    invested: b.invested || 0,
    upgradeCost: upgradeCost(b),
    maxLevel: BUSINESS_MAX_LEVEL,
    money: stats.money
  };
}
