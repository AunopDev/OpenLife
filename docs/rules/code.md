# กฎโค้ด (Code, Data, Save, Debug)

## 1. Stack และข้อห้าม
- **Vite + TypeScript + Canvas 2D + DOM** ที่ root · รัน `npm run dev` (127.0.0.1:5173) / `npm run build`
- **ห้ามเพิ่ม library / framework / backend โดยไม่ตกลงกับเจ้าของก่อน** (game engine, UI framework ฯลฯ)
- dev tools ที่อนุมัติแล้ว: **Vitest** (unit test) และ **Playwright** (e2e) — ไม่ถูก bundle ในเกม ([quality.md](quality.md))
- เป้า browser: Chrome/Safari/Firefox มือถือและเดสก์ท็อปรุ่นปัจจุบัน (ES2020)
- `prototype/` = legacy ห้ามแก้ · `dist/` = ผล build

## 2. โครงโฟลเดอร์
```
AGENTS.md                    กฎหลัก (อ่านก่อน) · CLAUDE.md ชี้มาที่นี่
README.md                    แนะนำโปรเจ็ค + คำสั่ง
index.html · package.json · tsconfig.json · vite.config.ts · vitest.config.ts · playwright.config.ts

docs/
  GDD.md                     แหล่งความจริงด้าน design + ภาคผนวกระบบที่ลงแล้ว
  BALANCE.md                 รายงาน balance
  BUGS.md                    บั๊กที่รู้แล้ว / แก้แล้ว
  HANDOVER.md                สรุปสถานะสำหรับคนรับงานต่อ (ถ้าขัดกับ AGENTS/rules ให้ยึด AGENTS/rules)
  CREDITS.md                 เครดิต asset (สร้างเมื่อมี asset ที่ต้องให้เครดิต)
  rules/                     กฎรายหมวด
  research/                  research cards (+ บรรทัด `geo:`)
  refs/                      ภาพ/เสียงอ้างอิงจริง + SOURCES.md (ไม่อยู่ในเกม)

src/
  main.ts                    entry (import CSS + game)
  game.ts                    เกมหลัก — ไฟล์ใหญ่ @ts-nocheck กำลังทยอยแยก (UI modal, input, ฉาก, render เก่า)
  style.css
  core/                      แกนกลาง ไม่แตะ DOM
    state.ts                 state กลาง + types
    save.ts                  save/load v3
    date.ts · util.ts        ปฏิทิน / clamp, fmt
    picker.ts                cross-run event memory
  sim/                       ตรรกะจำลอง pure (ไม่แตะ DOM — unit test ได้)
    time.ts                  อายุ ช่วงเวลา turn key
    economy.ts               ค่าใช้จ่าย ภาษี ประกันสังคม หนี้ รายได้
    family.ts                ลูก พ่อแม่
  content/                   ระบบเนื้อหา
    events.ts                compiler JSON events (requires/fx/ops/random)
    event-pools.ts           loader event pools + matchRequires
    audit.ts                 data/narrative/invariant audits
  world/                     ภูมิศาสตร์และแผนที่
    geo.ts                   จังหวัด → เขต/อำเภอ → ย่าน + types ค่าตั้งแผนที่ + geoAudit
    districts.ts             โซนเขตในกรุงเทพฯ (แผนที่เก่า)
    district-maps.ts         DistrictSpec + districtZone + แผนที่เฉพาะเขต (บางขุนเทียน)
    city-maps.ts             generator แผนที่เมือง (seeded, อ่านค่าตั้งจาก geo.json)
    map-audit.ts             audit แผนที่แบบ pure + PROP_ZONES
    world-data.ts            ข้อมูลแผนที่เมืองเก่า 40×28
  features/                  ★ ระบบเกมแต่ละอย่าง 1 โฟลเดอร์ = 1 feature (architecture.md)
    bills/                   บิลที่อยู่ — ตัวอย่างอ้างอิงของ feature module
  render/                    วาดภาพแบบ typed (pixel, night, palette, city-map-art, city-buildings, city-props)
  character/                 appearance.ts (ตัวละคร) · appearance-editor.ts (หน้าแต่งตัว)
  gameplay/                  actions.ts (เข้าฉาก กิจกรรม งาน)
  ui/                        menu.ts (เมนูหลัก)
  audio/                     audio.ts (SFX + เพลง procedural)
  data/*.json                ข้อมูลเกม (geo, events, chapters, ...)
  assets/                    sprite PNG + JSON, เสียง MP3, manifest.ts (สร้างเมื่อมีไฟล์แรก)

tests/
  unit/                      Vitest — maps, geo-config, events, economy, save, content
  e2e/                       Playwright — เปิดเกมจริง + ภาพหน้าจอ (test-results/screens/)
  saves/                     ไฟล์เซฟตัวอย่างรุ่นเก่า (ห้ามแก้ เพิ่มได้อย่างเดียว)

assets-src/                  ต้นฉบับ sprite/เสียง/palette (ไม่ถูก bundle) — ดู assets.md
design/mockup/               UI mockup (vector)
scripts/balance-sim.js       driver จำลอง balance (รันใน DevTools)
prototype/                   legacy ห้ามแก้
```

