/* bills — type ของ feature บิลที่อยู่ (ค่าเช่า + ค่าครองชีพ + ค่าใช้จ่ายตามรายได้) */

/** ยอดบิลของช่วงเวลาหนึ่ง (บาท) */
export interface BillBreakdown {
  months: number;
  rent: number;
  utility: number;
  lifestyle: number;
  total: number;
}

/** ข้อมูลที่ view ใช้วาดหน้าบิล — คำนวณเสร็จแล้วทั้งหมด */
export interface BillsViewModel {
  dateLabel: string;
  breakdown: BillBreakdown;
  money: number;
  paid: boolean;
  autoBills: boolean;
}

export type PayCashResult = { ok: true; amount: number } | { ok: false; reason: 'no-money'; amount: number };

/** ผลการคิดบิลตอนสิ้นช่วงเวลา (ใช้ในสลิปเงินเดือน) */
export interface MonthEndBills {
  /** ยอดบิลส่วนที่ยังไม่ได้จ่ายในช่วงนี้ */
  amount: number;
  unpaidMonths: number;
  /** จ่ายครบแล้ว (เองหรือหักอัตโนมัติ) */
  settled: boolean;
  /** ข้อความบันทึกเมื่อหักอัตโนมัติ */
  note?: string;
  /** คำเตือนเมื่อค้างจ่ายแล้วทบเข้าบัตรเครดิต */
  warning?: string;
}

/** ของที่ feature ต้องใช้จากเกม — ส่งเข้ามาทาง createBills(deps) (architecture.md §4) */
export interface BillsDeps {
  isPaused(): boolean;
  dateLabel(): string;
  openModal(html: string): void;
  closeModal(): void;
  toast(message: string): void;
  saveGame(): void;
  updateHud(): void;
}
