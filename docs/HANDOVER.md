# OpenLife — Handover Brief (สำหรับ Claude)

> เอกสารนี้สรุป "สิ่งที่ต้องการ" + สถานะปัจจุบัน + กติกา เพื่อให้คนใหม่接手ได้ทันที
> Source of truth ด้าน design: `docs/GDD.md` · กติกาพัฒนา: `AGENTS.md`

---

## 1) เป้าหมายโปรเจกต์

เกมจำลองชีวิตคนไทย **ตั้งแต่เกิดจนตาย** แนว pixel-art top-down + narrative life sim
- ภาษาไทยล้วน, แพลตฟอร์มเว็บ (Vite + TypeScript)
- โทน: ดราม่าสมจริง + เสียดสีสังคม + ซาบซึ้งเป็นระยะ
- ผู้เล่นอินกับตัวละครได้ แต่ไม่ยืดเยื้อจนเบื่อ (1 ชีวิต ≈ 4–6 ชม.)
- ภาพอ้างอิงสไตล์: The Lands (pixel map + HUD) แต่ต้อง **ไม่ลอกจนเกินไป**

---

## 2) สถานะปัจจุบัน (ทำแล้ว — อย่าทำซ้ำ)

### แกนเกม
- ชีวิต 10 บท (0 → ตาย), 307 events, 8 ตอนจบ, save/load v3
- เศรษฐกิจ/หนี้/เครดิต/ภาษี/ประกันสังคม, สายอาชีพ 4 track, ประเมินผล/เลื่อนขั้น
- ครอบครัว (ลูก/พ่อแม่/มรดก), ความฝัน 6 แบบ, ภูมิหลัง 4 แบบ
- 8 เขตกรุงเทพฯ + แผนที่เฉพาะเขต, ระบบย้ายถิ่น/สถานีขนส่ง
- แต่งตัวละคร (32×32), กระจก/ร้านตัดผม/ร้านเสื้อผ้า
- เวลาแบบ hybrid: เดินเองด้วย `N` (+1/+3/+6/+12 เดือน), กิจกรรม 3–9 ครั้ง/ช่วง

### UI/UX รอบล่าสุด
- HUD กระชับ: การ์ดตัวละคร + 8 สถานะ (4×2) + ข่าวย้ายไปแถบล่าง
- Toast ใหญ่ชัดขึ้น, ป้าย hotspot (DOM chip) จางเมื่อไกล/สว่างเมื่อใกล้
- ซูมต่อเนื่อง (ล้อเมาส์/pinch): แผนที่ 2–4.5x, ถนน 3–8x, ภายใน 3–7x
- แตะหลังคาอาคาร = เดินไปประตู + เข้าอัตโนมัติ, มีเส้นจุดนำทาง
- WASD/E ใช้ได้บนเดสก์ท็อป, มีแถบคำสั่งล่างซ้าย (ซ่อนบนมือถือ)
- หน้าตัวละครบนแผนที่สะท้อน แว่น/หมวก/ทรงผม/สีเสื้อ

### แผนที่/NPC/ภายใน
- **สุ่มตำแหน่งอาคารต่อเขต** (seeded) + **แลนด์มาร์คประจำเขตตำแหน่งตายตัว**
- บังคับบ้านกับออฟฟิศอยู่คนละฝั่ง
- **ตัดขั้นเลือกย่านออก** — สร้างตัวเลือกแค่ จังหวัด → เขต (ย่านเก็บเป็นค่าเบื้องหลัง)
- **เข้าได้ทุกอาคาร** ผ่าน scene `shop` (ภายใน通用ตามประเภท: ร้านสะดวกซื้อ/ตลาด/ยิม/โรงพยาบาล/ร้านเสื้อผ้า/บาร์/ศาลเจ้า/แลนด์มาร์ค)
- **NPC 9 ชนิด** (พ่อค้า/ตำรวจ/หมอ/พระ/ทนาย/หมาจร/แมวจร/หมูป่า) เดินเอง พักกลางคืน คุยได้ เพิ่มความสนิท (`life.npcRel`) — หมูป่าทำร้ายได้
- วัยเด็กมี **ภาพประกอบฉาก** ตามบท + แถบความคืบหน้า
- แยกชื่อ-นามสกุลเป็น 2 ช่อง, แก้กรอบแว่นให้พอดีหน้า
- Refactor state กลางเป็น `src/core/state.ts` (types + default)

