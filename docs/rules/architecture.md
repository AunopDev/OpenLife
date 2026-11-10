# กฎสถาปัตยกรรม: แยกเป็น Feature Module (แนว Angular / NestJS)

> **ทุกระบบที่สร้างใหม่ หรือแยกออกจาก `game.ts` ต้องเป็น feature module ในโฟลเดอร์ของตัวเอง**
> แต่ละไฟล์ทำหน้าที่เดียว (service / view / controller / types / test) และ feature อื่นเรียกใช้ผ่าน `index.ts` เท่านั้น
> เหตุผล: AI/คนที่มารับงานต่อ เปิดโฟลเดอร์เดียวแล้วเข้าใจระบบนั้นได้ทั้งหมด แก้แล้วไม่กระทบระบบอื่น และ test ตรรกะได้โดยไม่ต้องเปิดเบราว์เซอร์
> **ตัวอย่างอ้างอิงที่ใช้งานจริง: [`src/features/bills/`](../../src/features/bills/README.md)** — เปิดดูก่อนสร้าง feature ใหม่ แล้วทำตามแบบเดียวกัน
> ไม่ใช้ framework จริง — เอาแค่ **วิธีจัดโครง** มาใช้กับ TypeScript ล้วน (ห้ามเพิ่ม Angular/NestJS/DI library)

---

## 1. ภาพรวมชั้นของโปรเจ็ค
```
src/
  core/        แกนกลางที่ทุกอย่างใช้: state, save, date, util            ← shared (ไม่แตะ DOM)
  sim/         สูตรจำลองที่ใช้ร่วม: เวลา เงิน ครอบครัว                     ← shared (ไม่แตะ DOM)
  content/     ระบบ event + audit                                         ← shared
  world/       ภูมิศาสตร์ แผนที่                                          ← shared
  render/      primitives วาดภาพ + ศิลปะแผนที่                             ← shared
  features/    ★ ระบบเกมแต่ละอย่าง (1 โฟลเดอร์ = 1 feature)               ← งานใหม่อยู่ที่นี่
  ui/ · audio/ · character/ · gameplay/   ของเดิม (จะทยอยย้ายเข้า features/ เมื่อแตะ)
  game.ts      ตัวประกอบ (composition root) — ผูก feature เข้ากับเกม ไม่ควรมีตรรกะใหม่
  main.ts      entry
```
- **shared layer** = ของที่หลาย feature ใช้ร่วมกัน (เหมือน `CoreModule`/`SharedModule`)
- **feature** = ระบบเดียวที่ผู้เล่นรู้จัก (เหมือน `FeatureModule`) เช่น หางาน บิล ธุรกิจ ทรัพย์สิน ย้ายถิ่น แต่งตัว คุยกับ NPC สภาพอากาศ ความสำเร็จ สลิปเงินเดือน ประเมินผลปลายปี ตอนจบ

## 2. โครงโฟลเดอร์ของ feature
> ของจริงในโปรเจ็ค: `src/features/bills/` (types · constants · service + test · view + test · controller · index · README)

```
src/features/job-search/
  index.ts                     public API — export เฉพาะที่ feature อื่น/เกมต้องใช้ (barrel)
  job-search.types.ts          interface / type ของ feature
  job-search.constants.ts      ค่าคงที่ ตัวเลข ตาราง (ตัวเลขโลกจริงต้องมีแหล่ง — economy.md)
  job-search.service.ts        ตรรกะ pure: คำนวณ ตัดสิน เปลี่ยน state — ห้ามแตะ DOM/canvas
  job-search.service.test.ts   unit test ของ service (อยู่คู่กัน)
  job-search.view.ts           สร้าง HTML/DOM ของหน้าจอ — ห้ามมีตรรกะเกม
  job-search.controller.ts     ผูก: input/คลิก → service → view → เสียง/toast
  job-search.render.ts         (ถ้ามี) วาด canvas/พิกเซลเฉพาะ feature
  job-search.audit.ts          (ถ้ามี) ตรวจ invariant ของ feature คืน string[]
  job-search.css               (ถ้ามี) style เฉพาะ feature — class ขึ้นต้นด้วย prefix ของ feature
  README.md                    (ถ้า feature ซับซ้อน) อธิบายสั้น ๆ: ทำอะไร, state ที่ใช้, กฎ GDD ที่อ้างถึง
```
- ไม่จำเป็นต้องมีทุกไฟล์ — สร้างเฉพาะบทบาทที่มีจริง แต่ **ห้ามรวมบทบาทต่างกันไว้ในไฟล์เดียว** (เช่น ตรรกะ + HTML)
- feature ใหญ่แยกย่อยได้: `features/business/` → `business.service.ts`, `business-upgrade.service.ts`, `business.view.ts` …
- ข้อมูล JSON ขนาดใหญ่ยังอยู่ใน `src/data/` (แชร์กับ test/เครื่องมือ) แล้วให้ `*.constants.ts` หรือ service import มา