### กฎการวางไฟล์
- **ระบบใหม่ทุกระบบเป็น feature module** ใน `src/features/<name>/` ตาม [architecture.md](architecture.md)
- ไฟล์ใหม่ต้องอยู่ในโฟลเดอร์ตามหน้าที่ด้านบน — **ห้ามเพิ่มไฟล์ .ts ที่ระดับบนสุดของ `src/`** (ยกเว้น `main.ts`, `game.ts`)
- ตรรกะที่ไม่แตะ DOM → `core/` หรือ `sim/`; ตรรกะที่ต้องแตะ DOM → `ui/` หรือ `gameplay/`
- import ข้ามโฟลเดอร์ได้ตามทิศ: `ui/gameplay/render → world/content/sim → core` (ห้าม `core`/`sim` import จาก `ui`/`render`/`game.ts`)
- แยกโค้ดจาก `game.ts` ทีละกลุ่มที่พึ่งเฉพาะ state กลาง + ส่วนที่แยกแล้ว แล้วรัน `npm run check` ทุกครั้ง
- ไฟล์หนึ่งไม่ควรเกิน ~800 บรรทัด (ยกเว้น `game.ts` ระหว่างแยก) — ยาวกว่านั้นให้แยกตามหน้าที่

## 3. TypeScript และการแยกโมดูล
- โมดูลใหม่ทั้งหมดต้อง **ตรวจ type ได้** (ห้ามใส่ `// @ts-nocheck`) และหลีกเลี่ยง `any` — ถ้าจำเป็นให้ comment เหตุผล
- `game.ts` ยังเป็น `@ts-nocheck`: เวลาแตะส่วนไหน ให้พิจารณาย้ายส่วนนั้นออกเป็นโมดูลที่มี type (ทีละส่วน ไม่รื้อทั้งไฟล์)
- ลำดับการแยกที่แนะนำ: render (กำลังทำ) → การเงิน/เวลา (✅ `src/sim/`) → การเดินเวลา/สลิป (resolveMonth) → UI modal → input
- โค้ดจำลอง (เงิน เวลา event) **ห้ามแตะ DOM** — เพื่อให้รันทดสอบใน Node ได้ในอนาคต
- state ใช้ object จาก `src/core/state.ts` (const — แก้ค่าได้ ห้าม reassign)
- รูปแบบโค้ด: function declaration, `const`/`let`, comment ภาษาไทยสั้น ๆ อธิบาย "ทำไม", แก้แบบ surgical
- ห้าม refactor ใหญ่ที่ไม่ได้ขอ

## 4. State และเซฟ
- key: `openlife.save.v3` (localStorage) · auto-save ตอนจบเทิร์น/จบบท/`pagehide`
- **field ใหม่ใน state:**
  1. เพิ่ม type ใน `src/core/state.ts`
  2. ค่าเริ่มต้นใน object ของ state
  3. ค่า default ใน `loadGame()` (`src/core/save.ts`) เมื่อเซฟเก่าไม่มี
  4. ถ้ามีขอบเขต → เพิ่มใน `invariantAudit()`
  5. อัปเดต GDD
- ค่าชั่วคราวที่ไม่ควรข้ามเซฟ (เช่น `plannedMonths`) ต้อง reset ใน `loadGame()`
- **เปลี่ยนโครงเซฟแบบเข้ากันไม่ได้:** bump version + เขียน migration จากเวอร์ชันเก่า — ห้ามทิ้งเซฟผู้เล่นเงียบ ๆ (ถามเจ้าของก่อน)
- localStorage ทุกจุดต้องอยู่ใน try/catch และเกมต้องเล่นได้แม้ storage ใช้ไม่ได้
- ห้ามเก็บข้อมูลส่วนตัวจริงของผู้เล่น

