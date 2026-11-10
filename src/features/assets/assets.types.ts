/* assets — types ของ feature ทรัพย์สิน/ไลฟ์สไตล์ */

export interface AssetTrip {
  name: string;
  cost: number;
  heart: number;
  fun: number;
  rest: number;
  stamp: number;
  skill?: string;
}

export interface CarTier {
  name: string;
  cost: number;
}

/** ผลลัพธ์ของการทำรายการ (service → controller) */
export interface ActionResult {
  ok: boolean;
  message: string;
  achievements?: Array<{ id: string; label: string }>;
}

/** ของที่ service ต้องใช้จากเกม (ไม่แตะ DOM) */
export interface AssetsEffects {
  addNeed(key: string, amount: number): void;
  gainSkill(key: string, amount: number): void;
}

/** dependency ที่ controller รับจาก composition root (game.ts) */
export interface AssetsDeps {
  isPaused(): boolean;
  openModal(html: string): void;
  closeModal(): void;
  getModal(): HTMLElement | null;
  toast(message: string): void;
  saveGame(): void;
  updateHud(): void;
  openFinance(): void;
  openBusiness(): void;
  addAchievement(id: string, label: string): void;
  addNeed(key: string, amount: number): void;
  gainSkill(key: string, amount: number): void;
}

/** ข้อมูลที่คำนวณแล้วสำหรับ view */
export interface AssetsViewModel {
  money: number;
  prestige: number;
  homeLevel: number;
  homeCost: number | null;
  carTier: number;
  carName: string;
  carReady: boolean;
  carCost: number | null;
  rentals: number;
  rentalCost: number | null;
  rentalIncome: number;
  invest: number;
  donated: number;
  trips: number;
  tripMult: number;
  businessActive: boolean;
  businessType: string;
  businessLevel: number;
  businessMonthly: number;
  tripsList: AssetTrip[];
}
