# OpenLife — กฎการพัฒนา (Development Rules)

> ไฟล์นี้เป็นกฎกลางของโปรเจ็ค อ่านก่อนแก้โค้ดทุกครั้ง
> เป้าหมาย: รักษาคุณภาพพิกเซลอาร์ต และป้องกัน object วางผิดโซน/ทับสิ่งก่อสร้าง

---

## 0. RESEARCH FIRST — บังคับทุกงาน

> กฎนี้ใช้กับ **ทุกงาน** ไม่ใช่แค่การสร้างแผนที่: event, เนื้อหา, ชื่อ, วัฒนธรรม, เศรษฐกิจ, ราคา, อาชีพ, UI copy, art, audio, mechanic

### 0.1 ต้องรีเสิร์ชก่อนลงมือ
ก่อน implement ต้องตอบให้ได้ว่า:
- สิ่งนี้มีอยู่จริง/เกิดขึ้นจริงแบบไหน ในจังหวัด/เขต/ช่วงเวลานั้น
- ใครได้ประโยชน์/ใครเสียประโยชน์ และมีรายละเอียดอะไรที่คนท้องถิ่นจะจับได้ถ้าทำผิด
- ตัวเลข/ราคา/ระยะทาง/ชื่อสถานที่ อ้างอิงจากไหน
- อะไรคือ “แก่น” ที่ต้องเก็บ และอะไรคือ “รายละเอียดสมมติ” ที่เกมแต่งเพิ่ม

### 0.2 มาตรฐานแหล่งข้อมูล
- อย่างน้อย **2 แหล่งต่อเขต/จังหวัด** และควรมีอย่างน้อย 1 แหล่งทางการ/วิชาการ
- ลำดับความน่าเชื่อถือ: หน่วยงานราชการ/งานวิชาการ > หนังสือ/รายงาน > สื่อคุณภาพ > Wikipedia (ใช้เป็นจุดเริ่มแล้วไปต่อแหล่งอ้างอิง)
- บันทึก **URL + วันที่เข้าถึง + ข้อเท็จจริง + ข้อสงสัย** ไว้ใน research card
- ห้ามนำข้อสันนิษฐาน/ความเชื่อส่วนตัวมาแต่งเป็นข้อเท็จจริง

### 0.3 Research card
สร้าง/อัปเดตไฟล์ใน `docs/research/` เช่น `bangkok-bang-khun-thian.md`
โครงขั้นต่ำ:
1. คำถามที่ต้องตอบ
2. ข้อเท็จจริงหลัก (พร้อมอ้างอิง)
3. ภูมิศาสตร์/แผนที่ (น้ำ ถนน คลอง เขตติดต่อ)
4. เศรษฐกิจ/อาชีพ/ราคา
5. วัฒนธรรม อาหาร ผู้คน ภาษา
6. ปัญหา/ความอ่อนไหว
7. ไอเดียสำหรับเกม (map spec, activity, event, palette)
8. สิ่งที่แต่งเพิ่ม/ fictionalized
9. แหล่งอ้างอิง

ถ้าข้อมูลยังไม่พอ ให้ใส่ `TODO(research)` และ **ห้ามแต่งเป็น fact**

### 0.4 Checklist ก่อนส่งงาน
- [ ] research card ของพื้นที่/หัวข้อนั้นอัปเดตแล้ว
- [ ] ชื่อสถานที่/วัฒนธรรม/ตัวเลข มีแหล่งอ้างอิง
- [ ] ไม่ใช้ stereotype และไม่ลดทอนเขตนั้นเหลือภาพจำเดียว
- [ ] ระบุชัดว่าส่วนไหนสมมติ
- [ ] audit ทั้งหมดผ่าน

---

## 1. โครงสร้างโปรเจ็ค

```
OpenLife/
  AGENTS.md                # กฎการพัฒนา (ไฟล์นี้)
  docs/GDD.md              # แหล่งความจริงด้าน design
  docs/research/           # research cards ของจังหวัด/เขต/ระบบ (บังคับก่อนทำ)
  design/mockup/           # UI mockup (vector — ยังไม่ใช่ pixel art)
  index.html               # entry ของแอป Vite
  package.json             # Vite + TypeScript
  vite.config.ts
  tsconfig.json
  src/
    main.ts                # import CSS + เกม
    game.ts                # เกมหลัก (ระหว่างทยอยแยกเป็นโมดูล)
    audio.ts               # SFX + procedural music + mute
    events.ts              # compiler ของ JSON events (requires/fx/ops/random)
    event-pools.ts         # loader จาก data/event-pools.json + arc/random/variant events
    districts.ts           # เขต/ย่าน + districtAt/districtStyle
    geo.ts                 # ลำดับชั้น จังหวัด → เขต/อำเภอ → ย่าน + geoAudit
    district-maps.ts       # mapSpec ของแผนที่เฉพาะเขต + districtZone
    city-maps.ts           # generator แผนที่เมืองต่อจังหวัด/เขต (seeded, ไม่ใช้ผังกลาง)
    audit.ts               # data/narrative/invariant audits
    save.ts                # save/load v3
    actions.ts             # scene entry + daily activities + work
    menu.ts                # หน้าเมนูหลัก + พื้นหลัง pixel parallax เคลื่อนไหว
    appearance.ts          # ตัวละคร 32×32: ผิว/หน้า/ผม/ตา/จมูก/ปาก/เสื้อผ้า + audit
    appearance-editor.ts   # UI แต่งตัวใช้ร่วม: สร้างตัวละคร / กระจก / ร้านตัดผม / ร้านเสื้อผ้า
    picker.ts              # cross-run event memory
    util.ts                # clamp/fmt/rnd
    date.ts                # ปฏิทิน/WEEK/MONTHS
    world-data.ts          # BUILDINGS/TREES/HOUSES ฯลฯ
    style.css
    data/                  # JSON: chapters/backgrounds/dreams/provinces/career/finance/debts/events/event-pools
  prototype/               # legacy vanilla JS (เก็บไว้อ้างอิง/ย้อนกลับ)
    index.html
    style.css
    game.js
```

- **GDD คือแหล่งความจริงด้าน design** — แก้ mechanic/ตัวเลข ต้องอัปเดต GDD ด้วย
- **แอปหลักคือ Vite + TypeScript ที่ root** — รัน `npm run dev` (port 5173) / `npm run build`
- `prototype/` เป็น legacy เท่านั้น — อย่าแก้ต่อ ยกเว้นย้อนกลับฉุกเฉิน
- ห้ามเพิ่ม library/framework โดยไม่ตกลงก่อน