## 3. บทบาทของแต่ละไฟล์ (เทียบ Angular / NestJS)
| ไฟล์ | เทียบกับ | ทำได้ | ห้ามทำ |
|---|---|---|---|
| `index.ts` | `@Module({ exports })` | re-export API สาธารณะ, `createXxx(ctx)` | มีตรรกะเอง |
| `*.types.ts` | DTO / interface | type, interface, enum (เป็น union string) | มีโค้ดทำงาน |
| `*.constants.ts` | config / constants | ค่าคงที่, ตาราง, อ้างอิงแหล่ง | อ่าน/เขียน state |
| `*.service.ts` | `@Injectable` service | คำนวณ อ่าน/เขียน state ผ่าน ctx หรือ `core/state` คืนผลลัพธ์ | แตะ `document`, `window`, canvas, `localStorage`, `Math.random` ตรง ๆ |
| `*.view.ts` | component template | รับข้อมูลที่คำนวณแล้ว → คืน HTML string/element, ผูก event ไปที่ callback | ตัดสินใจทางเกม เปลี่ยน state, ใส่ข้อความผู้เล่นโดยไม่ escape |
| `*.controller.ts` | component class / controller | เปิด modal, รับคลิก, เรียก service, เรียก view, เล่นเสียง, toast, save | มีสูตรคำนวณ (ต้องอยู่ใน service) |
| `*.render.ts` | — | วาดด้วย `render/pixel.ts` | ตรรกะเกม |
| `*.audit.ts` | guard / validator | ตรวจ state/ข้อมูล คืน `string[]` | แก้ state |
| `*.test.ts` | `*.spec.ts` | test service/audit (และ view แบบ string ได้) | พึ่งเบราว์เซอร์ |

## 4. การพึ่งพา (Dependency) — แทน DI ของ Angular/NestJS
- feature **ไม่ import จาก `game.ts`** และไม่อ่านตัวแปร global ของ `game.ts`
- ของที่ feature ต้องใช้จากเกม (เช่น `toast`, `openModal`, `closeModal`, `playSfx`, `saveGame`, `updateHud`) ส่งเข้ามาทาง **context object ที่มี type** — นี่คือ "dependency injection" แบบเบา:
```ts
// features/job-search/job-search.types.ts
export interface JobSearchDeps {
  toast(msg: string): void;
  openModal(html: string): void;
  closeModal(): void;
  playSfx(name: string): void;
  rng(): number;              // สุ่มแบบส่งเข้ามา เพื่อให้ test กำหนดผลได้
}

// features/job-search/index.ts
export type { JobSearchDeps } from './job-search.types';
export { createJobSearch } from './job-search.controller';

// game.ts (composition root)
const jobSearch = createJobSearch({ toast, openModal, closeModal, playSfx, rng: Math.random });
// ใช้: jobSearch.open()
```
- state กลางอ่าน/เขียนผ่าน `src/core/state.ts` ได้ (เป็น singleton ร่วม) — แต่ถ้า feature มี state ของตัวเอง ให้เพิ่ม field ใน `state.ts` + default ใน `loadGame()` ตาม [code.md §4](code.md) ไม่เก็บใน `let` ลอย ๆ ใน feature
- **ทิศ import ที่อนุญาต:**
  ```
  game.ts → features/* → (core, sim, content, world, render, audio)
  features/a → features/b/index.ts   (ผ่าน index เท่านั้น ห้าม deep import เช่น features/b/b.service)
  core, sim → (ห้าม import จาก features, ui, render, game.ts)
  ```
- ห้าม circular import ระหว่าง feature — ถ้า a กับ b ต้องใช้กันและกัน ให้ย้ายส่วนร่วมไป `sim/` หรือ `core/`

## 5. การตั้งชื่อ
- โฟลเดอร์: kebab-case ภาษาอังกฤษ ตามชื่อระบบ (`job-search`, `year-review`, `npc-talk`)
- ไฟล์: `<feature>.<role>.ts` (`job-search.service.ts`) — role: `types` `constants` `service` `view` `controller` `render` `audit` `test`
- function: `camelCase` ขึ้นต้นด้วยกริยา (`calcOfferChance`, `renderJobList`, `openJobSearch`)
- type/interface: `PascalCase` (`JobOffer`, `JobSearchDeps`)
- CSS class: ขึ้นต้นด้วย prefix ของ feature (`.job-search__card`, `.job-search__offer`) ไม่ใช้ชื่อกว้าง ๆ ที่ชนกับ feature อื่น
- ข้อความผู้เล่นเป็นภาษาไทย แต่ชื่อในโค้ดเป็นอังกฤษ; comment ภาษาไทยอธิบาย "ทำไม"

