/* assets — ตรรกะทรัพย์สิน/ไลฟ์สไตล์ (pure เท่าที่ทำได้: อ่าน/เขียน core/state, ไม่แตะ DOM)
   ราคา/ผลตอบแทน: assets.constants.ts · รายได้ห้องเช่า: sim/economy.ts (RENTAL_INCOME) */
import { life, stats, debts } from '../../core/state';
import { clamp, fmt } from '../../core/util';
import { rentalIncome } from '../../sim/economy';
import {
  HOME_COSTS, CAR_TIERS, ASSET_TRIPS, RENTAL_COSTS, HOME_MAX, CAR_MAX, RENTAL_MAX,
  INVEST_OPTIONS, INVEST_1M, DONATE_SMALL, DONATE_BIG, HOME_HEART, CAR_HEART, HOME_UPKEEP_PER_LEVEL
} from './assets.constants';
import type { ActionResult, AssetsEffects, AssetsViewModel, AssetTrip, HomeUpgradeViewModel } from './assets.types';

function assets() {
  if (!life.assets) life.assets = { carTier: 0, trips: 0, donated: 0, invest: 0, rentals: 0 };
  const a: any = life.assets;
  if (typeof a.rentals !== 'number') a.rentals = 0;
  return a;
}

function business() {
  if (!life.business) life.business = { active: false, type: '', level: 0, monthly: 0, invested: 0 };
  return life.business as any;
}

function noMoney(cost: number): ActionResult {
  return { ok: false, message: 'เงินไม่พอ ฿' + fmt(cost) };
}

function pay(cost: number): boolean {
  if (stats.money < cost) return false;
  stats.money -= cost;
  return true;
}

/** prestige รวมจากบ้าน/รถ/ธุรกิจ/ทริป/บริจาค/ห้องเช่า */
export function assetPrestige(): number {
  const a: any = life.assets || {};
  const biz = life.business && (life.business as any).active ? ((life.business as any).level || 0) * 2 : 0;
  return (life.homeLevel || 0) * 2 + (a.carTier || 0) * 3 + biz +
    Math.min(5, a.trips || 0) + Math.min(5, Math.floor((a.donated || 0) / 1000000) * 2) +
    (a.rentals || 0) * 4;
}

/** ตัวคูณผลตอบแทนทริป (ยิ่งไปบ่อยยิ่งได้น้อย) */
export function tripMultiplier(): number {
  return Math.max(0.3, 1 - (assets().trips || 0) * 0.08);
}

/* ---------- รายการซื้อ/ลงทุน ---------- */

export function buyHome(): ActionResult {
  const home = life.homeLevel || 0;
  if (home >= HOME_MAX) return { ok: false, message: 'บ้านถึงระดับสูงสุดแล้ว' };
  const cost = HOME_COSTS[home];
  if (!pay(cost)) return noMoney(cost);
  life.homeLevel = home + 1;
  stats.heart = clamp(stats.heart + HOME_HEART, 0, 100);
  const achievements = [{ id: 'home_' + life.homeLevel, label: 'บ้านระดับ ' + life.homeLevel }];
  if (life.homeLevel >= HOME_MAX) achievements.push({ id: 'home_max', label: 'บ้านระดับสูงสุด' });
  return { ok: true, message: 'บ้านอัปเกรดเป็นระดับ ' + life.homeLevel + ' · ใจ +' + HOME_HEART, achievements: achievements };
}

export function buyCar(): ActionResult {
  const a = assets();
  const car = a.carTier || 0;
  if (car >= CAR_MAX) return { ok: false, message: 'รถถึงระดับสูงสุดแล้ว' };
  if (debts.car.balance > 0) return { ok: false, message: 'ปิดไฟแนนซ์รถก่อนอัปเกรด' };
  const tier = CAR_TIERS[car];
  if (!pay(tier.cost)) return noMoney(tier.cost);
  a.carTier = car + 1;
  life.flags.car = true;
  stats.heart = clamp(stats.heart + CAR_HEART, 0, 100);
  return {
    ok: true,
    message: 'ได้ ' + tier.name + ' · ใจ +' + CAR_HEART,
    achievements: [{ id: 'car_tier_' + a.carTier, label: 'รถระดับ ' + a.carTier }]
  };
}

export function buyRental(): ActionResult {
  const a = assets();
  const n = a.rentals || 0;
  if (n >= RENTAL_MAX) return { ok: false, message: 'อสังหาริมทรัพย์ถึงระดับสูงสุดแล้ว' };
  const cost = RENTAL_COSTS[n];
  if (!pay(cost)) return noMoney(cost);
  a.rentals = n + 1;
  return {
    ok: true,
    message: 'ซื้อห้องเช่า · รายได้รวม ฿' + fmt(rentalIncome()) + '/เดือน',
    achievements: [{ id: 'rental_' + a.rentals, label: 'ห้องเช่า ' + a.rentals + ' ห้อง' }]
  };
}