---

## 2. กฎพิกเซลอาร์ต (Rendering)

รายละเอียด implementation อยู่ใน `src/game.ts` หัวข้อ `PIXEL-ART RENDER`

- **Tile อาร์ต = 16px** — world px ต่อ art px คงที่ `W2A = TILE / ART = 4`
  - แปลงเป็น art: `art = world / 4`, หรือ `tile * 16`
  - **ห้ามใช้ `PIX` แปลงพิกัด** — `PIX` ใช้เฉพาะขยายผลลัพธ์ขึ้นจอ
- มี 2 ระดับซูม:
  - `MAP_PIX = 2` → **แผนที่เมืองเต็มจอ** (ค่าเริ่มต้น) เห็นทั้ง 40×28 tiles
  - `STREET_PIX = 5` → มุมมองถนนในเมือง (กด `M` สลับในเมือง) · `INTERIOR_PIX = 4` สำหรับภายในอาคาร
  - `PIX` เป็นตัวแปร (`let`) และ buffer ถูก resize ผ่าน `setPixelScale()`
- **ค่าเริ่มต้นคือ map view** — ภาพแบบ top-down แบน (flat roofs) ไม่มี facade
  - `cityMapStatic` = เลเยอร์แผนที่ (flat)
  - `cityStatic` = เลเยอร์ถนน (มี facade/รายละเอียด)
  - ภายในอาคารใช้ `INTERIOR_PIX` (4) เสมอ
- **ป้ายชื่อเขต/สถานที่** เป็น DOM overlay (`#mapLabels`, `.map-label`)
  - ข้อความคมไม่ pixelated, ห้ามวาด text ลงในโลกเกม
  - ตำแหน่งป้ายคำนวณจาก art px × `PIX` ลบ offset ของแผนที่
- **ห้ามวาดที่พิกัด fractional ของ art px** — ใช้ `px()` หรือ `Math.round()` ทุกครั้ง
- เรนเดอร์ลง buffer ตามระดับซูม (map 720×450 / street 288×180 @5x / interior 360×225 @4x) แล้วขยายด้วย **nearest-neighbour**
  - ห้ามเปิด `imageSmoothingEnabled`
  - canvas หลักต้องมี `image-rendering: pixelated`
- รถ top-down 4 ทิศ: แนวนอน 30×12 art px, แนวตั้ง 12×30 art px (ใหญ่กว่าตัวละคร ~1.5 เท่า)
- รถแนวตั้งเห็นหน้า/หลังชัด พร้อมไฟหน้า/ท้าย, กระจก, ล้อ, กระจกมองข้าง (ไม่ใช่ Side profile หัวทิ่ม)
- ตัวละครมี arm swing + bob; กล้องตามผู้เล่นแบบ smooth lerp และ snap เมื่อเปลี่ยนฉาก
- รถกับคนบนถนน: ถ้าขวางทางรถจะเบรก+ตะโกน (toast) หรือเฉี่ยว (health −4/ใจ −3) — **screen shake เฉพาะตอนเฉี่ยว** เดินปกติไม่สั่น; มี cooldown กัน trigger รัว
- ฉากนิ่ง (พื้น/ถนน/อาคาร/ต้นไม้/props) ให้วาดครั้งเดียวใน **static layer**
  - `buildCityArt(flat)` — `flat = true` สำหรับแผนที่, `false` สำหรับถนน
  - `buildOfficeArt()`, `buildHomeArt()`
  - วาดทุกเฟรมเฉพาะของที่ขยับ: รถ, คนเดิน, ผู้เล่น, แสง, เอฟเฟกต์
- **ห้ามใช้ text ในโลกเกม** — ป้ายร้านใช้ไอคอน + แท่ง lettering
  - ยกเว้นป้ายชื่อเขต/สถานที่ ซึ่งเป็น DOM overlay (`#mapLabels`) เพื่อความคม
  - ข้อความจริงทั้งหมดอยู่ใน HUD (DOM)
- ใช้ palette กลาง `P` และ helper `px()` / `ditherRect()` / `shadowBlob()`
- Gradient อนุญาตเฉพาะที่วาดใน art resolution (จะถูก pixelate เอง)
- **Yaowarat night-market detail:** `YAOWARAT_STALLS/TABLES/LOCALS/NEON/CLUTTER` ใน `game.ts`
  - ต้องเพิ่มตำแหน่งลง `auditLayout()` (โซน sidewalk) เมื่อเพิ่ม/ย้าย prop
  - แสงกลางคืนแบบ additive วาดใน `drawLighting()` **หลัง** tint เพื่อให้รายละเอียดไม่จมความมืด
  - `drawYaowaratDynamic()` ถูกเรียกเฉพาะเมื่อกล้องเห็นเขต (guard ด้วย `yaowaratInView`) เพื่อประสิทธิภาพ
- **แคชเบราว์เซอร์:** Vite ทำ HMR ให้แล้ว — ไม่ต้อง bump query string
  - ถ้าแก้ข้อมูล JSON ให้รีโหลดหน้า/รีสตาร์ท dev server ตามจำเป็น

---

## 3. กฎโซนและการวาง Object (สำคัญที่สุด)

แผนที่มีขนาด **40 × 28 tiles** ตำแหน่งฐาน (base) ของ object เป็นตัวกำหนดโซน

### 3.1 โซนถนน/ทางเท้า

| โซน | ตำแหน่ง |
|---|---|
| ถนนแนวนอน | แถว 8–9, 20–21 |
| ถนนแนวตั้ง | คอลัมน์ 12–13, 30–31 |
| ทางเท้าแนวนอน | แถว 7, 10, 19, 22 |
| ทางเท้าแนวตั้ง | คอลัมน์ 11, 14, 29, 32 |
| สระน้ำ | x 6–7, y 24–25 |
| สวนสาธารณะ | x 3–9, y 23–26 |

> ทางเท้าตัดกับถนนที่ทางแยก — ให้ถือว่า tile นั้นเป็น **ถนน** ก่อน
> ตัวช่วยตัดสินโซน: `tileZone(tx, ty)` ใน `game.js`

### 3.2 ตารางอนุญาตให้วาง

