# OpenLife — บั๊กที่รู้แล้ว

> กติกา: [docs/rules/quality.md §6](rules/quality.md) · ความรุนแรง: สูง (เล่นต่อไม่ได้/เสียเซฟ/ผิด content-safety) · กลาง (ผิดกฎเกม/ภาพผิดชัด) · ต่ำ (สวยงาม/เล็กน้อย)

## เปิดอยู่
| id | อาการ | วิธีทำให้เกิด | ไฟล์ที่น่าจะเกี่ยว | รุนแรง |
|---|---|---|---|---|
| B-001 | มือถือแนวตั้ง: โลกเกมเป็นแถบเล็กกลางจอ พื้นที่ว่างสีดำบน-ล่างเกือบครึ่งจอ ขัดหลัก Responsive (ห้ามเปลืองพื้นที่จอ — ux-ui.md §1 ข้อ 8) | `npm run e2e` → `test-results/screens/mobile-portrait/03-city-day.png` | `src/style.css` (`#world` 16:10), `fitStage()` ใน `src/game.ts` | กลาง |
| B-002 | ผู้เล่นสาย "สมดุล" จบชีวิตด้วยเงิน ฿28–48 ล้าน — ง่ายเกินเป้า balance | ดู `docs/BALANCE.md` | ระบบเงินใน `src/game.ts` | กลาง |
| B-003 | event ซ้ำบ่อยเมื่อเดินเวลา +1 เดือน (เห็น unique ~140 จาก 758 ครั้ง) | ดู `docs/BALANCE.md` | `src/core/picker.ts`, pool ใน `src/data/` | ต่ำ |
| B-004 | ชื่อผู้เล่นถูกใส่ใน `innerHTML` ตรง ๆ — ชื่อที่มี `<` ทำหน้าจอพัง | ตั้งชื่อ `<b>x` ตอนสร้างตัวละคร | `src/game.ts` (เช่น `openLife`, หน้าสรุป) | ต่ำ |
| B-006 | toast แจ้งเตือนซ้อนทับส่วนล่างของ modal (เช่น หน้าบิล) และทับคำใบ้หมุนจอบนมือถือแนวตั้ง | `npm run e2e` → `test-results/screens/mobile-portrait/09-bills.png` | `src/style.css` (toast/modal z-index, ตำแหน่ง) | ต่ำ |
| B-005 | debug hooks (`window.__ol` ฯลฯ) เปิดใน production build | เปิด console บนเว็บจริง | ท้าย `src/game.ts` | ต่ำ |

## แก้แล้ว
| id | อาการ | สาเหตุ | test ที่กันกลับมา |
|---|---|---|---|
| F-001 | 11 แผนที่มีจุดโต้ตอบ (สถานี ร้านตัดผม โรงพยาบาล ตลาด ออฟฟิศ ฯลฯ) ที่เดินไปไม่ถึง | ต้นไม้/บ้านสุ่มล้อม และอาคารหลักวางชิดจนหน้าประตูเป็นช่องปิด (เช่น นนทบุรี/บางบัวทอง/พิมลราช) | `maps.test.ts` "ผ่าน audit" (ตรวจ `hotspot unreachable`) |
| F-002 | event "นนท์คืนเงินพร้อมดอกเบี้ย" มีตัวเลือกเดียว ขัดหลัก "ทุกการเลือกมีราคา" | ข้อมูลใน `arc-events.json` | `events.test.ts` "ทุก event มีตัวเลือก 2–4 ข้อ" |
| F-003 | `dataAudit` นับ choice ที่ใช้ `ops` ว่า "ไม่มีผล" ถ้ายังไม่ได้ผูก apply | เงื่อนไขใน `src/content/audit.ts` ไม่รู้จัก `ops` | `events.test.ts` "dataAudit ไม่มีปัญหา" |
| F-004 | prop ชนิดที่ไม่รู้จักถูกข้ามใน district audit โดยไม่แจ้ง | `allowed[p.type]` เป็น undefined แล้วไม่ตรวจ | `src/world/map-audit.ts` แจ้ง "unknown prop type" |
| F-005 | สะพานไม้/ทางม้าลายของบางขุนเทียนถูกวาดลงแผนที่เมืองทุกจังหวัด | ตำแหน่ง hardcode ใน `buildDistrictArt` | ตรวจด้วยตา (ภาพ e2e) — แก้ใน session งานภาพ |