### Quality gates ที่ผ่านล่าสุด (รัน `npm run check` ครบ)
- `typecheck` ✅ · **unit 542 tests / 9 ไฟล์** ✅ · `build` ✅ · **e2e 45 passed (4 ขนาดจอ)** ✅
- audit ทุกตัว = `[]` / 0 · console ไม่มี error
- ภาพตรวจด้วยตา: `test-results/screens/<project>/*.png`

### โครงสร้างปัจจุบัน (refactor แล้ว)
`src/core` (state/save/date/util/picker) · `src/sim` (time/economy/family) · `src/content` (events/pools/audit) · `src/world` (geo/districts/maps/map-audit) · `src/render` (pixel/palette/city-*) · `src/character` · `src/gameplay` · `src/ui` · `src/audio`
`src/features/` — **bills** (บิลที่อยู่) · **assets** (ทรัพย์สิน/ไลฟ์สไตล์) · **business** (ธุรกิจ) · **job-search** (หางาน) — ทุกตัวมี service/view/controller/types + unit test
`game.ts` ยังใหญ่ + `@ts-nocheck` (ทยอยแยกต่อ)

---

## 3) สิ่งที่ต้องการให้ทำต่อ (เรียงตามลำดับความสำคัญ)

### P0 — บั๊ก/ความถูกต้อง (เหลือน้อย)
1. **B-002 เงินปลายเกมสูง** — ลดแล้ว 26% ด้วย progressive lifestyle (ดู `docs/BALANCE.md`) · เหลือตัดสินใจว่าจะเพิ่ม sink หรือ nerf รายได้ (ควรวัดนโยบาย "ผู้เล่นทั่วไป" ที่มีบ้าน/รถ/ครอบครัวก่อน)
2. **B-003 event ซ้ำ** — เป็นข้อจำกัด *จำนวนเนื้อหา* ไม่ใช่ picker (ขยาย pool = งานเขียน event; ต้องมี research)
3. **art 16px → 32px** — **เฟส 1 ✅** (dual buffer + scale module; ภาพยังเป็น 16px ขยาย ×2) · เหลือเฟส 2–5: สไปรต์/อาร์ต 32px จริง (ดู `docs/rules/art.md §1`)

### P1 — UX ที่ยังไม่ดี
4. **HUD ยังแน่นไปบนจอเล็ก** — ย้ายรายละเอียดไปหน้ากดดู (ซ่อน HUD ตอนเปิด modal แล้ว)
5. **การแตะนำทาง**: hit area, path smoothing, การหยุดที่ประตู, marker
6. **วัยเด็กยังน่าเบื่อ**: มีภาพประกอบฉากแล้ว — อยากได้มินิเกมสั้น/จังหวะเล่าเรื่อง

### P2 — เนื้อหา/โลก
7. **ภายในอาคารให้ต่างกันจริง**: ตอนนี้ใช้โครงห้องร่วม — อยากให้แต่ละประเภทยูนีค (ร้านของชำ/ตลาด/ยิม/คลินิก/ศาลเจ้า)
8. **NPC ให้ลึกขึ้น**: ตารางชีวิต (เช้าไปตลาด/เย็นกลับบ้าน), บทสนทนาหลากหลาย, หน้ารวมความสัมพันธ์, ผลระยะยาว
9. **แผนที่ยังเป็นบล็อกกริด**: อยากได้ผังที่หลากหลายขึ้น (ซอยแคบ, ลาน, ทางโค้ง, สวนแทรก) โดยไม่พัง A*/collision
10. **อัตลักษณ์เขตตามโลกจริง**: แต่ละเขตควรมีแลนด์มาร์ค/กิจกรรม/อาหาร/ปัญหาเฉพาะ → **ต้องทำ research card ก่อน** (ดู §4)
11. **ความหนาแน่นของโลก**: ป้ายร้าน, พร็อพ, คนเดิน, แสงกลางคืน — เพิ่มแต่ไม่ให้รก

### P3 — โครงสร้าง
12. แตก `src/game.ts` เป็น feature module ต่อ — แยกแล้ว **bills · assets · business · job-search**; เป้าถัดไป: finance/debts, quick-actions, home-upgrade, NPC/ความสัมพันธ์
13. ปรับ balance ต่อ (crime ending / promotion / เงินปลายเกม) + อัปเดต `docs/GDD.md` ทุกครั้งที่เปลี่ยน mechanic