| Object | โซนที่อนุญาต |
|---|---|
| ต้นไม้, พุ่มไม้ | `grass`, `park` เท่านั้น |
| รถเข็น/แผงลอย (vendor) | `sidewalk`, `park`, `grass` — **ห้ามบนถนน** |
| สกู๊ตเตอร์, จักรยาน, ม้านั่ง, ถังขยะ, หัวดับเพลิง, ป้ายรถเมล์, ขยะ, ถุงขยะ, เสาไฟ | `sidewalk` (ม้านั่ง/ถังขยะในสวนได้) |
| นกพิราบ | `sidewalk`, `park`, `grass` |
| ฝาท่อ, ท่อระบายน้ำ, แอ่งน้ำ | `road` เท่านั้น |
| ตู้ขายของ, กระถางต้นไม้, ตู้ไปรษณีย์ | `grass` (หรือ `sidewalk` เฉพาะที่ระบุ) |
| อาคาร/บ้าน | `grass` เท่านั้น |

### 3.3 กฎเหล็ก

1. **ห้ามวางฐาน object ทับ** อาคาร บ้าน ถนน ทางเท้า หรือสระน้ำ
2. **อาคาร/บ้านต้องไม่อยู่บนถนน/ทางเท้า และห้ามทับกันเอง**
3. **ห้ามวางร้านค้า/รถเข็นกลางถนน**
4. **ห้ามวางต้นไม้/พุ่มไม้ชิดผนังอาคาร** — ทรงพุ่มกว้าง ~0.625 tile ต้องไม่ทับตัวอาคาร
5. ภาพแนว 2.5D: ยอดต้นไม้/ป้าย/โคมไฟ **ยื่นขึ้นเหนือฐานได้** (ทิศเหนือ) ถือเป็นเรื่องปกติ
   - สิ่งที่ต้องถูกโซนคือ **จุดฐาน** ไม่ใช่ยอด
6. ต้นไม้/พุ่มไม้ต้องใช้พิกัด **tile เป็นจำนวนเต็ม** เพราะถูก mark ลง `cityGrid` เพื่อ collision
   (พิกัด fractional จะทำให้ collision เพี้ยน)
7. ห้ามสุ่มตำแหน่ง object แบบ runtime — ใช้ตำแหน่งที่กำหนดไว้หรือ seeded RNG เท่านั้น
8. ถ้าย้ายอาคาร/บ้าน ต้องตรวจ door hotspot ว่ายังเดินไปถึงได้

### 3.4 แผนที่เฉพาะเขต (district scene)

เมืองหลัก 40×28 เป็นภาพรวม แต่ละเขตที่มีแผนที่ของตัวเองใช้ **scene = 'district'** และขนาดยืดหยุ่นได้

- ข้อมูลอยู่ใน `src/district-maps.ts` (`DistrictSpec`): `grid`, `buildings/houses`, `roads/sidewalks`, `water/sand/mangroveZones`, `trees/mangroves/props/hotspots`, `spawn`, `palette`, `zoneRects`
- โซนตัดสินด้วย `districtZone(spec, tx, ty)` — ต้องใช้ตัวเดียวกันทั้ง art, collision และ audit
- **ห้ามวางฐาน object ทับ** น้ำ ถนน ทางเท้า ทราย อาคาร หรือกันเอง
- prop ประเภทใหม่ต้องเพิ่มใน `allowed` ของ `districtAudit()` และวาดใน `buildDistrictArt()`
-  hotspot ต้องอยู่บน tile ที่เดินได้ (`grid === 0`) และไม่อยู่ในน้ำ/อาคาร
- ต้นไม้/ป่าชายเลนที่บล็อกการเดินต้อง mark `grid = 1`
- เพิ่ม/ย้าย prop แล้วต้องรัน `__districtAudit()` ให้ได้ `[]`
- ขนาดแผนที่ต้องถูกคำนวณจาก `spec.w/h` (ห้าม hardcode 40×28 ใน district)

---

## 4. บังคับตรวจก่อนส่งงานทุกครั้ง

0. **Research card อัปเดต** สำหรับจังหวัด/เขต/ระบบที่แตะ (ดู §0) และเนื้อหา/ชื่อ/ตัวเลขมีแหล่งอ้างอิง
1. `npx tsc --noEmit` ผ่าน
2. `npm run build` ผ่าน (Vite)
3. เปิด `http://127.0.0.1:5173` แล้ว **console ต้องไม่มี error**
4. `__ol.life.phase` ต้องถูกต้อง, `__layoutAudit()` = `[]`
5. `__ol.dataAudit().issues` = `[]` (ทุก event มี choice/ผล/cond ถูกต้อง)
6. `__ol.narrativeAudit()` = `[]` (event พ่อแม่/ลูก/คู่รัก มี cond ตรงบริบท)
7. `__ol.invariantAudit()` = `[]` (stat/เงิน/หนี้/อายุ/ลูก/พ่อแม่ ไม่หลุดกรอบ)
8. ถ้าเพิ่ม/ย้าย object ต้องเพิ่มตำแหน่งนั้นลง `auditLayout()` พร้อมโซนที่อนุญาต (city) หรือ `districtAudit()` (district)
9. ตรวจภาพจริงอย่างน้อย: **แผนที่เมือง (day/night), มุมมองถนน, ออฟฟิศ, บ้าน, เขตบางขุนเทียน (day/night)**
   - ใช้ headless screenshot หรือแท็บ Review
10. `__districtAudit()` = `[]` เมื่ออยู่ใน district scene
11. หน้าเมนูหลักแสดงก่อนเข้าเกม (ยกเว้น debug flags), ปุ่มเล่นต่อ/เริ่มใหม่/วิธีเล่น/เสียง ทำงาน, พื้นหลังเคลื่อนไหว
12. `__ol.geoAudit()` = `[]` (id ไม่ซ้ำ, zone ของย่านถูกต้อง, ครบ 8 จังหวัด)
13. `__ol.appearanceAudit()` = `[]` และ portrait/ตัวละครบนแผนที่ใช้สี/ทรงที่เลือกจริง

> Audit ตรวจ: ต้นไม้/พุ่ม/ของใช้ vs โซน, อาคารบนถนน/ทางเท้า, อาคารทับกัน
> เรียกเองได้: `__layoutAudit()` · debug state: `__ol.life`, `__ol.finance`, `__ol.debts`, `__ol.career`

---

## 5. กฎความสอดคล้องของเนื้อหา (Narrative Consistency)

