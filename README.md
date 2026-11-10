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

```
index.html
src/
  main.ts        entry
  game.ts        game engine (ทยอยแยกโมดูล)
  audio.ts       SFX + procedural music + mute
  events.ts      JSON event compiler + ops engine
  event-pools.ts JSON event loader + requires matcher
  districts.ts   8 districts + districtAt/districtStyle
  audit.ts       data/narrative/invariant audits
  save.ts        save/load v3
  actions.ts     scene entry + daily activities + work
  picker.ts      cross-run event memory
  util.ts        clamp/fmt/rnd
  date.ts        calendar helpers
  world-data.ts  buildings/trees/houses
  style.css
  data/          JSON: chapters, backgrounds, dreams, provinces, career, finance, debts, events, event-pools
prototype/       legacy vanilla-JS prototype (อ้างอิงย้อนกลับ)
docs/GDD.md      design source of truth
AGENTS.md        development + narrative-consistency rules
```

## Quality gates

```bash
npx tsc --noEmit
npm run build
```

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
- WebAudio SFX + procedural music + ปุ่ม mute (`src/audio.ts`), touch controls สำหรับมือถือ
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
