/* bills — public API ของ feature บิลที่อยู่ (feature อื่น/เกม import จากไฟล์นี้เท่านั้น)
   ตัวอย่างอ้างอิงของ feature module: docs/rules/architecture.md */
export type { BillBreakdown, BillsDeps, MonthEndBills } from './bills.types';
export type { BillsFeature } from './bills.controller';
export { createBills } from './bills.controller';
export {
  billBreakdown,
  billsPaidThisTurn,
  billsPaidMonthsThisTurn,
  markBillsPaid,
  settleBillsAtMonthEnd
} from './bills.service';