ก่อนเพิ่ม/แก้ event ต้องรักษากฎนี้:

1. **พ่อแม่**: event/choice ที่พูดถึงพ่อแม่ ต้องมี `cond` ตรวจ `life.parents.alive` (ยกเว้น early life ที่พ่อแม่ยังอยู่แน่นอน)
   - ถ้าพ่อแม่เสียชีวิตแล้ว ห้ามมี event “ขอเงิน/มาอยู่ด้วย/ป่วย” อีก
   - “บ้านของพ่อแม่” ต้องมี `!life.parents.alive` + one-time flag
2. **ลูก**: event ที่พูดถึงลูกต้องมี `life.flags.kid` และตรวจอายุลูก (`childAgeYears()`) ให้ตรงช่วง
   - หลานต้องมี `life.flags.grandchild`
3. **คู่รัก**: event เกี่ยวกับคู่รักต้องมี `life.flags.married` หรือ `life.rel.love` ตามบริบท
   - หย่าร้างต้อง set `flags.married=false`
4. **งาน**: ถ้า `finance.salary <= 0` ต้องกรอง event ที่เกี่ยวกับออฟฟิศ/หัวหน้า/บริษัทออก
   - ยกเว้น event “จ้างงาน/หางาน”
5. **บ้าน/รถ/เกษียณ**: event ซ่อมบ้านต้องมี `flags.house`; ขายรถต้องสอดคล้อง `flags.car`; event เกษียณต้องมี `!flags.retired`
6. **One-time rewards**: event ที่ให้เงินก้อน/มรดก/ขายทรัพย์ ต้องมี flag กันรับซ้ำ
7. **Background**: ครอบครัวแตกแยกมี `rel.family` ต่ำ — อย่าให้ event ที่สมมติความอบอุ่นมาก ๆ เกิดก่อนความสัมพันธ์จะฟื้น (เช่น “พ่อแม่ขอมาอยู่ด้วย” ต้อง `rel.family >= 30`)
8. ทุกครั้งที่แก้ event ต้องรัน `__ol.dataAudit()`, `__ol.narrativeAudit()`, `__ol.invariantAudit()` ให้ clean

---

## 6. การเพิ่ม/ย้าย Object

- ตำแหน่ง object อยู่ใน `src/game.ts` ส่วน `WORLD DATA`:
  `BUILDINGS`, `HOUSES`, `TREES`, `BUSHES`, `SCOOTERS`, `LIGHTS`
- ข้อมูลเกมหลัก (บท, ภูมิหลัง, ความฝัน, จังหวัด, อาชีพ, การเงิน, หนี้) อยู่ใน `src/data/*.json`
  - event ยังอยู่ใน TS เพราะมี `apply()`/`cond()` (แผนถัดไป: แยก schema ให้เป็น JSON ได้)
- Props ที่วาดใน `buildCityArt()` (ม้านั่ง, ถังขยะ, รถเข็น, ฝาท่อ ฯลฯ)
  - ถ้าเพิ่มใหม่ **ต้องเพิ่มใน `auditLayout()` ด้วย**
- Static prop = visual only (ไม่บล็อกการเดิน) เว้นแต่ตั้งใจใส่ `cityGrid`
- อาคาร/บ้านแก้ที่ data เดียว (`BUILDINGS` / `HOUSES`) — hotspot และ collision อัปเดตตาม
- ถ้าเป็นของใหม่ที่ควรบล็อกการเดิน ให้แก้ `cityGrid`/`officeGrid`/`homeGrid` พร้อมกัน

---

## 7. Debug hooks

| Hook | ใช้ทำอะไร |
|---|---|
| `window.__ol` | state: `stats`, `world`, `player`, `flags`, `life`, `finance`, `debts`, `career` + `tp`, `setScene`, `tick`, `doAction`, `endTurn`, `openFinance`, `job` |
| `__layoutAudit()` | ตรวจโซน object ทั้งหมด (city) |
| `__districtAudit()` | ตรวจโซน/n้ำ/ทางเท้า/hotspot ของ district ที่โหลดอยู่ |
| `__ol.enterDistrict('bangkhunthian')` | เข้าเขตบางขุนเทียน (debug) |
| `__ol.leaveDistrict()` | กลับเข้าเมือง |
| `__ol.mirror()` / `__ol.salon()` / `__ol.clothingShop()` | เปิดหน้าต่างแต่งตัว (debug) |
| `__ol.dataAudit()` | ตรวจโครง event/choice/ผล/cond |
| `__ol.narrativeAudit()` | ตรวจ cond ของ event พ่อแม่/ลูก/คู่รัก/งาน |
| `__ol.invariantAudit()` | ตรวจ stat/เงิน/หนี้/อายุ/ครอบครัว ไม่หลุดกรอบ |
| URL `?new=1` | ล้างเซฟ เริ่มสร้างชีวิตใหม่ |
| `?adult=1` | เริ่มที่อายุ 22 (debug) |
| `?scene=office&x=9&y=9&t=1260` | เปิดฉาก/ตำแหน่ง/เวลา |
| `?view=street` | เปิดมุมมองถนน |
| `?modal=finance\|bed\|time\|help\|assets\|month\|payslip` | เปิด modal เพื่อดีบัก |
| `?notour=1` | ข้ามทัวร์สอนเล่น (ใช้กับ `?adult=1` ตอนทดสอบ) |
| `?district=bangkhunthian` | เข้าเขตบางขุนเทียนตอนบูต (ใช้กับ `&x=&y=&t=`) |
| `?skipmenu=1` | ข้ามเมนูหลักตอนบูต |
| `?province=&khet=&hood=` | เข้าแผนที่เมืองของจังหวัด/เขต/ย่านตอนบูต (ใช้กับ `?adult=1`) |

---

## 8. สไตล์โค้ด

- **Vite + TypeScript** — `src/game.ts` ยังเป็นไฟล์ใหญ่และใช้ `// @ts-nocheck` (แผนถัดไป: แตกโมดูล)
- ข้อมูลเกมหลักเป็น JSON (`src/data/`); event ยังเป็น TS เพราะมี `cond()/apply()`
- คงรูปแบบเดิม: function declaration, `const`/`let`, comment ภาษาไทย
- อย่า refactor ใหญ่โดยไม่จำเป็น — แก้แบบ surgical
- UI/ข้อความผู้เล่นเป็นภาษาไทย
- เก็บ logic การเดิน/collision/hotspot เดิมไว้ เว้นแต่ถูกขอให้เปลี่ยน
- ทุกครั้งที่เปลี่ยน mechanic ต้องอัปเดต `docs/GDD.md`