export function invest(amount: number): ActionResult {
  const a = assets();
  if (INVEST_OPTIONS.indexOf(amount) < 0) return { ok: false, message: 'จำนวนลงทุนไม่ถูกต้อง' };
  if (!pay(amount)) return noMoney(amount);
  a.invest = (a.invest || 0) + amount;
  const achievements = a.invest >= INVEST_1M ? [{ id: 'invest_1m', label: 'เงินลงทุนครบ 1 ล้าน' }] : [];
  return { ok: true, message: 'ลงทุน ฿' + fmt(amount) + ' · มูลค่ารวม ฿' + fmt(a.invest), achievements: achievements };
}

export function withdraw(): ActionResult {
  const a = assets();
  if ((a.invest || 0) <= 0) return { ok: false, message: 'ยังไม่มีเงินลงทุน' };
  const amount = a.invest;
  stats.money += amount;
  a.invest = 0;
  return { ok: true, message: 'ถอนเงินลงทุน ฿' + fmt(amount) };
}

export function donate(amount: number): ActionResult {
  if (amount !== DONATE_SMALL && amount !== DONATE_BIG) return { ok: false, message: 'จำนวนบริจาคไม่ถูกต้อง' };
  if (!pay(amount)) return noMoney(amount);
  const a = assets();
  a.donated = (a.donated || 0) + amount;
  const big = amount === DONATE_BIG;
  stats.heart = clamp(stats.heart + (big ? 6 : 3), 0, 100);
  const achievements = [{ id: 'donor', label: 'ผู้ให้' }];
  if (big) achievements.push({ id: 'patron', label: 'ผู้สนับสนุนกองทุนมรดก' });
  return {
    ok: true,
    message: big ? 'ตั้งกองทุนมรดก ฿5,000,000 · legacy ++' : 'บริจาค ฿1,000,000 · legacy +',
    achievements: achievements
  };
}

export function takeTrip(index: number, effects: AssetsEffects): ActionResult {
  const trip: AssetTrip = ASSET_TRIPS[index];
  if (!trip) return { ok: false, message: 'ไม่พบทริปนี้' };
  if (!pay(trip.cost)) return noMoney(trip.cost);
  const m = tripMultiplier();
  const heart = Math.round(trip.heart * m);
  stats.heart = clamp(stats.heart + heart, 0, 100);
  effects.addNeed('fun', Math.round(trip.fun * m));
  effects.addNeed('rest', Math.round(trip.rest * m));
  if (trip.skill) effects.gainSkill(trip.skill, 1);
  if (!life.collections) life.collections = { books: 0, food: 0, music: 0, stamps: 0 };
  life.collections.stamps = (life.collections.stamps || 0) + (trip.stamp || 0);
  const a = assets();
  a.trips = (a.trips || 0) + 1;
  const achievements = a.trips >= 3 ? [{ id: 'trips_3', label: 'ท่องเที่ยว 3 ครั้ง' }] : [];
  return { ok: true, message: trip.name + ' · ใจ +' + heart, achievements: achievements };
}

export function buildAssetsViewModel(): AssetsViewModel {
  const a = assets();
  const b = business();
  const home = life.homeLevel || 0;
  const car = a.carTier || 0;
  const rentals = a.rentals || 0;
  return {
    money: stats.money,
    prestige: assetPrestige(),
    homeLevel: home,
    homeCost: home < HOME_MAX ? HOME_COSTS[home] : null,
    carTier: car,
    carName: car > 0 ? CAR_TIERS[car - 1].name : '',
    carReady: debts.car.balance <= 0,
    carCost: car < CAR_MAX ? CAR_TIERS[car].cost : null,
    rentals: rentals,
    rentalCost: rentals < RENTAL_MAX ? RENTAL_COSTS[rentals] : null,
    rentalIncome: rentalIncome(),
    invest: a.invest || 0,
    donated: a.donated || 0,
    trips: a.trips || 0,
    tripMult: tripMultiplier(),
    businessActive: !!b.active,
    businessType: b.type || '',
    businessLevel: b.level || 0,
    businessMonthly: b.monthly || 0,
    tripsList: ASSET_TRIPS
  };
}

/** ข้อมูลหน้า "ปรับปรุงบ้าน" */
export function buildHomeUpgradeViewModel(): HomeUpgradeViewModel {
  const home = life.homeLevel || 0;
  return {
    level: home,
    maxLevel: HOME_MAX,
    nextCost: home < HOME_MAX ? HOME_COSTS[home] : null,
    upkeepPerLevel: HOME_UPKEEP_PER_LEVEL
  };
}