## 6. ขนาดและความรับผิดชอบ
- ไฟล์ใน feature ไม่ควรเกิน ~300 บรรทัด; feature ทั้งโฟลเดอร์ไม่ควรเกิน ~1,200 บรรทัด — ใหญ่กว่านั้นให้แยกเป็น sub-feature
- 1 feature = 1 เรื่องที่อธิบายได้ในประโยคเดียว ("ผู้เล่นหางานเมื่อตกงาน")
- ตรรกะที่ 2 feature ขึ้นไปใช้ซ้ำ → ย้ายไป `sim/` (สูตร) หรือ `core/` (เครื่องมือ)

## 7. Test
- unit test อยู่ **คู่กับไฟล์** ใน feature (`*.test.ts`) — Vitest เก็บทั้ง `src/**/*.test.ts` และ `tests/unit/**`
- service ทุกตัวต้องมี test อย่างน้อย: ผลปกติ · กรณีขอบ (เงินไม่พอ อายุไม่ถึง) · ไม่ทำให้ state หลุดกรอบ
- ความสุ่มส่งเข้ามาทาง `deps.rng` เพื่อให้ test กำหนดผลได้
- view ทดสอบได้แบบ string (มีข้อความที่ควรมี และ escape ข้อความผู้เล่นแล้ว)
- หน้าจอใหม่ของ feature → เพิ่ม e2e + ภาพหน้าจอใน `tests/e2e/` ([quality.md §3](quality.md))

## 8. ขั้นตอนสร้าง feature ใหม่
1. อ่าน GDD + กฎหมวดที่เกี่ยวข้อง และทำ research ถ้าอิงโลกจริง
2. สร้าง `src/features/<name>/` พร้อม `index.ts` + `<name>.types.ts` ก่อน (ออกแบบ API และ deps)
3. เขียน `<name>.service.ts` + `<name>.service.test.ts` (ตรรกะก่อนหน้าจอ)
4. เขียน `<name>.view.ts` → `<name>.controller.ts`
5. ผูกใน `game.ts` ด้วย `createXxx(deps)` จุดเดียว
6. state ใหม่ → `core/state.ts` + `loadGame()` default; mechanic ใหม่ → อัปเดต GDD
7. `npm run check` ผ่าน + ดูภาพหน้าจอ

## 9. การแยกของเดิมออกจาก `game.ts`
- เมื่อแก้ระบบใดใน `game.ts` ให้พิจารณาย้ายระบบนั้นทั้งก้อนเป็น feature ตามข้อ 2–4 (ทำทีละระบบ ไม่รื้อพร้อมกันหลายระบบ)
- ลำดับ: ย้ายสูตรไป service ก่อน (มี test) → ย้าย HTML ไป view → เหลือ controller → ลบของเดิมใน `game.ts` → `npm run check`
- ต้องรักษาพฤติกรรมเดิม 100% (เทียบผลก่อน/หลังได้ให้เทียบ เช่น snapshot แบบที่ทำกับแผนที่)
- โฟลเดอร์เดิม `ui/`, `audio/`, `character/`, `gameplay/` ย้ายเข้า `features/` เมื่อมีการแก้ระบบนั้น — ไม่ต้องย้ายเพื่อย้ายอย่างเดียว
- ระบบที่ควรแยกเป็น feature (เรียงตามความคุ้ม): ✅ บิล (`src/features/bills`) · สลิปเงินเดือน/เดินเวลา (`resolveMonth`, `finishMonth`) · การเงิน/หนี้ (`openFinance`, `payDebt`) · หางาน (`openJobSearch`) · ธุรกิจ · ทรัพย์สิน · ประเมินผลปลายปี · ตอนจบ · ย้ายถิ่น · คุยกับ NPC · ความสำเร็จ/milestone · สภาพอากาศ

## 10. Checklist โครงสร้าง
- [ ] งานใหม่อยู่ใน `src/features/<name>/` (หรือ shared layer ที่ถูกต้อง) — ไม่เพิ่มโค้ดใหม่ใน `game.ts` นอกจากการผูก `createXxx(deps)`
- [ ] แยกไฟล์ตามบทบาท: service ไม่แตะ DOM, view ไม่มีตรรกะเกม
- [ ] feature อื่นใช้ผ่าน `index.ts` เท่านั้น ไม่มี circular import
- [ ] ของจากเกมส่งเข้าทาง deps ที่มี type, ความสุ่มผ่าน `deps.rng`
- [ ] มี `*.service.test.ts` คู่กัน
- [ ] ชื่อโฟลเดอร์/ไฟล์/CSS class ตามข้อ 5 และไฟล์ไม่ยาวเกินข้อ 6