---

## 9. ระบบเกมที่ลงแล้ว (M1 slice)

- **แอปหลัก:** Vite + TypeScript ที่ root (`src/`), ข้อมูลหลักเป็น JSON ใน `src/data/`
- **ชีวิตเต็มวงจร:** `CHAPTERS` 10 บท (0→6→12→18→22→27→35→45→55→60→ตาย)
  - **Hybrid time:** ผู้เล่นเดินเวลาเองด้วย `N` → +1/+3/+6/+12 เดือน (`openTimeAdvance()`); เงินเดือน/บิล/ดอกเบี้ย/ประเมินงานคิดตามจำนวนเดือน
  - `life.phase`: `creation | early | adult | ended`
  - ปฐมวัย–มหาวิทยาลัยเป็น event card; 22+ เข้าเมือง/เศรษฐกิจ/แผนที่
- **สร้างตัวละคร:** ชื่อ/เพศ/จังหวัด/ภูมิหลัง 4 แบบ/ความฝัน 6 แบบ (`openLifeCreation()`)
- **Early life:** `EARLY_EVENTS` + `EXTRA_EVENTS` บท 1–4 (3–6 event/บท + event pack), ให้ smarts/social/traits/rel
  - เทิร์นแรกของแต่ละบทเป็น event หลัก (เช่น เลือกสายการเรียน/เส้นทาง) เพื่อไม่ให้พลาด choice สำคัญ
- **Adult life:** `ADULT_EVENTS` + `EXTRA_EVENTS` + `MORE_EVENTS` บท 5–10 + `MONTH_EVENTS`; เดินเวลาแต่ละครั้งมี event → สลิป → รีเซ็ตกิจกรรม
  - เส้นทางบท 4 (มหาวิทยาลัย/อาชีวะ/ทำงาน) → เงินเดือนเริ่มต้น + โบนัสจาก `smarts`
  - event adult สุ่มโดยไม่ซ้ำ event ก่อนหน้า; event ที่มี `cond` จะถูกกรองตาม flags/อายุ
  - **รวม event 307 อัน** (เป้า GDD 150+) · arc ต่อเนื่อง + random pack + variant pack (`src/data/arc-events.json`, `random-events.json`, `variant-events.json`)
  - weighted random: arc ×2.5, random pack ×1.25, variant ×1.1; สลับลำดับตัวเลือก 50% เมื่อมี ≥3 ข้อ
- **Responsive HUD (ทุกอุปกรณ์):** แยก `#world` (canvas + map labels + prompt) ออกจาก `#stage` (HUD)
  - `#stage` เต็มจอ (`position:fixed; inset:0`) + `env(safe-area-inset-*)`; ไม่มี transform scale ทั้งจอ
  - `#world` คงสัดส่วน 16:10 (`width:min(100%,100vh*1.6); height:min(100%,100vw/1.6)`) และจัดกลางจอ
  - `#game` เต็ม `#world`; `screenToWorld()` ใช้ `canvas.getBoundingClientRect()` จึงถูกทุกขนาดจอ
  - map labels อยู่ใน `#world` และวางด้วย `%` (ไม่ใช่ px) เพื่อสเกลตามโลก
  - HUD ใช้ CSS media queries: ≤1200px (tablet), ≤900px (phone), `max-height:500px` (landscape phone), `orientation:portrait`
  - portrait: stat panel ย้ายไปล่าง, ซ่อน ticker/minimap, rotate hint อยู่เหนือ stat panel
  - coach tour คำนวณพิกัดจาก `#stage` rect ตรง ๆ (ไม่คูณ scale) และ step 1 ใช้ `#world` + inset
- **กิจกรรม 3–9 ครั้ง/ช่วงเวลา:** `life.actionsThisTurn`, `life.periodMonths`, `spendActivity()`, `beginActivity()`; ทำงาน/ยิม/ดื่ม/ตรวจสุขภาพ/ดูทีวี/คุยเพื่อนร่วมงาน + กิจกรรมเสริม อ่านหนังสือ/เดินสวน/ทำอาหาร/โทรหาพ่อแม่/งานเสริม/ออกเดท
  - งบกิจกรรมตามช่วงเวลาที่เพิ่งเดิน: +1→3, +3→5, +6→7, +12→9 (`actionBudget()`)
  - กิจกรรมเดิมซ้ำในช่วงเดียวได้ผล 100/50/25/0% (`life.activityUses`), ค่าลบ/ค่าใช้จ่ายเต็ม
- **แตะ/คลิกเพื่อเดิน:** `handleWorldTap()` แปลงพิกัดจอ→world ตาม `PIX`/`cam` แล้ว A* บน grid ของฉาก (`findPathTiles`) + smooth path
  - แตะพื้น = เดิน · แตะอาคาร/จุดสนใจ = เดินไปใกล้แล้ว `interact()` อัตโนมัติ · มี marker จุดหมาย
  - ไม่มีปุ่ม D-pad/แผงปุ่มบนจอ; HUD กดได้ (นาฬิกา=เดินเวลา, เงิน=การเงิน, การ์ดชื่อ=ชีวิต) + ปุ่ม `?`
  - First-run tour 4 สเต็ป (`startCoachTour`) + คู่มือ (`openHelp`); คีย์ลัดยังใช้ได้แต่ไม่โชว์
