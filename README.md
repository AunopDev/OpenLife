# OpenLife

เกมจำลองชีวิตคนไทยตั้งแต่เกิดจนตาย — pixel-art top-down map + narrative life sim

## Run

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # production build → dist/
npm run preview  # preview dist/
```

## Controls

| Key | Action |
|---|---|
| Mouse / tap | เดินไปจุดที่แตะ · แตะอาคาร/จุดสนใจเพื่อเข้า/ทำกิจกรรม |
| `WASD` / arrows | เดิน (ทางเลือกสำหรับคีย์บอร์ด) |
| `E` | ใช้งานจุดที่อยู่ใกล้ / คุยกับ NPC |
| ล้อเมาส์ / pinch | ซูมเข้า–ออกแบบต่อเนื่อง (3x–8x) |
| `H` / ปุ่ม `?` | คู่มือ + เล่นทัวร์อีกครั้ง |
| `M` | สลับแผนที่เมือง ↔ มุมมองถนน |
| `F` | ภาพรวมการเงิน + จ่ายหนี้ (แตะช่องเงินก็ได้) |
| `J` | หางาน (เมื่อว่างงาน) |
| `L` | ภาพรวมชีวิต (แตะการ์ดชื่อก็ได้) |
| `T` | เข้าสถานีขนส่ง / แผนที่ย้ายจังหวัด (ปีละครั้ง) |
| `Q` | เมนูทำเร็ว (ทางเลือก) |
| `N` | เดินเวลาเอง +1/+3/+6/+12 เดือน (แตะนาฬิกาก็ได้) |

## Project

โครงโฟลเดอร์ฉบับเต็มและกฎการวางไฟล์: [docs/rules/code.md §2](docs/rules/code.md) · กฎทั้งหมด: [AGENTS.md](AGENTS.md)

```
src/
  main.ts · game.ts (กำลังแยก) · style.css
  core/      state, save, date, util, picker
  sim/       time, economy, family (ตรรกะ pure)
  content/   events, event-pools, audit
  world/     geo, districts, district-maps, city-maps, map-audit, world-data
  render/    วาดภาพ  ·  character/  ตัวละคร  ·  gameplay/  กิจกรรม  ·  ui/  เมนู  ·  audio/  เสียง
  data/      JSON (geo + ค่าตั้งแผนที่, events, chapters, ...)
tests/       unit (Vitest) · e2e (Playwright) · saves
docs/        GDD · BALANCE · BUGS · rules/ · research/
prototype/   legacy (ห้ามแก้)
```

## Quality gates

```bash
npm run check    # typecheck + unit test + build + e2e (3 ขนาดจอ) — ต้องผ่านก่อนส่งงาน
npm run test     # unit test อย่างเดียว
```
เครื่องใหม่: `npx playwright install chromium` ครั้งเดียว · ภาพหน้าจอ: `test-results/screens/`

ในเกม:
```js
__layoutAudit()          // พิกัด object
__ol.dataAudit()         // โครง event/choice
__ol.narrativeAudit()    // ความสอดคล้องเนื้อหา
__ol.invariantAudit()    // state invariants
```

## Status

- Full life arc 10 บท (0–85+), 307 events, 8 endings
- Economy/หนี้ที่จ่ายเอง (รวมสินเชื่อส่วนบุคคล), สายอาชีพ 4 track/ประเมินปลายปี/เลื่อนขั้น, ครอบครัว (ลูก/พ่อแม่/มรดก)
- Clean HUD: no on-screen D-pad or action grid
- Responsive layout for desktop, tablet, and phone (landscape + portrait) with safe-area support
- Click/tap-to-walk with A* pathfinding + tap buildings/hotspots to walk and interact
- Clickable HUD (clock = time, money = finance, name card = life), `?` help panel
- 4-step first-run coach tour with spotlight highlights
- Activity points: 3/5/7/9 actions for +1/+3/+6/+12 months, repeated actions give 100/50/25/0% benefit
- Manual hybrid time: advance +1/+3/+6/+12 months; salary, bills, interest and yearly review scale with months
- กิจกรรม 3–9 ครั้ง/ช่วงเวลา + เดินเวลาเอง, เงินเฟ้อ, เครดิตกำหนดบ้าน, ย้ายถิ่น, event ฤดูกาล, tutorial
- WebAudio SFX + procedural music + ปุ่ม mute (`src/audio/audio.ts`), touch controls สำหรับมือถือ
- Event แบบ declarative (`src/data/events.json` + `event-pools.json`) + ops engine (stat/rel/flag/salary/debt)
- 8 districts with own colors, rooftop details, street props, night glows, day/night activities, and district events
- Top-down cars for both axes, character arm-swing, smooth camera follow
- Road interaction: cars brake and shout, or clip the player with damage (camera shake only on collision)
- Life milestones + achievements in the `L` panel
- Needs/mood, skills, named people, business, collections, home upgrades, weather, legacy
- Assets & money sinks: house/car tiers, rental units (passive income), investments (0.3%/mo), trips, donations, upkeep, prestige
- Balance patch + full-life simulation report: `docs/BALANCE.md`
- Cross-run event memory, station scene, accessibility basics
- Randomised district maps (seeded) with fixed per-district landmarks; every interactable building is enterable (generic interiors); lively NPCs (merchant, police, doctor, monk, lawyer, dog, cat, wild boar) you can talk to and befriend
- ยังเหลือ: แยก `game.ts` เป็นโมดูลเพิ่ม, ปรับ crime ending / promotion balance
