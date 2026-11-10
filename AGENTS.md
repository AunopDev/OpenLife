# OpenLife — กฎหลักของโปรเจ็ค (อ่านก่อนทำงานทุกครั้ง)

> สำหรับคนและ AI ทุกตัวที่ทำงานกับโปรเจ็คนี้ (Claude, Codex, Cursor, Gemini ฯลฯ)
> ไฟล์นี้คือ **กฎเหล็ก + แผนที่ไปยังกฎรายหมวด** ใน [`docs/rules/`](docs/rules/README.md) — ต้องอ่านไฟล์หมวดที่งานของคุณแตะให้จบก่อนลงมือ

---

## 1. OpenLife คืออะไร
- เกมจำลองชีวิต **คนไทยหนึ่งคน ตั้งแต่เกิดจนตาย** (10 บท 0→60+ ปี) บนเว็บ
- ภาพ: แผนที่พิกเซล top-down **32px ต่อ tile** (กำลังย้ายจาก 16px) ตัวละครสัดส่วนสมจริง + HUD สีกรมท่า · ภาพผสม sprite PNG + วาดด้วยโค้ด · เสียงผสม WebAudio + ไฟล์เสียง
- แก่น: **ทุกการกระทำมีราคา · เงินไม่ใช่คำตอบเดียว · บริบทไทยจริง · ความตายคือบทส่งท้าย**
- ความยาก: **สนุกก่อน สมจริงแต่ยุติธรรม** — แพ้ได้เพราะการตัดสินใจ ไม่ใช่เพราะดวงครั้งเดียว; ถ้าเลือกเป็นคนเลวเกินไป ผลที่ตามมาจะโหดแบบสมจริง
- อุปกรณ์: **Responsive** — มือถือ แท็บเล็ต เดสก์ท็อป เล่นได้ครบและดีเท่ากัน จัดเลย์เอาต์/การควบคุมให้เหมาะแต่ละอุปกรณ์
- ภาษาในเกม: **ไทย** · ระดับอายุเป้าหมาย 13+
- Stack: **Vite + TypeScript + Canvas 2D + DOM** (ไม่มี framework/engine/backend)