- **เงินเฟ้อ:** `costInflation()` +2%/ปีหลังอายุ 22 กับค่าที่อยู่/เดินทาง/ครอบครัว
- **สายอาชีพ 4 track:** `life.careerTrack` = corporate/multinational/sme/factory + event เฉพาะสาย
- **เครดิตและที่อยู่:** `บ้านหลังแรก` ต้องเครดิต ≥ 70; `กู้บ้านไม่ผ่าน` สำหรับเครดิตต่ำ
- **ย้ายถิ่น:** event `โอกาสกลับบ้านเกิด` ปรับเงินเดือน/ค่าเช่าตามจังหวัด
- **ฤดูกาล:** `SEASON_EVENTS` (สงกรานต์/ปีใหม่/ตรุษจีน/เปิดเทอม)
- **Tutorial:** ช่วงแรกบท 5 อธิบายกิจกรรม 3–9 ครั้ง/เดินเวลา N/จ่ายหนี้ F/หางาน J
- **สินเชื่อส่วนบุคคล:** กู้ผ่าน F +50,000 เมื่อเครดิต ≥ 60; ดอก 1.5%/เดือน; ค้าง 2 เดือนเจ้าหนี้ตาม, 4 เดือนถูกฟ้อง
- **เสียง:** WebAudio SFX (`playSfx`) + ปุ่ม mute (`#soundBtn`, จำใน `openlife.sound`)
- **มือถือ:** แตะ/คลิกเดินและโต้ตอบได้โดยไม่ต้องมีปุ่มบนจอ; มีปุ่ม `?` เปิดคู่มือ/ทัวร์; pinch ซูมในแผนที่
- **JSON events:** `src/data/events.json` + `events.schema.json` (season/month/chapter5/chapter8); รองรับ `random` branch และ `ops`; event ที่ยังเป็น TS ใช้ ops แทน apply แล้ว
- **Audio module:** `src/audio.ts` — SFX + procedural music + mute; `game.ts` import `playSfx/unlockAudio/initSoundButton`
- **Events module:** `src/events.ts` — compile JSON events + declarative `ops` (stat/rel/flag/salary/rent/job/debt/ifFlag) เป็น cond/choices; `game.ts` เป็นเจ้าของ state
- **Event pools:** event data อยู่ใน `src/data/event-pools.json`; `src/event-pools.ts` เป็น loader + `matchRequires`; arc `arc-events.json` (`ARC_EVENTS`), random `random-events.json` (`RANDOM_EVENTS`), variant `variant-events.json` (`VARIANT_EVENTS`) — ทุกชุดมี weight และ choice shuffle
- **ย้ายถิ่น:** เดินเข้าสถานีขนส่งบนแผนที่ หรือกด `T` → ฉากสถานี/แผนที่ย้ายจังหวัด (ปีละครั้ง, ฿10,000)
- **Save module:** `src/save.ts` — snapshot/load/clear v3 ผ่าน SaveContext
- **Actions module:** `src/actions.ts` — เข้าฉาก, กิจกรรมรายวัน, งาน, OT
- **Cross-run memory:** `src/picker.ts` เก็บจำนวนครั้งที่เคยเห็น event ใน `openlife.seenEvents.v1` แล้วเลือก event ที่เห็นน้อยที่สุดก่อน
- **Balance:** ภาษีขั้นบันได 5/8/12/17%, ประกันสังคม 5% (เพดาน 750), salary cap `rank.max`, promotion gates (3/4/5/6 ปี, score 64/68/72/76, KPI ≥60), เกษียณ 65, death risk คูณ `months/12`
- **Bankruptcy grace:** ต้องเสี่ยงติดกัน 3 ครั้ง (`life.brokeTurns`) ก่อนล้มละลาย · เสี่ยงเมื่อ `credit ≤ 0 && missed ≥ 6` หรือ `missed ≥ 3 && netWorth < −300,000`
- **Lifestyle cost:** 12% ของเงินเดือน รวมในบิลที่อยู่ · business option มีต้นทุน 50k
- **บิลที่อยู่:** ค่าเช่า+ค่าน้ำไฟจ่ายเองที่บ้าน (`openBills`); ถ้าไม่จ่ายทบเข้าบัตรเครดิต · ค่าเดินทางจ่ายต่อเที่ยว
- **8 เขต:** สามย่าน/สีลม/จุฬาฯ/บางรัก/ปทุมวัน/สวนลุมพินี/เยาวราช/คลองเตย — palette, หลังคา/ดาดฟ้า, street props, ไฟกลางคืน, กิจกรรมกลางวัน/กลางคืน, event เฉพาะเขต
- **Milestones:** `life.milestones` — งานแรก/เลื่อนตำแหน่ง/บ้าน/รถ/แต่งงาน/ลูก/หลาน/เกษียณ/ธุรกิจ/เงินล้าน/ปลดหนี้
- **Needs/Mood:** `life.needs` 5 ตัว (อาหาร/พักผ่อน/สนุก/สังคม/สุขอนามัย) + `life.mood`; ลดลงช้า ๆ ไม่มีโทษถึงตาย
- **Skills:** `life.skills` 6 ตัว (สื่อสาร/เทคโนโลยี/การเงิน/ฟิตเนส/ทำอาหาร/สร้างสรรค์) เก็บจากกิจกรรม/งาน
- **People:** `life.people` 4 คนสำคัญ (เพื่อน/หัวหน้า/คู่รัก/ลูก) + ความสัมพันธ์/โน้ต
- **Business:** เปิด/อัปเกรดธุรกิจ 3 ประเภท มีรายได้ต่อเทิร์น
- **Assets/Money sinks:** `life.assets` — บ้าน 3 ระดับ (500k/1.5M/4M), รถ 3 ระดับ (600k/1.8M/5M), ห้องเช่า 3 ห้อง (3M/5M/8M), ลงทุน 0.3%/เดือน, ทริป 50k–800k (diminishing), บริจาค 1M/5M
  - ค่าดูแลบ้าน 1,500/ระดับ/เดือน + รถ 800/ระดับ/เดือน + ห้องเช่า 3,000/ห้อง/เดือน (รวมใน fixed)
  - ห้องเช่าให้รายได้ 30k/45k/70k ต่อเดือน; Prestige จากบ้าน/รถ/ธุรกิจ/ห้องเช่า/ทริป/บริจาค