---

## 4) กติกาบังคับ (จาก AGENTS.md)

- **RESEARCH FIRST**: ก่อนเพิ่มเนื้อหาเขต/วัฒนธรรม/ราคา/ชื่อ ต้องมี `docs/research/*.md` ≥2 แหล่ง (มีแหล่งทางการ/วิชาการอย่างน้อย 1) + ระบุส่วนที่แต่งเพิ่ม
- **Narrative consistency**: event พ่อแม่/ลูก/คู่รัก/งาน ต้องมี `cond` ตรวจสถานะจริง
- **State ใหม่**: เพิ่มใน type ที่ `src/core/state.ts` + default ใน `loadGame()`
- **Pixel art**: มาตรฐานใหม่ **32px/tile** (`ART`) — ปัจจุบันยัง 16px ระหว่างย้ายเป็นเฟส (ดู `docs/rules/art.md`) · `W2A = TILE/ART` · ห้าม text ในโลกเกม · ห้าม fractional art px
- **โซน object**: ต้นไม้เฉพาะ grass/park, รถเข็นห้ามบนถนน, อาคารห้ามทับถนน/ทางเท้า/กันเอง
- **ห้าม refactor ใหญ่โดยไม่จำเป็น** — แก้แบบ surgical, คงรูปแบบ function declaration/comment ไทย

---

## 5) Acceptance criteria ก่อนส่งงาน

```bash
npm run check     # typecheck → unit → build → e2e (4 ขนาดจอ)
```
+ ตรวจภาพจริง: `test-results/screens/` (menu, creation, city day/night, office, home night, บางขุนเทียน day/night, bills, ทุกแผนที่จังหวัด)
+ console ต้องไม่มี error และ audit ทั้ง 7 ตัว = `[]`

ในเกม (console):
```js
__layoutAudit()            // []
__ol.districtAudit()       // []
__ol.dataAudit().issues    // []
__ol.narrativeAudit()      // []
__ol.invariantAudit()      // []
__ol.geoAudit()            // []
__ol.appearanceAudit()     // []
```

Debug hooks ที่มี: `__ol.tp(x,y)`, `__ol.tick(dt)`, `__ol.doAction()`, `__ol.mapSpec()`, `__ol.npcs()`, `?new=1`, `?adult=1`, `?scene=office`, `?province=&khet=`, `?notour=1`

---

## 6) ไฟล์สำคัญ

| ไฟล์ | หน้าที่ |
|---|---|
| `docs/GDD.md` | design source of truth (อัปเดตทุกครั้งที่เปลี่ยน mechanic) |
| `AGENTS.md` | กติกาพัฒนา + narrative consistency + โซน object |
| `src/core/state.ts` | state กลาง + types + default |
| `src/game.ts` | เอนจินหลัก (รอแตกโมดูล) |
| `src/world/city-maps.ts` | generator แผนที่ต่อจังหวัด/เขต (seeded + landmark) |
| `src/world/district-maps.ts` | แผนที่เฉพาะเขต + districtZone |
| `src/gameplay/actions.ts` | เข้าฉาก/กิจกรรม/งาน |
| `src/content/events.ts`, `src/content/event-pools.ts`, `src/data/*.json` | ระบบ event |
| `src/character/appearance.ts` | ตัวละคร 32×32 |
| `src/core/save.ts` | save/load v3 |
| `src/ui/menu.ts` | หน้าเมนูหลัก |

---

## 7) โน้ตถึง Claude

- ผู้ใช้เล่นจริงบน `http://127.0.0.1:5173` — ระวังการแก้ที่ทำให้ HMR รีเซฟบ่อย
- งานรอบก่อนหน้าเน้น UX/แผนที่/NPC — อย่ารื้อระบบเดิน/collision/hotspot เดิมถ้าไม่จำเป็น
- ถ้าเพิ่ม field state ใหม่ ต้องอัปเดต `src/core/state.ts` + `loadGame()` + GDD
- งานที่มีความเสี่ยงสูง (แผนที่/AI NPC) ให้ทำทีละส่วนแล้วรัน audit ทุกครั้ง