## 2. กฎเหล็ก 15 ข้อ (ห้ามละเมิด)
1. **Research ก่อนเสมอ** — อะไรที่อิงโลกจริง (สถานที่ ราคา อาชีพ วัฒนธรรม กฎหมาย ภาพ) ต้องมี research card ใน `docs/research/` อย่างน้อย 2 แหล่ง; ข้อมูลไม่พอให้ใส่ `TODO(research)` **ห้ามแต่งเป็นข้อเท็จจริง** → [research.md](docs/rules/research.md)
2. **ไม่แตะสถาบันพระมหากษัตริย์ทุกรูปแบบ** · การเมืองใช้ของสมมติเท่านั้น · ไม่มีบุคคลหรือแบรนด์จริง → [content-safety.md](docs/rules/content-safety.md)
3. **อบายมุขและความผิดมีผลเสียสะสมจริงเสมอ** · ไม่มีวิธีทำผิดที่นำไปใช้ได้จริง · ไม่มีกลไกพนันด้วยเงินจริง
4. **ศาสนา ภูมิภาค เพศ แสดงด้วยความเคารพ** — ไม่เหมารวม ไม่ล้อ และข้อความต้องใช้ได้กับทุกเพศ
5. **ทุกตัวเลือกมีราคา** — ห้ามมี dominant choice และต้องมีตัวเลือกที่ทำได้เสมออย่างน้อย 1 ข้อ → [game-design.md](docs/rules/game-design.md)
6. **เนื้อเรื่องต้องต่อเนื่อง** — event พ่อแม่/ลูก/คู่รัก/งาน/บ้าน/รถต้องมีเงื่อนไขตรงบริบท; รางวัลครั้งเดียวต้องมี flag → [story-flow.md](docs/rules/story-flow.md), [event-flow.md](docs/rules/event-flow.md)
7. **event ใหม่เขียนเป็น JSON + `ops`** ใช้ key ที่ระบบรู้จักเท่านั้น
8. **เงินห้ามติดลบ** — จ่ายไม่พอให้ทบเป็นหนี้; ตัวเลขเงินจริงต้องมีแหล่งอ้างอิง → [economy.md](docs/rules/economy.md)
9. **Responsive: ทุกอุปกรณ์เล่นได้ครบเท่ากัน** — แตะ (มือถือ/แท็บเล็ต) และเมาส์+คีย์บอร์ด (เดสก์ท็อป) ทำได้ทุกอย่าง, เลย์เอาต์ปรับตามจอไม่เปลืองพื้นที่ · ไม่มี D-pad บนจอ · HUD คือเมนู · เป้ากด ≥ 44px → [ux-ui.md](docs/rules/ux-ui.md)
10. **พิกเซลอาร์ต 32px:** 1 tile = 32 art px, ขนาดทุกอย่างเทียบสเกลโลก (ผู้ใหญ่สูง ~54 px), ขยายจำนวนเต็ม + nearest-neighbour เท่านั้น, พิกัดเต็มจำนวน, **ไม่มีตัวอักษรในโลกเกม**, กลางวันไม่มีไฟเปิด, ย้ายจาก 16px เป็นเฟส → [art.md](docs/rules/art.md)
11. **ภาพ แอนิเมชัน และเสียงต้องเป็นไทยจริงและมีชีวิต** — ห้ามปล่องไฟบนบ้าน, ห้ามย่าน CBD เป็นทุ่งหญ้า, วัดตามภูมิภาค; ตัวละครมีท่าเดิน/idle/กิจกรรม/อารมณ์/อายุ; วัตถุที่ขยับในชีวิตจริงต้องขยับและมีเสียง → [characters.md](docs/rules/characters.md), [animation.md](docs/rules/animation.md), [audio.md](docs/rules/audio.md)
12. **แผนที่กำหนดด้วยข้อมูลเท่านั้น** — ค่าตั้งทุกพื้นที่อยู่ใน `geo.json` (`map`), ห้ามเช็กชื่อจังหวัด/เขตในโค้ด, ห้าม fallback เงียบ, พื้นที่ใหม่ต้องมี research card (`geo:`) · **ฐานของ object ต้องอยู่ในโซนที่ถูกต้อง** — ห้ามทับถนน/ทางเท้า/น้ำ/อาคาร/กันเอง; ห้าม hardcode ตำแหน่งของแผนที่อื่น; ใช้ seeded RNG → [maps.md](docs/rules/maps.md)
13. **ระบบใหม่ต้องเป็น feature module** ใน `src/features/<name>/` แยกไฟล์ตามบทบาท (types · service · view · controller · test) แบบ Angular/NestJS ใช้กันผ่าน `index.ts` และรับของจากเกมทาง deps — ดูตัวอย่างจริงที่ `src/features/bills/` → [architecture.md](docs/rules/architecture.md) · **โค้ดใหม่ต้องตรวจ type ได้** (ไม่มี `@ts-nocheck`) · state ใหม่ต้องลง `src/core/state.ts` + default ในเซฟ · ห้ามทำเซฟผู้เล่นหาย → [code.md](docs/rules/code.md)
14. **ห้ามเพิ่ม library/framework/backend และห้าม commit/push/deploy โดยไม่ได้รับอนุญาตจากเจ้าของ** · ทุกไฟล์ภาพ/เสียงต้องมีที่มาและสิทธิ์ใช้ ภาพอ้างอิงจริงใช้เรียนรู้ ห้าม trace → [assets.md](docs/rules/assets.md)
15. **ห้ามบอกว่าเสร็จ/ผ่าน ถ้ายังไม่ได้ตรวจจริง** — `npm run check` ต้องผ่าน, ห้ามปิด/ลด test เพื่อให้ผ่าน, งานใหญ่ต้องมีผู้ตรวจคนที่สอง, บั๊กที่เจอแต่ยังไม่แก้ต้องจดใน `docs/BUGS.md` → [workflow.md](docs/rules/workflow.md), [quality.md](docs/rules/quality.md)

## 3. อ่านอะไรเมื่อไร
| งาน | ต้องอ่าน |
|---|---|
| ทุกงาน | ไฟล์นี้ + [workflow.md](docs/rules/workflow.md) + [quality.md](docs/rules/quality.md) |
| แตะโลกจริง (สถานที่/ราคา/วัฒนธรรม) | [research.md](docs/rules/research.md) |
| เขียนข้อความ/event/ภาพที่มีคน ศาสนา การเมือง อบายมุข ความรุนแรง | [content-safety.md](docs/rules/content-safety.md) |
| mechanic, stat, ความยาก, ผลกรรม, ตอนจบ | [game-design.md](docs/rules/game-design.md) |
| เงิน เงินเดือน ภาษี หนี้ ราคา balance | [economy.md](docs/rules/economy.md) |
| บทชีวิต, arc, NPC, ภาษาเขียน | [story-flow.md](docs/rules/story-flow.md) |
| เพิ่ม/แก้ event | [event-flow.md](docs/rules/event-flow.md) |
| HUD, modal, เมนู, responsive | [ux-ui.md](docs/rules/ux-ui.md) |
| แผนที่ จังหวัด/เขต/ย่าน, การวาง object | [maps.md](docs/rules/maps.md) |
| งานภาพ ฉาก อาคาร พื้น สเกลโลก | [art.md](docs/rules/art.md) |
| ตัวละคร NPC สัตว์ เสื้อผ้า อารมณ์ อายุ | [characters.md](docs/rules/characters.md) |
| การเคลื่อนไหวของวัตถุ/โลก/UI | [animation.md](docs/rules/animation.md) |
| เสียง UI ตัวละคร วัตถุ บรรยากาศ เพลง | [audio.md](docs/rules/audio.md) |
| ไฟล์ sprite/เสียง ภาพอ้างอิงที่เจ้าของแนบ ลิขสิทธิ์ | [assets.md](docs/rules/assets.md) |
| สร้างระบบใหม่ / แยกของออกจาก game.ts / วางไฟล์ | [architecture.md](docs/rules/architecture.md) |
| โครงโค้ด state เซฟ audit debug | [code.md](docs/rules/code.md) |