- **Collections:** หนังสือ/อาหาร/ดนตรี/ของที่ระลึก สะสมจากกิจกรรมเขต
- **Home level:** อัปเกรดบ้าน 0–3 เพิ่มใจต่อเทิร์น
- **Weather:** แดดดี/ฝนตก/ร้อนจัด/ลมแรง ผลเล็กน้อย
- **Achievements:** `life.achievements` + toast + legacy score เมื่อจบชีวิต
- **Quick actions (`Q`):** ทำงาน/ยิม/ตรวจสุขภาพ/ดูทีวี/คุยเพื่อน/จ่ายบิล/การเงิน/จบเดือน ได้จากที่เดียว
- **Auto bills:** เปิด/ปิดหักบิลอัตโนมัติได้ในหน้าบิล (default ปิด)
- **Pay all debts:** ปุ่มจ่ายขั้นต่ำทุกก้อนในหน้า `F`
- **Accessibility:** focus-visible, `aria-live` toast, dialog role, `prefers-reduced-motion`
- **HUD throttle:** `updateHud()` ถูกเรียกสูงสุดทุก 200ms แทนทุกเฟรม
- **Ops engine:** event ที่เคยใช้ `apply()` ถูกแปลงเป็น `ops` ทั้งหมด; `normalizePoolOps()` ผูก apply ให้ตอนโหลด
- **ลด event ซ้ำ:** `life.recentEvents` เก็บ 10 ชื่อล่าสุดและกรองออกจาก pool (ยกเว้น pool เล็ก)
- **ประสิทธิภาพ:** หยุด render ตอน paused หลังเฟรมแรก, ข้าม loop เมื่อ tab hidden, หยุดเพลงเมื่อ tab hidden, จำกัด loop ~60fps
- **มือถือ:** pinch เพื่อซูมต่อเนื่อง 2.0x–4.0x (ขั้น 0.25); ปุ่ม M สลับ map/street view
- **สถิติ 8 ตัว:** health/heart/energy/money/kpi/credit/smarts/social
- **ความสัมพันธ์:** `life.rel` (family/friend/love/boss) + `life.traits` + `life.flags`
- **สายอาชีพ:** `CAREER_RANKS` 5 ระดับ (เด็กใหม่ → ผู้อำนวยการ)
  - ประเมินปลายปีทุก 12 เดือน (`career.lastReviewAge`)
  - score = KPI 60% + social 20% + boss 20% (±random) + ทักษะสื่อสาร
  - KPI สะสม passively +0.3/เดือนเมื่อมีงาน; หลังรีวิวลดลงครึ่งหนึ่ง (`48 + (KPI-50)×0.5`)
  - ขึ้นเงินเดือน 0–12%, โบนัส 0–6 เดือน, เลื่อนขั้นเมื่อ score ผ่าน gate + ทำงานครบ 3/4/5/6 ปี + KPI ≥60 + social ≥50
  - อายุ 45+ และ score <50 มีโอกาสถูกเลย์ออฟ
  - `career` ถูกบันทึกในเซฟ
- **หางาน (`J`):** ใช้เมื่อ `finance.salary=0` (ตกงาน) — สมัครออฟฟิศ (มีโอกาสผ่านตามอายุ/ปัญญา/มนุษยสัมพันธ์) หรือรับฟรีแลนซ์; จำกัด 1 ครั้ง/เทิร์น
- **ค่าใช้จ่ายต่อเนื่อง:** บ้าน (`flags.house`) → ค่าที่อยู่ 1,500/เดือน; ไม่มีรถ/รถถูกยึด → เดินทาง 1,200; แต่งงาน +3,000; มีลูก +8,000 (จนลูกอายุ 22)
  - ค่าใช้จ่ายเหล่านี้คิดใน `fixedPerMonth()` และแสดงในสลิป/การเงิน
- **ครอบครัวเชิงลึก:** `life.child` (อายุ/ความสัมพันธ์), `life.parents` (สุขภาพ/มีชีวิต)
  - `familyTick()` เพิ่มอายุลูกและลดสุขภาพพ่อแม่ตามอายุ; พ่อแม่เสียชีวิต → มรดก 100,000 + ใจ −15
  - `FAMILY_EVENTS`: ลูกสอบเข้า/ขอคำปรึกษา/แต่งงาน/มีหลาน, พ่อแม่ป่วยหนัก
  - event ลูกถูกกรองด้วย `childAgeYears()` (เช่น ลูกมีแฟน ≥13, เรียนจบ ≥18, แต่งงาน ≥24)
- **จบชีวิต:** `endingFor()` เลือก 8 แบบ — เกษียณอย่างสงบ / รวยแต่ตัวคนเดียว / หมดไฟกลางทาง / หนี้ท่วม / ลาออกไปทำของตัวเอง / ติดคดี / สุขภาพพัง / ตายก่อนวัย + สรุปชีวิต/ความฝัน
  - เงื่อนไขล้มละลาย, สุขภาพ 0, วัยชรา (บท 10 เทิร์น 25/อายุ 90)
- **ปฏิทิน:** `life.ageMonths` เป็นตัวหลัก; `lifeDateParts()` ใช้ปีเกิด 2547
- **Debt per period:** หนี้ต้องจ่ายเองทุกช่วง (ขั้นต่ำ × จำนวนเดือนที่เดิน); ไม่หักอัตโนมัติ
  - ถ้าจ่ายงวดนี้แล้ว ระบบหักขั้นต่ำเดือนที่เหลืออัตโนมัติเมื่อเดินเวลาหลายเดือน (ถ้าเงินไม่พอ ทบเข้าบัตรเครดิต + เตือน)
  - หน้าเดินเวลาแสดงหนี้ขั้นต่ำ/เดือน; หน้า F แสดงว่างวด = 1 เดือน
- **การเงิน:** เงินเดือน/ค่าเช่า/เดินทาง/บิล × จำนวนเดือนที่ผู้เล่นเลือกเดิน
- **Event:** `MONTH_EVENTS` (เพื่อนขอยืม, แม่ป่วย, ชวนลงทุน scam, การเมืองออฟฟิศ, เตือนสุขภาพ)
  - ต้องมี `cond` และ `choices[].apply`/`fx` เสมอ; อย่าตั้งเงื่อนไขที่ทำให้เงินติดลบ
- **Save:** key `openlife.save.v3`
  - auto-save ตอนจบเทิร์น/จบช่วงชีวิต และ `pagehide`
  - `?new=1` = ล้างเซฟเริ่มใหม่; `?adult=1` = เริ่มที่อายุ 22 (debug)
  - `?modal=finance|bed|time|help|assets|month|payslip` = เปิด modal เพื่อดีบัก
  - `?notour=1` = ข้ามทัวร์สอนเล่น (ใช้กับ `?adult=1` ตอนทดสอบ)
