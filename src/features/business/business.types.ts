/* business — types ของ feature ธุรกิจ */

export interface BusinessOption {
  type: string;
  cost: number;
  monthly: number;
}

export interface BusinessState {
  active: boolean;
  type: string;
  level: number;
  monthly: number;
  invested: number;
}

export interface BusinessActionResult {
  ok: boolean;
  message: string;
  achievement?: { id: string; label: string };
}

export interface BusinessViewModel {
  active: boolean;
  type: string;
  level: number;
  monthly: number;
  invested: number;
  upgradeCost: number;
  maxLevel: number;
  money: number;
}

export interface BusinessDeps {
  isPaused(): boolean;
  openModal(html: string): void;
  closeModal(): void;
  toast(message: string): void;
  saveGame(): void;
  updateHud(): void;
  addAchievement(id: string, label: string): void;
}
