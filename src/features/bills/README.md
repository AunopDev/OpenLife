# feature: bills (บิลที่อยู่)

**ทำอะไร:** ผู้เล่นจ่ายค่าเช่า + ค่าครองชีพ + ค่าใช้จ่ายตามรายได้ ของช่วงเวลาที่กำลังจะเดิน — จ่ายเงินสด, ผ่อนเข้าบัตรเครดิต หรือเปิดหักอัตโนมัติ; สิ้นช่วงเวลา ส่วนที่ยังไม่จ่ายจะถูกหักอัตโนมัติหรือทบเข้าบัตร

**ตัวอย่างอ้างอิงของ feature module** — ดูกฎ [docs/rules/architecture.md](../../../docs/rules/architecture.md)

| ไฟล์ | บทบาท |
|---|---|
| `index.ts` | public API |
| `bills.types.ts` | `BillBreakdown`, `BillsViewModel`, `MonthEndBills`, `BillsDeps` |
| `bills.constants.ts` | ผลเสียของการผ่อนเข้าบัตร, id ปุ่ม |
| `bills.service.ts` | คำนวณยอด, จ่าย/ผ่อน/หักอัตโนมัติ, คิดบิลสิ้นช่วงเวลา (pure) |
| `bills.service.test.ts` | unit test |
| `bills.view.ts` | HTML ของหน้าบิล |
| `bills.view.test.ts` | test HTML |
| `bills.controller.ts` | `createBills(deps)` → `{ open() }` |

**state ที่ใช้:** `life.flags.billsPaidTurn`, `life.flags.billsPaidMonths`, `life.flags.autoBills`, `stats.money/credit/heart`, `debts.credit.balance`
**สูตรร่วม:** `housingCost` / `livingCost` / `lifestyleCost` ใน `src/sim/economy.ts`
**ผูกกับเกม:** `game.ts` → `const billsFeature = createBills({...})` · hotspot "จ่ายบิลที่อยู่", เมนูทำเร็ว, หน้าเดินเวลา เรียก `openBills()` → `billsFeature.open()` · `resolveMonth()` เรียก `settleBillsAtMonthEnd(months)`