## 5. ข้อมูลและ RNG
- ข้อมูลเกม (บท ภูมิหลัง ความฝัน จังหวัด อาชีพ การเงิน หนี้ events) อยู่ใน `src/data/*.json`
- event ใหม่เป็น JSON + `ops` เท่านั้น (ดู [event-flow.md](event-flow.md))
- **งานภาพ/แผนที่ใช้ seeded RNG เท่านั้น** (`rng()`/`hashStr()` ใน `src/render/pixel.ts` หรือของ `src/world/city-maps.ts`)
- **[อนาคต]** ใช้ seeded RNG กลางกับ gameplay ด้วย และเก็บ seed ในเซฟ เพื่อย้อนบั๊กได้ — โค้ดใหม่ควรรับ RNG เป็นพารามิเตอร์แทนเรียก `Math.random` ตรง
- ข้อความจากผู้เล่น (ชื่อ ฯลฯ) ห้ามใส่ `innerHTML` ตรง ๆ — escape หรือใช้ `textContent`

## 6. ประสิทธิภาพ
- static layer วาดครั้งเดียว; วาดทุกเฟรมเฉพาะของที่ขยับ และเฉพาะที่อยู่ในกล้อง
- หยุด render เมื่อ paused (หลังเฟรมแรก) และเมื่อแท็บถูกซ่อน; จำกัด ~60fps
- `updateHud()` throttle ≤ ทุก 200ms
- bundle: ระวังขนาด (ตอนนี้ ~507 kB / gzip ~134 kB) — ข้อมูลใหญ่พิจารณา lazy load **[อนาคต]**

## 7. Audit และการตรวจ (ทุกข้อต้องได้ `[]`)
| คำสั่ง (console) | ตรวจ |
|---|---|
| `__layoutAudit()` | โซน object ของแผนที่เมืองเก่า |
| `__districtAudit()` | โซน/น้ำ/hotspot/spawn ของแผนที่ spec ที่โหลดอยู่ |
| `__ol.dataAudit().issues` | โครง event/choice/fx/cond |
| `__ol.narrativeAudit()` | cond ของ event พ่อแม่/ลูก/คู่รัก |
| `__ol.invariantAudit()` | stat/เงิน/หนี้/อายุ/ครอบครัวไม่หลุดกรอบ |
| `__ol.geoAudit()` | id ไม่ซ้ำ, zone ของย่าน, ครบทุกจังหวัด |
| `__ol.appearanceAudit()` | ค่าตัวละครถูกต้อง |
- และ `__ol.life.phase` ถูกต้อง, console ไม่มี error, `npx tsc --noEmit` + `npm run build` ผ่าน
- ระบบใหม่ที่มีกฎ invariant → เพิ่ม audit ของตัวเอง

## 8. Debug hooks
| Hook | ใช้ทำอะไร |
|---|---|
| `window.__ol` | state + `tp`, `setScene`, `tick`, `doAction`, `endTurn`, `forceEvent`, `openFinance`, `job`, `zoom`, `enterMap`, `enterDistrict`, `leaveDistrict`, `mirror`, `salon`, `clothingShop`, `simAdult` ฯลฯ |
| `?new=1` | ล้างเซฟ เริ่มใหม่ |
| `?adult=1` | เริ่มที่อายุ 22 |
| `?notour=1` | ข้ามทัวร์สอน |
| `?skipmenu=1` | ข้ามเมนูหลัก |
| `?scene=office&x=9&y=9&t=1260` | เปิดฉาก/ตำแหน่ง/เวลา (t = นาทีของวัน) |
| `?view=street` | มุมมองถนน |
| `?modal=finance\|bed\|time\|help\|assets\|month\|payslip` | เปิด modal |
| `?district=bangkhunthian` | เข้าแผนที่เฉพาะเขตตอนบูต |
| `?province=&khet=&hood=` | เข้าแผนที่เมืองของพื้นที่ตอนบูต (ใช้กับ `?adult=1`) |
- debug hooks (`window.__ol`, `__layoutAudit` ฯลฯ) **เปิดเฉพาะ `npm run dev` หรือ URL ที่มี `?debug=1`** — production build ไม่มี (e2e ใส่ `debug=1` ให้อัตโนมัติ); โค้ดเกมห้ามพึ่ง hooks เหล่านี้ตอนทำงานจริง
- ทดสอบเสร็จแล้วล้างเซฟทดสอบใน localStorage ของเบราว์เซอร์ที่ใช้ทดสอบ