เอกสารอื่น:
- [`docs/GDD.md`](docs/GDD.md) — แหล่งความจริงด้าน design และตัวเลขปัจจุบัน (เปลี่ยน mechanic/ตัวเลข ต้องแก้ GDD) · ภาคผนวก A = รายการระบบที่ลงแล้ว
- [`docs/BALANCE.md`](docs/BALANCE.md) — ผลจำลอง balance และปัญหาที่รู้อยู่
- [`docs/research/`](docs/research/README.md) — research cards และตารางสถานะ

## 4. Definition of Done (ย่อ — ฉบับเต็มใน workflow.md)
- [ ] **`npm run check` ผ่านทั้งหมด** (typecheck → unit test → build → e2e บน 4 ขนาดจอ: console ไม่มี error + audit ทั้ง 7 ตัว = `[]` + เซฟ/โหลด + ทุกแผนที่) → [quality.md](docs/rules/quality.md)
- [ ] เพิ่ม test ตาม [quality.md §3](docs/rules/quality.md) สำหรับสิ่งที่เพิ่มใหม่
- [ ] เปิดดูภาพใน `test-results/screens/` ของฉากที่แตะ
- [ ] ดูภาพจริงของสิ่งที่แตะ — มือถือ portrait/landscape + เดสก์ท็อป, กลางวัน/กลางคืน · ฟังเสียงและดูแอนิเมชันที่เกี่ยวข้อง
- [ ] asset ใหม่มีที่มา/สิทธิ์ใช้ และอยู่ในงบขนาด
- [ ] เซฟเก่ายังโหลดได้
- [ ] research card และ GDD อัปเดตแล้ว (ถ้าเกี่ยวข้อง)
- [ ] รายงานผลเป็นภาษาไทย บอกสิ่งที่ยังไม่ได้ทำ/ไม่ได้ตรวจตรง ๆ

## 5. โครงโปรเจ็คย่อ
```
AGENTS.md · CLAUDE.md · README.md · docs/{GDD, BALANCE, BUGS, HANDOVER, rules/, research/, refs/}
src/
  main.ts · game.ts (ใหญ่ @ts-nocheck กำลังแยก) · style.css
  core/       state · save · date · util · picker          (ไม่แตะ DOM)
  sim/        time · economy · family                       (ตรรกะจำลอง pure — unit test ได้)
  content/    events · event-pools · audit
  world/      geo · districts · district-maps · city-maps · map-audit · world-data
  features/   ★ ระบบเกมแต่ละอย่าง (1 โฟลเดอร์ = 1 feature) — งานใหม่อยู่ที่นี่
  render/     วาดภาพ typed     character/  ตัวละคร     gameplay/  กิจกรรม/ฉาก
  ui/         เมนู             audio/      เสียง       data/*.json · assets/
tests/{unit, e2e, saves} · assets-src/ · design/mockup/ · scripts/ · prototype/ (legacy ห้ามแก้)
```
- **ห้ามเพิ่มไฟล์ .ts ที่ระดับบนสุดของ `src/`** — วางตามหน้าที่ และ `core`/`sim` ห้าม import จาก `ui`/`render`/`game.ts`
รายละเอียดแต่ละไฟล์: [code.md §2](docs/rules/code.md)

## 6. เมื่อกฎขัดกันหรือไม่แน่ใจ
- ลำดับ: กฎหมายไทย + content-safety → ไฟล์นี้ → `docs/rules/` → GDD → โค้ดเดิม
- ยังตัดสินไม่ได้ → **หยุดและถามเจ้าของโปรเจ็ค** พร้อมตัวเลือกและคำแนะนำ อย่าเดา
- ตอบเจ้าของโปรเจ็คเป็น **ภาษาไทย** เสมอ
