# feature: assets (ทรัพย์สิน / ไลฟ์สไตล์)

**ทำอะไร:** หน้าซื้อ/อัปเกรดบ้าน รถ ห้องเช่า ลงทุน ถอนเงิน ทริป บริจาค และเปิดธุรกิจ — เป็น money sink หลักของเกม

**ตัวอย่าง feature module** — ตามกฎ [docs/rules/architecture.md](../../../docs/rules/architecture.md)

| ไฟล์ | บทบาท |
|---|---|
| `index.ts` | public API (`createAssets`, `assetPrestige`, `HOME_COSTS`, …) |
| `assets.types.ts` | `AssetsViewModel`, `ActionResult`, `AssetsDeps` |
| `assets.constants.ts` | ราคา/ผลตอบแทน/เพดานระดับ 3 ระดับ |
| `assets.service.ts` | ตรรกะซื้อ/ลงทุน/บริจาค/ทริป + prestige (ไม่แตะ DOM) |
| `assets.service.test.ts` | unit test 11 เคส |
| `assets.view.ts` | HTML ของหน้า (ไม่มีตรรกะเกม) |
| `assets.controller.ts` | `createAssets(deps)` → `{ open() }` ผูกคลิก → service |

**state ที่ใช้:** `life.assets` (carTier/trips/donated/invest/rentals), `life.homeLevel`, `life.business`, `life.flags.car`, `stats.money/heart`, `debts.car.balance`, `life.collections.stamps`
**สูตรร่วม:** `rentalIncome()` / `assetUpkeep()` ใน `src/sim/economy.ts`
**ผูกกับเกม:** `game.ts` → `const assetsFeature = createAssets({...})` · HUD/เมนู/rapid actions เรียก `openAssets()` → `assetsFeature.open()`

**ข้อควรระวัง:** ราคา/รายได้ต้องตรงกับ `docs/GDD.md §6.4` และ `docs/BALANCE.md`; ถ้าแก้ตัวเลขให้แก้ constants + GDD + test พร้อมกัน
