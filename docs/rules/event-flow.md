# กฎ Event (Event Flow & Schema)

> อ่านคู่กับ [story-flow.md](story-flow.md) (เนื้อหา/ภาษา) และ [content-safety.md](content-safety.md)
> event ใหม่ทั้งหมดเขียนเป็น **JSON** — ห้ามเขียน `apply()`/`cond()` แบบฟังก์ชันใน TS อีก

## 1. ชนิดและที่อยู่ของ event
| ชนิด | ไฟล์ | การเลือก |
|---|---|---|
| วัยเด็ก บท 1–4 | `src/data/event-pools.json` → `early` | ตามบท เทิร์นแรกเป็น event หลัก |
| ผู้ใหญ่ บท 5–10 | `event-pools.json` → `adult`, `extra`, `more` | สุ่มถ่วงน้ำหนักตามบท |
| ครอบครัว | `event-pools.json` → `family` | ตามเงื่อนไขลูก/พ่อแม่ |
| arc ต่อเนื่อง | `src/data/arc-events.json` (key = บท) | weight เริ่มต้น 2.5 |
| สุ่มทั่วไป | `src/data/random-events.json` | weight 1.25 |
| variant | `src/data/variant-events.json` | weight 1.1 |
| ฤดูกาล / ประจำเดือน / บท 5, 8 | `src/data/events.json` (`seasons`, `months`, …) ตาม `events.schema.json` | ตาม `month` |
| เฉพาะเขต | `DISTRICT_EVENTS` (ใน `game.ts` ระหว่างย้าย) | `requires.district` |

- loader: `src/content/event-pools.ts` · compiler: `src/content/events.ts` · ตัวเลือก event: `pickEventFromPool`, `adultEventPool`, `src/core/picker.ts`

## 2. โครงสร้าง event
```json
{
  "id": "friend_invest_1",
  "title": "นนท์ชวนลงทุน",
  "text": "นนท์โทรมาเสียงตื่นเต้น — “กูจะเปิดร้านออนไลน์ ว่างเมื่อไหร่มาช่วยดูหน่อยดิ”",
  "requires": { "noFlag": "friendArc1", "minAge": 22 },
  "weight": 2.5,
  "choices": [
    {
      "label": "ลงทุน 50,000 ในร้านของนนท์",
      "fx": { "money": -50000, "rel": { "friend": 8 }, "flags": { "friendArc1": true, "friendInvest": true } },
      "hint": [["down", "เงิน −50,000"], ["up", "เพื่อน"]]
    },
    {
      "label": "ปฏิเสธ — ยังไม่มั่นใจ",
      "random": [
        { "chance": 0.6, "fx": { "rel": { "friend": -5 } } },
        { "chance": 0.4, "fx": { "rel": { "friend": -1 } }, "toast": "นนท์บอกว่าเข้าใจ" }
      ]
    }
  ]
}
```
- บังคับ: `title`, `text`, `choices` (2–4 ข้อ) · ทุก choice ต้องมี `label` และผลอย่างน้อย 1 อย่าง (`fx` / `ops` / `random`)
- `title` ต้องไม่ซ้ำทั้งเกม (audit ตรวจ) · ควรมี `id` แบบ snake_case ที่ไม่ซ้ำ
- `random`: อย่างน้อย 2 branch, `chance` รวมกัน = 1, ทุก branch มีผล

## 3. `fx` (ผลแบบง่าย) — key ที่อนุญาตเท่านั้น
`health heart energy money kpi credit smarts social child trait rel flags`
- `rel`: `family friend love boss`
- `flags`: object `{ "flagName": true|false|number|string }`
- `trait`: ชื่อนิสัย (string)
- key อื่นจะไม่ผ่าน `__ol.dataAudit()`

## 4. `ops` (ผลแบบละเอียด)
| op | ใช้ทำอะไร |
|---|---|
| `{ "stat": "kpi", "delta": 5 }` | ปรับ stat (เงินไม่ต่ำกว่า 0, ที่เหลือ 0–100) |
| `{ "rel": "boss", "delta": -4 }` | ปรับความสัมพันธ์ |
| `{ "flag": "x", "value": true }` | ตั้ง flag |
| `salarySet` / `salaryMul` / `salaryAtLeast` | เปลี่ยนเงินเดือน |
| `rent` | ตั้งค่าเช่า |
| `job` / `jobAppend` | เปลี่ยนชื่ออาชีพ |
| `{ "debt": "credit", "add": 5000 }` | เพิ่มหนี้ (ใช้แทนการให้เงินติดลบ) |
| `{ "debt": "car", "zero": true, "shiftTo": "credit", "reserve": 0 }` | ปิดหนี้/ย้ายยอด |
| `{ "ifFlag": "x", "then": [...], "else": [...] }` | แตกกิ่งตาม flag |
| `{ "toast": "ข้อความ" }` | แจ้งเตือนสั้น |

