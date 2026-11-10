# feature: business (ธุรกิจ)

**ทำอะไร:** เปิดธุรกิจใหม่ (3 ตัวเลือก) และอัปเกรดสูงสุด 3 ระดับ — รายได้เข้ากระเป๋าทุกเทิร์น

| ไฟล์ | บทบาท |
|---|---|
| `index.ts` | public API (`createBusiness`, `startBusiness`, `upgradeBusiness`) |
| `business.types.ts` | `BusinessViewModel`, `ActionResult`, `BusinessDeps` |
| `business.constants.ts` | ตัวเลือกธุรกิจ, ต้นทุนอัปเกรด 400k/ระดับ, รายได้ +40%/ระดับ |
| `business.service.ts` | ตรรกะเปิด/อัปเกรด (ไม่แตะ DOM) |
| `business.service.test.ts` | unit test 7 เคส |
| `business.view.ts` | HTML หน้าเลือก/จัดการธุรกิจ |
| `business.controller.ts` | `createBusiness(deps)` → `{ open() }` |

**state ที่ใช้:** `life.business`, `life.flags.business`, `life.rel.friend`, `stats.money`
**ผูกกับเกม:** `game.ts` → `const businessFeature = createBusiness({...})` · `openAssets()` → `openBusiness()` → `businessFeature.open()`
**หมายเหตุ:** เดิมปุ่มอัปเกรดเขียน "+50%" แต่สูตรเป็น ×1.4 (+40%) — แก้ป้ายให้ตรงสูตรแล้ว
