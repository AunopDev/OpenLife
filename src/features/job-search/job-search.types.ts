/* job-search — types ของ feature หางาน */

export interface JobSearchInput {
  age: number;
  smarts: number;
  social: number;
  grooming: number;
  formal: boolean;
  connection: boolean;
  communication: number;
  tech: number;
  creativity: number;
}

export interface JobSearchOptions {
  chance: number;
  officeSalary: number;
  freeSalary: number;
  looksOk: boolean;
  looksSalary: number;
  looksChance: number;
}

export interface JobSearchDeps {
  isPaused(): boolean;
  currentTurnKey(): string;
  wearingFormal(): boolean;
  openModal(html: string): void;
  closeModal(): void;
  toast(message: string): void;
  saveGame(): void;
  updateHud(): void;
  /** จ้างงานจริง (จัดการ career/finance/profile + UI) */
  hire(salary: number, kind: 'office' | 'free' | 'looks'): void;
  /** สุ่ม 0..1 (ส่งเข้ามาเพื่อให้ test กำหนดผลได้) */
  rng(): number;
}