- ต้องการ op ใหม่ → เพิ่มใน `runOps()` (`src/content/events.ts`) + `events.schema.json` + ไฟล์นี้ พร้อมกัน

## 5. `requires` (เงื่อนไข) — key ที่ระบบรู้จัก
`flag noFlag parentsAlive parentHealthBelow childAgeMin childAgeMax minAge maxAge minCredit maxCredit minMoney minSalary minDebt provinceNot backgroundNot track district minRel maxRel` และ `all: [...]` / `any: [...]` สำหรับรวมเงื่อนไข
- `events.json` (schema) รองรับชุดย่อย: `minMoney maxHealth minRel parentsAlive flag noFlag childAgeMin childAgeMax careerTrack district` + `month`
- key ที่ระบบไม่รู้จักจะ **ถูกเพิกเฉยเงียบ ๆ** → event เกิดผิดบริบท — ต้องการ key ใหม่ให้เพิ่มใน `matchRequires()` (`src/content/event-pools.ts`) และ `buildCond()` (`src/content/events.ts`) ให้ตรงกัน แล้วอัปเดตไฟล์นี้

## 6. ลำดับการเกิด event (flow)
1. ผู้เล่นเดินเวลา → `startAdultTurn`/`startMonthEnd`
2. รวม pool ตามบท + กรองด้วย `cond`/`requires` + ตัดชื่อใน `life.recentEvents` (10 ล่าสุด, ยกเว้น pool เล็ก)
3. สุ่มถ่วงน้ำหนัก (arc ×2.5, random ×1.25, variant ×1.1) และ `src/core/picker.ts` เลือกอันที่เคยเห็นน้อยที่สุดข้ามรอบเล่น
4. ถ้ามี ≥3 ตัวเลือก สลับลำดับ 50%
5. ผู้เล่นเลือก → ใช้ผล → บันทึก `life.log` → สลิปเงินเดือน → รีเซ็ตกิจกรรม

## 7. Checklist เขียน event ใหม่
- [ ] ผ่าน [story-flow.md §6](story-flow.md) (พ่อแม่/ลูก/คู่รัก/งาน/บ้าน/รถ/เกษียณ/ครั้งเดียว/ภูมิหลัง/สถานที่/เวลา)
- [ ] มีตัวเลือกที่ทำได้เสมออย่างน้อย 1 ข้อ และไม่มีตัวเลือกที่ดีกว่าทุกด้าน
- [ ] ผลเงินที่อาจทำให้ติดลบ → ใช้ `debt` op หรือ `requires.minMoney`
- [ ] รางวัลก้อนใหญ่มี flag กันซ้ำ
- [ ] event ทางเลวมี flag และมี event ผลตามมา ([game-design.md §5](game-design.md))
- [ ] `hint` บอกทิศทาง (`up`/`down`) ไม่ต้องบอกตัวเลข stat ยกเว้นเงินที่รู้ล่วงหน้า
- [ ] ข้อความใช้ได้กับทุกเพศ และผ่าน [content-safety.md](content-safety.md)
- [ ] อิงเรื่องจริง → มี research
- [ ] `__ol.dataAudit().issues` = `[]`, `__ol.narrativeAudit()` = `[]`, `__ol.invariantAudit()` = `[]`
- [ ] ทดสอบเรียก event จริงด้วย `__ol.forceEvent('ชื่อ title')` แล้วลองทุกตัวเลือก

## 8. ปริมาณและสัดส่วน
- เป้าตอนนี้: 150+ event ผู้ใหญ่ (มีแล้ว ~300) — ต่อไปเน้น **คุณภาพ ความต่อเนื่อง และ event ตามพื้นที่** มากกว่าจำนวน
- แต่ละบทควรมี event ที่เกิดได้ ≥ 2 เท่าของจำนวนเทิร์นในบทนั้น (กันซ้ำ)
- event ที่เกิดได้ทุกบท ต้องเขียนให้เข้ากับทุกอายุ หรือจำกัดด้วย `minAge`/`maxAge`