- **UI:** `F` การเงิน · `L` ภาพรวมชีวิต · `N` เดินเวลา · HUD แสดงอายุ/บท/กิจกรรม/อารมณ์
- **ทดสอบขั้นต่ำ:** creation → early 4 บท → adult → เปลี่ยนบท → จบชีวิต; รีโหลดต้องได้เซฟเดิม; `?new=1` เริ่มใหม่; `__layoutAudit()` = `[]`
- **แผนที่เฉพาะเขต (vertical slice):** `scene = 'district'` + `src/district-maps.ts`
  - บางขุนเทียน 48×32: ทะเล/หาด/คลอง/บ่อกุ้ง/ป่าชายเลน/ท่าเรือ/ตลาด/ศาลเจ้า/โรงงาน/โกดัง
  - เข้า-ออกผ่าน hotspot ป้ายรถเมล์สายใต้ / “กลับเขตลุง” หรือปุ่มในคู่มือ `?`
  - กิจกรรม 12 จุด: ตลาด, ศาลเจ้า, ท่าเรือ, หาด, ป่าชายเลน, บ่อกุ้ง, โรงงาน, ห้องเย็น, โกดัง, ร้านอาหารทะเล, อนามัย, โรงเรียนชุมชน
  - อาร์ต day/night + คลื่น + เรือโยก + ควันโรงงาน + ไฟกลางคืนแบบ additive
  - `life.activeDistrict` ถูกบันทึกในเซฟ; `__districtAudit()` ต้อง = `[]`
- **หน้าเมนูหลัก:** `src/menu.ts` — พื้นหลัง pixel-art กรุงเทพฯ แบบ parallax เคลื่อนไหว (ท้องฟ้า/ดาว/เมฆ, skyline 3 ชั้น, วัด, BTS, ป้ายไฟ, รถ, คนเดิน)
  - ปุ่ม: เล่นต่อ (ถ้ามีเซฟ) → เริ่มชีวิตใหม่ → วิธีเล่น → เสียง
  - เริ่มใหม่เมื่อมีเซฟจะเขียนทับเซฟเดิม (ยืนยันด้วยการรีโหลด `?new=1`)
  - ใช้ `prefers-reduced-motion` ลดความเร็วแอนิเมชัน
  - ข้ามเมนูด้วย `?new=1`, `?adult=1`, `?scene=`, `?district=`, `?modal=` หรือ `?skipmenu=1`
- **ลำดับชั้นภูมิศาสตร์:** จังหวัด → เขต/อำเภอ → ย่าน (`src/data/geo.json`, `src/geo.ts`)
  - ใช้คำ “เขต” เฉพาะกรุงเทพฯ; จังหวัดอื่นใช้ “อำเภอ”
  - “ย่าน” เป็นชื่อเชิงสังคม/เศรษฐกิจ ไม่ใช่หน่วยราชการ
  - สร้างตัวละคร: ชื่อ/เพศ/จังหวัด → เขต/อำเภอ → ย่าน → ภูมิหลัง → ความฝัน
  - ย้ายถิ่น: จังหวัด → เขต/อำเภอ → ย่าน → จ่ายเงินและย้าย
  - ย่านมีผลต่อค่าเช่า/เงินเดือนเริ่มต้น (`geoFinance`) และถูกบันทึกใน `life.khet/neighborhood`
  - `life.district` เดิมยังใช้เป็นโซนแผนที่เมืองเมื่อย่านอยู่ในกรุงเทพฯ
  - `__ol.geoAudit()` ต้อง = `[]`
- **แต่งตัวละคร:** `src/appearance.ts` — portrait 32×32 เลเยอร์ pixel-art
  - สีผิว 6, รูปหน้า 5, ทรงผม 11 + สีผม 10, ตา 5 + สีตา 6, คิ้ว 5, จมูก 5, ปาก 5
  - หนวดเครา 5, แว่น 5, หมวก 4, เครื่องประดับ 4, เสื้อ 4 ทรง + 8 สี, กระ/ไฝ
  - พรีวิวสด, ปุ่มสุ่ม/รีเซ็ต, ไม่ล็อกตามเพศ
  - เก็บใน `life.appearance`; ใช้กับ HUD portrait และ sprite บนแผนที่
  - `__ol.appearanceAudit()` ต้อง = `[]`
  - **เปลี่ยนภายหลังได้:** กระจกที่บ้าน (ฟรี), ร้านตัดผม ฿300, ร้านเสื้อผ้า ฿800
  - `life.grooming` 0–100 ลดลงตามเวลา; กระจก +5, ตัดผม +20, ชุดใหม่ +12
  - grooming/ชุดสุภาพมีผลกับโอกาสสัมภาษณ์งาน
  - อายุ 42+ มีริ้วรอย, 58+ ผมเริ่มเทา (แสดงผลอัตโนมัติ ไม่ทับค่าที่เลือก)
  - **Wardrobe 3 ชุด** ที่กระจก: ลำลอง / ทำงาน / ออกงาน · ใส่/บันทึกทับได้
  - NPC คนสำคัญมี reaction กับลุคใหม่ (+ความสัมพันธ์เล็กน้อย)
  - **อาชีพสายบันเทิง** (นายแบบ/นักแสดง/อินฟลูเอนเซอร์) ในหน้าหางานเมื่อ grooming ≥55 และ social ≥40
  - **บัตรประชาชน** ในหน้าชีวิต ใช้ portrait/ชื่อ/ที่อยู่/อาชีพจริง
  - ร้านตัดผมชุมชนบางขุนเทียน ฿150 (ถูกกว่าในเมือง)
- **แผนที่เมืองแยกตามจังหวัด/เขต:** `src/city-maps.ts` สร้าง mapSpec จาก province+khet+hood (seeded)
  - เข้าเกม/ย้ายบ้าน → เข้าแผนที่ของจังหวัด/เขต/ย่านนั้นอัตโนมัติ (`life.activeMap`, `life.currentMap`)
  - แต่ละจังหวัดมี palette, แหล่งน้ำ, โครงถนน (ตัดถนนสายรองบางสายออก) และ props ต่างกัน
  - มี hotspot หลักครบ: บ้าน/ออฟฟิศ/ร้านสะดวกซื้อ/ตลาด/โรงพยาบาล/ร้านตัดผม/ร้านเสื้อผ้า/ยิม/สถานีขนส่ง/ร้านอาหาร/วัด/สวนหรือหาด
  - เข้า-ออกบ้าน/ออฟฟิศ/สถานี แล้วกลับมายังแผนที่เดิม (ไม่เด้งไปแผนที่กลาง)
  - ยังใช้ template อาคารร่วมกัน — ขั้นต่อไปคือ layout archetype ต่อเขต (market maze/CBD/campus/lakeside/coastal)
  - `__ol.enterMap(province,khet,hood)` สำหรับ debug
