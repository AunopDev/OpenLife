// @ts-nocheck
import chaptersData from './data/chapters.json';
import backgroundsData from './data/backgrounds.json';
import dreamsData from './data/dreams.json';
import provincesData from './data/provinces.json';
import careerData from './data/career.json';
import eventsData from './data/events.json';
import { playSfx, unlockAudio, isSoundEnabled, initSoundButton, setPageVisible } from './audio/audio';
import { buildJsonEvents, runOps } from './content/events';
import { createEventPools } from './content/event-pools';
import { clamp, fmt, rnd, escapeHtml } from './core/util';
import { WEEK, MONTHS, MDAYS, dateParts, nextMonthStart, isMonthEnd } from './core/date';
import { MAP_W, MAP_H, BUILDINGS, TREES, BUSHES, SCOOTERS, LIGHTS, POND, HOUSES, OFFICE, HOME, DESKS } from './world/world-data';
import { dataAudit as dataAuditImpl, invariantAudit as invariantAuditImpl, narrativeAudit as narrativeAuditImpl } from './content/audit';
import { saveGame as saveGameImpl, loadGame as loadGameImpl, clearSave as clearSaveImpl, SaveContext } from './core/save';
import { pickSeenEvent, markSeen, resetSeenMemory, seenCount } from './core/picker';
import { createActions } from './gameplay/actions';
import { openStartMenu } from './ui/menu';
import { DISTRICTS, districtAt, districtById, districtStyle } from './world/districts';
import { getDistrictMap, districtZone, DistrictSpec } from './world/district-maps';
import { getCityMap } from './world/city-maps';
import { auditDistrictSpec } from './world/map-audit';
import { geoDistricts, geoDistrict, geoNeighborhood, geoFinance, geoAudit, geoFindByZone } from './world/geo';
import * as Look from './character/appearance';
import * as LookEditor from './character/appearance-editor';
import { stats, world, flags, profile, finance, career, debts, life, SAVE_KEY } from './core/state';
import { P } from './render/palette';
import { createBills, billsPaidThisTurn, settleBillsAtMonthEnd } from './features/bills';
import { createAssets, assetPrestige } from './features/assets';
import { createBusiness } from './features/business';
import { createJobSearch } from './features/job-search';
import { ageYears, periodMonths, currentTurnKey } from './sim/time';
import { RENTAL_INCOME, totalDebt, debtMinPerMonth, costInflation, housingCost, transportCost, familyCost, assetUpkeep, rentalIncome, livingCost, taxPerMonth, socialSecurityPerMonth, fixedPerMonth, lifestyleCost, billsTotalPerTurn, passiveIncomePerMonth } from './sim/economy';
import { childAgeYears, familyTick } from './sim/family';
import { buildCityMapArt } from './render/city-map-art';
import { ArtScale, artToWorld, screenToArt } from './render/scale';
import { drawHuman32, drawAnimal32, HumanLook } from './render/character-art';
import { drawCar32, CAR_LEN } from './render/vehicle-art';

﻿'use strict';

/* ==========================================================
   OPENLIFE — WALKABLE PROTOTYPE v0.1
   เดินเองบนแผนที่ · เวลาเดินเอง · หยุดเฉพาะ event
   ========================================================== */

const TILE = 64;
// ขนาด canvas (logical px) — ปรับตามพื้นที่จริงของ #world ใน fitViewport() (Responsive: ux-ui.md §1 ข้อ 8)
let VW = 1440;
let VH = 900;

const ART = 16;              // art pixels per tile (สเกลเลกาซีที่โค้ดวาดภาพใช้)
const W2A = TILE / ART;      // world px per art px (= 4)
const W2A_OUT = TILE / (ART * 2); // world px per OUTPUT art px (= 2) — สำหรับสไปรต์ 32px
/** สเกลเอาต์พุต: 16px art → 32px art (Phase 1 ของการย้ายเป็น 32px/tile)
 *  วาดเลกาซีที่ 16 แล้วขยาย ×2 แบบ nearest — เกม/เซฟ/พิกัด world ไม่เปลี่ยน */
const OUT_SCALE = 2;
const STREET_PIX = 3;        // screen px per OUTPUT art px — street view (default)
const INTERIOR_PIX = 2;      // interiors (default)
const MAP_PIX = 1;           // city map view (default)
let PIX = STREET_PIX;        // screen px per output art px (32)
let PIX16 = PIX * OUT_SCALE; // screen px per legacy art px (16)
let zoomLevel = MAP_PIX;
let streetZoom = STREET_PIX;
let interiorZoom = INTERIOR_PIX;
let AW = VW / PIX16;         // legacy art viewport width (ใช้กับกล้อง/พิกัดเดิม)
let AH = VH / PIX16;         // legacy art viewport height
let AW32 = Math.ceil(VW / PIX);  // output art viewport width
let AH32 = Math.ceil(VH / PIX);  // output art viewport height

const cv = document.getElementById('game');
const mainCtx = cv.getContext('2d');
mainCtx.imageSmoothingEnabled = false;

const buffer = document.createElement('canvas');
buffer.width = AW;
buffer.height = AH;
const bctx = buffer.getContext('2d');
bctx.imageSmoothingEnabled = false;
let ctx = bctx;

/* บัฟเฟอร์เอาต์พุต 32px art (Phase 1) — ขยายจากบัฟเฟอร์เลกาซี ×2 แบบ nearest */
const buffer32 = document.createElement('canvas');
buffer32.width = AW32;
buffer32.height = AH32;
const b32ctx = buffer32.getContext('2d');
b32ctx.imageSmoothingEnabled = false;

function setPixelScale(p, force?: boolean) {
  if (!force && Math.abs(p - PIX) < 0.001) return;
  PIX = p;
  PIX16 = p * OUT_SCALE;
  AW = Math.ceil(VW / PIX16);
  AH = Math.ceil(VH / PIX16);
  AW32 = AW * OUT_SCALE;
  AH32 = AH * OUT_SCALE;
  buffer.width = AW;
  buffer.height = AH;
  buffer32.width = AW32;
  buffer32.height = AH32;
  bctx.imageSmoothingEnabled = false;
  b32ctx.imageSmoothingEnabled = false;
}

/* ---------- responsive layout flags ---------- */
function fitStage() {
  const portrait = window.innerHeight > window.innerWidth;
  document.body.classList.toggle('is-portrait', portrait);
  const coarse = isTouchUi();
  document.body.classList.toggle('is-touch', coarse);
  placeWorldBetweenHud();
  fitViewport();
}

/** มือถือแนวตั้ง: ให้ #world เต็มพื้นที่ระหว่างการ์ดตัวละคร (บน) กับแผงสถานะ (ล่าง) — ค่าใช้ใน style.css */
function placeWorldBetweenHud() {
  const root = document.documentElement;
  const stage = document.getElementById('stage');
  const card = document.querySelector('.char-card');
  const stats = document.getElementById('statPanel');
  if (!stage || !card || !stats || !window.matchMedia('(orientation: portrait) and (max-width: 900px)').matches) {
    root.style.removeProperty('--world-top');
    root.style.removeProperty('--world-bottom');
    return;
  }
  const s = stage.getBoundingClientRect();
  const top = Math.round(card.getBoundingClientRect().bottom - s.top + 6);
  const bottom = Math.round(s.bottom - stats.getBoundingClientRect().top + 6);
  root.style.setProperty('--world-top', top + 'px');
  root.style.setProperty('--world-bottom', bottom + 'px');
}

/** ตั้งขนาด canvas ให้สัดส่วนตรงกับ #world จริง (ไม่ยืดภาพ) — จอแคบใช้ logical px น้อยลงให้พิกเซลไม่เล็กเกินอ่าน */
function fitViewport() {
  const el = document.getElementById('world');
  if (!el) return;
  const r = el.getBoundingClientRect();
  if (r.width < 10 || r.height < 10) return;
  const w = r.height > r.width ? Math.round(clamp(r.width * 2, 720, 1440)) : 1440;
  const h = Math.round(w * clamp(r.height / r.width, 0.5, 2.4));
  if (w === VW && h === VH) return;
  VW = w;
  VH = h;
  cv.width = VW;
  cv.height = VH;
  mainCtx.imageSmoothingEnabled = false;
  setPixelScale(PIX, true);
  pausedRendered = false; // ให้ loop วาดใหม่แม้เกมหยุดอยู่ (เปิด modal)
}
window.addEventListener('resize', fitStage);
window.addEventListener('orientationchange', function () { setTimeout(fitStage, 60); });
// HUD เปลี่ยนความสูงได้ (ข้อความยาว/ตัดบรรทัด) → จัดพื้นที่โลกใหม่
if ('ResizeObserver' in window) {
  const hudObserver = new ResizeObserver(function () { fitStage(); });
  ['statPanel'].forEach(function (id) { const el = document.getElementById(id); if (el) hudObserver.observe(el); });
  const cardEl = document.querySelector('.char-card');
  if (cardEl) hudObserver.observe(cardEl);
}

/* ==========================================================
   WORLD DATA
   ========================================================== */

const CITY_W = MAP_W * TILE;
const CITY_H = MAP_H * TILE;

/* ---------- city collision grid ---------- */
const cityGrid = [];
for (let y = 0; y < MAP_H; y++) cityGrid.push(new Array(MAP_W).fill(0));

BUILDINGS.forEach(function (b) {
  for (let y = b.y; y < b.y + b.h; y++) {
    for (let x = b.x; x < b.x + b.w; x++) cityGrid[y][x] = 1;
  }
});
HOUSES.forEach(function (b) {
  for (let y = b.y; y < b.y + b.h; y++) {
    for (let x = b.x; x < b.x + b.w; x++) cityGrid[y][x] = 1;
  }
});
TREES.forEach(function (t) { cityGrid[t[1]][t[0]] = 1; });
for (let y = POND.y; y < POND.y + POND.h; y++) {
  for (let x = POND.x; x < POND.x + POND.w; x++) cityGrid[y][x] = 1;
}

/* ---------- grass texture ---------- */
const GRASS_DOTS = [];
for (let i = 0; i < 900; i++) {
  GRASS_DOTS.push({
    x: Math.floor(rnd() * CITY_W),
    y: Math.floor(rnd() * CITY_H),
    w: 3 + Math.floor(rnd() * 6),
    h: 3,
    c: rnd() < 0.5 ? '#26492f' : '#305c3d'
  });
}

/* ==========================================================
   INTERIORS
   ========================================================== */


function makeGrid(w, h) {
  const g = [];
  for (let y = 0; y < h; y++) g.push(new Array(w).fill(0));
  for (let x = 0; x < w; x++) { g[0][x] = 1; g[h - 1][x] = 1; }
  for (let y = 0; y < h; y++) { g[y][0] = 1; g[y][w - 1] = 1; }
  return g;
}

const officeGrid = makeGrid(OFFICE.w, OFFICE.h);
officeGrid[10][9] = 0; // door
DESKS.forEach(function (d) { officeGrid[d[1]][d[0]] = 1; officeGrid[d[1]][d[0] + 1] = 1; });
officeGrid[4][15] = 1; // water cooler
for (let y = 2; y <= 5; y++) officeGrid[y][16] = 1;       // filing cabinets
for (let y = 6; y <= 7; y++) {                            // meeting table
  for (let x = 6; x <= 8; x++) officeGrid[y][x] = 1;
}

const STATION = { w: 18, h: 11 };
const STATION_COUNTERS = [
  { province: 'กรุงเทพฯ', x: 2 }, { province: 'นนทบุรี', x: 4 },
  { province: 'ปทุมธานี', x: 6 }, { province: 'สมุทรปราการ', x: 8 },
  { province: 'เชียงใหม่', x: 10 }, { province: 'ขอนแก่น', x: 12 },
  { province: 'ชลบุรี', x: 14 }, { province: 'สงขลา', x: 16 }
];
const stationGrid = makeGrid(STATION.w, STATION.h);
STATION_COUNTERS.forEach(function (c) { stationGrid[2][c.x] = 1; });

const homeGrid = makeGrid(HOME.w, HOME.h);
homeGrid[8][7] = 0; // door
[[2, 2], [3, 2], [2, 3], [3, 3]].forEach(function (t) { homeGrid[t[1]][t[0]] = 1; }); // bed
[[6, 1], [7, 1]].forEach(function (t) { homeGrid[t[1]][t[0]] = 1; }); // tv
[[10, 2], [11, 2], [12, 2]].forEach(function (t) { homeGrid[t[1]][t[0]] = 1; }); // kitchen

/* ---------- ร้านค้า/สถานที่ทั่วไป (เข้าได้ทุกอาคาร) ---------- */
const SHOP = { w: 14, h: 9 };
const shopGrid = makeGrid(SHOP.w, SHOP.h);
shopGrid[8][7] = 0; // door
[[2, 2], [3, 2], [4, 2], [9, 2], [10, 2], [11, 2]].forEach(function (t) {
  shopGrid[t[1]][t[0]] = 1;
});
[[5, 4], [6, 4], [7, 4]].forEach(function (t) { shopGrid[t[1]][t[0]] = 1; });

let shopKind = '';
let shopStatic = null;
let shopStaticKind = '';
let shopReturn = { x: 0, y: 0 };

/* ==========================================================
   STATE — stats/world/flags/profile/finance/career/debts/life อยู่ใน src/state.ts
   ========================================================== */

const CAREER_RANKS = careerData;

let monthsPlayed = 0;
let pendingEnding = null;
let gameOver = false;

/* ==========================================================
   FULL LIFE · chapters, creation, event pools
   ========================================================== */

const CHAPTERS = chaptersData;

const BACKGROUNDS = backgroundsData;

const DREAMS = dreamsData;

const PROVINCES = provincesData;

/* ---------- early-life events (chapters 1–4) ---------- */

const { EARLY_EVENTS, ADULT_EVENTS, EXTRA_EVENTS, MORE_EVENTS, FAMILY_EVENTS, ARC_EVENTS, RANDOM_EVENTS, VARIANT_EVENTS } = createEventPools({
  life: life, stats: stats, finance: finance, world: world,
  ageYears: ageYears, chapterData: chapterData, childAgeYears: childAgeYears,
  clamp: clamp, totalDebt: totalDebt, toast: toast
});


/* ---------- adult chapter events (5–10) ---------- */



const player = {
  x: 6.5 * TILE,
  y: 16.4 * TILE,
  dir: 'down',
  moving: false,
  frame: 0
};

let scene = 'city';
let viewMode = 'map';       // 'map' = แผนที่เมืองเต็มจอ · 'street' = เดินชมถนน
let cityMapStatic = null;
let districtStatic = null;
let districtSpec: DistrictSpec | null = null;
let districtHotspotList: any[] = [];
let artStyleOverride: any = null;
let paused = false;
let pausedRendered = false; // วาดเฟรมเดียวตอน pause (ต้องประกาศก่อน fitStage() ตอนบูต)
let anim = 0;
let shake = 0;
let cam = { x: 0, y: 0 };
let camScene = '';
let currentHotspot = null;

const sceneInfo = {
  city: { w: CITY_W, h: CITY_H, grid: cityGrid, name: 'บางรัก · กรุงเทพฯ' },
  office: { w: OFFICE.w * TILE, h: OFFICE.h * TILE, grid: officeGrid, name: 'ออฟฟิศ · ชั้น 7' },
  home: { w: HOME.w * TILE, h: HOME.h * TILE, grid: homeGrid, name: 'บ้าน · บางรัก' },
  shop: { w: SHOP.w * TILE, h: SHOP.h * TILE, grid: shopGrid, name: 'ร้านค้า' },
  station: { w: STATION.w * TILE, h: STATION.h * TILE, grid: stationGrid, name: 'สถานีขนส่ง' }
};

/* ==========================================================
   INPUT
   ========================================================== */

const keys = {};

function isWalkKey(k) {
  return k === 'w' || k === 'a' || k === 's' || k === 'd' ||
    k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright';
}

function toggleViewMode() {
  if (scene !== 'city' || paused) return;
  viewMode = viewMode === 'map' ? 'street' : 'map';
  toast(viewMode === 'map' ? 'มุมมองแผนที่เมือง' : 'มุมมองถนน');
}

function currentPixelScale() {
  if (scene === 'city' && viewMode === 'map') return zoomLevel;
  if (scene === 'city' || scene === 'district') return streetZoom;
  return interiorZoom;
}

function adjustZoom(delta) {
  if (paused) return;
  if (scene === 'city' && viewMode === 'map') {
    zoomLevel = clamp(Math.round((zoomLevel + delta) * 4) / 4, MAP_PIX, 2.5);
  } else if (scene === 'city' || scene === 'district') {
    streetZoom = clamp(Math.round((streetZoom + delta) * 2) / 2, 2, 4);
  } else {
    interiorZoom = clamp(Math.round((interiorZoom + delta) * 2) / 2, 1, 3);
  }
}

function setZoomFromPinch(value) {
  if (scene === 'city' && viewMode === 'map') {
    zoomLevel = clamp(Math.round(value * 4) / 4, MAP_PIX, 2.5);
  } else if (scene === 'city' || scene === 'district') {
    streetZoom = clamp(Math.round(value * 2) / 2, 2, 4);
  } else {
    interiorZoom = clamp(Math.round(value * 2) / 2, 1, 3);
  }
}

/* mouse wheel = continuous zoom in every scene */
cv.addEventListener('wheel', function (e) {
  if (paused) return;
  e.preventDefault();
  adjustZoom(e.deltaY > 0 ? -0.5 : 0.5);
}, { passive: false });

window.addEventListener('keydown', function (e) {
  unlockAudio();
  const tgt = e.target as HTMLElement | null;
  if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.tagName === 'SELECT' || tgt.isContentEditable)) return;
  const k = e.key.toLowerCase();
  if (isWalkKey(k) || k === ' ') e.preventDefault();
  if (keys[k]) return;
  keys[k] = true;
  if (k === 'e' && !paused) interact();
  if (k === 'f' && !paused) openFinance();
  if (k === 'j' && !paused && life.phase === 'adult') openJobSearch();
  if (k === 'l' && !paused && life.phase === 'adult') openLife();
  if (k === 't' && !paused && life.phase === 'adult') openTravel();
  if (k === 'q' && !paused && life.phase === 'adult') openQuickActions();
  if (k === 'n' && !paused && life.phase === 'adult') openTimeAdvance();
  if (k === 'h' && !paused && life.phase === 'adult') openHelp();
  if (k === 'm') toggleViewMode();
});
window.addEventListener('keyup', function (e) {
  keys[e.key.toLowerCase()] = false;
});
window.addEventListener('blur', function () {
  Object.keys(keys).forEach(function (k) { keys[k] = false; });
});

document.addEventListener('pointerdown', function (e) {
  unlockAudio();
  if (isSoundEnabled() && e.target && e.target.closest && e.target.closest('button')) playSfx('click');
}, true);

initSoundButton();

/* pinch to switch map/street view */
let pinchStart = 0;
let pinchStartZoom = MAP_PIX;
function touchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}
cv.addEventListener('touchstart', function (e) {
  if (e.touches.length === 2) {
    tapStart = null;
    pinchStart = touchDistance(e.touches);
    pinchStartZoom = currentPixelScale();
  }
}, { passive: true });
cv.addEventListener('touchmove', function (e) {
  if (e.touches.length !== 2 || !pinchStart) return;
  if (paused) return;
  const d = touchDistance(e.touches);
  setZoomFromPinch(pinchStartZoom * (d / pinchStart));
}, { passive: true });
cv.addEventListener('touchend', function () { pinchStart = 0; });
cv.addEventListener('touchcancel', function () { pinchStart = 0; });

/* ==========================================================
   HOTSPOTS
   ========================================================== */

function doorSpot(b) {
  return {
    x: (b.door + 0.5) * TILE,
    y: (b.y + b.h + 0.15) * TILE,
    r: 108
  };
}

const {
  enterHome, leaveHome, enterStation, leaveStation,
  enterOffice, leaveOffice, buyFood, gotoGym, drink, checkup,
  busToOffice, sleep, watchTv, eatAtHome, chatCoworker,
  openWork, triggerOvertimeEvent,
  readBook, walkPark, cookMeal, callParents, sideGig, dateNight
} = createActions({
  stats: stats, world: world, life: life, flags: flags, finance: finance,
  tile: TILE,
  getScene: function () { return scene; },
  setScene: function (v) { scene = v; },
  getPlayer: function () { return player; },
  toast: toast,
  addMinutes: addMinutes,
  spendActivity: spendActivity,
  beginActivity: beginActivity,
  addNeed: addNeed,
  gainSkill: gainSkill,
  currentTurnKey: currentTurnKey,
  openModal: openModal,
  closeModal: closeModal,
  bindChoices: bindChoices,
  openJobSearch: openJobSearch,
  enterInterior: enterInterior,
  exitInterior: exitInterior
});

const cityHotspots = [
  Object.assign(doorSpot(BUILDINGS[3]), { label: 'เข้าบ้าน', act: enterHome }),
  Object.assign(doorSpot(BUILDINGS[2]), { label: 'เข้าออฟฟิศ', act: enterOffice }),
  Object.assign(doorSpot(BUILDINGS[4]), { label: 'ซื้อของที่ 7-Eleven', act: buyFood }),
  Object.assign(doorSpot(BUILDINGS[5]), { label: 'เข้ายิม', act: gotoGym }),
  Object.assign(doorSpot(BUILDINGS[6]), { label: 'นั่งร้านเหล้า', act: drink }),
  Object.assign(doorSpot(BUILDINGS[1]), { label: 'ตรวจสุขภาพ', act: checkup }),
  { x: 9.5 * TILE, y: 10.4 * TILE, r: 100, label: 'ขึ้นรถเมล์ไปออฟฟิศ', act: busToOffice },
  { x: 14.5 * TILE, y: 10.4 * TILE, r: 90, label: 'เข้าสถานีขนส่ง', act: enterStation },
  { x: 16.0 * TILE, y: 10.4 * TILE, r: 92, label: 'รถเมล์สายใต้ → บางขุนเทียน', act: function () { enterDistrict('bangkhunthian'); } },
  { x: 21.5 * TILE, y: 10.4 * TILE, r: 90, label: 'ตัดผมที่ร้านตัดผม', act: openSalon },
  { x: 27.0 * TILE, y: 10.4 * TILE, r: 90, label: 'ซื้อเสื้อผ้าที่ร้าน', act: openClothingShop }
].concat(DISTRICTS.map(function (d) {
  return {
    x: d.spot[0] * TILE,
    y: d.spot[1] * TILE,
    r: 86,
    label: d.activity,
    districtId: d.id,
    act: function () { return districtActivity(d.id); }
  };
}));

const officeHotspots = [
  { x: 8.6 * TILE, y: 4.4 * TILE, r: 100, label: 'ทำงานที่โต๊ะ', act: openWork },
  { x: 15.5 * TILE, y: 4.4 * TILE, r: 100, label: 'คุยกับเพื่อนร่วมงาน', act: chatCoworker },
  { x: 9.5 * TILE, y: 10.25 * TILE, r: 90, label: 'ออกจากออฟฟิศ', act: leaveOffice }
];

const homeHotspots = [
  { x: 3.0 * TILE, y: 4.4 * TILE, r: 100, label: 'นอน / เดินเวลา', act: openSleep },
  { x: 6.5 * TILE, y: 2.4 * TILE, r: 100, label: 'ดูทีวี', act: watchTv },
  { x: 11.0 * TILE, y: 3.4 * TILE, r: 100, label: 'กินข้าว', act: eatAtHome },
  { x: 9.4 * TILE, y: 3.2 * TILE, r: 90, label: 'จ่ายบิลที่อยู่', act: openBills },
  { x: 12.4 * TILE, y: 3.2 * TILE, r: 86, label: 'ปรับปรุงบ้าน', act: openHomeUpgrade },
  { x: 12.4 * TILE, y: 2.2 * TILE, r: 92, label: 'แต่งตัวหน้ากระจก', act: openMirror },
  { x: 7.5 * TILE, y: 8.25 * TILE, r: 90, label: 'ออกจากบ้าน', act: leaveHome }
];

const stationHotspots = STATION_COUNTERS.map(function (c) {
  return {
    x: (c.x + 0.5) * TILE,
    y: 3.4 * TILE,
    r: 84,
    label: 'ไป ' + c.province,
    act: openMigration
  };
}).concat([
  { x: 9 * TILE, y: 9.4 * TILE, r: 90, label: 'ออกจากสถานี', act: leaveStation }
]);

function hotspots() {
  if (scene === 'office') return officeHotspots;
  if (scene === 'home') return homeHotspots;
  if (scene === 'station') return stationHotspots;
  if (scene === 'shop') return shopHotspots();
  if (scene === 'district') return districtHotspotList;
  return cityHotspots;
}

function nearestHotspot() {
  let best = null;
  let bestD = Infinity;
  hotspots().forEach(function (h) {
    const dx = player.x - h.x;
    const dy = player.y - h.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < h.r && d < bestD) { best = h; bestD = d; }
  });
  return best;
}

function interact() {
  if (currentNpc) { talkToNpc(currentNpc); return; }
  if (currentHotspot) currentHotspot.act();
}

/* ==========================================================
   TAP / CLICK TO MOVE (The Lands style)
   ========================================================== */

let walkPath = [];
let pendingHotspot = null;
let moveMarker = null;
let tapStart = null;
let coachRefresh = null;

function isTouchUi() {
  try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; }
}

function walkableTile(sc, tx, ty) {
  const info = sceneInfo[sc];
  if (!info) return false;
  if (tx < 0 || ty < 0 || tx >= info.grid[0].length || ty >= info.grid.length) return false;
  return info.grid[ty][tx] === 0;
}

function nearestWalkableTile(sc, tx, ty, maxR) {
  if (walkableTile(sc, tx, ty)) return { x: tx, y: ty };
  for (let r = 1; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = tx + dx;
        const ny = ty + dy;
        if (walkableTile(sc, nx, ny) && canStand(sc, (nx + 0.5) * TILE, (ny + 0.5) * TILE)) return { x: nx, y: ny };
      }
    }
  }
  return null;
}

function findPathTiles(sc, sx, sy, tx, ty) {
  if (!walkableTile(sc, sx, sy) || !walkableTile(sc, tx, ty)) return null;
  if (sx === tx && sy === ty) return [{ x: tx, y: ty }];
  const grid = sceneInfo[sc].grid;
  const w = grid[0].length;
  const idx = function (x, y) { return y * w + x; };
  const open = [{ x: sx, y: sy, g: 0, f: 0, p: null }];
  const best = {};
  best[idx(sx, sy)] = 0;
  const dirs = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]
  ];
  let guard = 0;
  while (open.length && guard++ < 6000) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur.x === tx && cur.y === ty) {
      const out = [];
      let n = cur;
      while (n) { out.push({ x: n.x, y: n.y }); n = n.p; }
      out.reverse();
      return out;
    }
    for (let di = 0; di < dirs.length; di++) {
      const d = dirs[di];
      const nx = cur.x + d[0];
      const ny = cur.y + d[1];
      if (!walkableTile(sc, nx, ny)) continue;
      if (d[0] && d[1] && (!walkableTile(sc, cur.x + d[0], cur.y) || !walkableTile(sc, cur.x, cur.y + d[1]))) continue;
      const ng = cur.g + d[2];
      const k = idx(nx, ny);
      if (best[k] !== undefined && best[k] <= ng) continue;
      best[k] = ng;
      open.push({ x: nx, y: ny, g: ng, f: ng + Math.abs(tx - nx) + Math.abs(ty - ny), p: cur });
    }
  }
  return null;
}

function lineClear(x1, y1, x2, y2) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / 10));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!canStand(scene, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
  }
  return true;
}

function buildWalkPath(tiles) {
  const pts = [{ x: player.x, y: player.y }].concat(tiles.map(function (t) {
    return { x: (t.x + 0.5) * TILE, y: (t.y + 0.5) * TILE };
  }));
  const out = [];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !lineClear(pts[i].x, pts[i].y, pts[j].x, pts[j].y)) j--;
    out.push(pts[j]);
    i = j;
  }
  return out;
}

function approachTileForHotspot(h) {
  const sc = scene;
  const cx = h.x / TILE;
  const cy = h.y / TILE;
  const radius = Math.max(1, Math.ceil((h.r + 6) / TILE));
  let best = null;
  let bestScore = Infinity;
  for (let ty = Math.floor(cy) - radius; ty <= Math.ceil(cy) + radius; ty++) {
    for (let tx = Math.floor(cx) - radius; tx <= Math.ceil(cx) + radius; tx++) {
      if (!walkableTile(sc, tx, ty)) continue;
      const wx = (tx + 0.5) * TILE;
      const wy = (ty + 0.5) * TILE;
      const dHot = Math.hypot(wx - h.x, wy - h.y);
      if (dHot > h.r - 10) continue;
      if (!canStand(sc, wx, wy)) continue;
      const score = Math.hypot(wx - player.x, wy - player.y) + dHot * 0.2;
      if (score < bestScore) { bestScore = score; best = { x: tx, y: ty }; }
    }
  }
  return best;
}

function hotspotAtWorld(wx, wy) {
  let best = null;
  let bestD = Infinity;
  hotspots().forEach(function (h) {
    const d = Math.hypot(wx - h.x, wy - h.y);
    if (d <= Math.max(h.r, 96) && d < bestD) { best = h; bestD = d; }
  });
  return best;
}

function buildingHotspotAtWorld(wx, wy) {
  const tx = wx / TILE;
  const ty = wy / TILE;

  // แผนที่ย่าน (district): แตะตัวอาคาร = เดินไปประตูแล้วเข้า
  if (scene === 'district' && districtSpec) {
    for (let i = 0; i < districtSpec.buildings.length; i++) {
      const b = districtSpec.buildings[i];
      if (tx < b.x - 0.4 || tx > b.x + b.w + 0.4 || ty < b.y - 1 || ty > b.y + b.h + 0.5) continue;
      const dx = (b.door + 0.5) * TILE;
      const dy = (b.y + b.h + 0.15) * TILE;
      let found = null;
      let bd = Infinity;
      districtHotspotList.forEach(function (h) {
        const d = Math.hypot(h.x - dx, h.y - dy);
        if (d < bd && d < 150) { bd = d; found = h; }
      });
      if (found) return found;
    }
    return null;
  }

  if (scene !== 'city') return null;
  for (let i = 0; i < BUILDINGS.length; i++) {
    const b = BUILDINGS[i];
    if (tx < b.x || tx > b.x + b.w || ty < b.y - 1 || ty > b.y + b.h) continue;
    const ds = doorSpot(b);
    let found = null;
    hotspots().forEach(function (h) {
      if (!found && Math.abs(h.x - ds.x) < 1 && Math.abs(h.y - ds.y) < 1) found = h;
    });
    if (found) return found;
  }
  return null;
}

function artScale(): ArtScale {
  return { tilePx: TILE, artPx: ART, screenPx: PIX16 };
}

function screenToWorld(clientX, clientY) {
  const rect = cv.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const cx = (clientX - rect.left) / rect.width * VW;
  const cy = (clientY - rect.top) / rect.height * VH;
  const mapView = scene === 'city' && viewMode === 'map';
  let camAx;
  let camAy;
  if (mapView) {
    camAx = Math.round((CITY_AW - AW) / 2);
    camAy = Math.round((CITY_AH - AH) / 2);
  } else {
    camAx = Math.round(cam.x / W2A);
    camAy = Math.round(cam.y / W2A);
  }
  const s = artScale();
  return { x: artToWorld(screenToArt(cx, camAx, s), s), y: artToWorld(screenToArt(cy, camAy, s), s) };
}

function clearWalk() {
  walkPath = [];
  pendingHotspot = null;
  moveMarker = null;
}

function handleWorldTap(clientX, clientY) {
  if (paused || gameOver || life.phase !== 'adult') return;
  const w = screenToWorld(clientX, clientY);
  if (!w) return;
  const h = hotspotAtWorld(w.x, w.y) || buildingHotspotAtWorld(w.x, w.y);
  let target = null;
  if (h) {
    target = approachTileForHotspot(h);
  } else {
    const tx = Math.floor(w.x / TILE);
    const ty = Math.floor(w.y / TILE);
    if (walkableTile(scene, tx, ty) && canStand(scene, (tx + 0.5) * TILE, (ty + 0.5) * TILE)) {
      target = { x: tx, y: ty };
    } else {
      target = nearestWalkableTile(scene, tx, ty, 2);
    }
  }
  if (!target) { toast('ตรงนั้นเดินไปไม่ได้'); return; }
  let sx = Math.floor(player.x / TILE);
  let sy = Math.floor(player.y / TILE);
  if (!walkableTile(scene, sx, sy)) {
    const alt = nearestWalkableTile(scene, sx, sy, 2);
    if (alt) { sx = alt.x; sy = alt.y; }
  }
  const tiles = findPathTiles(scene, sx, sy, target.x, target.y);
  if (!tiles) { toast('หาเส้นทางไปตรงนั้นไม่ได้'); return; }
  const path = buildWalkPath(tiles);
  if (!path.length) return;
  walkPath = path;
  pendingHotspot = h || null;
  const last = path[path.length - 1];
  moveMarker = { x: last.x, y: last.y };
  playSfx('click');
}

function followWalkPath(dt) {
  const wp = walkPath[0];
  if (!wp) return;
  const dx = wp.x - player.x;
  const dy = wp.y - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2.5) {
    walkPath.shift();
    if (!walkPath.length) {
      moveMarker = null;
      const h = pendingHotspot;
      pendingHotspot = null;
      if (h) {
        const near = nearestHotspot();
        if (near && (near === h || (near.label === h.label && Math.abs(near.x - h.x) < 1))) {
          currentHotspot = near;
        } else if (Math.hypot(player.x - h.x, player.y - h.y) <= h.r + 14) {
          currentHotspot = h;
        } else {
          return;
        }
        interact();
      }
    }
    return;
  }
  const speed = (scene === 'city' && viewMode === 'map' ? 300 : (scene === 'city' ? 145 : 172)) * dt;
  const step = Math.min(dist, speed);
  const nx = player.x + (dx / dist) * step;
  const ny = player.y + (dy / dist) * step;
  const ox = player.x;
  const oy = player.y;
  if (canStand(scene, nx, player.y)) player.x = nx;
  if (canStand(scene, player.x, ny)) player.y = ny;
  if (Math.hypot(player.x - ox, player.y - oy) < Math.max(0.4, step * 0.25)) {
    clearWalk();
    return;
  }
  player.moving = true;
  player.frame += dt * 8;
  if (Math.abs(dx) > Math.abs(dy)) player.dir = dx > 0 ? 'right' : 'left';
  else player.dir = dy > 0 ? 'down' : 'up';
}

function drawMoveMarker() {
  // เส้นทางที่กำลังเดิน (จุดนำทาง) — ช่วยให้เห็นว่ากดไปไหน
  if (walkPath && walkPath.length) {
    ctx.globalAlpha = 0.55;
    let prev = { x: player.x, y: player.y };
    for (let i = 0; i < walkPath.length; i++) {
      const p = walkPath[i];
      const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
      const steps = Math.max(1, Math.round(dist / 30));
      for (let s = 1; s <= steps; s++) {
        const wx = prev.x + (p.x - prev.x) * s / steps;
        const wy = prev.y + (p.y - prev.y) * s / steps;
        px(Math.round(wx / W2A), Math.round(wy / W2A) - 1, 1, 1, '#ffd75e');
      }
      prev = p;
    }
    ctx.globalAlpha = 1;
  }

  if (!moveMarker) return;
  const x = Math.round(moveMarker.x / W2A);
  const y = Math.round(moveMarker.y / W2A);
  const pulse = 1 + Math.sin(anim * 6) * 0.18;
  const rx = Math.max(3, Math.round(5 * pulse)) + 2;
  ctx.strokeStyle = 'rgba(255,215,94,.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, Math.max(2, Math.round(rx * 0.5)), 0, 0, Math.PI * 2);
  ctx.stroke();
  px(x - 1, y - 1, 2, 2, '#ffd75e');
}

cv.addEventListener('pointerdown', function (e) {
  if (e.button !== undefined && e.button !== 0) return;
  tapStart = { x: e.clientX, y: e.clientY, id: e.pointerId };
});
cv.addEventListener('pointerup', function (e) {
  if (!tapStart || tapStart.id !== e.pointerId) return;
  const moved = Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y);
  tapStart = null;
  if (moved > 14) return;
  handleWorldTap(e.clientX, e.clientY);
});
cv.addEventListener('pointercancel', function () { tapStart = null; });
cv.addEventListener('pointermove', function (e) {
  if (e.pointerType === 'touch') return;
  const w = screenToWorld(e.clientX, e.clientY);
  const hit = w && (hotspotAtWorld(w.x, w.y) || buildingHotspotAtWorld(w.x, w.y));
  cv.style.cursor = hit ? 'pointer' : 'default';
});

/* ==========================================================
   ACTIONS
   ========================================================== */

function toast(text) {
  const wrap = document.getElementById('toast');
  const d = document.createElement('div');
  d.className = 'toast-item';
  d.textContent = text;
  wrap.appendChild(d);
  setTimeout(function () { d.remove(); }, 2600);
}

function pickTrafficShout() {
  const lines = [
    'เฮ้ย! ดูทางบ้างสิ!',
    'จะเดินกลางถนนทำไม!',
    'เบรกแทบไม่ทันเลย!',
    'หลบหน่อยครับ!',
    'ตาไม่ดูรถกันหรือไง!'
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

function addMinutes(m) {
  world.minutes += m;
  while (world.minutes >= 1440) {
    world.minutes -= 1440;
    world.day += 1;
    stats.energy = clamp(stats.energy - 8, 0, 100);
    flags.workedToday = false;
  }
}

/* ==========================================================
   MODALS
   ========================================================== */

const overlay = document.getElementById('overlay');
const modal = document.getElementById('modal');

function openModal(html) {
  paused = true;
  modal.innerHTML = html;
  overlay.classList.remove('hidden');
  document.body.classList.add('modal-open'); // toast ย้ายขึ้นบนไม่ทับ modal (B-006)
  const first = modal.querySelector('button:not([disabled])');
  if (first) first.focus();
}
function closeModal() {
  paused = false;
  overlay.classList.add('hidden');
  document.body.classList.remove('modal-open');
  modal.innerHTML = '';
}

function bindChoices(fn) {
  modal.querySelectorAll('[data-choice]').forEach(function (b) {
    b.addEventListener('click', function () {
      fn(Number(b.getAttribute('data-choice')));
    });
  });
}

﻿
/* ---------- EXTRA EVENT PACK · +66 events ---------- */

ADULT_EVENTS[5] = (ADULT_EVENTS[5] || []).concat(jsonEvents(eventsData.chapter5 || []));
ADULT_EVENTS[8] = (ADULT_EVENTS[8] || []).concat(jsonEvents(eventsData.chapter8 || []));





/* ---------- EVENT PACK 2 · +41 events (total >150) ---------- */




/* ---------- FAMILY EVENTS · ลูกโต / พ่อแม่ชรา / หลาน ---------- */



/* ==========================================================
   LIFE ENGINE · เกิด → ตาย
   ========================================================== */

function chapterData(n) {
  return CHAPTERS[(n || life.chapter) - 1];
}

const ACTIONS_PER_TURN = 3;

function actionBudget() {
  const m = Math.max(1, life.periodMonths || 1);
  if (m >= 12) return 9;
  if (m >= 6) return 7;
  if (m >= 3) return 5;
  return ACTIONS_PER_TURN;
}

function activitiesLeft() {
  return Math.max(0, actionBudget() - (life.actionsThisTurn || 0));
}

function spendActivity() {
  if (life.phase !== 'adult') return true;
  if (activitiesLeft() <= 0) {
    toast('กิจกรรมช่วงนี้ครบ ' + actionBudget() + ' ครั้งแล้ว · เดินเวลาเพื่อเริ่มช่วงใหม่');
    return false;
  }
  life.actionsThisTurn = (life.actionsThisTurn || 0) + 1;
  updateHud();
  return true;
}

function beginActivity(key) {
  if (!life.activityUses) life.activityUses = {};
  const uses = life.activityUses[key] || 0;
  life.activityUses[key] = uses + 1;
  return uses <= 0 ? 1 : uses === 1 ? 0.5 : uses === 2 ? 0.25 : 0;
}

const FX_LABEL = {
  health: 'สุขภาพ', heart: 'ใจ', energy: 'พลังงาน', money: 'เงิน',
  kpi: 'ผลงาน', credit: 'เครดิต', smarts: 'ปัญญา', social: 'มนุษย์'
};
const REL_LABEL = { family: 'ครอบครัว', friend: 'เพื่อน', love: 'คู่รัก', boss: 'หัวหน้า' };
const TRACK_LABEL = { corporate: 'บริษัทมหาชน', multinational: 'บริษัทข้ามชาติ', sme: 'SME', factory: 'โรงงาน/สายช่าง' };

function fxHints(fx) {
  if (!fx) return '';
  const out = [];
  Object.keys(FX_LABEL).forEach(function (k) {
    if (!fx[k]) return;
    const v = fx[k];
    const cls = v > 0 ? 'up' : 'down';
    const sign = v > 0 ? '+' : '';
    out.push('<span class="hint ' + cls + '">' + FX_LABEL[k] + ' ' + sign + v + '</span>');
  });
  if (fx.rel) {
    Object.keys(fx.rel).forEach(function (k) {
      const v = fx.rel[k];
      if (!v) return;
      out.push('<span class="hint ' + (v > 0 ? 'up' : 'down') + '">' + (REL_LABEL[k] || k) + ' ' + (v > 0 ? '+' : '') + v + '</span>');
    });
  }
  if (fx.trait) out.push('<span class="hint req">ได้ trait: ' + fx.trait + '</span>');
  if (fx.flags) out.push('<span class="hint req">สถานะชีวิตเปลี่ยน</span>');
  return out.slice(0, 5).join('');
}

function applyActivityFx(fx, mult) {
  if (!fx || mult >= 1) { applyLifeFx(fx); return; }
  const scaled = JSON.parse(JSON.stringify(fx));
  ['health', 'heart', 'energy', 'kpi', 'credit', 'smarts', 'social'].forEach(function (k) {
    if (typeof scaled[k] === 'number' && scaled[k] > 0) scaled[k] = Math.round(scaled[k] * mult);
  });
  if (typeof scaled.money === 'number' && scaled.money > 0) scaled.money = Math.round(scaled.money * mult);
  if (typeof scaled.child === 'number' && scaled.child > 0) scaled.child = Math.round(scaled.child * mult);
  if (scaled.rel) {
    Object.keys(scaled.rel).forEach(function (k) {
      if (scaled.rel[k] > 0) scaled.rel[k] = Math.round(scaled.rel[k] * mult);
    });
  }
  applyLifeFx(scaled);
}

function applyChoiceOutcome(c) {
  if (!c) return;
  if (c.random && c.random.length) {
    const roll = Math.random();
    let acc = 0;
    let picked = c.random[c.random.length - 1];
    for (let i = 0; i < c.random.length; i++) {
      const b = c.random[i];
      if (b.chance === undefined) { picked = b; break; }
      acc += b.chance;
      if (roll < acc) { picked = b; break; }
    }
    if (picked.apply) picked.apply();
    else applyLifeFx(picked.fx);
    if (picked.toast) toast(picked.toast);
    return;
  }
  if (c.apply) c.apply();
  else applyLifeFx(c.fx);
}

function applyLifeFx(fx) {
  if (!fx) return;
  ['health', 'heart', 'energy', 'money', 'kpi', 'credit', 'smarts', 'social'].forEach(function (k) {
    if (!fx[k]) return;
    let delta = fx[k];
    if (k === 'heart' && delta < 0) {
      if (life.traits.indexOf('อดทน') >= 0) delta *= 0.7;
      if (life.traits.indexOf('อ่อนไหว') >= 0) delta *= 1.2;
    }
    if (k === 'energy' && delta < 0 && life.traits.indexOf('แรงฮึด') >= 0) delta *= 0.8;
    if (k === 'money' && delta < 0 && life.traits.indexOf('ประหยัด') >= 0) delta *= 0.9;
    if (k === 'kpi' && delta > 0) {
      if (life.traits.indexOf('ขยัน') >= 0) delta *= 1.2;
      if (life.traits.indexOf('แรงฮึด') >= 0) delta *= 1.15;
    }
    const v = stats[k] + Math.round(delta);
    stats[k] = k === 'money' ? Math.max(0, v) : clamp(v, 0, 100);
  });
  if (fx.rel) {
    Object.keys(fx.rel).forEach(function (k) {
      life.rel[k] = clamp((life.rel[k] || 0) + fx.rel[k], 0, 100);
    });
  }
  if (fx.flags) {
    Object.keys(fx.flags).forEach(function (k) { life.flags[k] = fx.flags[k]; });
    if (fx.flags.kid && (!life.child || life.child.ageMonths < 0)) {
      life.child = { name: 'ลูก', ageMonths: 0, relation: 70 };
    }
  }
  if (fx.child) {
    life.child.relation = clamp((life.child.relation || 70) + fx.child, 0, 100);
  }
  if (fx.trait && life.traits.indexOf(fx.trait) < 0) life.traits.push(fx.trait);
}

function lifeEventHtml(ev, meta) {
  const order = (ev.choices || []).map(function (c, i) { return i; });
  if (order.length >= 3 && Math.random() < 0.5) {
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = order[i];
      order[i] = order[j];
      order[j] = t;
    }
  }
  const art = life.phase === 'early'
    ? '<div class="story-head"><canvas id="storyArt" width="660" height="112"></canvas><div class="story-fade"></div></div>'
    : '';
  return art +
    '<div class="ev-head"><span class="ev-chip">' + meta.chip + '</span><span>' + meta.sub + '</span></div>' +
    '<div class="ev-title">' + ev.title + '</div>' +
    '<div class="ev-text">' + ev.text + '</div>' +
    '<div class="choices">' +
    order.map(function (oi, di) {
      const c = ev.choices[oi];
      const hints = c.hint ? hintHtml(c.hint) : fxHints(c.fx);
      return '<button class="choice" data-choice="' + oi + '"><span class="c-label">' + (di + 1) + '. ' + c.label + '</span>' +
        '<span class="c-hint">' + hints + '</span></button>';
    }).join('') +
    '</div>';
}

/* ---------- ภาพประกอบวัยเด็ก (ทำให้ช่วงแรกมีชีวิตขึ้น) ---------- */
function drawStoryArt() {
  const cv = document.getElementById('storyArt') as HTMLCanvasElement | null;
  if (!cv) return;
  const c = cv.getContext('2d');
  if (!c) return;
  const W = cv.width;
  const H = cv.height;
  const ch = life.chapter || 1;
  const r = function (x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

  // sky
  const sky = ch <= 1 ? '#1a2550' : ch === 2 ? '#3f6fa8' : ch === 3 ? '#2f4a7a' : '#243a5e';
  r(0, 0, W, H, sky);
  // stars for early chapters
  if (ch <= 3) {
    for (let i = 0; i < 26; i++) {
      const sx = (i * 97) % W;
      const sy = (i * 37) % 52;
      r(sx, sy, 2, 2, 'rgba(255,255,255,.35)');
    }
  }

  if (ch === 1) {
    // บ้าน: ห้องนอน
    r(0, 72, W, 40, '#4a3a2c');
    r(0, 60, W, 14, '#3a2c22');
    r(70, 30, 70, 34, 'rgba(255,233,168,.18)');
    r(76, 34, 58, 26, '#0b1a36');
    r(84, 40, 42, 14, '#ffe9a8');
    // เตียงเด็ก
    r(250, 66, 90, 24, '#c9d6ff');
    r(250, 60, 90, 8, '#e8eefc');
    r(256, 52, 78, 8, '#ffd75e');
    // พ่อแม่
    r(120, 66, 14, 30, '#2b3a7a'); r(126, 58, 8, 8, '#f0c9a0');
    r(150, 66, 14, 30, '#8a4a5a'); r(156, 58, 8, 8, '#f0c9a0');
    // โมบาย
    r(430, 26, 2, 24, '#c9d6ff');
    r(410, 50, 42, 3, '#ffd75e');
    r(420, 53, 6, 8, '#ff8fb1');
    r(436, 53, 6, 8, '#7dd3fc');
  } else if (ch === 2) {
    // โรงเรียน + สนาม
    r(0, 78, W, 34, '#3f6b3f');
    r(60, 22, 240, 56, '#8a7a63');
    r(54, 16, 252, 10, '#6b5a44');
    r(74, 34, 26, 22, '#ffe9a8');
    r(116, 34, 26, 22, '#ffe9a8');
    r(158, 34, 26, 22, '#ffe9a8');
    r(200, 40, 40, 38, '#4a3a2c');
    r(214, 42, 12, 12, '#c9d6ff');
    // ต้นไม้
    r(360, 54, 8, 34, '#5a4433');
    r(342, 26, 44, 34, '#2b5c3d');
    r(348, 18, 32, 16, '#357047');
    // เด็กวิ่ง
    r(430, 66, 10, 24, '#e85c6c'); r(432, 58, 8, 8, '#f0c9a0');
    r(480, 66, 10, 24, '#4a6fd6'); r(482, 58, 8, 8, '#e0b48c');
    r(540, 68, 14, 22, '#ffd75e'); r(545, 60, 8, 8, '#f0c9a0');
    // ลูกบอล
    r(510, 80, 10, 10, '#ff8fb1');
    // ดวงอาทิตย์
    r(560, 14, 26, 26, '#ffe9a8');
  } else if (ch === 3) {
    // ห้องเรียน
    r(0, 74, W, 38, '#3a2c22');
    r(40, 18, 240, 48, '#1e3a34');
    r(48, 26, 224, 32, '#2a4a40');
    r(60, 32, 60, 4, 'rgba(255,255,255,.35)');
    r(60, 40, 140, 4, 'rgba(255,255,255,.25)');
    r(60, 48, 90, 4, 'rgba(255,255,255,.2)');
    // โต๊ะ
    r(320, 70, 120, 8, '#8a6448'); r(330, 78, 6, 22, '#6b4a3a'); r(424, 78, 6, 22, '#6b4a3a');
    r(330, 58, 26, 12, '#e8eefc');
    // ครู
    r(500, 44, 26, 52, '#8a4a5a'); r(506, 32, 14, 14, '#f0c9a0');
    // กระดาน
    r(470, 24, 140, 34, '#1e3a34');
    r(478, 30, 120, 22, '#2f5a4a');
  } else {
    // มหาวิทยาลัย/ที่ทำงาน
    r(0, 76, W, 36, '#3f5c3e');
    r(80, 20, 200, 58, '#7a5240');
    r(70, 14, 220, 10, '#5a3622');
    r(96, 36, 24, 42, '#e8eefc'); r(140, 36, 24, 42, '#c9d6ff'); r(184, 36, 24, 42, '#e8eefc');
    r(236, 42, 28, 36, '#4a3a2c');
    r(320, 54, 8, 34, '#5a4433'); r(300, 26, 48, 36, '#2b5c3d');
    r(430, 70, 120, 8, '#8a6448');
    r(450, 50, 12, 24, '#2b3a7a'); r(453, 42, 8, 8, '#f0c9a0');
    r(500, 50, 12, 24, '#8a4a5a'); r(503, 42, 8, 8, '#e0b48c');
  }

  // scanline overlay
  c.fillStyle = 'rgba(0,0,0,.10)';
  for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 1);
}

function applyBackground(id) {
  const b = BACKGROUNDS.filter(function (x) { return x.id === id; })[0] || BACKGROUNDS[1];
  stats.health = b.health;
  stats.heart = b.heart;
  stats.energy = 100;
  stats.money = b.money;
  stats.kpi = 50;
  stats.credit = 65;
  stats.smarts = 50;
  stats.social = 50;
  life.rel.family = b.family;
  if (b.trait && life.traits.indexOf(b.trait) < 0) life.traits.push(b.trait);
}

function openLifeCreation() {
  profile.job = 'เด็ก';
  profile.chapter = 'ปฐมวัย';
  profile.age = 0;
  if (!life.appearance) life.appearance = Look.normaliseAppearance(Look.DEFAULT_APPEARANCE);
  else life.appearance = Look.normaliseAppearance(life.appearance);
  updateHud();
  const provinceOpts = PROVINCES.map(function (p) {
    return '<option' + (p === life.province ? ' selected' : '') + '>' + p + '</option>';
  }).join('');
  const genders = ['ชาย', 'หญิง', 'อื่น ๆ'].map(function (g) {
    return '<option' + (g === life.gender ? ' selected' : '') + '>' + g + '</option>';
  }).join('');
  const html =
    '<div class="ev-head"><span class="ev-chip">สร้างชีวิต</span><span>พ.ศ. 2547</span></div>' +
    '<div class="ev-title">เกิดมาเป็นใคร?</div>' +
    '<div class="ev-text">ทุกชีวิตเริ่มจากจุดที่ไม่ได้เลือก — แต่หลังจากนี้ คุณจะเลือกเอง</div>' +
    '<div class="field-row">' +
    '<div class="field"><label>ชื่อ</label><input id="crFirst" maxlength="16" placeholder="สมชาย" /></div>' +
    '<div class="field"><label>นามสกุล</label><input id="crLast" maxlength="16" placeholder="ใจดี" /></div>' +
    '</div>' +
    '<div class="field"><label>เพศ</label><select id="crGender">' + genders + '</select></div>' +
    '<div class="field"><label>จังหวัดเกิด</label><select id="crProvince">' + provinceOpts + '</select></div>' +
    '<button class="btn-primary" id="crNext">ต่อไป ▶ แต่งหน้าตา</button>';
  openModal(html);
  const firstEl = document.getElementById('crFirst') as HTMLInputElement | null;
  const lastEl = document.getElementById('crLast') as HTMLInputElement | null;
  const nameParts = (profile.name || 'สมชาย ใจดี').trim().split(/\s+/);
  if (firstEl) firstEl.value = nameParts[0] || '';
  if (lastEl) lastEl.value = nameParts.slice(1).join(' ') || '';
  document.getElementById('crNext').addEventListener('click', function () {
    const first = ((document.getElementById('crFirst') as HTMLInputElement).value || '').trim();
    const last = ((document.getElementById('crLast') as HTMLInputElement).value || '').trim();
    profile.name = (first + ' ' + last).trim() || 'ไม่มีชื่อ';
    life.gender = (document.getElementById('crGender') as HTMLSelectElement).value;
    life.province = (document.getElementById('crProvince') as HTMLSelectElement).value;
    life.homeProvince = life.province;
    life.khet = '';
    life.khetName = '';
    life.neighborhood = '';
    life.neighborhoodName = '';
    showAppearanceStep();
  });
}

function showAppearanceStep() {
  const opts = {
    app: life.appearance,
    mode: 'all',
    title: 'หน้าตาแบบไหน?',
    subtitle: 'เลือกได้อิสระ ไม่จำกัดเพศ',
    price: 0,
    confirmLabel: 'ต่อไป ▶ เลือกเขต',
    backLabel: '← กลับไปแก้ชื่อ',
    previewAge: 22,
    onBack: openLifeCreation,
    onConfirm: function (app, _price) {
      life.appearance = app;
      drawPortrait();
      showDistrictStep();
    },
    canPay: function () { return true; },
    onNeedMoney: function () {},
    onSound: function () { playSfx('click'); }
  };
  openModal(LookEditor.appearanceEditorHtml(opts));
  LookEditor.wireAppearanceEditor(modal, opts);
}

function openLookEditor(config) {
  if (life.phase !== 'adult' || paused) return;
  const price = config.price || 0;
  const opts = {
    app: life.appearance || Look.DEFAULT_APPEARANCE,
    mode: config.mode || 'all',
    title: config.title,
    subtitle: config.subtitle,
    price: price,
    confirmLabel: config.confirmLabel,
    backLabel: config.backLabel || 'ปิด',
    previewAge: ageYears(),
    onBack: closeModal,
    canPay: function (cost) { return stats.money >= cost; },
    onNeedMoney: function () { toast('เงินไม่พอ · ต้องมี ฿' + fmt(price)); },
    onConfirm: function (app, cost) {
      const before = JSON.stringify(life.appearance || {});
      if (cost > 0) stats.money -= cost;
      life.appearance = app;
      life.grooming = clamp((life.grooming || 0) + (config.grooming || 0), 0, 100);
      addMinutes(config.minutes || 45);
      drawPortrait();
      saveGame();
      closeModal();
      updateHud();
      toast(config.doneText || 'เรียบร้อย · ความเรียบร้อย +' + (config.grooming || 0));
      if (before !== JSON.stringify(app)) looksReaction();
    },
    onSound: function () { playSfx('click'); }
  };
  openModal(LookEditor.appearanceEditorHtml(opts));
  LookEditor.wireAppearanceEditor(modal, opts);
}

function openMirror() {
  if (life.phase !== 'adult' || paused) return;
  ensureWardrobe();
  const labels = { casual: 'ชุดลำลอง', work: 'ชุดทำงาน', formal: 'ชุดออกงาน' };
  const slots = ['casual', 'work', 'formal'];
  const active = life.wardrobeActive || 'casual';
  const html =
    '<div class="ev-head"><span class="ev-chip">กระจกที่บ้าน</span><span>ฟรี</span></div>' +
    '<div class="ev-title">จะทำอะไรหน้ากระจก?</div>' +
    '<div class="ev-text">แต่งหน้าตา/เสื้อผ้า หรือสลับชุดที่บันทึกไว้ · ชุดปัจจุบัน: <b>' + (labels[active] || 'ชุดลำลอง') + '</b></div>' +
    '<button class="btn-primary" id="mirrorEdit">แต่งหน้าตา / เสื้อผ้า</button>' +
    '<div class="quick-grid">' +
    slots.map(function (s) {
      return '<button data-wardrobe="' + s + '"><b>' + labels[s] + '</b><span>ใส่ชุดนี้</span></button>';
    }).join('') +
    '</div>' +
    '<div class="pay-debt" style="margin-top:4px">บันทึกลุคปัจจุบันเป็น:</div>' +
    '<div class="quick-grid">' +
    slots.map(function (s) {
      return '<button data-save-wardrobe="' + s + '"><b>บันทึก → ' + labels[s] + '</b><span>ทับชุดเดิม</span></button>';
    }).join('') +
    '</div>' +
    '<button class="btn-ghost" id="mirrorClose">ปิด</button>';
  openModal(html);
  document.getElementById('mirrorClose').addEventListener('click', closeModal);
  document.getElementById('mirrorEdit').addEventListener('click', function () {
    closeModal();
    openLookEditor({
      mode: 'all',
      price: 0,
      title: 'กระจกที่บ้าน',
      subtitle: 'จัดหน้าตาและเสื้อผ้าให้เรียบร้อย',
      confirmLabel: 'ใช้หน้าตานี้',
      backLabel: 'ปิด',
      grooming: 5,
      minutes: 20,
      doneText: 'จัดตัวเองหน้ากระจก · ความเรียบร้อย +5'
    });
  });
  modal.querySelectorAll('[data-wardrobe]').forEach(function (b) {
    b.addEventListener('click', function () { applyWardrobe(b.getAttribute('data-wardrobe')); });
  });
  modal.querySelectorAll('[data-save-wardrobe]').forEach(function (b) {
    b.addEventListener('click', function () { saveWardrobe(b.getAttribute('data-save-wardrobe')); });
  });
}

function wardrobeStyle(app) {
  return {
    outfit: app.outfit || 'tee',
    clothes: app.clothes || 'white',
    glasses: app.glasses || 'none',
    hat: app.hat || 'none',
    accessory: app.accessory || 'none'
  };
}

function ensureWardrobe() {
  const a = life.appearance || Look.DEFAULT_APPEARANCE;
  if (!life.wardrobe) life.wardrobe = {};
  if (!life.wardrobe.casual) life.wardrobe.casual = wardrobeStyle(a);
  if (!life.wardrobe.work) life.wardrobe.work = { outfit: 'shirt', clothes: 'white', glasses: 'none', hat: 'none', accessory: 'none' };
  if (!life.wardrobe.formal) life.wardrobe.formal = { outfit: 'shirt', clothes: 'black', glasses: 'none', hat: 'none', accessory: 'necklace' };
  if (!life.wardrobeActive || !life.wardrobe[life.wardrobeActive]) life.wardrobeActive = 'casual';
}

function applyWardrobe(slot) {
  ensureWardrobe();
  const w = life.wardrobe[slot];
  if (!w || !life.appearance) return;
  Object.assign(life.appearance, w);
  life.wardrobeActive = slot;
  life.grooming = clamp((life.grooming || 70) + 2, 0, 100);
  drawPortrait();
  saveGame();
  closeModal();
  updateHud();
  toast('ใส่ ' + ({ casual: 'ชุดลำลอง', work: 'ชุดทำงาน', formal: 'ชุดออกงาน' }[slot] || 'ชุด') + ' · ความเรียบร้อย +2');
}

function saveWardrobe(slot) {
  ensureWardrobe();
  if (!life.appearance) return;
  life.wardrobe[slot] = wardrobeStyle(life.appearance);
  life.wardrobeActive = slot;
  saveGame();
  closeModal();
  toast('บันทึกชุดนี้เป็น ' + ({ casual: 'ชุดลำลอง', work: 'ชุดทำงาน', formal: 'ชุดออกงาน' }[slot] || slot));
}

function looksReaction() {
  const g = life.grooming === undefined ? 70 : life.grooming;
  if (g < 60) return;
  if (life.flags.married || (life.rel.love || 0) > 0) {
    life.rel.love = clamp((life.rel.love || 0) + 1, 0, 100);
    stats.heart = clamp(stats.heart + 1, 0, 100);
    toast('💬 มิ้นท์: “ลุคนี้ดีนะ” · ความรัก +1');
  } else {
    life.rel.friend = clamp((life.rel.friend || 0) + 1, 0, 100);
    stats.heart = clamp(stats.heart + 1, 0, 100);
    toast('💬 นนท์: “ตัดผมใหม่เหรอ ดูดีขึ้นนะ” · เพื่อน +1');
  }
}

function openSalon(priceOverride?: number) {
  const price = priceOverride || 300;
  openLookEditor({
    mode: 'hair',
    price: price,
    title: 'ร้านตัดผม',
    subtitle: 'เปลี่ยนทรง/สีผมและหนวดเครา',
    confirmLabel: 'ตัดผม · ฿' + price,
    backLabel: 'ยังไม่ตัด',
    grooming: 20,
    minutes: 60,
    doneText: 'ตัดผมใหม่ · ความเรียบร้อย +20'
  });
}

function openClothingShop() {
  openLookEditor({
    mode: 'style',
    price: 800,
    title: 'ร้านเสื้อผ้า',
    subtitle: 'เสื้อผ้า แว่น หมวก และเครื่องประดับ',
    confirmLabel: 'ซื้อชุดใหม่ · ฿800',
    backLabel: 'ยังไม่ซื้อ',
    grooming: 12,
    minutes: 45,
    doneText: 'ได้ชุดใหม่ · ความเรียบร้อย +12'
  });
}

function wearingFormal() {
  const o = (life.appearance || {}).outfit;
  return o === 'shirt' || o === 'blouse';
}

function showDistrictStep() {
  const districts = geoDistricts(life.province);
  const p = life.province;
  const unit = p === 'กรุงเทพฯ' ? 'เขต' : 'อำเภอ';
  const html =
    '<div class="ev-head"><span class="ev-chip">เลือก' + unit + '</span><span>' + p + '</span></div>' +
    '<div class="ev-title">เกิดใน' + unit + 'ไหน?</div>' +
    '<div class="ev-text">' + unit + 'กำหนดบรรยากาศ ค่าเช่า และโอกาสในชีวิตช่วงแรก</div>' +
    '<div class="choice-grid">' +
    districts.map(function (d) {
      return '<button class="choice" data-khet="' + d.id + '">' +
        '<span class="c-label">' + d.name + '</span>' +
        '<span class="c-hint">' + d.vibe + ' · ' + d.neighborhoods.length + ' ย่าน</span></button>';
    }).join('') +
    '</div>' +
    '<button class="btn-ghost" id="khetBack">← กลับไปแต่งหน้าตา</button>';
  openModal(html);
  document.getElementById('khetBack').addEventListener('click', showAppearanceStep);
  modal.querySelectorAll('[data-khet]').forEach(function (b) {
    b.addEventListener('click', function () {
      const d = geoDistrict(life.province, b.getAttribute('data-khet'));
      if (!d) return;
      life.khet = d.id;
      life.khetName = d.name;
      // เลือกจังหวัด + เขตเท่านั้น — ย่านใช้ค่ามาตรฐานของเขต (ไม่ถามผู้เล่น)
      const h = d.neighborhoods[0];
      life.neighborhood = h ? h.id : '';
      life.neighborhoodName = h ? h.name : '';
      life.district = h && h.zone ? h.zone : '';
      life.districtName = d.name;
      life.homeKhet = d.id;
      life.homeKhetName = d.name;
      life.homeNeighborhood = life.neighborhood;
      life.homeNeighborhoodName = life.neighborhoodName;
      showBackgroundStep();
    });
  });
}

function showNeighborhoodStep() {
  const d = geoDistrict(life.province, life.khet);
  if (!d) { showDistrictStep(); return; }
  const html =
    '<div class="ev-head"><span class="ev-chip">เลือกย่าน</span><span>' + d.name + ' · ' + life.province + '</span></div>' +
    '<div class="ev-title">อยู่ย่านไหน?</div>' +
    '<div class="ev-text">ย่านมีผลกับค่าเช่า เงินเดือนเริ่มต้น และไลฟ์สไตล์ — เลือกแล้วเปลี่ยนภายหลังได้เมื่อย้ายบ้าน</div>' +
    '<div class="choice-grid">' +
    d.neighborhoods.map(function (h) {
      const rentTag = h.rent >= 1.3 ? 'ค่าเช่าสูง' : h.rent <= 0.9 ? 'ค่าเช่าต่ำ' : 'ค่าเช่าปานกลาง';
      const salTag = h.salary >= 1.1 ? 'รายได้ดี' : h.salary <= 0.92 ? 'รายได้เริ่มต้นต่ำ' : 'รายได้ปานกลาง';
      return '<button class="choice" data-hood="' + h.id + '">' +
        '<span class="c-label">' + h.name + '</span>' +
        '<span class="c-hint">' + h.vibe + '<br>' + rentTag + ' · ' + salTag + '</span></button>';
    }).join('') +
    '</div>' +
    '<button class="btn-ghost" id="hoodBack">← กลับไปเลือก' + (life.province === 'กรุงเทพฯ' ? 'เขต' : 'อำเภอ') + '</button>';
  openModal(html);
  document.getElementById('hoodBack').addEventListener('click', showDistrictStep);
  modal.querySelectorAll('[data-hood]').forEach(function (b) {
    b.addEventListener('click', function () {
      const h = geoNeighborhood(life.province, b.getAttribute('data-hood'));
      if (!h) return;
      life.neighborhood = h.id;
      life.neighborhoodName = h.name;
      life.district = h.zone || '';
      life.districtName = life.khetName;
      life.homeKhet = life.khet;
      life.homeKhetName = life.khetName;
      life.homeNeighborhood = h.id;
      life.homeNeighborhoodName = h.name;
      showBackgroundStep();
    });
  });
}

function showBackgroundStep() {
  const html =
    '<div class="ev-head"><span class="ev-chip">ภูมิหลังครอบครัว</span><span>เลือกได้ 1 อย่าง</span></div>' +
    '<div class="ev-title">คุณเกิดมาในครอบครัวแบบไหน?</div>' +
    '<div class="choices">' +
    BACKGROUNDS.map(function (b, i) {
      return '<button class="choice" data-choice="' + i + '"><span class="c-label">' + b.name + '</span>' +
        '<span class="c-hint">' + b.desc + '</span></button>';
    }).join('') +
    '</div>';
  openModal(html);
  bindChoices(function (i) {
    life.backgroundId = BACKGROUNDS[i].id;
    applyBackground(life.backgroundId);
    updateHud();
    showDreamStep();
  });
}

function showDreamStep() {
  const html =
    '<div class="ev-head"><span class="ev-chip">ความฝัน</span><span>ใช้ตัดสินตอนจบชีวิต</span></div>' +
    '<div class="ev-title">คุณอยากได้อะไรจากชีวิตนี้?</div>' +
    '<div class="choices">' +
    DREAMS.map(function (d, i) {
      return '<button class="choice" data-choice="' + i + '"><span class="c-label">' + d.name + '</span></button>';
    }).join('') +
    '</div>';
  openModal(html);
  bindChoices(function (i) {
    life.dreamId = DREAMS[i].id;
    const b = BACKGROUNDS.filter(function (x) { return x.id === life.backgroundId; })[0];
    const d = DREAMS[i];
    const html2 =
      '<div class="ev-head"><span class="ev-chip">ยืนยัน</span><span>เริ่มชีวิต</span></div>' +
      '<div class="ev-title">' + escapeHtml(profile.name) + '</div>' +
      '<div class="pay-debt">เพศ <b>' + life.gender + '</b> · เกิดที่ <b>' + life.province + '</b><br>' +
      'เขต/อำเภอ: <b>' + (life.khetName || '-') + '</b><br>' +
      'ครอบครัว: <b>' + b.name + '</b><br>ความฝัน: <b>' + d.name + '</b><br>' +
      'เงินเริ่มต้น: <b>฿' + fmt(stats.money) + '</b> · ครอบครัว <b>' + life.rel.family + '</b>/100</div>' +
      '<button class="btn-primary" id="crStart">เริ่มชีวิต ▶</button>';
    openModal(html2);
    document.getElementById('crStart').addEventListener('click', startEarlyLife);
  });
}

function startEarlyLife() {
  let legacy = 0;
  try { legacy = Number(localStorage.getItem('openlife.legacy') || '0'); } catch (e) { /* ignore */ }
  if (legacy > 0) {
    stats.money += Math.min(50000, legacy * 2000);
    toast('มรดกตระกูลจากชีวิตรุ่นก่อน +฿' + fmt(Math.min(50000, legacy * 2000)));
  }
  life.phase = 'early';
  life.chapter = 1;
  life.turn = 0;
  life.ageMonths = 0;
  life.actionsThisTurn = 0;
  life.recentEvents = [];
  life.log = [];
  profile.age = 0;
  profile.chapter = chapterData().name;
  profile.job = 'เด็ก';
  world.day = 0;
  world.minutes = 7 * 60;
  stats.energy = 100;
  closeModal();
  saveGame();
  updateHud();
  showEarlyTurn();
}

function pickEventFromPool(pool, forceFirst) {
  if (!pool.length) return null;
  let ev;
  if (forceFirst) {
    ev = pool[0];
    markSeen(ev.title);
  } else {
    ev = pickSeenEvent(pool, life.recentEvents || [], life.lastEventTitle);
  }
  life.lastEventTitle = ev.title;
  if (!life.recentEvents) life.recentEvents = [];
  life.recentEvents.push(ev.title);
  while (life.recentEvents.length > 24) life.recentEvents.shift();
  return ev;
}

function showEarlyTurn() {
  if (life.phase !== 'early') return;
  const ch = chapterData();
  if (life.ageMonths >= ch.to * 12 || life.turn >= ch.turns) {
    completeEarlyChapter();
    return;
  }
  const pool = (EARLY_EVENTS[life.chapter] || [])
    .concat(EXTRA_EVENTS[life.chapter] || [])
    .concat(MORE_EVENTS[life.chapter] || []);
  if (!pool.length) { advanceEarlyTurn(); return; }
  const ev = pickEventFromPool(pool, life.turn === 0);
  openModal(lifeEventHtml(ev, {
    chip: 'บท ' + ch.n + ' · ' + ch.name,
    sub: 'อายุ ' + ageYears() + ' ปี · เหตุการณ์ ' + (life.turn + 1) + '/' + ch.turns
  }));
  drawStoryArt();
  bindChoices(function (i) {
    const c = ev.choices[i];
    if (!c) return;
    applyChoiceOutcome(c);
    life.log.push({ age: ageYears(), chapter: life.chapter, title: ev.title, choice: c.label });
    advanceEarlyTurn();
  });
}

function advanceEarlyTurn() {
  const ch = chapterData();
  life.turn += 1;
  life.ageMonths += ch.months;
  profile.age = ageYears();
  profile.chapter = ch.name;
  updateHud();
  saveGame();
  if (life.ageMonths >= ch.to * 12 || life.turn >= ch.turns) {
    completeEarlyChapter();
  } else {
    showEarlyTurn();
  }
}

function completeEarlyChapter() {
  const ch = chapterData();
  if (life.chapter >= 4) {
    enterAdulthood();
    return;
  }
  const next = CHAPTERS[life.chapter];
  showChapterSummary(
    'จบบท ' + ch.n + ' · ' + ch.name,
    'คุณอายุ ' + ageYears() + ' ปี — อีกไม่นานประตูสู่บท “' + next.name + '” จะเปิด<br><br>' +
    'สุขภาพ ' + Math.round(stats.health) + ' · ใจ ' + Math.round(stats.heart) +
    ' · ปัญญา ' + Math.round(stats.smarts) + ' · มนุษย์ ' + Math.round(stats.social) +
    '<br>ครอบครัว ' + life.rel.family + ' · เพื่อน ' + life.rel.friend +
    (life.traits.length ? '<br>นิสัย: ' + life.traits.join(', ') : ''),
    function () {
      life.chapter += 1;
      life.turn = 0;
      profile.chapter = chapterData().name;
      saveGame();
      updateHud();
      showEarlyTurn();
    }
  );
}

function showChapterSummary(title, text, onNext) {
  openModal(
    '<div class="ev-head"><span class="ev-chip">ผ่านช่วงชีวิต</span><span>' + dateLabel() + '</span></div>' +
    '<div class="ev-title">' + title + '</div>' +
    '<div class="ev-text">' + text + '</div>' +
    '<button class="btn-primary" id="chapterNext">ไปต่อ ▶</button>'
  );
  document.getElementById('chapterNext').addEventListener('click', function () {
    closeModal();
    onNext();
  });
}

function resetFinances() {
  debts.credit.balance = 15000;
  debts.car.balance = 180000;
  debts.student.balance = 120000 + (life.flags.studentLoan || 0);
  debts.personal.balance = 0;
  ['credit', 'car', 'student', 'personal'].forEach(function (k) {
    const d = debts[k];
    d.missed = 0;
    d.lastPaidKey = null;
    d.repossessed = false;
    d.collector = false;
    d.lawsuit = false;
    d.grace = false;
  });
  finance.salary = 22000;
  finance.rent = 5500;
  finance.transport = 3000;
  if (stats.money < 4500) stats.money = 4500;
  life.flags.car = true;
  life.flags.unemployed = false;
}

function initLifeSystems() {
  life.needs = { fun: 70, social: 65, rest: 70, hygiene: 75, hunger: 75 };
  life.mood = 'ปกติ';
  life.grooming = 70;
  ensureWardrobe();
  life.skills = { communication: 20, tech: 15, finance: 15, fitness: 20, cooking: 20, creativity: 15 };
  life.people = [
    { id: 'friend', name: 'นนท์', role: 'เพื่อนสนิท', rel: life.rel.friend, note: '' },
    { id: 'boss', name: 'คุณสมชาย', role: 'หัวหน้า', rel: life.rel.boss, note: '' },
    { id: 'partner', name: 'มิ้นท์', role: 'คู่รัก', rel: life.rel.love, note: '' },
    { id: 'child', name: 'ลูก', role: 'ลูก', rel: life.child.relation, note: '' }
  ];
  life.business = { active: false, type: '', level: 0, monthly: 0, invested: 0 };
  life.assets = { carTier: 0, trips: 0, donated: 0, invest: 0, rentals: 0 };
  life.collections = { books: 0, food: 0, music: 0, stamps: 0 };
  life.homeLevel = 0;
  life.weather = 'แดดดี';
  life.achievements = [];
  life.legacy = 0;
  life.activityUses = {};
  life.plannedMonths = 1;
  life.periodMonths = 1;
}

function enterAdulthood() {
  life.phase = 'adult';
  life.chapter = 5;
  life.turn = 0;
  life.actionsThisTurn = 0;
  life.recentEvents = [];
  life.brokeTurns = 0;
  life.milestones = [];
  life.ageMonths = 22 * 12;
  profile.age = 22;
  profile.chapter = chapterData().name;

  const path = life.flags.path || 'uni';
  let base = 22000;
  let track = 'corporate';
  if (path === 'voc') { track = 'factory'; base = 15000; }
  else if (path === 'work') { track = 'sme'; base = 18000; }
  else if (stats.smarts >= 65) { track = 'multinational'; base = 26000; }
  base += Math.round(Math.max(0, stats.smarts - 50) * 80);
  life.careerTrack = track;

  if (track === 'factory') profile.job = 'พนักงานโรงงาน · เด็กใหม่';
  else if (track === 'sme') profile.job = 'พนักงานบริษัท · เด็กใหม่';
  else if (track === 'multinational') profile.job = 'พนักงานบริษัทข้ามชาติ · เด็กใหม่';
  else profile.job = 'พนักงานเงินเดือน · เด็กใหม่';

  career.rank = 0;
  career.yearsInRank = 0;
  career.lastReviewAge = 264;
  career.reviews = 0;
  career.promotions = 0;
  career.bonusTotal = 0;
  initLifeSystems();

  resetFinances();
  finance.salary = base;
  const geoF = geoFinance(life.province, life.neighborhood);
  finance.salary = Math.max(9000, Math.round(finance.salary * geoF.salary));
  finance.rent = Math.max(1200, Math.round(finance.rent * geoF.rent));
  initDebtDue();
  world.day = 0;
  world.minutes = 7 * 60;
  stats.energy = 100;
  // กันเซฟเก่า/เส้นทางดีบั๊กที่ไม่มีเขต: ยึดบ้านเกิดที่ผู้เล่นเลือกไว้
  if (!life.khet && life.homeKhet) {
    life.khet = life.homeKhet;
    life.khetName = life.homeKhetName || life.khetName;
  }
  if (!life.neighborhood && life.homeNeighborhood) {
    life.neighborhood = life.homeNeighborhood;
    life.neighborhoodName = life.homeNeighborhoodName || life.neighborhoodName;
  }
  enterCityMap(true, true);
  closeModal();
  paused = false;
  saveGame();
  updateHud();
  toast('เข้าสู่วัยทำงาน · อายุ 22 · เงินเดือน ฿' + fmt(finance.salary));
  if (life.neighborhoodName) toast('เริ่มชีวิตที่ย่าน ' + life.neighborhoodName + ' · ' + life.province);
  if (bootQuery.get('notour') === '1') { life.flags.tutorialSeen = true; saveGame(); }
  if (!life.flags.tutorialSeen && bootQuery.get('notour') !== '1') {
    setTimeout(function () { startCoachTour(); }, 350);
  }
}

function openLife() {
  if (paused) return;
  const ch = chapterData();
  const bg = BACKGROUNDS.filter(function (x) { return x.id === life.backgroundId; })[0];
  const dream = DREAMS.filter(function (x) { return x.id === life.dreamId; })[0];
  const rel = Object.keys(REL_LABEL).map(function (k) {
    return REL_LABEL[k] + ' <b>' + Math.round(life.rel[k] || 0) + '</b>';
  }).join(' · ');
  const childLine = life.flags.kid
    ? 'ลูก <b>' + (childAgeYears() >= 0 ? childAgeYears() + ' ปี' : 'แรกเกิด') + '</b> · ความสัมพันธ์ <b>' + Math.round(life.child.relation) + '</b>'
    : 'ยังไม่มีลูก';
  const parentLine = life.parents.alive
    ? 'พ่อแม่ยังมีชีวิต · สุขภาพ <b>' + Math.round(life.parents.health) + '</b>'
    : 'พ่อแม่เสียชีวิตแล้ว';
  const n = life.needs || {};
  const needLine = 'ความต้องการ: อาหาร <b>' + Math.round(n.hunger || 0) + '</b> · พักผ่อน <b>' + Math.round(n.rest || 0) +
    '</b> · สนุก <b>' + Math.round(n.fun || 0) + '</b> · สังคม <b>' + Math.round(n.social || 0) + '</b> · สุขอนามัย <b>' + Math.round(n.hygiene || 0) + '</b>';
  const sk = life.skills || {};
  const skillLine = 'ทักษะ: สื่อสาร <b>' + Math.round(sk.communication || 0) + '</b> · เทคโนโลยี <b>' + Math.round(sk.tech || 0) +
    '</b> · การเงิน <b>' + Math.round(sk.finance || 0) + '</b> · ฟิตเนส <b>' + Math.round(sk.fitness || 0) +
    '</b> · ทำอาหาร <b>' + Math.round(sk.cooking || 0) + '</b> · สร้างสรรค์ <b>' + Math.round(sk.creativity || 0) + '</b>';
  const peopleLine = (life.people || []).map(function (p) {
    return p.name + ' (' + p.role + ') <b>' + Math.round(p.rel || 0) + '</b>';
  }).join(' · ') || 'ยังไม่มีคนสำคัญ';
  const coll = life.collections || {};
  const collLine = 'ของสะสม: หนังสือ <b>' + (coll.books || 0) + '</b> · อาหาร <b>' + (coll.food || 0) +
    '</b> · ดนตรี <b>' + (coll.music || 0) + '</b> · แสตมป์/ของที่ระลึก <b>' + (coll.stamps || 0) + '</b>';
  const bizLine = life.business && life.business.active
    ? 'ธุรกิจ: <b>' + life.business.type + '</b> ระดับ ' + life.business.level + ' · +฿' + fmt(life.business.monthly) + '/เดือน'
    : 'ธุรกิจ: ยังไม่มี';
  const html =
    '<div class="ev-head"><span class="ev-chip">ชีวิต</span><span>' + escapeHtml(profile.name) + '</span></div>' +
    '<div class="ev-title">' + profile.age + ' ปี · ' + ch.name + '</div>' +
    '<div class="pay-debt">' +
    'จังหวัด: <b>' + life.province + '</b> · เขต/อำเภอ: <b>' + (life.khetName || '-') + '</b> · ย่าน: <b>' + (life.neighborhoodName || '-') + '</b> · เพศ: <b>' + life.gender + '</b><br>' +
    (life.neighborhoodName ? 'ไลฟ์สไตล์: <b>' + ((geoNeighborhood(life.province, life.neighborhood) || {}).vibe || '-') + '</b><br>' : '') +
    'ภูมิหลัง: <b>' + (bg ? bg.name : '-') + '</b><br>' +
    'ความฝัน: <b>' + (dream ? dream.name : '-') + '</b><br>' +
    'งาน: <b>' + profile.job + '</b> · เงินเดือน <b>฿' + fmt(finance.salary) + '</b><br>' +
    'สายงาน: <b>' + (TRACK_LABEL[life.careerTrack] || '-') + '</b><br>' +
    'ประเมินแล้ว ' + career.reviews + ' ครั้ง · เลื่อนขั้น ' + career.promotions + ' ครั้ง<br>' +
    'นิสัย: <b>' + (life.traits.length ? life.traits.join(', ') : 'ยังไม่มี') + '</b><br><br>' +
    rel + '<br>' + childLine + '<br>' + parentLine + '<br>' +
    'เงินสด <b>฿' + fmt(stats.money) + '</b> · หนี้รวม <b>฿' + fmt(totalDebt()) + '</b><br>' +
    'อารมณ์: <b>' + (life.mood || 'ปกติ') + '</b> · อากาศ: <b>' + (life.weather || 'แดดดี') + '</b> · บ้านระดับ <b>' + (life.homeLevel || 0) + '</b> · ความเรียบร้อย <b>' + Math.round(life.grooming === undefined ? 70 : life.grooming) + '</b> · ชุด <b>' + ({ casual: 'ลำลอง', work: 'ทำงาน', formal: 'ออกงาน' }[life.wardrobeActive] || 'ลำลอง') + '</b><br>' +
    needLine + '<br>' + skillLine + '<br>' + peopleLine + '<br>' + collLine + '<br>' + bizLine + '<br>' +
    'บทที่ ' + ch.n + ' · ' + dateLabel() + '<br>' +
    '🏅 Milestones: <b>' + ((life.milestones || []).slice(-5).map(function (m) { return m.label; }).join(' · ') || 'ยังไม่มี') + '</b><br>' +
    '🏆 Achievements: <b>' + ((life.achievements || []).length) + '</b> อย่าง' +
    '</div>' +
    '<button class="btn-primary" id="lifeAssets">🏠 ทรัพย์สิน</button>' +
    '<button class="btn-ghost" id="lifeBusiness">ธุรกิจ</button>' +
    '<button class="btn-ghost" id="lifeHome">ปรับปรุงบ้าน</button>' +
    '<button class="btn-ghost" id="lifeId">🪪 บัตรประชาชน</button>' +
    '<button class="btn-ghost" id="lifeClose">ปิด</button>';
  openModal(html);
  document.getElementById('lifeClose').addEventListener('click', closeModal);
  document.getElementById('lifeBusiness').addEventListener('click', function () { closeModal(); openBusiness(); });
  document.getElementById('lifeHome').addEventListener('click', function () { closeModal(); openHomeUpgrade(); });
  document.getElementById('lifeAssets').addEventListener('click', function () { closeModal(); openAssets(); });
  document.getElementById('lifeId').addEventListener('click', function () { closeModal(); openIdCard(); });
}

function citizenId() {
  const seed = (profile.name || '') + (life.province || '') + (life.khetName || '') + (life.neighborhoodName || '');
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const digits = String(1000000000000 + (h % 900000000000)).slice(0, 13);
  return digits[0] + ' ' + digits.slice(1, 5) + ' ' + digits.slice(5, 10) + ' ' + digits.slice(10, 12) + ' ' + digits[12];
}

function openIdCard() {
  if (paused) return;
  const parts = lifeDateParts();
  const addr = 'เลขที่ ' + (1 + (profile.name.length % 199)) + ' หมู่ ' + (1 + (profile.name.length % 9)) +
    ' แขวง/ตำบล ' + (life.neighborhoodName || '-') + ' เขต/อำเภอ ' + (life.khetName || '-') +
    ' จังหวัด ' + (life.province || '-');
  const html =
    '<div class="ev-head"><span class="ev-chip">ราชอาณาจักรไทย</span><span>บัตรประจำตัวประชาชน</span></div>' +
    '<div class="ev-title">บัตรประชาชน</div>' +
    '<div class="id-card">' +
    '<canvas id="idPortrait" width="32" height="32" aria-label="รูปถ่ายในบัตร"></canvas>' +
    '<div class="id-lines">' +
    '<div class="id-row"><span>ชื่อ</span><b>' + escapeHtml(profile.name) + '</b></div>' +
    '<div class="id-row"><span>เลขประจำตัว</span><b>' + citizenId() + '</b></div>' +
    '<div class="id-row"><span>เกิด</span><b>1 ม.ค. 2547 · ' + Math.floor(ageYears()) + ' ปี</b></div>' +
    '<div class="id-row"><span>ที่อยู่</span><b>' + addr + '</b></div>' +
    '<div class="id-row"><span>อาชีพ</span><b>' + (profile.job || '-') + '</b></div>' +
    '</div>' +
    '</div>' +
    '<div class="pay-debt">บัตรนี้ใช้ยืนยันตัวตนในเกม · รูปถ่ายอัปเดตตามหน้าตาและอายุ</div>' +
    '<button class="btn-primary" id="idClose">ปิด</button>';
  openModal(html);
  const c = document.getElementById('idPortrait') as HTMLCanvasElement | null;
  if (c) Look.paintPortrait(c, life.appearance || Look.DEFAULT_APPEARANCE, '#e8eefc', ageYears());
  document.getElementById('idClose').addEventListener('click', closeModal);
}

const MOVE_COST = 10000;

function openMigration() {
  if (life.phase !== 'adult' || paused) return;
  if (life.lastMoveAge !== undefined && ageYears() - life.lastMoveAge < 1) {
    toast('ย้ายจังหวัดได้ปีละครั้ง · รออีกสักหน่อย');
    return;
  }
  const cost = MOVE_COST;
  const NODE_POS = {
    'กรุงเทพฯ': [52, 68], 'นนทบุรี': [42, 62], 'ปทุมธานี': [56, 58],
    'สมุทรปราการ': [59, 78], 'เชียงใหม่': [28, 20], 'ขอนแก่น': [62, 36],
    'ชลบุรี': [65, 66], 'สงขลา': [42, 88]
  };
  const options = PROVINCES.map(function (p) {
    const here = p === life.province;
    const home = p === life.homeProvince;
    const pos = NODE_POS[p] || [50, 50];
    return '<button class="travel-node' + (here ? ' current' : '') + (home ? ' home' : '') + '"' +
      ' style="left:' + pos[0] + '%;top:' + pos[1] + '%" data-move="' + p + '"' + (here ? ' disabled' : '') + '>' +
      '<b>' + p + '</b>' +
      '<span>' + (here ? 'อยู่ที่นี่' : (home ? 'บ้านเกิด' : 'ย้ายได้')) + '</span>' +
      '</button>';
  }).join('');
  const html =
    '<div class="ev-head"><span class="ev-chip">ย้ายถิ่น</span><span>ปีละครั้ง</span></div>' +
    '<div class="ev-title">จะย้ายไปจังหวัดไหน?</div>' +
    '<div class="ev-text">อยู่ที่ <b>' + life.province + '</b> · เงินสด <b>฿' + fmt(stats.money) + '</b> · เงินเดือน <b>฿' + fmt(finance.salary) + '</b> · ค่าเดินทาง <b>฿' + fmt(cost) + '</b></div>' +
    '<div class="travel-map">' + options + '</div>' +
    '<div class="pay-debt">ขั้นต่อไป: เลือกเขต/อำเภอ · บ้านเกิดได้โบนัสครอบครัว</div>' +
    '<button class="btn-ghost" id="moveClose">ยังไม่ย้าย</button>';
  openModal(html);
  document.getElementById('moveClose').addEventListener('click', closeModal);
  modal.querySelectorAll('[data-move]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const dest = btn.getAttribute('data-move');
      if (dest === life.province) return;
      openMoveDistrict(dest);
    });
  });
}

function openMoveDistrict(dest: string) {
  const districts = geoDistricts(dest);
  const unit = dest === 'กรุงเทพฯ' ? 'เขต' : 'อำเภอ';
  const html =
    '<div class="ev-head"><span class="ev-chip">ย้ายถิ่น · ' + unit + '</span><span>' + dest + '</span></div>' +
    '<div class="ev-title">จะอยู่' + unit + 'ไหน?</div>' +
    '<div class="ev-text">ค่าเดินทาง ฿' + fmt(MOVE_COST) + ' · เงินสด ฿' + fmt(stats.money) + '</div>' +
    '<div class="choice-grid">' +
    districts.map(function (d) {
      return '<button class="choice" data-move-khet="' + d.id + '">' +
        '<span class="c-label">' + d.name + '</span>' +
        '<span class="c-hint">' + d.vibe + '</span></button>';
    }).join('') +
    '</div>' +
    '<button class="btn-ghost" id="moveBackProv">← กลับไปเลือกจังหวัด</button>';
  openModal(html);
  document.getElementById('moveBackProv').addEventListener('click', openMigration);
  modal.querySelectorAll('[data-move-khet]').forEach(function (b) {
    b.addEventListener('click', function () {
      const khetId = b.getAttribute('data-move-khet');
      const d = geoDistrict(dest, khetId);
      if (!d) return;
      const h = d.neighborhoods[0];
      completeMove(dest, khetId, h ? h.id : '');
    });
  });
}

function openMoveNeighborhood(dest: string, khetId: string) {
  const d = geoDistrict(dest, khetId);
  if (!d) { openMoveDistrict(dest); return; }
  const html =
    '<div class="ev-head"><span class="ev-chip">ย้ายถิ่น · ย่าน</span><span>' + d.name + ' · ' + dest + '</span></div>' +
    '<div class="ev-title">จะอยู่ย่านไหน?</div>' +
    '<div class="ev-text">ค่าเช่า/เงินเดือนจะปรับตามย่าน · ค่าเดินทาง ฿' + fmt(MOVE_COST) + '</div>' +
    '<div class="choice-grid">' +
    d.neighborhoods.map(function (h) {
      return '<button class="choice" data-move-hood="' + h.id + '">' +
        '<span class="c-label">' + h.name + '</span>' +
        '<span class="c-hint">' + h.vibe + '<br>ค่าเช่า ×' + h.rent.toFixed(2) + ' · เงินเดือน ×' + h.salary.toFixed(2) + '</span></button>';
    }).join('') +
    '</div>' +
    '<button class="btn-ghost" id="moveBackKhet">← กลับไปเลือก' + (dest === 'กรุงเทพฯ' ? 'เขต' : 'อำเภอ') + '</button>';
  openModal(html);
  document.getElementById('moveBackKhet').addEventListener('click', function () { openMoveDistrict(dest); });
  modal.querySelectorAll('[data-move-hood]').forEach(function (b) {
    b.addEventListener('click', function () { completeMove(dest, khetId, b.getAttribute('data-move-hood')); });
  });
}

function completeMove(dest: string, khetId: string, hoodId: string) {
  const hood = geoNeighborhood(dest, hoodId);
  const khet = geoDistrict(dest, khetId);
  if (!hood || !khet) return;
  if (stats.money < MOVE_COST) { toast('เงินไม่พอค่าที่พัก/เดินทาง ฿' + fmt(MOVE_COST)); return; }
  stats.money -= MOVE_COST;
  const isHome = dest === life.homeProvince;
  const provFactor = dest === 'กรุงเทพฯ' ? 1.15 : isHome ? 0.75 : 0.85;
  if (finance.salary > 0) {
    finance.salary = Math.max(9000, Math.round(finance.salary * provFactor * hood.salary));
  }
  const baseRent = dest === 'กรุงเทพฯ' ? 5500 : isHome ? 3000 : 4000;
  finance.rent = Math.max(1200, Math.round(baseRent * hood.rent));
  if (dest === 'กรุงเทพฯ') {
    stats.heart = clamp(stats.heart - 2, 0, 100);
  } else if (isHome) {
    life.rel.family = clamp(life.rel.family + 5, 0, 100);
    stats.heart = clamp(stats.heart + 3, 0, 100);
    stats.health = clamp(stats.health + 1, 0, 100);
  } else {
    stats.social = clamp(stats.social + 2, 0, 100);
    stats.heart = clamp(stats.heart + 1, 0, 100);
  }
  life.province = dest;
  life.khet = khet.id;
  life.khetName = khet.name;
  life.neighborhood = hood.id;
  life.neighborhoodName = hood.name;
  life.district = hood.zone || '';
  life.districtName = khet.name;
  life.flags.movedBack = dest !== 'กรุงเทพฯ';
  life.lastMoveAge = ageYears();
  enterCityMap(true, true);
  saveGame();
  closeModal();
  updateHud();
  toast('ย้ายไป ' + hood.name + ' · ' + khet.name + ' · ' + dest + ' · เงินเดือน ฿' + fmt(finance.salary) + ' · ค่าเช่า ฿' + fmt(finance.rent));
}

function simNewAdult(backgroundId, path, smarts) {
  life.phase = 'adult';
  life.chapter = 5;
  life.turn = 0;
  life.ageMonths = 22 * 12;
  life.backgroundId = backgroundId || 'mid';
  life.province = 'กรุงเทพฯ';
  life.homeProvince = 'กรุงเทพฯ';
  life.rel = { family: 70, friend: 50, love: 0, boss: 50 };
  life.traits = [];
  life.log = [];
  life.eventIndex = {};
  life.lastEventTitle = '';
  life.recentEvents = [];
  life.actionsThisTurn = 0;
  life.lastMoveAge = undefined;
  life.brokeTurns = 0;
  life.milestones = [];
  life.child = { name: 'ลูก', ageMonths: -1, relation: 70 };
  life.parents = { health: 75, alive: true };
  life.flags = { path: path || 'uni', tutorialSeen: true };
  life.careerTrack = path === 'voc' ? 'factory' : path === 'work' ? 'sme' : ((smarts || 55) >= 65 ? 'multinational' : 'corporate');
  stats.health = 75;
  stats.heart = 65;
  stats.energy = 100;
  stats.money = 5000;
  stats.kpi = 55;
  stats.credit = 65;
  stats.smarts = smarts || 55;
  stats.social = 50;
  career.rank = 0;
  career.yearsInRank = 0;
  career.lastReviewAge = 264;
  career.reviews = 0;
  career.promotions = 0;
  career.bonusTotal = 0;
  resetFinances();
  let base = path === 'voc' ? 15000 : path === 'work' ? 18000 : ((smarts || 55) >= 65 ? 26000 : 22000);
  base += Math.round(Math.max(0, (smarts || 55) - 50) * 80);
  finance.salary = base;
  initDebtDue();
  profile.name = 'Sim';
  profile.age = 22;
  profile.chapter = chapterData().name;
  profile.job = path === 'voc' ? 'พนักงานโรงงาน · เด็กใหม่' : path === 'work' ? 'พนักงานบริษัท · เด็กใหม่' : 'พนักงานเงินเดือน · เด็กใหม่';
  initLifeSystems();
  world.day = 0;
  world.minutes = 7 * 60;
  scene = 'city';
  viewMode = 'map';
  paused = false;
  gameOver = false;
  pendingEnding = null;
  monthsPlayed = 0;
  closeModal();
  return { salary: finance.salary, background: life.backgroundId, path: life.flags.path, track: life.careerTrack };
}

function openTravel() {
  if (life.phase !== 'adult' || paused) return;
  if (scene === 'city') enterStation();
  else openMigration();
}

function adultEventPool() {
  const pool = (ADULT_EVENTS[life.chapter] || []).filter(function (e) {
    return !e.cond || e.cond();
  });
  (EXTRA_EVENTS[life.chapter] || []).forEach(function (e) {
    if (!e.cond || e.cond()) pool.push(e);
  });
  (MORE_EVENTS[life.chapter] || []).forEach(function (e) {
    if (!e.cond || e.cond()) pool.push(e);
  });
  (FAMILY_EVENTS[life.chapter] || []).forEach(function (e) {
    if (!e.cond || e.cond()) pool.push(e);
  });
  (ARC_EVENTS[life.chapter] || []).forEach(function (e) {
    if (!e.cond || e.cond()) pool.push(e);
  });
  (RANDOM_EVENTS[life.chapter] || []).forEach(function (e) {
    if (!e.cond || e.cond()) pool.push(e);
  });
  (VARIANT_EVENTS[life.chapter] || []).forEach(function (e) {
    if (!e.cond || e.cond()) pool.push(e);
  });
  if (life.chapter === 5) {
    MONTH_EVENTS.forEach(function (e) {
      if (!e.cond || e.cond()) pool.push(e);
    });
  }
  const monthNow = lifeDateParts().m;
  SEASON_EVENTS.forEach(function (e) {
    if (e.month === monthNow && (!e.cond || e.cond())) pool.push(e);
  });
  DISTRICT_EVENTS.forEach(function (e) {
    if (!e.cond || e.cond()) pool.push(e);
  });
  const workRe = /หัวหน้า|เพื่อนร่วมงาน|บริษัท|ออฟฟิศ|OT|ลูกค้า|เงินเดือน|ประชุม|โปรเจกต์|เลย์ออฟ|เกษียณ|อำลา/;
  const rehireRe = /จ้างงาน|หางาน|สมัครงาน/;
  return pool.filter(function (e) {
    if (finance.salary <= 0 && !rehireRe.test(e.title) && workRe.test(e.title + ' ' + e.text)) return false;
    return true;
  });
}

function pickAdultEvent() {
  return pickEventFromPool(adultEventPool(), false);
}

function auditContext() {
  return {
    ADULT_EVENTS: ADULT_EVENTS,
    EXTRA_EVENTS: EXTRA_EVENTS,
    MORE_EVENTS: MORE_EVENTS,
    FAMILY_EVENTS: FAMILY_EVENTS,
    ARC_EVENTS: ARC_EVENTS,
    RANDOM_EVENTS: RANDOM_EVENTS,
    VARIANT_EVENTS: VARIANT_EVENTS,
    MONTH_EVENTS: MONTH_EVENTS,
    SEASON_EVENTS: SEASON_EVENTS,
    DISTRICT_EVENTS: DISTRICT_EVENTS,
    EARLY_EVENTS: EARLY_EVENTS,
    stats: stats,
    life: life,
    finance: finance,
    debts: debts,
    career: career,
    profile: profile,
    gameOver: gameOver,
    ageYears: ageYears,
    actionsPerTurn: actionBudget()
  };
}

function dataAudit() { return dataAuditImpl(auditContext()); }
function invariantAudit() { return invariantAuditImpl(auditContext()); }
function narrativeAudit() { return narrativeAuditImpl(auditContext()); }

const COACH_STEPS = [
  {
    selector: '#world',
    pad: 0,
    title: 'เดินและสำรวจ',
    text: 'แตะหรือคลิก <b>พื้น</b> เพื่อเดินไปตรงนั้น · แตะ <b>อาคาร/จุดสนใจ</b> เพื่อเดินไปและใช้งานทันที<br>' +
      'ถ้าถนัดคีย์บอร์ด ใช้ <b>WASD</b> เดิน และ <b>E</b> ใช้งาน'
  },
  {
    selector: '.clock',
    pad: 8,
    title: 'เดินเวลา',
    text: 'แตะ <b>นาฬิกา</b> เพื่อเลือก +1 / +3 / +6 / +12 เดือน<br>' +
      'เงินเดือน บิล หนี้ และประเมินงานจะคิดตามจำนวนเดือน · <b>กิจกรรม</b> จะได้มากขึ้นเมื่อเดินเวลานานขึ้น'
  },
  {
    selector: '.stat-row[data-stat="money"]',
    pad: 6,
    title: 'เงินและหนี้',
    text: 'แตะช่อง <b>เงิน</b> เพื่อดูรายรับ–รายจ่าย จ่ายบิล/หนี้ (หรือกด <b>F</b>)<br>' +
      'ระบบไม่หักหนี้อัตโนมัติ — ต้องจ่ายเองทุกช่วงเวลา'
  },
  {
    selector: '.char-card',
    pad: 6,
    title: 'ชีวิตของคุณ',
    text: 'แตะ <b>การ์ดชื่อ</b> เพื่อดูภาพรวมชีวิต ครอบครัว อาชีพ และความฝัน (หรือกด <b>L</b>)<br>' +
      'ปุ่ม <b>?</b> มุมขวาบนเปิดคู่มือและเล่นทัวร์นี้ซ้ำได้ทุกเมื่อ'
  }
];

function coachRectFor(step) {
  if (step.rect) return step.rect;
  const el = document.querySelector(step.selector);
  const stage = document.getElementById('stage');
  if (!el || !stage) {
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    return { x: sw * 0.1, y: sh * 0.2, w: sw * 0.8, h: sh * 0.55 };
  }
  const sr = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const pad = step.pad || 6;
  let box = {
    x: r.left - sr.left - pad,
    y: r.top - sr.top - pad,
    w: r.width + pad * 2,
    h: r.height + pad * 2
  };
  // world highlight: focus on the visible play area (avoid cutting through HUD)
  if (step.selector === '#world') {
    const stat = document.querySelector('.stat-panel');
    const statR = stat ? stat.getBoundingClientRect() : null;
    const boxRight = box.x + box.w;
    const boxBottom = box.y + box.h;
    const statBottom = statR ? statR.bottom - sr.top : 0;
    const statRight = statR ? statR.right - sr.left : 0;
    let left = box.x + 10;
    if (statR && statRight < box.x + box.w * 0.55) left = Math.max(left, statRight + 14);
    let top = box.y + 10;
    if (statR && statBottom > box.y && statBottom < box.y + box.h * 0.6) top = statBottom + 10;
    const w = boxRight - left - 10;
    const h = boxBottom - top - 10;
    if (w > 80 && h > 60) box = { x: left, y: top, w: w, h: h };
  }
  return box;
}

function startCoachTour(onDone) {
  if (document.getElementById('coach')) return;
  const stage = document.getElementById('stage');
  if (!stage) return;
  paused = true;
  clearWalk();
  let stepIndex = 0;
  const coach = document.createElement('div');
  coach.className = 'coach';
  coach.id = 'coach';
  coach.innerHTML =
    '<div class="coach-hole"></div>' +
    '<div class="coach-tip">' +
    '<div class="coach-step"></div>' +
    '<div class="coach-title"></div>' +
    '<div class="coach-text"></div>' +
    '<div class="coach-actions"><button class="btn-ghost" type="button" data-coach="skip">ข้าม</button>' +
    '<button class="btn-primary" type="button" data-coach="next">ต่อไป ▶</button></div>' +
    '</div>';
  stage.appendChild(coach);

  const hole = coach.querySelector('.coach-hole');
  const tip = coach.querySelector('.coach-tip');
  const stepEl = coach.querySelector('.coach-step');
  const titleEl = coach.querySelector('.coach-title');
  const textEl = coach.querySelector('.coach-text');
  const nextBtn = coach.querySelector('[data-coach="next"]');

  function finish() {
    if (coach.parentNode) coach.parentNode.removeChild(coach);
    coachRefresh = null;
    life.flags.tutorialSeen = true;
    paused = false;
    saveGame();
    updateHud();
    if (onDone) onDone();
  }

  function renderStep() {
    const st = COACH_STEPS[stepIndex];
    if (!st) { finish(); return; }
    const r = coachRectFor(st);
    hole.style.left = Math.round(r.x) + 'px';
    hole.style.top = Math.round(r.y) + 'px';
    hole.style.width = Math.round(r.w) + 'px';
    hole.style.height = Math.round(r.h) + 'px';
    stepEl.textContent = 'ขั้นที่ ' + (stepIndex + 1) + ' / ' + COACH_STEPS.length;
    titleEl.textContent = st.title;
    textEl.innerHTML = st.text;
    nextBtn.textContent = stepIndex === COACH_STEPS.length - 1 ? 'เริ่มเล่น ▶' : 'ต่อไป ▶';

    const stageW = stage.clientWidth || window.innerWidth;
    const stageH = stage.clientHeight || window.innerHeight;
    const tipW = Math.min(400, stageW - 24);
    tip.style.width = tipW + 'px';
    const tipH = tip.offsetHeight || 170;
    let tx = r.x + r.w / 2 - tipW / 2;
    tx = clamp(tx, 12, Math.max(12, stageW - tipW - 12));
    let ty = r.y + r.h + 18;
    if (ty + tipH > stageH - 12) ty = Math.max(12, r.y - tipH - 18);
    tip.style.left = Math.round(tx) + 'px';
    tip.style.top = Math.round(ty) + 'px';
  }

  nextBtn.addEventListener('click', function () {
    playSfx('click');
    stepIndex += 1;
    if (stepIndex >= COACH_STEPS.length) finish();
    else renderStep();
  });
  coach.querySelector('[data-coach="skip"]').addEventListener('click', function () {
    playSfx('click');
    finish();
  });

  renderStep();
  coachRefresh = renderStep;
}

window.addEventListener('resize', function () {
  if (coachRefresh) setTimeout(function () { if (coachRefresh) coachRefresh(); }, 120);
});

function openHelp() {
  if (document.getElementById('coach')) return;
  const html =
    '<div class="ev-head"><span class="ev-chip">ช่วยเหลือ</span><span>แตะ/คลิกเพื่อเล่น</span></div>' +
    '<div class="ev-title">วิธีเล่นและเมนูลัด</div>' +
    '<div class="ev-text">' +
    '• แตะ/คลิก <b>พื้น</b> = เดิน · แตะ <b>อาคาร/จุดสนใจ</b> = เดินไปและใช้งาน<br>' +
    '• แตะ <b>นาฬิกา</b> = เดินเวลา · แตะ <b>เงิน</b> = การเงิน/หนี้ · แตะ <b>การ์ดชื่อ</b> = ภาพรวมชีวิต<br>' +
    '• กิจกรรมต่อช่วง: 3/5/7/9 ครั้งตาม +1/+3/+6/+12 เดือน — ทำซ้ำได้แต่ผลลดลง (100/50/25%)<br>' +
    '• เดินไป <b>ป้ายรถเมล์สายใต้</b> ทางเท้าถนนสีลม เพื่อเข้าเขต <b>บางขุนเทียน</b> (ทะเล คลอง ป่าชายเลน)<br>' +
    '• สร้างชีวิต: เลือก <b>จังหวัด → เขต/อำเภอ → ย่าน</b> · ย่านมีผลต่อค่าเช่าและเงินเดือนเริ่มต้น<br>' +
    '• เปลี่ยนลุค: กระจกที่บ้าน (ฟรี) · ร้านตัดผม ฿300 · ร้านเสื้อผ้า ฿800 (มีผลกับงาน/ความเรียบร้อย)' +
    '</div>' +
    '<div class="quick-grid">' +
    '<button data-help="time"><b>เดินเวลา</b><span>+1 / +3 / +6 / +12</span></button>' +
    '<button data-help="finance"><b>การเงิน / หนี้</b><span>จ่ายบิลและหนี้</span></button>' +
    '<button data-help="assets"><b>ทรัพย์สิน</b><span>บ้าน รถ ลงทุน ทริป</span></button>' +
    '<button data-help="life"><b>ภาพรวมชีวิต</b><span>ครอบครัว อาชีพ ความฝัน</span></button>' +
    '<button data-help="job"><b>หางาน</b><span>เมื่อว่างงาน</span></button>' +
    '<button data-help="travel"><b>ย้ายถิ่น</b><span>สถานีขนส่ง</span></button>' +
    '<button data-help="district"><b>บางขุนเทียน</b><span>ทะเล คลอง ป่าชายเลน</span></button>' +
    '<button data-help="map"><b>สลับมุมมอง</b><span>แผนที่ / ถนน</span></button>' +
    '</div>' +
    '<div class="pay-debt">' +
    'คีย์ลัด: <b>WASD</b> เดิน · <b>E</b> ใช้งาน · <b>F</b> การเงิน · <b>J</b> หางาน · <b>L</b> ชีวิต · ' +
    '<b>T</b> ย้ายถิ่น · <b>N</b> เดินเวลา · <b>M</b> แผนที่ · <b>Q</b> เมนูด่วน · <b>H</b> ช่วยเหลือ' +
    '</div>' +
    '<div class="coach-actions" style="justify-content:flex-end">' +
    '<button class="btn-ghost" id="helpTour">เล่นทัวร์อีกครั้ง</button>' +
    '<button class="btn-primary" id="helpClose">ปิด</button>' +
    '</div>';
  openModal(html);
  document.getElementById('helpClose').addEventListener('click', closeModal);
  document.getElementById('helpTour').addEventListener('click', function () {
    closeModal();
    startCoachTour();
  });
  modal.querySelectorAll('[data-help]').forEach(function (b) {
    b.addEventListener('click', function () {
      const a = b.getAttribute('data-help');
      closeModal();
      if (a === 'time') openTimeAdvance();
      else if (a === 'finance') openFinance();
      else if (a === 'assets') openAssets();
      else if (a === 'life') openLife();
      else if (a === 'job') openJobSearch();
      else if (a === 'travel') openTravel();
      else if (a === 'district') {
        if (scene === 'district') leaveDistrict();
        else enterDistrict('bangkhunthian');
      }
      else if (a === 'map') toggleViewMode();
    });
  });
}

function setupHudClicks() {
  const clock = document.querySelector('.clock');
  if (clock) {
    clock.addEventListener('click', function (e) {
      e.stopPropagation();
      if (life.phase === 'adult' && !paused) openTimeAdvance();
    });
  }
  const card = document.querySelector('.char-card');
  if (card) {
    card.addEventListener('click', function () {
      if (life.phase === 'adult' && !paused) openLife();
    });
  }
  const statPanel = document.getElementById('statPanel');
  if (statPanel) {
    statPanel.addEventListener('click', function (e) {
      const row = e.target && e.target.closest ? e.target.closest('.stat-row') : null;
      if (!row) return;
      const key = row.getAttribute('data-stat');
      if ((key === 'money' || key === 'credit') && !paused) openFinance();
    });
  }
  const help = document.getElementById('helpBtn');
  if (help) help.addEventListener('click', function () {
    if (life.phase === 'adult' && !paused) openHelp();
  });
  const prompt = document.getElementById('prompt');
  if (prompt) {
    const go = function () { if (!paused) interact(); };
    prompt.addEventListener('click', go);
    prompt.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  }
  const pKey = document.getElementById('promptKey');
  if (pKey && isTouchUi()) {
    pKey.textContent = 'แตะ';
    pKey.classList.add('tap');
  }
}

function forceEvent(title) {
  const ev = adultEventPool().filter(function (e) { return e.title === title; })[0];
  if (!ev) return false;
  paused = true;
  const ch = chapterData();
  openModal(lifeEventHtml(ev, {
    chip: 'บท ' + ch.n + ' · ' + ch.name,
    sub: 'อายุ ' + ageYears() + ' ปี'
  }));
  bindChoices(function (i) {
    const c = ev.choices[i];
    if (!c) return;
    applyChoiceOutcome(c);
    life.log.push({ age: ageYears(), chapter: life.chapter, title: ev.title, choice: c.label });
    resolveMonth(ev);
  });
  return true;
}

function startAdultTurn() {
  if (life.phase !== 'adult' || gameOver) return;
  if (!life.flags.tutorialSeen) {
    startCoachTour(function () { startAdultTurn(); });
    return;
  }
  paused = true;
  const ev = pickAdultEvent();
  if (!ev) { resolveMonth(null); return; }

  const ch = chapterData();
  openModal(lifeEventHtml(ev, {
    chip: 'บท ' + ch.n + ' · ' + ch.name,
    sub: 'อายุ ' + ageYears() + ' ปี'
  }));
  bindChoices(function (i) {
    const c = ev.choices[i];
    if (!c) return;
    applyChoiceOutcome(c);
    life.log.push({ age: ageYears(), chapter: life.chapter, title: ev.title, choice: c.label });
    resolveMonth(ev);
  });
}

function deathRoll(months) {
  if (stats.health <= 0) return true;
  const age = ageYears();
  if (age < 45) return false;
  let risk = Math.max(0, age - 45) * 0.0012 + (100 - stats.health) * 0.0015;
  if (age >= 80) risk += (age - 80) * 0.004;
  risk = risk * (months / 12);
  if (Math.random() < risk) {
    stats.health = clamp(stats.health - (18 + Math.random() * 28), 0, 100);
    if (stats.health <= 0) return true;
    toast('ร่างกายส่งสัญญาณเตือน · สุขภาพลดลง');
  }
  return false;
}

function dreamAchieved() {
  switch (life.dreamId) {
    case 'house': return !!(life.flags.house || stats.money >= 500000);
    case 'family': return life.rel.family >= 70 && life.rel.love >= 40;
    case 'manager': return finance.salary >= 50000;
    case 'retire': return stats.money >= 2000000;
    case 'business': return !!life.flags.business;
    case 'free': return finance.salary === 0 && stats.money >= 500000;
    default: return false;
  }
}

function needsReview() {
  return life.phase === 'adult' &&
    !life.flags.retired &&
    finance.salary > 0 &&
    life.ageMonths - career.lastReviewAge >= 12;
}

function reviewCareer() {
  if (life.flags.looksCareer) {
    const grooming = life.grooming === undefined ? 70 : life.grooming;
    const score = clamp(Math.round(
      grooming * 0.35 + stats.social * 0.25 + (life.skills.creativity || 0) * 0.2 + stats.kpi * 0.2 +
      (Math.random() * 8 - 4)
    ), 0, 100);
    let raisePct = 0;
    let bonusMonths = 0;
    if (score >= 85) { raisePct = 0.10 + Math.random() * 0.02; bonusMonths = 2 + Math.random() * 2; }
    else if (score >= 70) { raisePct = 0.05 + Math.random() * 0.02; bonusMonths = 1 + Math.random(); }
    else if (score >= 55) { raisePct = 0.02 + Math.random() * 0.02; bonusMonths = Math.random() * 0.8; }
    const oldSalary = finance.salary;
    finance.salary = Math.min(65000, Math.round(oldSalary * (1 + raisePct)));
    const bonus = Math.round(finance.salary * bonusMonths);
    stats.money += bonus;
    career.bonusTotal += bonus;
    career.reviews += 1;
    career.lastReviewAge = life.ageMonths;
    stats.kpi = clamp(48 + (stats.kpi - 50) * 0.5, 0, 100);
    stats.heart = clamp(stats.heart + (score >= 70 ? 4 : 1), 0, 100);
    return {
      score: score, oldSalary: oldSalary, newSalary: finance.salary,
      raisePct: raisePct, bonus: bonus, bonusMonths: bonusMonths,
      promoted: false, laidOff: false, rank: 0
    };
  }
  const skillBonus = Math.min(5, (life.skills.communication || 0) * 0.05);
  const score = clamp(Math.round(stats.kpi * 0.6 + stats.social * 0.2 + life.rel.boss * 0.2 + skillBonus + (Math.random() * 8 - 4)), 0, 100);
  let raisePct = 0;
  let bonusMonths = 0;

  if (score >= 85) {
    raisePct = 0.10 + Math.random() * 0.02;
    bonusMonths = 3 + Math.random() * 3;
  } else if (score >= 70) {
    raisePct = 0.05 + Math.random() * 0.02;
    bonusMonths = 1.5 + Math.random() * 1.5;
  } else if (score >= 55) {
    raisePct = 0.02 + Math.random() * 0.02;
    bonusMonths = Math.random() * 1.2;
  }

  const oldSalary = finance.salary;
  const PROMO_GATES = [
    { years: 3, age: 0, score: 64 },
    { years: 4, age: 0, score: 68 },
    { years: 5, age: 30, score: 72 },
    { years: 6, age: 38, score: 76 }
  ];
  const gate = PROMO_GATES[career.rank];
  let promoted = false;
  if (gate && score >= gate.score && career.yearsInRank >= gate.years && ageYears() >= gate.age && career.rank < 4 && stats.kpi >= 60 && stats.social >= 50) {
    career.rank += 1;
    career.yearsInRank = 0;
    career.promotions += 1;
    promoted = true;
  } else {
    career.yearsInRank += 1;
  }

  let newSalary = Math.round(oldSalary * (1 + raisePct));
  if (promoted) {
    newSalary = Math.max(newSalary, CAREER_RANKS[career.rank].min);
    profile.job = CAREER_RANKS[career.rank].title;
  }
  const salaryCap = Math.max(CAREER_RANKS[career.rank].max, oldSalary);
  newSalary = Math.min(newSalary, salaryCap);
  finance.salary = newSalary;

  const bonus = Math.round(newSalary * bonusMonths);
  stats.money += bonus;
  career.bonusTotal += bonus;
  career.reviews += 1;
  career.lastReviewAge = life.ageMonths;
  stats.kpi = clamp(48 + (stats.kpi - 50) * 0.5, 0, 100);
  stats.heart = clamp(stats.heart + (promoted ? 6 : 1), 0, 100);

  let laidOff = false;
  if (ageYears() >= 45 && score < 50 && Math.random() < 0.35) {
    laidOff = true;
    finance.salary = 0;
    profile.job = 'ว่างงาน';
    life.flags.laidoff = true;
    life.flags.unemployed = true;
    stats.heart = clamp(stats.heart - 15, 0, 100);
    stats.health = clamp(stats.health - 4, 0, 100);
  }

  checkMilestones();

  return {
    score: score, oldSalary: oldSalary, newSalary: finance.salary,
    raisePct: raisePct, bonus: bonus, bonusMonths: bonusMonths,
    promoted: promoted, laidOff: laidOff, rank: career.rank
  };
}

function showYearReview(next) {
  const r = reviewCareer();
  const html =
    '<div class="ev-head"><span class="ev-chip">ประเมินปลายปี</span><span>อายุ ' + ageYears() + ' ปี</span></div>' +
    '<div class="ev-title">ผลประเมิน: ' + r.score + ' / 100</div>' +
    '<div class="pay-table">' +
    payRow('ผลงาน (KPI)', Math.round(stats.kpi) + ' / 100') +
    payRow('เงินเดือนเดิม', '฿' + fmt(r.oldSalary)) +
    payRow('ปรับขึ้น', (r.raisePct > 0 ? '+' + (r.raisePct * 100).toFixed(1) + '%' : 'ไม่ขึ้น'), 'pos') +
    payRow('โบนัส', '฿' + fmt(r.bonus), 'pos') +
    '<div class="pay-total"><span>เงินเดือนใหม่</span><b>฿' + fmt(r.newSalary) + '</b></div>' +
    '</div>' +
    (r.promoted ? '<div class="pay-warn">เลื่อนตำแหน่ง → ' + CAREER_RANKS[r.rank].title + '</div>' : '') +
    (r.laidOff ? '<div class="pay-warn">ถูกเลย์ออฟ — เงินเดือนกลายเป็น 0 และต้องหางานใหม่</div>' : '') +
    '<div class="pay-debt">โบนัสสะสมทั้งชีวิต <b>฿' + fmt(career.bonusTotal) + '</b> · เลื่อนขั้นแล้ว <b>' + career.promotions + '</b> ครั้ง</div>' +
    '<button class="btn-primary" id="reviewNext">ไปต่อ ▶</button>';

  playSfx('notify');
  openModal(html);
  document.getElementById('reviewNext').addEventListener('click', function () {
    closeModal();
    updateHud();
    saveGame();
    next();
  });
}

function endingFor(type) {
  const age = ageYears();
  const family = life.rel.family;
  const money = stats.money;

  if (life.flags.crime) {
    return {
      id: 'crime',
      title: 'บทส่งท้าย · ติดคดี',
      text: 'เงินที่ได้มาไม่เคยพอ และหลักฐานที่คุณคิดว่าซ่อนได้ ก็กลับมาถึงมือคนอื่นจนได้ — คุกไม่ได้จบชีวิตทันที แต่มันเปลี่ยนทุกอย่างที่เหลือ'
    };
  }
  if (type === 'bankruptcy' || totalDebt() > 500000) {
    return {
      id: 'debt',
      title: 'บทส่งท้าย · หนี้ท่วมจนตัวแตก',
      text: 'เจ้าหนี้ฟ้องล้มละลาย ทรัพย์สินถูกยึด และชื่อของคุณติดแบล็กลิสต์อีกหลายปี — ชีวิตใหม่เริ่มได้ แต่ไม่มีใครบอกว่ามันจะง่าย'
    };
  }
  if (type === 'death' || stats.health <= 0) {
    if (age < 45) {
      return {
        id: 'early_death',
        title: 'บทส่งท้าย · ตายก่อนวัยอันควร',
        text: 'ไม่มีใครเตรียมตัวสำหรับวันนี้ ทั้งงานที่ยังค้าง ครอบครัวที่ยังรอ และคำพูดที่ยังไม่ได้พูด'
      };
    }
    return {
      id: 'health',
      title: 'บทส่งท้าย · สุขภาพพังก่อนเกษียณ',
      text: 'ร่างกายส่งสัญญาณมานานหลายปี แต่คุณเลือกจะทำงานต่อ — จนวันหนึ่งมันก็ไม่ยอมรับฟังคุณอีกแล้ว'
    };
  }
  if (life.flags.business) {
    return {
      id: 'business',
      title: 'บทส่งท้าย · ลาออกไปทำของตัวเอง',
      text: 'คุณไม่ได้รวยที่สุด แต่ได้ตื่นมาแล้วรู้ว่าวันนี้จะทำอะไร — และนั่นคือสิ่งที่คุณตามหามาทั้งชีวิต'
    };
  }
  if (money >= 1000000 && family < 50) {
    return {
      id: 'rich_alone',
      title: 'บทส่งท้าย · รวยแต่ตัวคนเดียว',
      text: 'งานศพของคุณมีคนมาเยอะ แวดล้อมด้วยดอกไม้และคำชม — แต่ไม่มีใครที่รู้จักคุณจริง ๆ'
    };
  }
  if (stats.heart < 25) {
    return {
      id: 'burnout',
      title: 'บทส่งท้าย · หมดไฟกลางทาง',
      text: 'คุณทำงานหนักมาตลอด จนลืมไปว่าตัวเองอยากอะไร — และวันนี้ก็ไม่มีแรงจะเริ่มถามอีก'
    };
  }
  return {
    id: 'peace',
    title: 'บทส่งท้าย · เกษียณอย่างสงบ',
    text: 'คุณจากไปในบ้านที่มีคนที่รักอยู่ข้าง ๆ ความฝันบางอย่างสำเร็จ บางอย่างไม่ — แต่ทั้งหมดนั้นคือชีวิตของคุณ'
  };
}

function legacyScore() {
  const coll = Object.keys(life.collections || {}).reduce(function (a, k) { return a + life.collections[k]; }, 0);
  const as = life.assets || {};
  return Math.min(10, Math.floor(
    (life.milestones || []).length / 2 +
    (life.achievements || []).length / 2 +
    (life.homeLevel || 0) +
    (life.business && life.business.active ? life.business.level : 0) +
    coll / 5 +
    (life.flags.kid ? 1 : 0) +
    assetPrestige() / 5 +
    Math.min(2, (as.invest || 0) / 2000000)
  ));
}

function showLifeEnding(type) {
  gameOver = true;
  life.legacy = legacyScore();
  try {
    const prev = Number(localStorage.getItem('openlife.legacy') || '0');
    localStorage.setItem('openlife.legacy', String(Math.max(0, prev) + life.legacy));
  } catch (e) { /* ignore */ }
  life.phase = 'ended';
  updateHud();
  const age = ageYears();
  const debt = totalDebt();
  const dreamOk = dreamAchieved();
  const ending = endingFor(type);
  const title = ending.title;
  const text = ending.text;

  const log = life.log.slice(-7).map(function (l) {
    return '· อายุ ' + l.age + ': ' + l.title + ' — ' + l.choice;
  }).join('<br>');
  const bgObj = BACKGROUNDS.filter(function (x) { return x.id === life.backgroundId; })[0];
  const relLine = 'ครอบครัว <b>' + life.rel.family + '</b> · คู่รัก <b>' + life.rel.love + '</b> · เพื่อน <b>' + life.rel.friend + '</b>' +
    (life.flags.kid ? ' · ลูก <b>' + Math.round(life.child.relation) + '</b>' : '');
  const as = life.assets || {};
  const assetLine = 'บ้านระดับ <b>' + (life.homeLevel || 0) + '</b> · รถ <b>' +
    (as.carTier > 0 ? as.carTier + '/3' : 'ไม่มี') + '</b> · ลงทุน <b>฿' + fmt(as.invest || 0) +
    '</b> · ห้องเช่า <b>' + (as.rentals || 0) + '</b> · ทริป <b>' + (as.trips || 0) + '</b> ครั้ง' +
    ((as.donated || 0) > 0 ? ' · บริจาค <b>฿' + fmt(as.donated) + '</b>' : '');

  playSfx('page');
  const html =
    '<div class="ev-head"><span class="ev-chip">จบชีวิต</span><span>อายุ ' + age + ' ปี</span></div>' +
    '<div class="ev-title">' + title + '</div>' +
    '<div class="ev-text">' + text + '</div>' +
    '<div class="pay-debt">' +
    'เกิดที่ <b>' + life.province + '</b> · ภูมิหลัง <b>' + (bgObj ? bgObj.name : '-') + '</b><br>' +
    'สถานะสุดท้าย: <b>' + profile.chapter + '</b> · อาชีพ <b>' + profile.job + '</b><br>' +
    'เงินคงเหลือ <b>฿' + fmt(stats.money) + '</b> · หนี้ <b>฿' + fmt(debt) + '</b> · เครดิต <b>' + Math.round(stats.credit) + '</b><br>' +
    relLine + '<br>' +
    assetLine + '<br>' +
    'ความฝัน: <b>' + (dreamOk ? 'สำเร็จ' : 'ไม่สำเร็จ') + '</b> · ประเมินแล้ว <b>' + career.reviews + '</b> ครั้ง<br>' +
    'Legacy: <b>' + life.legacy + '</b> · Milestones <b>' + (life.milestones || []).length + '</b> · Achievements <b>' + (life.achievements || []).length + '</b><br>' +
    (log ? '<br>' + log : '') +
    '</div>' +
    '<button class="btn-primary" id="restartLife">เริ่มชีวิตใหม่ ▶</button>';
  openModal(html);
  document.getElementById('restartLife').addEventListener('click', function () {
    clearSave();
    location.reload();
  });
}

function resumeLife() {
  if (life.phase === 'early') {
    showEarlyTurn();
  } else if (life.phase === 'adult') {
    closeModal();
    paused = false;
    if (life.activeMap && scene === 'city') enterCityMap(true, true);
    updateHud();
    toast('กลับมาที่ชีวิตเดิม · อายุ ' + ageYears());
  } else if (life.phase === 'creation') {
    openLifeCreation();
  }
}


/* ==========================================================
   MONTH CYCLE · เงินเดือน · หนี้ · event · save
   ========================================================== */

function payRow(label, value, cls) {
  return '<div class="pay-row' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span><b>' + value + '</b></div>';
}

function openTimeAdvance() {
  if (life.phase !== 'adult' || paused) return;
  const billsMonth = Math.round(housingCost() + livingCost() + lifestyleCost());
  const fixedMonth = familyCost() + assetUpkeep();
  const paid = billsPaidThisTurn();
  const html =
    '<div class="ev-head"><span class="ev-chip">เดินเวลา</span><span>' + dateLabel() + '</span></div>' +
    '<div class="ev-title">จะเดินเวลากี่เดือน?</div>' +
    '<div class="ev-text">อายุ <b>' + ageYears() + '</b> ปี · เงินสด <b>฿' + fmt(stats.money) + '</b> · กิจกรรมเหลือ <b>' + activitiesLeft() + '/' + actionBudget() + '</b></div>' +
    '<div class="quick-grid">' +
    '<button data-time="1"><b>+1 เดือน</b><span>กิจกรรม 3 ครั้งถัดไป</span></button>' +
    '<button data-time="3"><b>+3 เดือน</b><span>กิจกรรม 5 ครั้งถัดไป</span></button>' +
    '<button data-time="6"><b>+6 เดือน</b><span>กิจกรรม 7 ครั้งถัดไป</span></button>' +
    '<button data-time="12"><b>+1 ปี</b><span>กิจกรรม 9 ครั้งถัดไป · เร็ว</span></button>' +
    '</div>' +
    '<div class="pay-debt">' + (paid ? 'บิลเดือนนี้: จ่ายแล้ว (ถ้าเดินเวลานานจะคิดเดือนที่เหลือเพิ่ม)' : '⚠ บิลที่อยู่ยังไม่จ่าย · ฿' + fmt(billsMonth) + '/เดือน') +
    '<br>หนี้ขั้นต่ำ <b>฿' + fmt(debtMinPerMonth()) + '/เดือน</b> · จ่ายงวดนี้แล้วส่วนที่เหลือจะหักอัตโนมัติ<br>' +
    (fixedMonth > 0 ? 'ครอบครัว/ค่าดูแลทรัพย์สิน <b>฿' + fmt(fixedMonth) + '/เดือน</b><br>' : '') +
    'เงินเดือน/บิล/ดอกเบี้ย/ประเมินงานคิดตามจำนวนเดือน · กิจกรรมช่วงถัดไปได้ตามช่วงเวลาที่เลือก</div>' +
    '<button class="btn-ghost" id="timeClose">ยังไม่เดินเวลา</button>';
  openModal(html);
  document.getElementById('timeClose').addEventListener('click', closeModal);
  modal.querySelectorAll('[data-time]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      life.plannedMonths = Number(btn.getAttribute('data-time')) || 1;
      closeModal();
      startAdultTurn();
    });
  });
}

function openSleep() {
  const html =
    '<div class="ev-head"><span class="ev-chip">บ้าน</span><span>' + dateLabel() + '</span></div>' +
    '<div class="ev-title">จะเข้านอนแล้ว?</div>' +
    '<div class="ev-text">เตียงนุ่ม แต่พรุ่งนี้ยังมีงานรออยู่ — จะพักคืนเดียว หรือเดินเวลาไปข้างหน้า?</div>' +
    '<div class="choices">' +
    '<button class="choice" data-choice="0"><span class="c-label">1. นอน 1 คืน</span>' +
    '<span class="c-hint"><span class="hint up">พลังงานเต็ม</span><span class="hint time">ตื่น 07:00</span></span></button>' +
    '<button class="choice" data-choice="1"><span class="c-label">2. เดินเวลา (+1 / +3 / +6 / +1 ปี)</span>' +
    '<span class="c-hint"><span class="hint up">รับเงินเดือน</span><span class="hint down">หักค่าใช้จ่าย</span><span class="hint req">มี event</span></span></button>' +
    '<button class="choice" data-choice="2"><span class="c-label">3. ยังไม่นอน</span></button>' +
    '</div>';

  openModal(html);
  bindChoices(function (i) {
    if (i === 0) {
      sleep();
    } else if (i === 1) {
      closeModal();
      openTimeAdvance();
    } else {
      closeModal();
    }
  });
}

const MONTH_EVENTS = jsonEvents(eventsData.months);

function opContext() {
  return {
    life: life,
    stats: stats,
    finance: finance,
    profile: profile,
    debts: debts,
    lifeDateParts: lifeDateParts,
    childAgeYears: childAgeYears,
    applyLifeFx: applyLifeFx,
    toast: toast
  };
}

function jsonEvents(list) {
  return buildJsonEvents(list, opContext());
}

function normalizeEventOps(list) {
  (list || []).forEach(function (ev) {
    (ev.choices || []).forEach(function (c) {
      if (c.ops && !c.apply) {
        c.apply = function () { runOps(c.ops, opContext()); };
      }
    });
  });
}

function normalizePoolOps(pool) {
  if (Array.isArray(pool)) {
    normalizeEventOps(pool);
    return;
  }
  Object.keys(pool || {}).forEach(function (k) {
    normalizeEventOps(pool[k]);
  });
}

const SEASON_EVENTS = jsonEvents(eventsData.seasons);
const DISTRICT_EVENTS = jsonEvents(eventsData.district || []);

function hintHtml(hints) {
  return hints.map(function (h) { return '<span class="hint ' + h[0] + '">' + h[1] + '</span>'; }).join('');
}

function pickMonthEvent() {
  if (monthsPlayed > 0 && Math.random() > 0.7) return null;
  const pool = MONTH_EVENTS.filter(function (e) { return !e.cond || e.cond(); });
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function startMonthEnd() {
  paused = true;
  const ev = pickMonthEvent();
  if (!ev) { resolveMonth(null); return; }

  const html =
    '<div class="ev-head"><span class="ev-chip">' + ev.chip + '</span><span>สิ้นเดือน · ' + MONTHS[dateParts(world.day).m] + '</span></div>' +
    '<div class="ev-title">' + ev.title + '</div>' +
    '<div class="ev-text">' + ev.text + '</div>' +
    '<div class="choices">' +
    ev.choices.map(function (c, i) {
      return '<button class="choice" data-choice="' + i + '"><span class="c-label">' + (i + 1) + '. ' + c.label + '</span>' +
        '<span class="c-hint">' + hintHtml(c.hint || []) + '</span></button>';
    }).join('') +
    '</div>';

  openModal(html);
  bindChoices(function (i) {
    const ch = ev.choices[i];
    if (ch) applyChoiceOutcome(ch);
    resolveMonth(ev);
  });
}

function initDebtDue() {
  const key = currentTurnKey();
  Object.keys(debts).forEach(function (k) {
    debts[k].lastPaidKey = key; // เดือนแรกเริ่มนับ ไม่ถือว่าค้าง
    debts[k].missed = 0;
    debts[k].repossessed = false;
    debts[k].grace = true;
  });
}

function payDebt(key, amount) {
  const d = debts[key];
  if (!d) return;
  amount = Math.floor(Number(amount));
  if (!isFinite(amount) || amount <= 0) { toast('ใส่จำนวนเงินที่จะจ่าย'); return; }
  if (d.balance <= 0) { toast(d.label + ' ปิดแล้ว'); return; }
  if (amount > stats.money) { toast('เงินไม่พอ (มี ฿' + fmt(stats.money) + ')'); return; }

  const months = periodMonths();
  const minDue = Math.min(d.min * months, d.balance);
  const alreadyPaid = d.lastPaidKey === currentTurnKey();
  amount = Math.min(amount, d.balance);
  stats.money -= amount;
  d.balance -= amount;

  if (amount >= minDue || d.balance === 0) {
    d.lastPaidKey = currentTurnKey();
    d.missed = 0;
    d.grace = false;
    if (!alreadyPaid) stats.credit = clamp(stats.credit + 1, 0, 100);
    toast('จ่าย ' + d.label + ' ฿' + fmt(amount) + ' · ครบขั้นต่ำงวดนี้');
  } else {
    toast('จ่าย ' + d.label + ' ฿' + fmt(amount) + ' · ยังไม่ถึงขั้นต่ำ ฿' + fmt(minDue));
  }

  saveGame();
  updateHud();
  openFinance(true);
}

function addNeed(key, amount) {
  if (!life.needs) life.needs = { fun: 70, social: 65, rest: 70, hygiene: 75, hunger: 75 };
  life.needs[key] = clamp((life.needs[key] || 0) + amount, 0, 100);
}

function gainSkill(key, amount) {
  if (!life.skills) life.skills = {};
  life.skills[key] = clamp((life.skills[key] || 0) + amount, 0, 100);
}

function computeMood() {
  const n = life.needs;
  const avg = (n.fun + n.social + n.rest + n.hygiene + n.hunger) / 5 +
    (stats.heart - 50) * 0.25 + ((life.grooming || 70) - 50) * 0.15;
  life.mood = avg >= 75 ? 'สดใส' : avg >= 55 ? 'ปกติ' : avg >= 35 ? 'เหนื่อย' : 'เครียด';
}

function needsTick() {
  addNeed('fun', -3);
  addNeed('social', -2);
  addNeed('rest', -4);
  addNeed('hygiene', -3);
  addNeed('hunger', -5);
  life.grooming = clamp((life.grooming === undefined ? 70 : life.grooming) - 1, 0, 100);
  computeMood();
}

function syncPeople() {
  if (!Array.isArray(life.people)) return;
  life.people.forEach(function (p) {
    if (p.id === 'friend') p.rel = life.rel.friend;
    else if (p.id === 'boss') p.rel = life.rel.boss;
    else if (p.id === 'partner') p.rel = life.rel.love;
    else if (p.id === 'child') p.rel = life.child.relation;
    if (p.id === 'partner' && life.flags.married) p.note = 'แต่งงานแล้ว';
    if (p.id === 'child' && life.flags.kid) p.note = childAgeYears() + ' ปี';
    if (p.id === 'child' && life.flags.grandchild) p.note = 'มีหลานแล้ว';
  });
}

function weatherTick() {
  const pool = ['แดดดี', 'ฝนตก', 'ร้อนจัด', 'ลมแรง'];
  let next = pool[Math.floor(Math.random() * pool.length)];
  if (next === life.weather) next = pool[(pool.indexOf(next) + 1) % pool.length];
  life.weather = next;
  if (next === 'ฝนตก') { stats.energy = clamp(stats.energy - 2, 0, 100); stats.heart = clamp(stats.heart + 1, 0, 100); }
  if (next === 'ร้อนจัด') { stats.energy = clamp(stats.energy - 3, 0, 100); stats.health = clamp(stats.health - 1, 0, 100); }
  if (next === 'ลมแรง') { stats.heart = clamp(stats.heart + 1, 0, 100); }
  if (next === 'แดดดี') { stats.health = clamp(stats.health + 1, 0, 100); }
}

function addAchievement(id, label) {
  if (!Array.isArray(life.achievements)) life.achievements = [];
  if (life.achievements.indexOf(id) >= 0) return;
  life.achievements.push(id);
  toast('🏆 ' + label);
}

function checkAchievements() {
  if (finance.salary > 0) addAchievement('first_job', 'งานแรก');
  if (career.promotions > 0) addAchievement('first_promo', 'เลื่อนตำแหน่งครั้งแรก');
  if (career.rank >= 4) addAchievement('director', 'ขึ้นถึงผู้อำนวยการ');
  if (life.flags.house) addAchievement('house', 'บ้านหลังแรก');
  if (life.flags.car) addAchievement('car', 'รถคันแรก');
  if (life.flags.married) addAchievement('married', 'แต่งงาน');
  if (life.flags.kid) addAchievement('kid', 'มีลูกคนแรก');
  if (life.flags.grandchild) addAchievement('grandchild', 'มีหลานคนแรก');
  if (life.flags.retired) addAchievement('retired', 'เกษียณ');
  if (life.business.active) addAchievement('business', 'เปิดธุรกิจ');
  if (life.homeLevel >= 3) addAchievement('home_max', 'บ้านระดับสูงสุด');
  const as = life.assets || {};
  if (as.carTier >= 1) addAchievement('car_tier_1', 'รถครอบครัว');
  if (as.carTier >= 2) addAchievement('car_tier_2', 'SUV คันแรก');
  if (as.carTier >= 3) addAchievement('car_tier_3', 'รถหรู');
  if (as.trips >= 3) addAchievement('trips_3', 'ท่องเที่ยว 3 ครั้ง');
  if (as.invest >= 1000000) addAchievement('invest_1m', 'เงินลงทุนครบ 1 ล้าน');
  if ((as.rentals || 0) >= 1) addAchievement('rental_1', 'ห้องเช่าแรก');
  if ((as.rentals || 0) >= 3) addAchievement('rental_3', 'เจ้าของอสังหา 3 ห้อง');
  if (as.donated >= 1000000) addAchievement('donor', 'ผู้ให้');
  if (as.donated >= 5000000) addAchievement('patron', 'ผู้สนับสนุนกองทุนมรดก');
  const totalCollect = Object.keys(life.collections || {}).reduce(function (a, k) { return a + life.collections[k]; }, 0);
  if (totalCollect >= 10) addAchievement('collector', 'นักสะสมตัวยง');
  const maxSkill = Object.keys(life.skills || {}).reduce(function (a, k) { return Math.max(a, life.skills[k]); }, 0);
  if (maxSkill >= 60) addAchievement('skill_60', 'ทักษะระดับเชี่ยวชาญ');
  if (ageYears() >= 80) addAchievement('long_life', 'อายุยืน 80 ปี');
  if (stats.money >= 1000000) addAchievement('millionaire', 'เงินเก็บครบ 1 ล้าน');
  if (ageYears() >= 23 && totalDebt() === 0) addAchievement('debt_free', 'ปลดหนี้ครบ');
  if ((life.milestones || []).length >= 8) addAchievement('milestone_8', 'เก็บความสำเร็จ 8 อย่าง');
}

function addMilestone(id, label) {
  if (!Array.isArray(life.milestones)) life.milestones = [];
  for (let i = 0; i < life.milestones.length; i += 1) {
    if (life.milestones[i].id === id) return;
  }
  life.milestones.push({ id: id, label: label, age: ageYears() });
  toast('🏅 ' + label + ' · อายุ ' + ageYears() + ' ปี');
}

function checkMilestones() {
  if (finance.salary > 0) addMilestone('firstJob', 'ได้งานแรก');
  if (career.promotions > 0) addMilestone('firstPromotion', 'เลื่อนตำแหน่งครั้งแรก');
  if (career.rank >= 4) addMilestone('director', 'ขึ้นถึงผู้อำนวยการ');
  if (life.flags.house) addMilestone('house', 'มีบ้านหลังแรก');
  if (life.flags.car) addMilestone('car', 'มีรถคันแรก');
  if (life.flags.married) addMilestone('married', 'แต่งงาน');
  if (life.flags.kid) addMilestone('kid', 'มีลูกคนแรก');
  if (life.flags.grandchild) addMilestone('grandchild', 'มีหลานคนแรก');
  if (life.flags.retired) addMilestone('retired', 'เกษียณ');
  if (life.flags.business) addMilestone('business', 'เปิดธุรกิจของตัวเอง');
  if (stats.money >= 1000000) addMilestone('millionaire', 'เงินเก็บครบ 1 ล้าน');
  if (ageYears() >= 23 && totalDebt() === 0) addMilestone('debtFree', 'ปลดหนี้ครบ');
  checkAchievements();
}

function resolveMonth(ev, monthsArg) {
  pendingEnding = null;
  const months = Math.max(1, monthsArg || periodMonths());
  const p = lifeDateParts();
  const familyNotes = familyTick(months);
  needsTick();
  weatherTick();
  syncPeople();
  // ประสบการณ์ทำงานสะสมตามเวลาที่ผ่านไป (ทำงานเต็มเวลาแม้ไม่ได้กดกิจกรรม)
  if (finance.salary > 0) {
    stats.kpi = clamp(stats.kpi + 0.3 * months, 0, 100);
    life.rel.boss = clamp((life.rel.boss || 0) + 0.03 * months, 0, 100);
    stats.social = clamp(stats.social + 0.02 * months, 0, 100);
  }
  const salary = finance.salary * months;
  const passive = passiveIncomePerMonth() * months;
  if (life.assets && life.assets.invest > 0) {
    life.assets.invest = Math.round(life.assets.invest * Math.pow(1.003, months));
  }
  const tax = taxPerMonth() * months;
  const social = socialSecurityPerMonth() * months;
  stats.money += salary + passive;
  stats.money = Math.max(0, stats.money - tax - social);

  const fixed = fixedPerMonth() * months;
  let fixedShortfall = 0;
  if (stats.money < fixed) {
    fixedShortfall = fixed - stats.money;
    stats.money = 0;
    debts.credit.balance += fixedShortfall;
    stats.credit = clamp(stats.credit - 3, 0, 100);
    stats.heart = clamp(stats.heart - 4, 0, 100);
  } else {
    stats.money -= fixed;
  }

  const closingKey = currentTurnKey();
  const debtNotes = [];
  const warnings = [];
  if (fixedShortfall) warnings.push('เงินไม่พอจ่ายค่าครอบครัว/ทรัพย์สิน — ยอดขาด ฿' + fmt(fixedShortfall) + ' ทบเข้าบัตรเครดิต');
  // บิลที่จ่ายไปแล้วครอบคลุมเฉพาะเดือนที่จ่ายจริง — เดินเวลายาวต้องจ่ายส่วนที่เหลือ
  const billRes = settleBillsAtMonthEnd(months);
  const bills = billRes.amount;
  const billsSettled = billRes.settled;
  if (billRes.note) debtNotes.push(billRes.note);
  if (billRes.warning) warnings.push(billRes.warning);
  familyNotes.forEach(function (n) { warnings.push(n); });
  let interestTotal = 0;

  Object.keys(debts).forEach(function (key) {
    const d = debts[key];
    if (d.balance <= 0) {
      d.missed = 0;
      debtNotes.push(d.label + ': ' + (d.repossessed ? 'ถูกยึดแล้ว' : 'ปิดแล้ว'));
      return;
    }

    const interest = Math.round(d.balance * d.rate * months);
    d.balance += interest;
    interestTotal += interest;

    if (d.lastPaidKey === closingKey) {
      d.missed = 0;
      const extraMonths = Math.max(0, months - 1);
      if (extraMonths > 0) {
        const want = Math.min(d.min * extraMonths, d.balance);
        if (want > 0) {
          if (stats.money >= want) {
            stats.money -= want;
            d.balance -= want;
            debtNotes.push(d.label + ': หักขั้นต่ำเพิ่ม ' + extraMonths + ' เดือน ฿' + fmt(want));
          } else {
            debts.credit.balance += want;
            stats.credit = clamp(stats.credit - 2, 0, 100);
            warnings.push(d.label + ': เงินไม่พอจ่ายขั้นต่ำเดือนที่เหลือ ฿' + fmt(want) + ' — ทบเข้าบัตรเครดิต');
          }
        }
      }
      debtNotes.push(d.label + (d.grace ? ': เริ่มนับงวดนี้' : ': จ่ายตรงเวลา'));
    } else {
      d.missed = (d.missed || 0) + 1;
      const minDue = Math.min(d.min * months, d.balance);
      const fee = Math.round(minDue * 0.05);
      d.balance += fee;
      stats.credit = clamp(stats.credit - 3, 0, 100);
      stats.heart = clamp(stats.heart - 2, 0, 100);
      debtNotes.push(d.label + ': ค้าง ' + d.missed + ' งวด (ค่าปรับ ฿' + fmt(fee) + ')');
    }
    d.grace = false;
  });

  // บันไดบทลงโทษ
  const car = debts.car;
  if (car.balance > 0 && car.missed >= 3 && !car.repossessed) {
    car.repossessed = true;
    car.balance = 0;
    car.missed = 0;
    life.flags.car = false;
    stats.credit = clamp(stats.credit - 12, 0, 100);
    stats.heart = clamp(stats.heart - 10, 0, 100);
    stats.health = clamp(stats.health - 2, 0, 100);
    warnings.push('รถถูกยึด — หนี้ผ่อนรถปิดด้วยการยึดทรัพย์');
  }

  const credit = debts.credit;
  if (credit.balance > 0 && credit.missed >= 2 && !credit.collector) {
    credit.collector = true;
    stats.credit = clamp(stats.credit - 5, 0, 100);
    stats.heart = clamp(stats.heart - 5, 0, 100);
    stats.health = clamp(stats.health - 2, 0, 100);
    warnings.push('เจ้าหนี้บัตรเครดิตโทรมาและส่งจดหมาย');
  }
  if (credit.balance > 0 && credit.missed >= 4 && !credit.lawsuit) {
    credit.lawsuit = true;
    stats.credit = clamp(stats.credit - 10, 0, 100);
    stats.health = clamp(stats.health - 4, 0, 100);
    warnings.push('บัตรเครดิตถูกฟ้องศาล');
  }

  const student = debts.student;
  if (student.balance > 0 && student.missed >= 4 && !student.lawsuit) {
    student.lawsuit = true;
    stats.credit = clamp(stats.credit - 8, 0, 100);
    stats.health = clamp(stats.health - 3, 0, 100);
    warnings.push('กยศ. ถูกฟ้อง');
  }

  const personal = debts.personal;
  if (personal.balance > 0 && personal.missed >= 2 && !personal.collector) {
    personal.collector = true;
    stats.credit = clamp(stats.credit - 4, 0, 100);
    stats.heart = clamp(stats.heart - 4, 0, 100);
    warnings.push('เจ้าหนี้สินเชื่อส่วนบุคคลโทรมา');
  }
  if (personal.balance > 0 && personal.missed >= 4 && !personal.lawsuit) {
    personal.lawsuit = true;
    stats.credit = clamp(stats.credit - 8, 0, 100);
    stats.health = clamp(stats.health - 3, 0, 100);
    warnings.push('สินเชื่อส่วนบุคคลถูกฟ้อง');
  }

  // monthly drift (scale with turn length) + mood/home comfort
  stats.health = clamp(stats.health - 0.15 * months, 0, 100);
  stats.heart = clamp(stats.heart - 0.3 * months, 0, 100);
  if (life.mood === 'สดใส') stats.heart = clamp(stats.heart + 2, 0, 100);
  else if (life.mood === 'เครียด') stats.heart = clamp(stats.heart - 2, 0, 100);
  stats.heart = clamp(stats.heart + (life.homeLevel || 0), 0, 100);

  const missedTotal = Object.keys(debts).reduce(function (a, k) { return a + (debts[k].missed || 0); }, 0);
  const debtTotal = totalDebt();
  const netWorth = stats.money + ((life.assets && life.assets.invest) || 0) - debtTotal;

  const inBankruptcyRisk = (stats.credit <= 0 && missedTotal >= 6) ||
    (missedTotal >= 3 && netWorth < -300000);
  if (inBankruptcyRisk) {
    life.brokeTurns = (life.brokeTurns || 0) + 1;
  } else {
    life.brokeTurns = 0;
  }
  if (stats.health <= 0) {
    pendingEnding = 'death';
  } else if (life.brokeTurns >= 3) {
    pendingEnding = 'bankruptcy';
  } else if (inBankruptcyRisk) {
    warnings.push('เสี่ยงล้มละลาย ' + life.brokeTurns + '/3 — จ่ายหนี้/หาเงินก่อน');
  }

  showPayslip({
    p: p,
    ev: ev,
    months: months,
    salary: salary,
    passive: passive,
    tax: tax,
    social: social,
    bills: bills,
    billsPaid: billsSettled,
    fixed: fixed,
    interestTotal: interestTotal,
    debtNotes: debtNotes,
    warnings: warnings,
    totalDebt: debtTotal,
    missedTotal: missedTotal,
    pendingEnding: pendingEnding
  });
}

function showPayslip(r) {
  let rows = payRow('เงินเดือน (' + r.months + ' เดือน)', '+' + fmt(r.salary), 'pos');
  if (r.passive > 0) rows += payRow('รายได้เสริม', '+' + fmt(r.passive), 'pos');
  rows += payRow('ภาษี', '−' + fmt(r.tax), 'neg');
  rows += payRow('ประกันสังคม', '−' + fmt(r.social), 'neg');
  rows += payRow('บิลที่อยู่/ค่าครองชีพ', r.billsPaid ? 'จ่ายแล้ว' : 'ค้าง ฿' + fmt(r.bills), r.billsPaid ? 'pos' : 'neg');
  if (familyCost() > 0) {
    rows += payRow('ครอบครัว', '−' + fmt(familyCost() * r.months), 'neg');
  }
  if (assetUpkeep() > 0) {
    rows += payRow('ค่าดูแลทรัพย์สิน', '−' + fmt(assetUpkeep() * r.months), 'neg');
  }

  const notes = r.debtNotes.map(function (t) { return '· ' + t; }).join('<br>');
  const warns = r.warnings.map(function (t) { return '⚠ ' + t; }).join('<br>');

  const html =
    '<div class="ev-head"><span class="ev-chip">สิ้นเดือน</span><span>' + dateLabel() + '</span></div>' +
    '<div class="ev-title">สลิปเงินเดือน · ' + MONTHS[r.p.m] + ' ' + r.p.y + '</div>' +
    '<div class="pay-table">' + rows +
    '<div class="pay-total"><span>คงเหลือในบัญชี</span><b>฿' + fmt(stats.money) + '</b></div>' +
    '</div>' +
    '<div class="pay-debt">ระบบ <b>ไม่หักหนี้อัตโนมัติ</b> — ต้องจ่ายเองที่ปุ่ม F<br>' +
    notes + '<br>ดอกเบี้ยเดือนนี้ <b>฿' + fmt(r.interestTotal) + '</b> · หนี้รวม <b>฿' + fmt(r.totalDebt) + '</b><br>' +
    (life.assets && life.assets.invest > 0 ? 'เงินลงทุน <b>฿' + fmt(life.assets.invest) + '</b> (+0.3%/เดือน) · ' : '') +
    'เครดิต <b>' + Math.round(stats.credit) + '</b> / 100</div>' +
    (warns ? '<div class="pay-warn">' + warns + '</div>' : '') +
    (r.pendingEnding ? '<div class="pay-warn">สถานะของคุณถึงจุดจบแล้ว — กดไปต่อเพื่อดูบทส่งท้าย</div>' : '') +
    '<button class="btn-primary" id="payContinue">' + (r.pendingEnding ? 'บทส่งท้าย ▶' : 'เริ่มเดือนใหม่ ▶') + '</button>';

  playSfx('coin');
  openModal(html);
  document.getElementById('payContinue').addEventListener('click', function () { finishMonth(r.months); });
}

function finishMonth(monthsArg) {
  const months = Math.max(1, monthsArg || periodMonths());

  life.turn += 1;
  life.actionsThisTurn = 0;
  life.activityUses = {};
  life.periodMonths = months;
  life.plannedMonths = 1;
  life.ageMonths += months;
  profile.age = ageYears();
  if (life.ageMonths >= 65 * 12 && !life.flags.retired) {
    finance.salary = 0;
    life.flags.retired = true;
    profile.job = 'เกษียณ';
    toast('อายุ 65 · เข้าสู่การเกษียณอย่างเป็นทางการ');
  }
  checkMilestones();
  world.day += months * 30;
  world.minutes = 7 * 60;
  stats.energy = clamp(stats.energy + 40, 0, 100);
  stats.heart = clamp(stats.heart + 2, 0, 100);
  flags.workedToday = false;
  monthsPlayed += 1;

  closeModal();

  if (pendingEnding) {
    clearSave();
    showLifeEnding(pendingEnding);
    return;
  }

  let chapterChanged = false;
  const ch = chapterData();
  if (life.ageMonths >= ch.to * 12 && life.chapter < 10) {
    life.chapter += 1;
    life.turn = 0;
    life.recentEvents = [];
    profile.chapter = chapterData().name;
    chapterChanged = true;
  }

  if (life.chapter === 10 && life.ageMonths >= 90 * 12) {
    clearSave();
    showLifeEnding('oldage');
    return;
  }

  if (deathRoll(months)) {
    clearSave();
    showLifeEnding('death');
    return;
  }

  const next = function () { afterTurnCommit(chapterChanged, months); };
  if (needsReview()) showYearReview(next);
  else next();
}

function afterTurnCommit(chapterChanged, months) {
  saveGame();
  updateHud();

  if (chapterChanged) {
    const nc = chapterData();
    showChapterSummary(
      'เข้าสู่บท ' + nc.n + ' · ' + nc.name,
      'อายุ ' + profile.age + ' ปี — ชีวิตเข้าสู่ช่วงใหม่<br><br>' +
      'สุขภาพ ' + Math.round(stats.health) + ' · ใจ ' + Math.round(stats.heart) +
      ' · เงิน ฿' + fmt(stats.money) + ' · หนี้ ฿' + fmt(totalDebt()) +
      '<br>ตำแหน่ง ' + profile.job + ' · เงินเดือน ฿' + fmt(finance.salary),
      function () {
        closeModal();
        paused = false;
        updateHud();
        saveGame();
      }
    );
  } else {
    paused = false;
    toast('ผ่านไป ' + months + ' เดือน · อายุ ' + profile.age);
  }
}

// บิลที่อยู่: feature module (src/features/bills) — ตัวอย่างอ้างอิงของ architecture.md
const billsFeature = createBills({
  isPaused: function () { return paused; },
  dateLabel: dateLabel,
  openModal: openModal,
  closeModal: closeModal,
  toast: toast,
  saveGame: saveGame,
  updateHud: updateHud
});

function openBills() { billsFeature.open(); }

function districtActivity(id) {
  if (paused) return;
  const d = districtById(id);
  if (!d) return;
  if (!spendActivity()) return;
  const hour = world.minutes / 60;
  const isNight = hour >= 18 || hour < 5;
  const label = isNight && d.nightActivity ? d.nightActivity : d.activity;
  const fx = isNight && d.nightFx ? d.nightFx : d.activityFx;
  const m = beginActivity('district-' + id);
  applyActivityFx(fx, m);
  const skillMap = { samyan: 'creativity', silom: 'finance', chula: 'creativity', bangrak: 'communication', pathumwan: 'communication', lumphini: 'fitness', yaowarat: 'cooking', khlongtoei: 'fitness' };
  const collMap = { samyan: 'books', silom: 'music', chula: 'books', bangrak: 'food', pathumwan: 'music', lumphini: 'stamps', yaowarat: 'food', khlongtoei: 'stamps' };
  if (skillMap[id]) gainSkill(skillMap[id], 1);
  if (collMap[id]) life.collections[collMap[id]] = (life.collections[collMap[id]] || 0) + 1;
  addNeed('fun', 4);
  addNeed('social', 2);
  addMinutes(45);
  updateHud();
  toast(label + ' · ' + d.vibe);
}

/* ธุรกิจ: feature module (src/features/business) — ดู docs/rules/architecture.md */
const businessFeature = createBusiness({
  isPaused: function () { return paused; },
  openModal: openModal,
  closeModal: closeModal,
  toast: toast,
  saveGame: saveGame,
  updateHud: updateHud,
  addAchievement: addAchievement
});

function openBusiness() { businessFeature.open(); }

function openHomeUpgrade() { assetsFeature.openHome(); }

/* ทรัพย์สิน/ไลฟ์สไตล์: feature module (src/features/assets) — ดู docs/rules/architecture.md */
const assetsFeature = createAssets({
  isPaused: function () { return paused; },
  openModal: openModal,
  closeModal: closeModal,
  getModal: function () { return modal; },
  toast: toast,
  saveGame: saveGame,
  updateHud: updateHud,
  openFinance: function () { openFinance(true); },
  openBusiness: openBusiness,
  addAchievement: addAchievement,
  addNeed: addNeed,
  gainSkill: gainSkill
});

function openAssets() { assetsFeature.open(); }

function openQuickActions() {
  if (life.phase !== 'adult' || paused) return;
  const left = activitiesLeft();
  const bills = billsTotalPerTurn();
  const paid = billsPaidThisTurn();
  const overdue = Object.keys(debts).reduce(function (a, k) { return a + (debts[k].missed > 0 ? 1 : 0); }, 0);
  const dis = left <= 0 ? ' disabled' : '';
  const html =
    '<div class="ev-head"><span class="ev-chip">ทำเร็ว</span><span>กิจกรรมเหลือ ' + left + ' / ' + actionBudget() + '</span></div>' +
    '<div class="ev-title">ช่วงนี้จะทำอะไร?</div>' +
    '<div class="quick-grid">' +
    '<button data-quick="work"' + dis + '><b>ทำงาน</b><span>KPI +</span></button>' +
    '<button data-quick="gym"' + dis + '><b>ออกกำลังกาย</b><span>สุขภาพ/ใจ +</span></button>' +
    '<button data-quick="checkup"' + dis + '><b>ตรวจสุขภาพ</b><span>สุขภาพ ++</span></button>' +
    '<button data-quick="tv"' + dis + '><b>ดูทีวี</b><span>ใจ +</span></button>' +
    '<button data-quick="chat"' + dis + '><b>คุยเพื่อนร่วมงาน</b><span>ใจ +</span></button>' +
    '<button data-quick="bills"><b>จ่ายบิลที่อยู่</b><span>' + (paid ? 'จ่ายแล้ว' : 'ค้าง ฿' + fmt(bills)) + '</span></button>' +
    '<button data-quick="debts"><b>การเงิน/หนี้</b><span>' + (overdue ? 'ค้าง ' + overdue + ' งวด' : 'ดูสถานะ') + '</span></button>' +
    '<button data-quick="end" class="quick-end"><b>เดินเวลา</b><span>+1 / +3 / +6 / +1 ปี</span></button>' +
    '</div>' +
    '<div class="quick-sub">กิจกรรมเสริม</div>' +
    '<div class="quick-grid">' +
    '<button data-quick="read"' + dis + '><b>อ่านหนังสือ</b><span>ปัญญา +</span></button>' +
    '<button data-quick="walk"' + dis + '><b>เดินเล่นสวน</b><span>ใจ/สุขภาพ +</span></button>' +
    '<button data-quick="cook"' + dis + '><b>ทำอาหารเอง</b><span>อิ่ม + ทำอาหาร</span></button>' +
    '<button data-quick="call"' + dis + '><b>โทรหาพ่อแม่</b><span>ครอบครัว +</span></button>' +
    '<button data-quick="gig"' + dis + '><b>งานเสริม</b><span>เงิน +</span></button>' +
    '<button data-quick="date"' + dis + '><b>ออกเดท</b><span>ความรัก +</span></button>' +
    '</div>' +
    '<div class="pay-debt">เงินสด <b>฿' + fmt(stats.money) + '</b> · เงินเดือน <b>฿' + fmt(finance.salary) + '</b> · บิล <b>' + (paid ? 'จ่ายแล้ว' : '฿' + fmt(bills)) + '</b></div>' +
    '<button class="btn-ghost" id="quickClose">ปิด</button>';
  openModal(html);
  document.getElementById('quickClose').addEventListener('click', closeModal);
  modal.querySelectorAll('[data-quick]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const a = btn.getAttribute('data-quick');
      closeModal();
      if (a === 'work') openWork();
      else if (a === 'gym') gotoGym();
      else if (a === 'checkup') checkup();
      else if (a === 'tv') watchTv();
      else if (a === 'chat') chatCoworker();
      else if (a === 'read') readBook();
      else if (a === 'walk') walkPark();
      else if (a === 'cook') cookMeal();
      else if (a === 'call') callParents();
      else if (a === 'gig') sideGig();
      else if (a === 'date') dateNight();
      else if (a === 'bills') openBills();
      else if (a === 'debts') openFinance(true);
      else if (a === 'end') openTimeAdvance();
    });
  });
}

function openFinance(force) {
  if (paused && !force) return;
  const months = periodMonths();
  const key = currentTurnKey();
  const fixed = fixedPerMonth() * months;
  let monthlyDue = 0;
  let debtRowsHtml = '';

  Object.keys(debts).forEach(function (k) {
    const d = debts[k];
    const due = Math.min(d.min * months, d.balance);
    monthlyDue += due;
    if (k === 'personal' && d.balance <= 0) return;
    const paid = d.lastPaidKey === key;
    const status = d.balance <= 0
      ? (d.repossessed ? 'ถูกยึดแล้ว' : 'ปิดแล้ว')
      : (paid ? (d.grace ? 'เริ่มนับงวดนี้' : 'จ่ายแล้วงวดนี้') : 'ยังไม่จ่าย');
    const statusCls = d.balance <= 0 ? 'muted' : (paid ? 'ok' : 'bad');

    debtRowsHtml +=
      '<div class="debt-row">' +
      '<div class="debt-info">' +
      '<div class="debt-title"><b>' + d.label + '</b><span class="debt-status ' + statusCls + '">' + status + (d.missed ? ' · ค้าง ' + d.missed + ' งวด' : '') + '</span></div>' +
      '<div class="debt-sub">คงเหลือ ฿' + fmt(d.balance) + ' · ขั้นต่ำงวดนี้ ฿' + fmt(due) + ' · กำหนดวันที่ ' + d.dueDay + '</div>' +
      '</div>' +
      (d.balance > 0
        ? '<div class="debt-pay"><input id="pay-' + k + '" type="number" min="0" step="100" value="' + due + '"><button data-pay="' + k + '">จ่าย</button></div>'
        : '') +
      '</div>';
  });

  const tax = taxPerMonth() * months;
  const social = socialSecurityPerMonth() * months;
  const bills = billsTotalPerTurn();
  const billsPaid = billsPaidThisTurn();
  const totalOut = fixed + monthlyDue + tax + social + (billsPaid ? 0 : bills);
  const net = (finance.salary * months) + (passiveIncomePerMonth() * months) - totalOut;
  const canBorrowPersonal = debts.personal.balance <= 0 && stats.credit >= 60;
  const unpaidDebts = Object.keys(debts).filter(function (k) {
    return debts[k].balance > 0 && debts[k].lastPaidKey !== key;
  });
  let unpaidDebtDue = 0;
  unpaidDebts.forEach(function (k) {
    const d = debts[k];
    unpaidDebtDue += Math.min(d.min * months, d.balance);
  });

  const html =
    '<div class="ev-head"><span class="ev-chip">การเงิน</span><span>' + MONTHS[lifeDateParts().m] + ' ' + lifeDateParts().y + '</span>' +
    '<button class="ev-x" id="finX" type="button" aria-label="ปิด">✕</button></div>' +
    '<div class="ev-title">ภาพรวมการเงิน</div>' +
    '<div class="pay-table">' +
    payRow('เงินเดือน (' + months + ' เดือน)', '+' + fmt(finance.salary * months), 'pos') +
    (passiveIncomePerMonth() > 0 ? payRow('รายได้เสริม', '+' + fmt(passiveIncomePerMonth() * months), 'pos') : '') +
    payRow('ภาษี', '−' + fmt(tax), 'neg') +
    payRow('ประกันสังคม', '−' + fmt(social), 'neg') +
    payRow('บิลที่อยู่/ค่าครองชีพ', billsPaid ? 'จ่ายแล้ว' : 'ค้าง ฿' + fmt(bills), billsPaid ? 'pos' : 'neg') +
    (familyCost() > 0 ? payRow('ครอบครัว', '−' + fmt(familyCost() * months), 'neg') : '') +
    (assetUpkeep() > 0 ? payRow('ค่าดูแลทรัพย์สิน', '−' + fmt(assetUpkeep() * months), 'neg') : '') +
    '<div class="pay-total"><span>เหลือต่องวด (ถ้าจ่ายขั้นต่ำ)</span><b>฿' + fmt(net) + '</b></div>' +
    '</div>' +
    '<div class="debt-list">' + debtRowsHtml + '</div>' +
    '<div class="pay-debt">หนี้รวม <b>฿' + fmt(totalDebt()) + '</b> · เครดิต <b>' + Math.round(stats.credit) + '</b> / 100 · เงินสด <b>฿' + fmt(stats.money) + '</b><br>' +
    'ระบบไม่หักหนี้อัตโนมัติ — จ่ายเองด้านบน หรือปล่อยค้างเพื่อดูผลที่ตามมา<br>' +
    'งวดที่แสดง = 1 เดือน · ถ้าเดินเวลาหลายเดือน ระบบจะหักขั้นต่ำเดือนที่เหลืออัตโนมัติเมื่อจ่ายงวดนี้</div>' +
    (billsPaid ? '' : '<button class="btn-primary" id="payBillsFin">จ่ายบิลที่อยู่/ค่าครองชีพ ฿' + fmt(bills) + '</button>') +
    (unpaidDebts.length ? '<button class="btn-primary" id="payAllDebts">จ่ายขั้นต่ำทั้งหมด ฿' + fmt(unpaidDebtDue) + '</button>' : '') +
    (canBorrowPersonal ? '<button class="btn-primary" id="borrowPersonal">กู้สินเชื่อส่วนบุคคล +50,000 (ดอก 1.5%/เดือน)</button>' : '') +
    '<button class="btn-primary" id="finAssets">🏠 ทรัพย์สิน / ลงทุน</button>' +
    '<button class="btn-ghost" id="finClose">ปิด</button>';

  openModal(html);
  document.getElementById('finClose').addEventListener('click', closeModal);
  const finAssets = document.getElementById('finAssets');
  if (finAssets) {
    finAssets.addEventListener('click', function () {
      closeModal();
      openAssets();
    });
  }
  const finX = document.getElementById('finX');
  if (finX) finX.addEventListener('click', closeModal);
  const payBillsFin = document.getElementById('payBillsFin');
  if (payBillsFin) {
    payBillsFin.addEventListener('click', function () {
      closeModal();
      openBills();
    });
  }
  const payAllDebts = document.getElementById('payAllDebts');
  if (payAllDebts) {
    payAllDebts.addEventListener('click', function () {
      if (stats.money < unpaidDebtDue) {
        toast('เงินไม่พอจ่ายขั้นต่ำทั้งหมด ฿' + fmt(unpaidDebtDue));
        return;
      }
      unpaidDebts.forEach(function (k) {
        const d = debts[k];
        payDebt(k, Math.min(d.min * months, d.balance));
      });
      closeModal();
      openFinance(true);
    });
  }
  const borrowBtn = document.getElementById('borrowPersonal');
  if (borrowBtn) {
    borrowBtn.addEventListener('click', function () {
      stats.money += 50000;
      debts.personal.balance += 50000;
      debts.personal.missed = 0;
      debts.personal.grace = true;
      stats.credit = clamp(stats.credit - 2, 0, 100);
      saveGame();
      closeModal();
      toast('กู้สินเชื่อส่วนบุคคล +50,000 · ดอก 1.5%/เดือน');
      openFinance(true);
    });
  }
  modal.querySelectorAll('[data-pay]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const k = btn.getAttribute('data-pay');
      const input = document.getElementById('pay-' + k);
      payDebt(k, input ? input.value : 0);
    });
  });
}

/* หางาน: feature module (src/features/job-search) — ดู docs/rules/architecture.md */
const jobSearchFeature = createJobSearch({
  isPaused: function () { return paused; },
  currentTurnKey: currentTurnKey,
  wearingFormal: wearingFormal,
  openModal: openModal,
  closeModal: closeModal,
  toast: toast,
  saveGame: saveGame,
  updateHud: updateHud,
  hire: hireJob,
  rng: Math.random
});

function openJobSearch() { jobSearchFeature.open(); }

function hireJob(salary, kind) {
  if (kind === 'looks') {
    career.rank = 0;
    career.yearsInRank = 0;
    career.lastReviewAge = life.ageMonths;
    finance.salary = salary;
    profile.job = 'นายแบบ/นักแสดง · ฟรีแลนซ์';
    stats.kpi = 50;
    life.flags.unemployed = false;
    life.flags.looksCareer = true;
    addAchievement('looks_career', 'งานสายบันเทิง');
    closeModal();
    saveGame();
    updateHud();
    toast('ได้งานสายบันเทิง: ' + profile.job + ' · ฿' + fmt(finance.salary) + '/เดือน');
    return;
  }
  life.flags.looksCareer = false;
  const oldRank = career.rank;
  career.rank = kind === 'office' ? Math.max(0, oldRank - 1) : 0;
  const cap = CAREER_RANKS[career.rank].max;
  finance.salary = Math.min(
    kind === 'office' ? Math.max(salary, CAREER_RANKS[career.rank].min) : salary,
    Math.max(cap, salary)
  );
  profile.job = kind === 'office' ? CAREER_RANKS[career.rank].title : 'ฟรีแลนซ์';
  career.yearsInRank = 0;
  career.lastReviewAge = life.ageMonths;
  stats.kpi = 50;
  life.flags.unemployed = false;
  closeModal();
  saveGame();
  updateHud();
  toast('ได้งาน: ' + profile.job + ' · ฿' + fmt(finance.salary) + '/เดือน');
}


function saveContext(): SaveContext {
  return {
    saveKey: SAVE_KEY,
    stats: stats,
    world: world,
    flags: flags,
    profile: profile,
    finance: finance,
    debts: debts,
    career: career,
    life: life,
    player: player,
    scene: scene,
    viewMode: viewMode,
    getMonthsPlayed: function () { return monthsPlayed; },
    setMonthsPlayed: function (v) { monthsPlayed = v; },
    sceneExists: function (name) {
      if (name === 'district') return !!(life.currentMap || life.activeMap || (life.activeDistrict && getDistrictMap(life.activeDistrict)));
      return !!sceneInfo[name];
    },
    setPlayer: function (x, y, dir) { player.x = x; player.y = y; player.dir = dir; },
    setScene: function (name) { scene = name; },
    setViewMode: function (mode) { viewMode = mode; }
  };
}

function saveGame() { saveGameImpl(saveContext()); }
function loadGame() { return loadGameImpl(saveContext()); }
function clearSave() { clearSaveImpl(saveContext()); }

/* ---------- work ---------- */
/* ==========================================================
   UPDATE
   ========================================================== */

function gridAt(sc, x, y) {
  const info = sceneInfo[sc];
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= info.grid[0].length || ty >= info.grid.length) return 1;
  return info.grid[ty][tx];
}

function canStand(sc, x, y) {
  const hw = 11;
  const top = y - 22;
  const bottom = y + 4;
  return !gridAt(sc, x - hw, top) && !gridAt(sc, x + hw, top) &&
    !gridAt(sc, x - hw, bottom) && !gridAt(sc, x + hw, bottom);
}

function update(dt) {
  if (gameOver) return;
  anim += dt;
  world.minutes += dt * world.speed;
  while (world.minutes >= 1440) {
    world.minutes -= 1440;
    world.day += 1;
    stats.energy = clamp(stats.energy - 8, 0, 100);
    flags.workedToday = false;
    toast('อีกวันผ่านไป...');
  }

  let dx = 0;
  let dy = 0;
  if (keys.w || keys.arrowup) dy -= 1;
  if (keys.s || keys.arrowdown) dy += 1;
  if (keys.a || keys.arrowleft) dx -= 1;
  if (keys.d || keys.arrowright) dx += 1;

  const keyMoving = dx !== 0 || dy !== 0;
  if (keyMoving && walkPath.length) clearWalk();
  player.moving = keyMoving;

  if (keyMoving) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len; dy /= len;
    const speed = (scene === 'city' && viewMode === 'map' ? 300 : (scene === 'city' ? 145 : 172)) * dt;
    const nx = player.x + dx * speed;
    const ny = player.y + dy * speed;

    if (canStand(scene, nx, player.y)) player.x = nx;
    if (canStand(scene, player.x, ny)) player.y = ny;

    player.frame += dt * 8;

    if (Math.abs(dx) > Math.abs(dy)) player.dir = dx > 0 ? 'right' : 'left';
    else player.dir = dy > 0 ? 'down' : 'up';
  } else if (walkPath.length) {
    followWalkPath(dt);
  }

  // keep camera inside world + smooth follow (snap on scene jumps)
  const info = sceneInfo[scene];
  const viewW = AW * W2A;
  const viewH = AH * W2A;
  const targetCamX = info.w <= viewW ? (info.w - viewW) / 2 : clamp(player.x - viewW / 2, 0, info.w - viewW);
  const targetCamY = info.h <= viewH ? (info.h - viewH) / 2 : clamp(player.y - viewH / 2, 0, info.h - viewH);
  const sceneJump = camScene !== scene;
  camScene = scene;
  if (sceneJump) clearWalk();
  const snapCam = sceneJump || Math.abs(targetCamX - cam.x) > viewW || Math.abs(targetCamY - cam.y) > viewH;
  const follow = snapCam ? 1 : Math.min(1, dt * 8);
  cam.x += (targetCamX - cam.x) * follow;
  cam.y += (targetCamY - cam.y) * follow;

  // cars & pedestrians
  shake = Math.max(0, shake - dt * 2.2);
  cars.forEach(function (c) {
    if (anim < c.stoppedUntil) return;
    if (c.axis === 'h') {
      c.x += c.dir * c.speed * dt;
      if (c.dir > 0 && c.x > CITY_W + 80) c.x = -80;
      if (c.dir < 0 && c.x < -80) c.x = CITY_W + 80;
    } else {
      c.y += c.dir * c.speed * dt;
      if (c.dir > 0 && c.y > CITY_H + 80) c.y = -80;
      if (c.dir < 0 && c.y < -80) c.y = CITY_H + 80;
    }

    if (scene !== 'city') return;
    const tx = Math.floor(player.x / TILE);
    const ty = Math.floor(player.y / TILE);
    if (tileZone(tx, ty) !== 'road') return;

    const dx = player.x - c.x;
    const dy = player.y - c.y;
    const along = c.axis === 'h' ? dx * c.dir : dy * c.dir;
    const side = c.axis === 'h' ? Math.abs(dy) : Math.abs(dx);
    const overlap = c.axis === 'h'
      ? (Math.abs(dx) < 70 && Math.abs(dy) < 40)
      : (Math.abs(dy) < 70 && Math.abs(dx) < 40);
    const ahead = along > -20 && along < 130 && side < 45;

    if ((overlap || ahead) && anim > c.cooldown) {
      c.cooldown = anim + 3.5;
      if (overlap && Math.abs(along) < 55) {
        stats.health = clamp(stats.health - 4, 0, 100);
        stats.heart = clamp(stats.heart - 3, 0, 100);
        stats.energy = clamp(stats.energy - 2, 0, 100);
        shake = 0.65;
        if (c.axis === 'h') {
          const nx = player.x - c.dir * 24;
          if (canStand(scene, nx, player.y)) player.x = nx;
        } else {
          const ny = player.y - c.dir * 24;
          if (canStand(scene, player.x, ny)) player.y = ny;
        }
        c.stoppedUntil = anim + 3;
        c.shoutUntil = anim + 2.4;
        toast('🚗 ถูกรถเฉี่ยว! สุขภาพ −4 · ใจ −3');
        playSfx('error');
      } else {
        c.stoppedUntil = anim + 2.2;
        c.shoutUntil = anim + 2.2;
        toast('🚗 ' + pickTrafficShout());
        playSfx('honk');
      }
    }
  });

  peds.forEach(function (p) {
    p.x += p.dir * p.speed * dt;
    if (p.x > p.max) { p.x = p.max; p.dir = -1; }
    if (p.x < p.min) { p.x = p.min; p.dir = 1; }
    p.phase += dt * 7;
  });

  updateNpcs(dt);

  if (scene === 'city') {
    const d = districtAt(Math.floor(player.x / TILE), Math.floor(player.y / TILE));
    if (d) life.district = d.id;
  }

  // prompt (NPC มาก่อนถ้าอยู่ใกล้กว่า)
  currentNpc = nearestNpc();
  currentHotspot = nearestHotspot();
  const prompt = document.getElementById('prompt');
  if (currentNpc) {
    prompt.classList.remove('hidden');
    document.getElementById('promptText').textContent = 'คุยกับ' + currentNpc.type.name;
  } else if (currentHotspot) {
    prompt.classList.remove('hidden');
    let label = currentHotspot.label;
    if (currentHotspot.districtId) {
      const dd = districtById(currentHotspot.districtId);
      const hh = world.minutes / 60;
      if (dd && (hh >= 18 || hh < 5) && dd.nightActivity) label = dd.nightActivity;
    }
    document.getElementById('promptText').textContent = label;
  } else {
    prompt.classList.add('hidden');
  }

  const now = performance.now();
  if (now - lastHudAt > 200) {
    lastHudAt = now;
    updateHud();
  }
}

let lastHudAt = 0;
let portraitAgeKey = '';

function updateHud() {
  const ch = chapterData();
  profile.age = ageYears();
  const ageKey = String(profile.age);
  if (ageKey !== portraitAgeKey) {
    portraitAgeKey = ageKey;
    drawPortrait();
  }
  profile.chapter = ch ? ch.name : '—';
  const nameEl = document.getElementById('charName');
  if (nameEl) nameEl.textContent = profile.name;

  if (life.phase === 'early' || life.phase === 'creation') {
    document.getElementById('clockTime').textContent = life.phase === 'creation' ? '—' : (profile.age + ' ปี');
    document.getElementById('clockDate').textContent = life.phase === 'creation' ? 'สร้างชีวิต' : ('บท ' + ch.n + ' · ' + ch.name);
    document.getElementById('paydayText').textContent = life.phase === 'creation' ? '' : ('เทิร์น ' + (life.turn + 1) + ' / ' + ch.turns);
    document.getElementById('locName').textContent = life.phase === 'creation' ? 'สร้างชีวิต' : ('บท ' + ch.n + ' · ' + ch.name);
  } else {
    const hh = Math.floor(world.minutes / 60);
    const mm = Math.floor(world.minutes % 60);
    document.getElementById('clockTime').textContent =
      String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    document.getElementById('clockDate').textContent = dateLabel();
    const curDistrict = scene === 'city' ? districtById(life.district) : null;
    // แผนที่ย่าน (district) ต้องใช้ชื่อจาก map spec จริง ไม่ใช่ life.district ที่เป็นค่าเก่า
    const mapName = scene === 'district' && sceneInfo.district ? sceneInfo.district.name : '';
    document.getElementById('locName').textContent =
      scene === 'district' ? mapName
        : scene === 'city'
          ? ((life.neighborhoodName ? life.neighborhoodName + ' · ' : '') + (life.province || 'กรุงเทพฯ'))
          : (curDistrict ? curDistrict.name + ' · ' + life.province : sceneInfo[scene].name);

    // payday (25th)
    const dp = lifeDateParts();
    const left = dp.d <= 25 ? 25 - dp.d : 30 - dp.d + 25;
    const overdue = Object.keys(debts).reduce(function (a, k) { return a + (debts[k].missed > 0 ? 1 : 0); }, 0);
    document.getElementById('paydayText').textContent =
      (finance.salary <= 0 && !life.flags.retired
        ? 'ว่างงาน · กด J หางาน'
        : (left === 0 ? 'เงินเดือนออกวันนี้' : 'เงินเดือนออกอีก ' + left + ' วัน') +
          (overdue ? ' · ⚠ ค้าง ' + overdue + ' หนี้' : ''));
  }

  document.getElementById('ageText').textContent = 'อายุ ' + profile.age + ' · ' + profile.chapter;
  const roleEl = document.getElementById('charRole');
  if (roleEl) roleEl.textContent = profile.job;
  const actEl = document.getElementById('actText');
  if (actEl) {
    if (life.phase === 'adult') {
      actEl.textContent = 'กิจกรรมช่วงนี้ ' + (life.actionsThisTurn || 0) + '/' + actionBudget();
      actEl.classList.toggle('full', activitiesLeft() <= 0);
    } else {
      actEl.textContent = '';
    }
  }
  const moodEl = document.getElementById('moodText');
  if (moodEl) {
    moodEl.textContent = life.phase === 'adult'
      ? 'อารมณ์: ' + (life.mood || 'ปกติ') + ' · เรียบร้อย ' + Math.round(life.grooming === undefined ? 70 : life.grooming) + ' · ' + (life.weather || 'แดดดี')
      : '';
  }

  STAT_DEFS.forEach(function (d) {
    const el = statEls[d.key];
    if (!el) return;
    const v = stats[d.key];
    el.val.textContent = d.key === 'money' ? fmt(v) : Math.round(v);
    el.bar.style.width = clamp(v / d.max * 100, 1, 100) + '%';
  });
}

function lifeDateParts() {
  const tm = Math.max(0, life.ageMonths || 0);
  return { d: 1 + (world.day % 30), m: tm % 12, y: 2547 + Math.floor(tm / 12) };
}

function dateLabel() {
  const p = lifeDateParts();
  const weekday = WEEK[(world.day + 1) % 7];
  return weekday + ' ' + p.d + ' ' + MONTHS[p.m] + ' ' + p.y;
}

/* ==========================================================
   STATS UI
   ========================================================== */

const ICONS = {
  health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20s-7-4.5-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.5 12 20 12 20z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M9 14c1 1.2 2 1.8 3 1.8s2-.6 3-1.8"/><path d="M9 10h.01M15 10h.01"/></svg>',
  energy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 5 14h6l-1 8 8-12h-6l1-8z"/></svg>',
  money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>',
  kpi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V9M10 19V5M16 19v-6M22 19H2"/></svg>',
  credit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>'
};

const STAT_DEFS = [
  { key: 'health', label: 'สุขภาพ', color: '#6ee7a8', max: 100 },
  { key: 'heart', label: 'ใจ', color: '#ff8fb1', max: 100 },
  { key: 'energy', label: 'พลังงาน', color: '#ffd75e', max: 100 },
  { key: 'money', label: 'เงิน', color: '#7dd3fc', max: 50000 },
  { key: 'kpi', label: 'ผลงาน', color: '#b39dff', max: 100 },
  { key: 'credit', label: 'เครดิต', color: '#ff9f4a', max: 100 },
  { key: 'smarts', label: 'ปัญญา', color: '#c4a7ff', max: 100 },
  { key: 'social', label: 'มนุษย์', color: '#7dd3fc', max: 100 }
];

const statEls = {};

function buildStats() {
  const wrap = document.getElementById('statPanel');
  wrap.innerHTML = '';
  STAT_DEFS.forEach(function (d) {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.dataset.stat = d.key;
    row.innerHTML =
      '<span class="stat-lbl">' + d.label + '</span>' +
      '<span class="stat-val"></span>' +
      '<span class="stat-bar"><i style="background:' + d.color + '"></i></span>';
    wrap.appendChild(row);
    statEls[d.key] = {
      val: row.querySelector('.stat-val'),
      bar: row.querySelector('.stat-bar i')
    };
  });
}

/* ==========================================================
   PORTRAIT
   ========================================================== */

function drawPortrait() {
  const p = document.getElementById('portrait') as HTMLCanvasElement | null;
  if (!p) return;
  Look.paintPortrait(p, life.appearance || Look.DEFAULT_APPEARANCE, undefined, ageYears());
}

/* ==========================================================
   ENTITIES
   ========================================================== */

const cars = [
  { axis: 'h', x: 120, y: 8.35 * TILE, dir: 1, speed: 120, color: '#e85c6c', stoppedUntil: 0, cooldown: 0, shoutUntil: 0 },
  { axis: 'h', x: 1400, y: 9.35 * TILE, dir: -1, speed: 95, color: '#7dd3fc', stoppedUntil: 0, cooldown: 0, shoutUntil: 0 },
  { axis: 'h', x: 700, y: 20.35 * TILE, dir: 1, speed: 130, color: '#ffd75e', stoppedUntil: 0, cooldown: 0, shoutUntil: 0 },
  { axis: 'h', x: 1900, y: 21.35 * TILE, dir: -1, speed: 105, color: '#6ee7a8', stoppedUntil: 0, cooldown: 0, shoutUntil: 0 },
  { axis: 'v', y: 220, x: 12.35 * TILE, dir: 1, speed: 110, color: '#ff9f4a', stoppedUntil: 0, cooldown: 0, shoutUntil: 0 },
  { axis: 'v', y: 1200, x: 31.35 * TILE, dir: -1, speed: 118, color: '#c4a7ff', stoppedUntil: 0, cooldown: 0, shoutUntil: 0 }
];

const peds = [
  { x: 300, y: 7.55 * TILE, min: 80, max: 1800, dir: 1, speed: 40, phase: 0, color: '#c9d6ff' },
  { x: 1500, y: 10.45 * TILE, min: 100, max: 2300, dir: -1, speed: 34, phase: 1, color: '#ff8fb1' },
  { x: 900, y: 19.55 * TILE, min: 300, max: 2100, dir: 1, speed: 46, phase: 2, color: '#ffd75e' },
  { x: 1700, y: 22.45 * TILE, min: 200, max: 2200, dir: -1, speed: 38, phase: 3, color: '#6ee7a8' }
];

/* ==========================================================
   NPC — คนในเมืองที่ใช้ชีวิตของตัวเอง
   ========================================================== */

const NPC_TYPES = [
  { id: 'vendor', name: 'พ่อค้าแม่ค้า', kind: 'human', color: '#ffb45c', lines: ['ของสดมาจากตลาดเมื่อเช้าเลยนะ', 'ซื้อเยอะ ๆ หน่อยนะลูก'] },
  { id: 'police', name: 'ตำรวจ', kind: 'human', color: '#4a6fd6', lines: ['ระวังของหายนะครับ', 'แถวนี้ปลอดภัย ไม่ต้องห่วง'] },
  { id: 'doctor', name: 'หมอ', kind: 'human', color: '#e8eefc', lines: ['อย่าลืมตรวจสุขภาพปีละครั้งนะ', 'นอนให้พอด้วย'] },
  { id: 'monk', name: 'พระ', kind: 'human', color: '#e0a13a', lines: ['สาธุ', 'ทำใจให้สบาย'] },
  { id: 'lawyer', name: 'ทนาย', color: '#c9d6ff', kind: 'human', lines: ['เรื่องสัญญาไว้ใจผมได้', 'อ่านก่อนเซ็นทุกครั้ง'] },
  { id: 'dog', name: 'หมาจร', kind: 'animal', color: '#a07a52', lines: ['โฮ่ง!', 'หางกระดิก'] },
  { id: 'cat', name: 'แมวจร', kind: 'animal', color: '#c9a27a', lines: ['เมี้ยว', 'เดินหนีไป'] },
  { id: 'wild', name: 'หมูป่า', kind: 'wild', color: '#6a5240', lines: ['...'] }
];

let npcs = [];
let currentNpc = null;

function npcSeed(str) {
  let s = 7;
  for (let i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) >>> 0;
  return s;
}

function spawnNpcsForDistrict() {
  npcs = [];
  currentNpc = null;
  if (!districtSpec) return;
  let s = npcSeed(districtSpec.id);
  const rndN = function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const w = districtSpec.w;
  const h = districtSpec.h;
  for (let i = 0; i < 26 && npcs.length < 9; i++) {
    const tx = 1 + Math.floor(rndN() * (w - 2));
    const ty = 1 + Math.floor(rndN() * (h - 2));
    if (!districtSpec.grid[ty] || districtSpec.grid[ty][tx] !== 0) continue;
    const t = NPC_TYPES[npcs.length % NPC_TYPES.length];
    npcs.push({
      type: t,
      x: (tx + 0.5) * TILE,
      y: (ty + 0.5) * TILE,
      homeX: tx, homeY: ty, tx: tx, ty: ty,
      speed: t.kind === 'human' ? 38 : (t.kind === 'wild' ? 52 : 26),
      phase: rndN() * 6,
      dir: 'down',
      cool: 0
    });
  }
}

function pickNpcTarget(n) {
  if (!districtSpec) return;
  for (let i = 0; i < 14; i++) {
    const tx = n.homeX + Math.floor((Math.random() * 9) - 4);
    const ty = n.homeY + Math.floor((Math.random() * 9) - 4);
    if (districtSpec.grid[ty] && districtSpec.grid[ty][tx] === 0) { n.tx = tx; n.ty = ty; return; }
  }
}

function updateNpcs(dt) {
  if (scene !== 'district' || !npcs.length) return;
  const hour = world.minutes / 60;
  const awake = hour >= 6 && hour < 22;
  npcs.forEach(function (n) {
    n.phase += dt * 6;
    n.cool = Math.max(0, n.cool - dt);

    // สัตว์ดุ: อยู่ใกล้แล้วมีโอกาสทำร้าย
    if (n.type.kind === 'wild' && n.cool <= 0 && Math.hypot(player.x - n.x, player.y - n.y) < 52) {
      stats.health = clamp(stats.health - 4, 0, 100);
      stats.heart = clamp(stats.heart - 3, 0, 100);
      shake = 0.55;
      n.cool = 7;
      toast('🐗 หมูป่าหลุดมาวิ่งชน! สุขภาพ −4 · ใจ −3');
      playSfx('error');
      return;
    }

    const gx = (n.tx + 0.5) * TILE;
    const gy = (n.ty + 0.5) * TILE;
    const dx = gx - n.x;
    const dy = gy - n.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) { pickNpcTarget(n); return; }
    const speed = (n.type.kind === 'human' && !awake ? n.speed * 0.45 : n.speed);
    n.x += dx / d * speed * dt;
    n.y += dy / d * speed * dt;
    n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  });
}

function nearestNpc() {
  let best = null;
  let bd = Infinity;
  npcs.forEach(function (n) {
    const d = Math.hypot(player.x - n.x, player.y - n.y);
    if (d < 78 && d < bd) { bd = d; best = n; }
  });
  return best;
}

function talkToNpc(n) {
  if (paused) return;
  if (!life.npcRel) life.npcRel = {};
  const rel = life.npcRel[n.type.id] || 0;
  const line = n.type.lines[Math.floor(Math.random() * n.type.lines.length)];
  const canFeed = n.type.kind !== 'wild';
  const html =
    '<div class="ev-head"><span class="ev-chip">' + n.type.name + '</span><span>ความสนิท ' + rel + '/100</span></div>' +
    '<div class="ev-title">' + line + '</div>' +
    '<div class="choices">' +
    '<button class="choice" data-npc="0"><span class="c-label">คุยเล่นด้วย</span>' +
    '<span class="c-hint"><span class="hint up">ใจ +2</span><span class="hint up">สนิท +4</span></span></button>' +
    (canFeed
      ? '<button class="choice" data-npc="1"><span class="c-label">เลี้ยงข้าว / ให้เงิน 20 บาท</span>' +
        '<span class="c-hint"><span class="hint down">เงิน −20</span><span class="hint up">สนิท +8</span></span></button>'
      : '') +
    '<button class="choice" data-npc="2"><span class="c-label">จากมา</span></button>' +
    '</div>';
  openModal(html);
  modal.querySelectorAll('[data-npc]').forEach(function (b) {
    b.addEventListener('click', function () {
      const i = Number(b.getAttribute('data-npc'));
      if (i === 0) {
        life.npcRel[n.type.id] = clamp((life.npcRel[n.type.id] || 0) + 4, 0, 100);
        stats.heart = clamp(stats.heart + 2, 0, 100);
        toast('คุยกับ' + n.type.name + ' · ใจ +2');
      } else if (i === 1) {
        if (stats.money < 20) { toast('เงินไม่พอ'); return; }
        stats.money -= 20;
        life.npcRel[n.type.id] = clamp((life.npcRel[n.type.id] || 0) + 8, 0, 100);
        toast('ให้เงิน' + n.type.name + ' 20฿ · สนิท +8');
      }
      closeModal();
    });
  });
}

/* ขนาดเลเยอร์ static (art px เลกาซี 16px) */
const CITY_AW = MAP_W * ART;
const CITY_AH = MAP_H * ART;
const OFFICE_AW = OFFICE.w * ART;
const OFFICE_AH = OFFICE.h * ART;
const HOME_AW = HOME.w * ART;
const HOME_AH = HOME.h * ART;
const STATION_AW = STATION.w * ART;
const STATION_AH = STATION.h * ART;

let cityStatic = null;
let officeStatic = null;
let homeStatic = null;
let stationStatic = null;
const winGlows = [];

function rngArt(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function px(x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

function ditherRect(x, y, w, h, c, step, alpha) {
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  for (let yy = 0; yy < h; yy += step) {
    const off = (Math.floor(yy / step) % 2) * step;
    for (let xx = off; xx < w; xx += step * 2) {
      px(x + xx, y + yy, step, step, c);
    }
  }
  ctx.globalAlpha = 1;
}

function shadowBlob(x, y, w) {
  ctx.globalAlpha = 0.3;
  px(x - w / 2, y, w, 1, P.shadow);
  px(x - w / 2 + 1, y + 1, w - 2, 1, P.shadow);
  px(x - w / 2 + 3, y + 2, w - 6, 1, P.shadow);
  ctx.globalAlpha = 1;
}

function makeLayer(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const prev = ctx;
  ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  fn();
  ctx = prev;
  return c;
}

function filterLayer(src, filter) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const cx = c.getContext('2d');
  if (!('filter' in cx)) return src;
  cx.filter = filter;
  cx.drawImage(src, 0, 0);
  return c;
}

function buildStatics() {
  cityStatic = makeLayer(CITY_AW, CITY_AH, function () { buildCityArt(false); });
  const rawMap = makeLayer(CITY_AW, CITY_AH, function () { buildCityArt(true); });
  cityMapStatic = filterLayer(rawMap, 'brightness(1.16) saturate(1.06) contrast(1.02)');
  officeStatic = makeLayer(OFFICE_AW, OFFICE_AH, buildOfficeArt);
  homeStatic = makeLayer(HOME_AW, HOME_AH, buildHomeArt);
  stationStatic = makeLayer(STATION_AW, STATION_AH, buildStationArt);
  if (districtSpec) buildDistrictStatic(districtSpec);
}

/* ==========================================================
   DISTRICT SCENE (จังหวัด → เขต → แผนที่เฉพาะเขต)
   ========================================================== */

let districtStaticId = '';
let districtNight = null;       // เลเยอร์ไฟกลางคืน (เฉพาะแผนที่เมืองแบบใหม่)
let districtLights = [];        // แสงฟุ้ง {x,y,r,c,a} หน่วย art px
let mapReturnPoints: any = {};
let interiorSource = 'city';

function buildDistrictStatic(spec: DistrictSpec) {
  districtStaticId = spec.id;
  if (spec.style) {
    // แผนที่เมืองทุกจังหวัด → src/render/city-map-art.ts (มีเลเยอร์กลางวัน/กลางคืนแยก)
    const art = buildCityMapArt(spec);
    districtStatic = art.day;
    districtNight = art.night;
    districtLights = art.lights;
    return;
  }
  districtNight = null;
  districtLights = [];
  const prev = artStyleOverride;
  artStyleOverride = {};
  districtStatic = makeLayer(spec.w * ART, spec.h * ART, function () { buildDistrictArt(spec); });
  artStyleOverride = prev;
}

function applyMapSpec(spec: DistrictSpec, placePlayer: boolean, mainMap: boolean, silent: boolean) {
  districtSpec = spec;
  sceneInfo.district = {
    w: spec.w * TILE,
    h: spec.h * TILE,
    grid: spec.grid,
    name: spec.name
  };
  districtHotspotList = spec.hotspots.map(function (h) {
    return {
      x: h.x * TILE,
      y: h.y * TILE,
      r: h.r,
      label: h.label,
      act: function () { districtAct(h.act); }
    };
  });
  mapReturnPoints = { default: { x: spec.spawn.x, y: spec.spawn.y } };
  spec.hotspots.forEach(function (h) {
    mapReturnPoints[h.id] = { x: h.x, y: h.y };
  });
  if (districtStaticId !== spec.id || !districtStatic) buildDistrictStatic(spec);
  spawnNpcsForDistrict();
  if (mainMap) {
    life.activeMap = spec.id;
    life.activeDistrict = '';
    life.currentMap = 'city:' + spec.id;
  } else {
    life.activeDistrict = spec.id;
    life.currentMap = 'district:' + spec.id;
  }

  if (placePlayer) {
    scene = 'district';
    viewMode = 'street';
    player.x = spec.spawn.x * TILE;
    player.y = spec.spawn.y * TILE;
    player.dir = 'up';
    player.moving = false;
    clearWalk();
    camScene = '';
    if (!silent) toast('เข้าสู่ ' + spec.name);
    hideMapLabels();
    updateHud();
  }
}

function prepareDistrict(id: string, placePlayer: boolean) {
  const spec = getDistrictMap(id);
  if (!spec) return false;
  applyMapSpec(spec, placePlayer, false, false);
  return true;
}

function prepareCityMap(province: string, khet: string, hood: string, placePlayer: boolean, silent: boolean) {
  const spec = getCityMap(province, khet, hood);
  applyMapSpec(spec, placePlayer, true, silent);
  return spec;
}

function enterCityMap(placePlayer: boolean, silent: boolean) {
  return prepareCityMap(life.province, life.khet, life.neighborhood, placePlayer, silent);
}

function enterDistrict(id: string) {
  if (life.phase !== 'adult') return;
  if (!getDistrictMap(id)) { toast('เขตนี้ยังไม่เปิด'); return; }
  prepareDistrict(id, true);
  saveGame();
  updateHud();
}

function leaveDistrict() {
  if (life.activeMap) {
    enterCityMap(true, true);
    toast('กลับเข้าเมือง');
    updateHud();
    saveGame();
    return;
  }
  scene = 'city';
  viewMode = 'map';
  player.x = 16.0 * TILE;
  player.y = 10.4 * TILE;
  player.dir = 'down';
  clearWalk();
  camScene = '';
  hideMapLabels();
  toast('กลับเข้าเมือง');
  updateHud();
  saveGame();
}

function enterInterior(kind: string) {
  interiorSource = scene === 'district' ? 'district' : 'city';
}

function exitInterior(kind: string) {
  if (interiorSource === 'district' && sceneInfo.district) {
    scene = 'district';
    viewMode = 'street';
    const p = mapReturnPoints[kind] || mapReturnPoints.default || (districtSpec ? districtSpec.spawn : { x: 14, y: 8 });
    player.x = p.x * TILE;
    player.y = p.y * TILE;
    player.dir = 'down';
    player.moving = false;
    clearWalk();
    camScene = '';
    hideMapLabels();
    updateHud();
    saveGame();
    return;
  }
  scene = 'city';
  viewMode = 'map';
  if (kind === 'home') { player.x = 5.5 * TILE; player.y = 15.9 * TILE; }
  else if (kind === 'office') { player.x = 18.5 * TILE; player.y = 7.9 * TILE; }
  else { player.x = 14.5 * TILE; player.y = 10.4 * TILE; }
  player.dir = 'down';
  clearMove();
  updateHud();
  saveGame();
}

function clearMove() {
  clearWalk();
  camScene = '';
  hideMapLabels();
}

function hideMapLabels() {
  const wrap = document.getElementById('mapLabels');
  if (wrap) wrap.classList.add('hidden');
}

/* ---------- เข้าได้ทุกอาคาร: ภายในแบบทั่วไปตามประเภท ---------- */
const SHOP_DEFS: any = {
  foodshop: { name: 'ร้านสะดวกซื้อ', accent: '#2f9d62', label: 'ซื้อของ', act: 'foodshop' },
  market: { name: 'ตลาด', accent: '#ffb45c', label: 'เดินตลาด', act: 'market' },
  gym: { name: 'ฟิตเนส', accent: '#8f6fe0', label: 'ออกกำลังกาย', act: 'gym' },
  hospital: { name: 'โรงพยาบาล', accent: '#e05a72', label: 'ตรวจสุขภาพ', act: 'hospital' },
  clothes: { name: 'ร้านเสื้อผ้า', accent: '#d9a8ff', label: 'ซื้อเสื้อผ้า', act: 'shop' },
  bar: { name: 'ร้านอาหาร', accent: '#ff8f6a', label: 'นั่งกิน', act: 'bar' },
  temple: { name: 'ศาลเจ้า', accent: '#ffd75e', label: 'ไหว้', act: 'temple' },
  landmark: { name: 'แลนด์มาร์ค', accent: '#7dd3fc', label: 'ชมวิว', act: 'landmark' }
};

function buildShopStatic(kind: string) {
  if (shopStatic && shopStaticKind === kind) return;
  shopStaticKind = kind;
  shopStatic = makeLayer(SHOP.w * ART, SHOP.h * ART, function () { buildShopArt(kind); });
}

function enterShop(kind: string) {
  const def = SHOP_DEFS[kind];
  if (!def || life.phase !== 'adult') return;
  shopKind = kind;
  shopReturn = { x: player.x, y: player.y };
  buildShopStatic(kind);
  sceneInfo.shop.name = def.name;
  scene = 'shop';
  viewMode = 'street';
  player.x = 7 * TILE;
  player.y = 7.2 * TILE;
  player.dir = 'up';
  player.moving = false;
  clearMove();
  toast('เข้า' + def.name);
  updateHud();
}

function leaveShop() {
  scene = 'district';
  viewMode = 'street';
  player.x = shopReturn.x;
  player.y = shopReturn.y;
  player.dir = 'down';
  player.moving = false;
  clearMove();
  saveGame();
}

function shopHotspots() {
  const def = SHOP_DEFS[shopKind] || SHOP_DEFS.foodshop;
  return [
    { x: 6 * TILE, y: 4.9 * TILE, r: 104, label: def.label, act: function () { districtAct(def.act); } },
    { x: 7 * TILE, y: 8.2 * TILE, r: 84, label: 'ออกจากร้าน', act: leaveShop }
  ];
}

function templePray() {
  if (!spendActivity()) return;
  const m = beginActivity('temple');
  stats.heart = clamp(stats.heart + Math.round(5 * m), 0, 100);
  life.rel.family = clamp((life.rel.family || 0) + Math.round(1 * m), 0, 100);
  addMinutes(30);
  toast('ไหว้ศาลเจ้า · ใจ +' + Math.round(5 * m) + ' · ครอบครัว +1');
}

function visitLandmark() {
  if (!spendActivity()) return;
  const m = beginActivity('landmark');
  stats.heart = clamp(stats.heart + Math.round(4 * m), 0, 100);
  stats.social = clamp(stats.social + Math.round(1 * m), 0, 100);
  addMinutes(30);
  toast('แวะชมแลนด์มาร์คประจำเขต · ใจ +4');
}

function districtAct(name: string) {
  if (life.phase !== 'adult' || paused) return;
  const insideShop = scene === 'shop';
  switch (name) {
    case 'home': enterHome(); break;
    case 'office': enterOffice(); break;
    case 'foodshop': if (!insideShop) { enterShop('foodshop'); break; } buyFood(); break;
    case 'market': if (!insideShop) { enterShop('market'); break; } buyFood(); break;
    case 'gym': if (!insideShop) { enterShop('gym'); break; } gotoGym(); break;
    case 'hospital': if (!insideShop) { enterShop('hospital'); break; } checkup(); break;
    case 'shop': if (!insideShop) { enterShop('clothes'); break; } openClothingShop(); break;
    case 'station': enterStation(); break;
    case 'bar': if (!insideShop) { enterShop('bar'); break; } drink(); break;
    case 'temple': if (!insideShop) { enterShop('temple'); break; } templePray(); break;
    case 'landmark': if (!insideShop) { enterShop('landmark'); break; } visitLandmark(); break;
    case 'park': walkPark(); break;
    case 'seafood': {
      if (stats.money < 140) { toast('เงินไม่พอซื้ออาหารทะเล'); return; }
      if (!spendActivity()) return;
      const m = beginActivity('seafood');
      stats.money -= 140;
      addNeed('hunger', Math.round(20 * m));
      addNeed('fun', Math.round(5 * m));
      stats.heart = clamp(stats.heart + Math.round(2 * m), 0, 100);
      life.collections.food = (life.collections.food || 0) + 1;
      gainSkill('cooking', 1);
      addMinutes(45);
      toast('ซื้อกุ้ง/ปลาสดจากตลาด · อิ่ม +20 · ของสะสมอาหาร +1');
      break;
    }
    case 'health': {
      if (stats.money < 150) { toast('เงินไม่พอ'); return; }
      if (!spendActivity()) return;
      const m = beginActivity('clinic');
      stats.money -= 150;
      stats.health = clamp(stats.health + Math.round(8 * m), 0, 100);
      addMinutes(60);
      toast('ตรวจสุขภาพที่อนามัย · สุขภาพ +' + Math.round(8 * m));
      break;
    }
    case 'school': {
      if (!spendActivity()) return;
      const m = beginActivity('community');
      stats.smarts = clamp(stats.smarts + Math.round(2 * m), 0, 100);
      stats.social = clamp(stats.social + Math.round(1 * m), 0, 100);
      addMinutes(90);
      toast('ช่วยกิจกรรมโรงเรียนชุมชน · ปัญญา +2 · สังคม +1');
      break;
    }
    case 'factory': {
      if (finance.salary <= 0) { openJobSearch(); return; }
      if (!spendActivity()) return;
      const m = beginActivity('factoryShift');
      const pay = Math.round(700 * m);
      stats.money += pay;
      stats.energy = clamp(stats.energy - 18, 0, 100);
      stats.health = clamp(stats.health - 1, 0, 100);
      gainSkill('tech', 1);
      addMinutes(240);
      toast('ทำงานกะโรงงาน · เงิน +฿' + fmt(pay) + ' · พลังงาน −18');
      break;
    }
    case 'coldstorage': {
      if (!spendActivity()) return;
      const m = beginActivity('coldShift');
      const pay = Math.round(550 * m);
      stats.money += pay;
      stats.energy = clamp(stats.energy - 15, 0, 100);
      addMinutes(210);
      toast('ทำงานห้องเย็น · เงิน +฿' + fmt(pay));
      break;
    }
    case 'warehouse': {
      if (!spendActivity()) return;
      const m = beginActivity('dockWork');
      const pay = Math.round(450 * m);
      stats.money += pay;
      stats.energy = clamp(stats.energy - 14, 0, 100);
      gainSkill('fitness', 1);
      addMinutes(180);
      toast('รับจ้างขนของที่โกดัง · เงิน +฿' + fmt(pay) + ' · ฟิตเนส +1');
      break;
    }
    case 'pier': {
      if (stats.money < 80) { toast('เงินไม่พอค่าเรือ'); return; }
      if (!spendActivity()) return;
      const m = beginActivity('boat');
      stats.money -= 80;
      stats.heart = clamp(stats.heart + Math.round(6 * m), 0, 100);
      addNeed('fun', Math.round(8 * m));
      addMinutes(60);
      toast('นั่งเรือชมคลอง · ใจ +6 · สนุก +8');
      break;
    }
    case 'beach': {
      if (!spendActivity()) return;
      const m = beginActivity('beach');
      stats.heart = clamp(stats.heart + Math.round(4 * m), 0, 100);
      stats.health = clamp(stats.health + Math.round(1 * m), 0, 100);
      addNeed('fun', Math.round(6 * m));
      addNeed('rest', Math.round(3 * m));
      addMinutes(45);
      toast('นั่งหาดบางขุนเทียน · ใจ +4 · สนุก +6');
      break;
    }
    case 'mangrove': {
      if (!spendActivity()) return;
      const m = beginActivity('mangroveWalk');
      stats.smarts = clamp(stats.smarts + Math.round(2 * m), 0, 100);
      stats.health = clamp(stats.health + Math.round(1 * m), 0, 100);
      life.collections.stamps = (life.collections.stamps || 0) + 1;
      addMinutes(60);
      toast('เดินป่าชายเลน · ปัญญา +2 · ของที่ระลึก +1');
      break;
    }
    case 'pond': {
      if (!spendActivity()) return;
      const m = beginActivity('pondWork');
      const pay = Math.round(350 * m);
      stats.money += pay;
      stats.energy = clamp(stats.energy - 10, 0, 100);
      gainSkill('cooking', 1);
      addMinutes(90);
      toast('ช่วยบ่อกุ้งชุมชน · เงิน +฿' + fmt(pay));
      break;
    }
    case 'food': {
      if (stats.money < 260) { toast('เงินไม่พอ'); return; }
      if (!spendActivity()) return;
      const m = beginActivity('seafoodMeal');
      stats.money -= 260;
      addNeed('hunger', Math.round(25 * m));
      stats.heart = clamp(stats.heart + Math.round(3 * m), 0, 100);
      life.collections.food = (life.collections.food || 0) + 1;
      addMinutes(60);
      toast('กินอาหารทะเลริมคลอง · อิ่ม +25 · ของสะสมอาหาร +1');
      break;
    }
    case 'exit':
      leaveDistrict();
      break;
    case 'salon':
      openSalon();
      break;
    case 'salon150':
      openSalon(150);
      break;
    default:
      break;
  }
  updateHud();
}


/* ---------- layout audit: ทุก object ต้องอยู่โซนที่ควรอยู่ ---------- */

function tileZone(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 'edge';
  for (let i = 0; i < BUILDINGS.length; i++) {
    const b = BUILDINGS[i];
    if (tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h) return 'building';
  }
  for (let i = 0; i < HOUSES.length; i++) {
    const b = HOUSES[i];
    if (tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h) return 'building';
  }
  if (tx >= POND.x && tx < POND.x + POND.w && ty >= POND.y && ty < POND.y + POND.h) return 'pond';
  if (ty === 8 || ty === 9 || ty === 20 || ty === 21) return 'road';
  if (tx === 12 || tx === 13 || tx === 30 || tx === 31) return 'road';
  if (ty === 7 || ty === 10 || ty === 19 || ty === 22) return 'sidewalk';
  if (tx === 11 || tx === 14 || tx === 29 || tx === 32) return 'sidewalk';
  if (tx >= 3 && tx < 10 && ty >= 23 && ty < 27) return 'park';
  return 'grass';
}

const YAOWARAT_STALLS = [
  [15.2, 22.05, 0], [18.0, 22.05, 1], [20.8, 22.05, 2],
  [25.6, 22.05, 3], [28.0, 22.05, 4],
  [16.2, 19.05, 5], [19.8, 19.05, 6], [26.0, 19.05, 7]
];
const YAOWARAT_TABLES = [[22.6, 22.35], [23.8, 22.35]];
const YAOWARAT_LOCALS = [[17.2, 22.62, 0], [21.9, 22.72, 1], [26.9, 22.62, 2]];
const YAOWARAT_NEON = [
  [14.35, 19.25, '#ff5c6c', 0], [29.65, 19.25, '#ffd75e', 1],
  [15.1, 22.65, '#4ade80', 2], [28.9, 22.65, '#ff8f3f', 3],
  [21.2, 19.3, '#ffd75e', 4]
];
const YAOWARAT_CLUTTER = [
  ['crate', 15.1, 22.4], ['crate', 20.9, 22.4], ['gas', 21.3, 19.3],
  ['bags', 24.6, 22.4], ['bucket', 26.5, 22.4], ['menu', 16.6, 22.4],
  ['coil', 27.9, 22.4], ['crate', 18.6, 19.3]
];

function auditLayout() {
  const issues = [];
  const check = function (label, x, y, allowed) {
    const z = tileZone(Math.floor(x), Math.floor(y));
    if (allowed.indexOf(z) === -1) {
      issues.push(label + ' @' + Number(x).toFixed(1) + ',' + Number(y).toFixed(1) + ' → ' + z);
    }
  };

  TREES.forEach(function (t) { check('tree', t[0] + 0.5, t[1] + 0.5, ['grass', 'park']); });
  BUSHES.forEach(function (b) { check('bush', b[0], b[1], ['grass', 'park']); });
  SCOOTERS.forEach(function (s) { check('scooter', s[0], s[1], ['sidewalk']); });
  LIGHTS.forEach(function (l) { check('lamp', l[0], l[1], ['sidewalk', 'park', 'grass']); });

  const props = [
    ['vendor', 22.2, 7.95, ['sidewalk']],
    ['vendor', 10.4, 24.2, ['park', 'grass']],
    ['bench', 4.1, 24.6, ['park']],
    ['bench', 10.3, 24.4, ['grass']],
    ['bench', 9.6, 10.9, ['sidewalk']],
    ['bin', 8.2, 10.9, ['sidewalk']],
    ['bin', 3.4, 26.6, ['park']],
    ['hydrant', 20.5, 7.8, ['sidewalk']],
    ['manhole', 17.5, 9.3, ['road']],
    ['manhole', 27.5, 21.3, ['road']],
    ['manhole', 13.4, 14.5, ['road']],
    ['drain', 15.4, 8.1, ['road']],
    ['drain', 24.4, 21.9, ['road']],
    ['bus stop', 9.5, 10.2, ['sidewalk']],
    ['bus stop', 16.0, 10.2, ['sidewalk']],
    ['barber pole', 21.4, 10.2, ['sidewalk']],
    ['clothes rack', 27.0, 10.2, ['sidewalk']],
    ['vending', 23.0, 16.2, ['grass']],
    ['traffic light', 11.2, 7.6, ['sidewalk']],
    ['puddle', 16.2, 21.9, ['road']],
    ['puddle', 23.8, 8.2, ['road']],
    ['puddle', 18.4, 20.7, ['road']],
    ['puddle', 26.8, 21.4, ['road']],
    ['litter', 16.8, 10.7, ['sidewalk']],
    ['litter', 33.4, 22.7, ['sidewalk']],
    ['pot', 22.8, 24.2, ['grass']],
    ['pot', 28.6, 12.2, ['grass']],
    ['bags', 9.0, 19.7, ['sidewalk']],
    ['mailbox', 3.0, 15.5, ['grass']],
    ['bike', 17.3, 10.9, ['sidewalk']],
    ['bike', 28.6, 19.6, ['sidewalk']],
    ['pigeon', 15.4, 10.7, ['sidewalk']],
    ['pigeon', 16.2, 10.9, ['sidewalk']],
    ['pigeon', 27.6, 19.6, ['sidewalk']],
    ['pigeon', 6.8, 23.9, ['park']]
  ];
  props.forEach(function (p) { check(p[0], p[1], p[2], p[3]); });

  YAOWARAT_STALLS.forEach(function (s) { check('yaowarat stall', s[0], s[1], ['sidewalk']); });
  YAOWARAT_TABLES.forEach(function (t) { check('yaowarat table', t[0], t[1], ['sidewalk']); });
  YAOWARAT_LOCALS.forEach(function (l) { check('yaowarat local', l[0], l[1], ['sidewalk']); });
  YAOWARAT_NEON.forEach(function (s) { check('yaowarat neon', s[0], s[1], ['sidewalk']); });
  YAOWARAT_CLUTTER.forEach(function (c) { check('yaowarat ' + c[0], c[1], c[2], ['sidewalk']); });

  [[3.2, 7.9], [10.5, 7.9], [21.5, 7.9], [34.5, 7.9],
   [10.5, 22.9], [21.5, 22.9], [34.5, 22.9]].forEach(function (p) {
    check('power pole', p[0], p[1], ['sidewalk']);
  });

  // อาคาร/บ้าน ต้องไม่อยู่บนถนน/ทางเท้า และต้องไม่ทับกัน
  const structures = BUILDINGS.concat(HOUSES);
  structures.forEach(function (b) {
    for (let ty = b.y; ty < b.y + b.h; ty++) {
      for (let tx = b.x; tx < b.x + b.w; tx++) {
        if (ty === 7 || ty === 8 || ty === 9 || ty === 10 ||
            ty === 19 || ty === 20 || ty === 21 || ty === 22 ||
            tx === 11 || tx === 12 || tx === 13 || tx === 14 ||
            tx === 29 || tx === 30 || tx === 31 || tx === 32) {
          issues.push('building on street @' + tx + ',' + ty);
        }
      }
    }
  });
  for (let i = 0; i < structures.length; i++) {
    for (let j = i + 1; j < structures.length; j++) {
      const a = structures[i];
      const b = structures[j];
      if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
        issues.push('building overlap @' + a.x + ',' + a.y + ' × ' + b.x + ',' + b.y);
      }
    }
  }

  if (issues.length) console.warn('[OpenLife] layout issues:', issues);
  else console.info('[OpenLife] layout audit: OK (' + (TREES.length + BUSHES.length + props.length) + ' objects)');
  return issues;
}

/* ---------- district layout audit ---------- */

function districtAudit() {
  const spec = districtSpec || (life.activeDistrict ? getDistrictMap(life.activeDistrict) : null);
  if (!spec) return [];
  // ตรรกะอยู่ใน src/map-audit.ts (pure — unit test เรียกใช้ได้)
  const issues = auditDistrictSpec(spec);
  if (issues.length) console.warn('[OpenLife] district issues:', spec.id, issues);
  else console.info('[OpenLife] district audit: OK (' + spec.id + ' ' + spec.w + '×' + spec.h + ')');
  return issues;
}

/* ==========================================================
   CITY — STATIC ART
   ========================================================== */

function buildCityArt(flat) {
  const r = rngArt(20261109);

  // ---- grass base
  px(0, 0, CITY_AW, CITY_AH, P.grass);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * CITY_AW / 8) * 8;
    const y = Math.floor(r() * CITY_AH / 8) * 8;
    ditherRect(x, y, 8 + Math.floor(r() * 28), 8 + Math.floor(r() * 18), P.grassD, 2, 0.45);
  }
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(r() * CITY_AW / 8) * 8;
    const y = Math.floor(r() * CITY_AH / 8) * 8;
    ditherRect(x, y, 8 + Math.floor(r() * 22), 8 + Math.floor(r() * 14), P.grassL, 2, 0.35);
  }
  for (let i = 0; i < 2000; i++) {
    const x = Math.floor(r() * CITY_AW);
    const y = Math.floor(r() * CITY_AH);
    px(x, y, 1, 1, r() < 0.55 ? P.grassD : P.grassL);
  }
  for (let i = 0; i < 320; i++) {
    const x = Math.floor(r() * (CITY_AW - 2));
    const y = Math.floor(r() * (CITY_AH - 2));
    px(x, y, 1, 2, P.blade);
    px(x + 1, y + 1, 1, 1, P.grassL);
  }
  for (let i = 0; i < 80; i++) {
    const x = Math.floor(r() * CITY_AW);
    const y = Math.floor(r() * CITY_AH);
    const c = [P.flowerA, P.flowerB, P.flowerC][Math.floor(r() * 3)];
    px(x, y, 1, 1, c);
    if (r() < 0.4) px(x + 1, y, 1, 1, 'rgba(255,255,255,.55)');
  }

  // ---- district ground identity (subtle tint + block patterns)
  DISTRICTS.forEach(function (d) {
    const bx = d.rect[0] * ART;
    const by = d.rect[1] * ART;
    const bw = d.rect[2] * ART;
    const bh = d.rect[3] * ART;
    ditherRect(bx, by, bw, bh, d.accent, 4, 0.055);
    // block-edge accent so each district reads differently from above
    ctx.globalAlpha = 0.18;
    px(bx + 2, by + 2, bw - 4, 1, d.accent);
    px(bx + 2, by + bh - 3, bw - 4, 1, d.accent);
    ctx.globalAlpha = 1;
    // paved plaza for commercial districts
    if (d.id === 'silom' || d.id === 'pathumwan' || d.id === 'yaowarat') {
      for (let yy = by + 12; yy < by + bh - 12; yy += 10) {
        for (let xx = bx + 12; xx < bx + bw - 12; xx += 10) {
          if ((Math.floor(xx / 10) + Math.floor(yy / 10)) % 2 === 0) {
            ctx.globalAlpha = 0.12;
            px(xx, yy, 6, 6, d.accent);
            ctx.globalAlpha = 1;
          }
        }
      }
    }
  });

  // ---- park lawn (blended edges, flower beds, paths)
  const parkX = 3 * ART;
  const parkY = 23 * ART;
  const parkW = 7 * ART;
  const parkH = 4 * ART;
  px(parkX + 2, parkY, parkW - 4, parkH, '#2f5b3c');
  px(parkX, parkY + 2, parkW, parkH - 4, '#2f5b3c');
  px(parkX + 1, parkY + 1, parkW - 2, parkH - 2, '#2f5b3c');
  px(parkX + 3, parkY, parkW - 6, 1, '#274c33');
  px(parkX + 3, parkY + parkH - 1, parkW - 6, 1, '#274c33');
  const pr = rngArt(4242);
  for (let i = 0; i < 380; i++) {
    const x = parkX + Math.floor(pr() * parkW);
    const y = parkY + Math.floor(pr() * parkH);
    px(x, y, 1, 1, pr() < 0.5 ? '#3a6a45' : '#274c33');
  }
  // flower beds with soil
  for (let b = 0; b < 2; b++) {
    const bx = parkX + 10 + b * 48;
    px(bx - 1, parkY + 5, 22, 10, '#4a3a2a');
    px(bx, parkY + 6, 20, 8, P.dirt);
    for (let i = 0; i < 10; i++) {
      const fx = bx + (i % 5) * 4 + (Math.floor(i / 5) % 2) * 2;
      const fy = parkY + 7 + Math.floor(i / 5) * 4;
      px(fx, fy, 1, 1, i % 3 === 0 ? P.flowerB : P.flowerA);
      if (i % 4 === 0) px(fx + 1, fy, 1, 1, P.flowerC);
    }
  }
  // winding dirt paths (8 art px wide)
  [5, 9].forEach(function (tx) {
    const cx = tx * ART + 4;
    for (let y = 22 * ART; y < 27 * ART; y++) {
      const wob = Math.round(Math.sin(y * 0.55 + tx) * 1);
      px(cx - 4 + wob, y, 8, 1, P.dirt);
      px(cx - 3 + wob, y, 6, 1, (y % 3 === 0) ? P.dirtL : P.dirt);
    }
    for (let y = 22 * ART + 4; y < 27 * ART; y += 9) {
      px(cx - 3 + Math.round(Math.sin(y * 0.5) * 1), y, 6, 2, P.dirtL);
    }
  });
  // stepping stones + park litter
  for (let i = 0; i < 14; i++) {
    const x = parkX + 4 + Math.floor(pr() * (parkW - 8));
    const y = parkY + 20 + Math.floor(pr() * (parkH - 24));
    px(x, y, 1, 1, pr() < 0.5 ? P.dirtL : '#6b5539');
  }

  // ---- sidewalks
  const H_WALKS = [7, 10, 19, 22];
  const V_WALKS = [11, 14, 29, 32];
  H_WALKS.forEach(function (row) { pave(0, row * ART, CITY_AW, ART); });
  V_WALKS.forEach(function (col) { pave(col * ART, 0, ART, CITY_AH); });

  // ---- roads
  const H_ROADS = [[8, 2], [20, 2]];
  const V_ROADS = [[12, 2], [30, 2]];
  H_ROADS.forEach(function (rd) { roadSurface(0, rd[0] * ART, CITY_AW, rd[1] * ART, true); });
  V_ROADS.forEach(function (rd) { roadSurface(rd[0] * ART, 0, rd[1] * ART, CITY_AH, false); });

  // ---- curbs
  H_ROADS.forEach(function (rd) {
    const y = rd[0] * ART;
    const h = rd[1] * ART;
    px(0, y - 1, CITY_AW, 1, P.curb);
    px(0, y + h, CITY_AW, 1, P.curb);
    px(0, y, CITY_AW, 1, 'rgba(0,0,0,.30)');
    px(0, y + h - 1, CITY_AW, 1, 'rgba(0,0,0,.30)');
  });
  V_ROADS.forEach(function (rd) {
    const x = rd[0] * ART;
    const w = rd[1] * ART;
    px(x - 1, 0, 1, CITY_AH, P.curb);
    px(x + w, 0, 1, CITY_AH, P.curb);
    px(x, 0, 1, CITY_AH, 'rgba(0,0,0,.30)');
    px(x + w - 1, 0, 1, CITY_AH, 'rgba(0,0,0,.30)');
  });

  // ---- crosswalks
  crosswalkH(11 * ART, 8 * ART, 16, 32);
  crosswalkH(14 * ART, 8 * ART, 16, 32);
  crosswalkV(12 * ART, 7 * ART, 32, 16);
  crosswalkV(12 * ART, 10 * ART, 32, 16);
  crosswalkH(29 * ART, 8 * ART, 16, 32);
  crosswalkH(32 * ART, 8 * ART, 16, 32);
  crosswalkV(30 * ART, 7 * ART, 32, 16);
  crosswalkV(30 * ART, 10 * ART, 32, 16);

  // bus-stop curb paint
  for (let i = 0; i < 8; i++) {
    px(8 * ART + i * 4, 10 * ART - 3, 2, 2, i % 2 ? '#ffd75e' : '#1b2038');
  }

  // ---- pond
  drawPondArt();

  // ---- buildings & houses
  BUILDINGS.forEach(function (b) { drawBuildingArt(b, flat); });
  HOUSES.forEach(function (h) { drawHouseArt(h, flat); });

  drawDistrictDecals();
  drawDistrictStreetProps();

  // ---- vegetation
  BUSHES.forEach(function (b) { drawBushArt(b[0] * ART, b[1] * ART); });
  TREES.forEach(function (t, i) {
    drawTreeArt((t[0] + 0.5) * ART, (t[1] + 0.92) * ART, i % 3);
    if (i % 4 === 0) {
      for (let k = 0; k < 3; k++) px((t[0] + 0.3 + k * 0.22) * ART, (t[1] + 0.95) * ART, 1, 1, '#6b5539');
    }
  });
  drawPigeonArt(15.4 * ART, 10.7 * ART);
  drawPigeonArt(16.2 * ART, 10.9 * ART);
  drawPigeonArt(27.6 * ART, 19.6 * ART);
  drawPigeonArt(6.8 * ART, 23.9 * ART);

  // ---- street furniture
  drawBenchArt(4.1 * ART, 24.6 * ART);
  drawBenchArt(10.3 * ART, 24.4 * ART);
  drawBinArt(3.4 * ART, 26.6 * ART);
  drawBenchArt(9.6 * ART, 10.9 * ART);
  drawBinArt(8.2 * ART, 10.9 * ART);
  drawHydrantArt(20.5 * ART, 7.8 * ART);
  drawVendorArt(22.2 * ART, 7.95 * ART);
  drawVendorArt(10.4 * ART, 24.2 * ART);
  drawManholeArt(17.5 * ART, 9.3 * ART);
  drawManholeArt(27.5 * ART, 21.3 * ART);
  drawManholeArt(13.4 * ART, 14.5 * ART);
  drawDrainArt(15.4 * ART, 8.1 * ART);
  drawDrainArt(24.4 * ART, 21.9 * ART);

  // ---- parked scooters + bikes
  SCOOTERS.forEach(function (s) { drawScooterArt(s[0] * ART, s[1] * ART, s[2]); });
  drawBikeArt(17.3 * ART, 10.9 * ART);
  drawBikeArt(28.6 * ART, 19.6 * ART);

  // ---- bus stop
  drawBusStopArt(9.5 * ART, 10.2 * ART);
  drawBusStopArt(16.0 * ART, 10.2 * ART);
  drawBarberPoleArt(21.4 * ART, 10.2 * ART);
  drawClothesRackArt(27.0 * ART, 10.2 * ART);

  // ---- street lamps (poles) + power poles
  LIGHTS.forEach(function (l) { drawLampPost(l[0] * ART, l[1] * ART); });
  drawPowerLine();

  // ---- little extras
  drawPuddle(16.2 * ART, 21.9 * ART, 10, 3);
  drawPuddle(23.8 * ART, 8.2 * ART, 8, 2);
  drawLitter(16.8 * ART, 10.7 * ART);
  drawLitter(33.4 * ART, 22.7 * ART);
  drawPot(22.8 * ART, 24.2 * ART);
  drawPot(28.6 * ART, 12.2 * ART);
  drawBags(9.0 * ART, 19.7 * ART);
  drawMailbox(3.0 * ART, 15.5 * ART);
  drawTrafficLight(11.2 * ART, 7.6 * ART);
  drawVendingArt(23.0 * ART, 16.2 * ART);

  // ---- Yaowarat night-market detail pass
  drawYaowaratArt(flat);
}

function pave(x, y, w, h) {
  px(x, y, w, h, P.walk);
  for (let yy = 0; yy < h; yy += 4) {
    for (let xx = 0; xx < w; xx += 4) {
      const light = ((Math.floor(xx / 4) + Math.floor(yy / 4)) % 2) === 0;
      px(x + xx, y + yy, 3, 3, light ? P.walkL : P.walk);
    }
  }
  px(x, y + h - 1, w, 1, P.walkD);
}

function roadSurface(x, y, w, h, horizontal) {
  px(x, y, w, h, P.road);
  const r = rngArt(x * 31 + y * 17 + (horizontal ? 7 : 13));
  const n = Math.floor((w * h) / 55);
  for (let i = 0; i < n; i++) {
    const sx = x + Math.floor(r() * w);
    const sy = y + Math.floor(r() * h);
    const k = r();
    px(sx, sy, 1, 1, k < 0.5 ? P.roadD : k < 0.85 ? P.roadL : '#4a5370');
  }
  if (horizontal) {
    // lighter tyre wear
    ctx.globalAlpha = 0.10;
    px(x, y + 6, w, 2, '#cfd6e6');
    px(x, y + 19, w, 2, '#cfd6e6');
    ctx.globalAlpha = 1;
    // dashed centre line
    for (let d = 6; d < w; d += 16) {
      px(x + d, y + h / 2 - 1, 6, 1, P.line);
    }
    // patches / cracks
    for (let i = 0; i < 4; i++) {
      const cx = x + Math.floor(r() * (w - 24));
      const cy = y + 3 + Math.floor(r() * (h - 8));
      px(cx, cy, 8 + Math.floor(r() * 12), 2, P.roadD);
    }
  } else {
    ctx.globalAlpha = 0.10;
    px(x + 6, y, 2, h, '#cfd6e6');
    px(x + 19, y, 2, h, '#cfd6e6');
    ctx.globalAlpha = 1;
    for (let d = 6; d < h; d += 16) {
      px(x + w / 2 - 1, y + d, 1, 6, P.line);
    }
    for (let i = 0; i < 4; i++) {
      const cx = x + 3 + Math.floor(r() * (w - 8));
      const cy = y + Math.floor(r() * (h - 24));
      px(cx, cy, 2, 8 + Math.floor(r() * 12), P.roadD);
    }
  }
}

function crosswalkH(x, y, w, h) {
  for (let yy = y + 2; yy < y + h - 1; yy += 4) {
    px(x + 1, yy, w - 2, 2, P.line);
  }
}

function crosswalkV(x, y, w, h) {
  for (let xx = x + 2; xx < x + w - 1; xx += 4) {
    px(xx, y + 1, 2, h - 2, P.line);
  }
}

function drawPondArt() {
  const x = POND.x * ART;
  const y = POND.y * ART;
  const w = POND.w * ART;
  const h = POND.h * ART;

  // stone rim
  px(x - 3, y - 1, w + 6, h + 2, '#6a6f88');
  px(x - 1, y - 3, w + 2, h + 6, '#6a6f88');
  px(x - 2, y - 2, w + 4, h + 4, '#565b72');
  // water body with rounded pixel corners
  px(x + 2, y, w - 4, h, P.water);
  px(x, y + 2, w, h - 4, P.water);
  px(x + 1, y + 1, w - 2, h - 2, P.water);
  // deep middle
  px(x + 5, y + 5, w - 10, h - 10, P.waterD);
  px(x + 8, y + 9, w - 16, h - 18, P.water);
  // surface glints
  px(x + 6, y + 6, 9, 1, P.waterL);
  px(x + 18, y + 16, 7, 1, 'rgba(160,220,255,.35)');
  px(x + 11, y + 22, 5, 1, 'rgba(160,220,255,.22)');
  // reeds and rocks along the rim
  for (let i = 0; i < 6; i++) px(x + 1 + i * 6, y + h - 3, 1, 4, '#3d6b45');
  px(x - 3, y + 8, 4, 3, '#4a4f64');
  px(x + w - 1, y + 20, 4, 3, '#4a4f64');
  // lily pads
  px(x + 6, y + 18, 5, 2, '#3f7a4e');
  px(x + 23, y + 7, 5, 3, '#3f7a4e');
  px(x + 25, y + 8, 1, 1, P.flowerB);
  // ducks
  px(x + 12, y + 11, 4, 3, '#e8eeff');
  px(x + 13, y + 10, 3, 1, '#f4f7ff');
  px(x + 16, y + 11, 1, 1, '#ff9f4a');
  px(x + 13, y + 14, 1, 1, '#c9d6ff');
  px(x + 21, y + 22, 3, 2, '#dce4ff');
  px(x + 23, y + 22, 1, 1, '#ff9f4a');
}

/* ---------- buildings ---------- */

function drawDistrictStreetProps() {
  DISTRICTS.forEach(function (d) {
    const bx = d.rect[0] * ART;
    const by = d.rect[1] * ART;
    const bw = d.rect[2] * ART;

    if (d.id === 'silom') {
      // skywalk glass canopy along the office sidewalk
      const y = 7 * ART - 6;
      for (let x = bx + 8; x < bx + bw - 8; x += 18) {
        px(x, y, 14, 4, '#7dd3fc');
        px(x, y + 4, 2, 10, '#c9d6ff');
        px(x + 12, y + 4, 2, 10, '#c9d6ff');
        ctx.globalAlpha = 0.45;
        px(x, y + 1, 14, 1, '#e8eeff');
        ctx.globalAlpha = 1;
      }
      // bus stop shelter
      px(bx + 52, 10 * ART - 15, 24, 3, '#1a2038');
      px(bx + 54, 10 * ART - 12, 20, 8, 'rgba(125,211,252,.35)');
      px(bx + 55, 10 * ART - 4, 2, 8, '#c9d6ff');
      px(bx + 71, 10 * ART - 4, 2, 8, '#c9d6ff');
    } else if (d.id === 'yaowarat') {
      // lantern string + vertical shop signs
      const y = 22 * ART - 8;
      for (let x = bx + 10; x < bx + bw - 10; x += 16) {
        px(x, y, 1, 5, '#2a1a1a');
        px(x - 2, y + 5, 5, 4, '#ff5c6c');
        px(x - 1, y + 6, 3, 2, '#ffd75e');
        if (x % 32 < 16) px(x + 5, 20 * ART + 10, 4, 12, d.accent);
      }
      // overhead cables
      for (let yy = 20 * ART + 6; yy < 22 * ART; yy += 9) {
        px(bx + 4, yy, bw - 8, 1, 'rgba(20,20,30,.45)');
      }
    } else if (d.id === 'pathumwan') {
      // billboard frames + neon strips
      for (let x = bx + 18; x < bx + bw - 18; x += 44) {
        px(x, 19 * ART - 20, 26, 14, '#1a2038');
        px(x + 2, 19 * ART - 18, 22, 8, '#b06fd6');
        px(x + 5, 19 * ART - 16, 16, 2, '#ffd75e');
        px(x + 2, 19 * ART - 6, 22, 2, '#1a2038');
      }
    } else if (d.id === 'chula') {
      // pink faculty banners
      for (let x = bx + 14; x < bx + bw - 10; x += 28) {
        px(x, 7 * ART - 22, 1, 18, '#8a8f9e');
        px(x - 4, 7 * ART - 20, 9, 12, '#d98aa8');
        px(x - 3, 7 * ART - 18, 7, 2, '#fff');
      }
      // bicycle racks
      for (let x = bx + 8; x < bx + bw - 30; x += 20) {
        px(x, 7 * ART - 4, 1, 4, '#c9d6ff');
        px(x + 3, 7 * ART - 4, 1, 4, '#c9d6ff');
        px(x + 6, 7 * ART - 4, 1, 4, '#c9d6ff');
        px(x - 3, 7 * ART - 5, 12, 1, '#8a93b8');
      }
    } else if (d.id === 'samyan') {
      // book carts and awnings
      for (let x = bx + 20; x < bx + bw - 20; x += 42) {
        px(x, 7 * ART - 12, 16, 7, '#d9c7a0');
        px(x + 2, 7 * ART - 10, 5, 4, d.accent);
        px(x + 8, 7 * ART - 10, 5, 4, '#7a4a3a');
        px(x - 2, 7 * ART - 15, 20, 3, '#b04148');
      }
      // newspaper stands
      px(bx + 8, 7 * ART - 8, 8, 6, '#d9c7a0');
      px(bx + 9, 7 * ART - 7, 3, 2, '#2a3150');
      px(bx + 13, 7 * ART - 7, 2, 2, '#b04148');
    } else if (d.id === 'bangrak') {
      // market umbrellas
      for (let x = bx + 16; x < bx + bw - 16; x += 38) {
        px(x, 10 * ART - 12, 1, 10, '#6b4a3a');
        px(x - 7, 10 * ART - 16, 15, 4, d.accent);
        px(x - 5, 10 * ART - 14, 11, 2, '#e8eefc');
      }
      // laundry lines between shophouses
      for (let x = bx + 20; x < bx + bw - 20; x += 40) {
        px(x, 12 * ART + 6, 30, 1, '#8a6448');
        px(x + 4, 12 * ART + 7, 3, 3, '#e8eefc');
        px(x + 11, 12 * ART + 7, 3, 3, '#ffd75e');
        px(x + 18, 12 * ART + 7, 3, 3, '#7dd3fc');
      }
    } else if (d.id === 'lumphini') {
      // park benches / exercise bars
      for (let x = bx + 20; x < bx + bw - 20; x += 44) {
        px(x, 24 * ART + 8, 14, 2, '#8a6448');
        px(x, 24 * ART + 10, 14, 2, '#6b4a3a');
        px(x + 1, 24 * ART + 12, 2, 4, '#3a2f28');
        px(x + 11, 24 * ART + 12, 2, 4, '#3a2f28');
      }
    } else if (d.id === 'khlongtoei') {
      // containers and barrels
      for (let x = bx + 14; x < bx + bw - 20; x += 38) {
        px(x, 19 * ART - 10, 18, 9, '#4f8a9a');
        px(x + 2, 19 * ART - 8, 14, 2, '#6fb3bd');
        px(x + 16, 19 * ART - 5, 4, 6, '#8a5a3a');
        px(x + 17, 19 * ART - 3, 2, 2, '#c9a06a');
      }
      // utility poles + wires
      for (let x = bx + 20; x < bx + bw - 10; x += 30) {
        px(x, 19 * ART - 30, 2, 26, '#6b4a3a');
        px(x, 19 * ART - 26, 10, 1, 'rgba(20,20,30,.5)');
        px(x - 8, 19 * ART - 20, 10, 1, 'rgba(20,20,30,.45)');
      }
    }
  });
}

function drawDistrictDecals() {
  DISTRICTS.forEach(function (d) {
    const x = Math.round(d.spot[0] * ART);
    const y = Math.round(d.spot[1] * ART);
    ctx.globalAlpha = 0.28;
    px(x - 9, y + 2, 18, 3, P.shadow);
    ctx.globalAlpha = 1;

    if (d.id === 'samyan') {
      px(x - 7, y - 6, 14, 2, d.accent);
      px(x - 6, y - 4, 12, 4, '#d9c7a0');
      px(x - 5, y - 3, 10, 1, '#8a5a3a');
      px(x - 7, y + 1, 14, 2, '#7a4a3a');
    } else if (d.id === 'silom') {
      px(x - 6, y - 8, 10, 7, '#2a3150');
      px(x - 5, y - 7, 8, 5, '#7dd3fc');
      px(x + 5, y - 3, 5, 6, '#e8eefc');
      px(x + 6, y - 2, 3, 2, '#8a5a3a');
    } else if (d.id === 'chula') {
      px(x - 2, y - 12, 2, 13, '#6b4a3a');
      px(x, y - 12, 9, 6, d.accent);
      px(x + 2, y - 10, 5, 2, '#fff');
      px(x - 6, y - 3, 10, 2, '#e8eefc');
    } else if (d.id === 'bangrak') {
      px(x - 9, y - 4, 18, 2, '#8a6448');
      px(x - 9, y - 1, 18, 2, '#6b4a3a');
      px(x - 8, y + 1, 2, 4, '#3a2f28');
      px(x + 6, y + 1, 2, 4, '#3a2f28');
      px(x - 7, y - 8, 14, 2, d.accent);
    } else if (d.id === 'pathumwan') {
      px(x - 7, y - 5, 7, 8, '#e8eefc');
      px(x - 6, y - 4, 5, 6, d.accent);
      px(x + 1, y - 7, 7, 10, '#ffd75e');
      px(x + 2, y - 6, 5, 8, '#b06fd6');
      px(x - 7, y - 8, 1, 4, '#c9d6ff');
      px(x + 7, y - 10, 1, 4, '#c9d6ff');
    } else if (d.id === 'lumphini') {
      px(x - 8, y - 2, 14, 5, '#3f8a4c');
      px(x - 6, y, 10, 2, '#6ee7a8');
      px(x + 8, y - 6, 3, 8, '#c9d6ff');
      px(x + 9, y - 5, 1, 4, '#7dd3fc');
    } else if (d.id === 'yaowarat') {
      px(x - 8, y - 4, 15, 7, '#6e3a3e');
      px(x - 7, y - 3, 13, 2, d.accent);
      px(x - 9, y - 10, 18, 3, '#b04148');
      px(x + 6, y - 8, 2, 3, '#ffd75e');
      px(x - 5, y - 6, 3, 3, '#ffd75e');
      px(x + 2, y - 6, 3, 3, '#ff9f4a');
    } else if (d.id === 'khlongtoei') {
      px(x - 8, y - 7, 8, 9, '#4f8a9a');
      px(x - 7, y - 6, 6, 7, '#6fb3bd');
      px(x + 1, y - 5, 7, 7, '#8a5a3a');
      px(x + 2, y - 4, 5, 2, '#c9a06a');
      px(x + 2, y - 1, 5, 2, '#c9a06a');
    }
  });
}

function drawBuildingArt(b, flat) {
  if (flat) { drawBuildingFlat(b); return; }
  const st = artStyleOverride || districtStyle(b.x + b.w / 2, b.y + b.h / 2);
  b = Object.assign({}, b, {
    roof: st.roof || b.roof,
    roofDark: st.roofDark || b.roofDark,
    sign: st.sign || b.sign
  });
  const x = b.x * ART;
  const y = b.y * ART;
  const w = b.w * ART;
  const h = b.h * ART;
  const wallH = clamp(Math.round(h * 0.46), 12, 30);
  const roofH = h - wallH;
  const wallY = y + roofH;
  const cx = x + w / 2;

  // ground shadow
  ctx.globalAlpha = 0.38;
  px(x + 3, y + 4, w, h, P.shadow);
  ctx.globalAlpha = 1;

  // wall
  px(x, wallY, w, wallH, b.wall);
  for (let yy = wallY + 3; yy < y + h - 1; yy += 4) {
    px(x, yy, w, 1, 'rgba(0,0,0,.16)');
    const off = (Math.floor(yy / 4) % 2) ? 4 : 0;
    for (let xx = x + off; xx < x + w; xx += 8) {
      px(xx, yy - 4, 1, 4, 'rgba(0,0,0,.10)');
    }
  }
  px(x, wallY, w, 1, 'rgba(255,255,255,.12)');
  px(x, y + h - 2, w, 2, 'rgba(0,0,0,.35)');

  // windows
  const rows = wallH >= 19 ? 2 : 1;
  const doorCol = Math.floor(b.w / 2) - 1;
  for (let rw = 0; rw < rows; rw++) {
    for (let i = 0; i < b.w; i++) {
      if (rw === rows - 1 && (i === doorCol || i === doorCol + 1)) continue;
      const wx = x + i * ART + 5;
      const wy = wallY + 3 + rw * 9;
      const lit = ((i * 3 + rw * 5 + b.x * 7) % 5) !== 0;
      const warm = ((i + rw + b.y) % 3) === 0;
      drawWindowArt(wx, wy, 6, 5, lit, warm);
    }
  }

  // door + awning + step
  const doorW = 8;
  const doorH = Math.min(12, wallH - 2);
  const dx = Math.round(cx - doorW / 2);
  const dy = y + h - doorH;
  px(dx - 1, dy - 1, doorW + 2, doorH + 1, P.frame);
  px(dx, dy, doorW, doorH, '#1a2038');
  px(dx + 1, dy + 1, doorW - 2, doorH - 3, '#252c4a');
  px(dx + doorW - 3, dy + Math.floor(doorH / 2), 1, 1, '#ffd75e');
  const awX = Math.round(cx - 8);
  const awY = dy - 4;
  for (let i = 0; i < 16; i += 4) px(awX + i, awY, 2, 3, b.sign);
  px(awX, awY, 16, 1, 'rgba(255,255,255,.30)');
  px(dx - 3, y + h - 2, doorW + 6, 2, '#3c425c');
  px(dx + 1, y + h - 4, doorW - 2, 2, '#4a2f2f');

  // roof
  px(x - 2, y, w + 4, roofH + 2, b.roofDark);
  px(x, y + 1, w, roofH - 1, b.roof);
  for (let yy = y + 3; yy < y + roofH; yy += 3) {
    px(x, yy, w, 1, 'rgba(0,0,0,.18)');
    const off = (Math.floor(yy / 3) % 2) ? 3 : 0;
    for (let xx = x + off; xx < x + w; xx += 6) {
      px(xx, yy - 3, 1, 3, 'rgba(0,0,0,.10)');
    }
  }
  px(x, y, w, 1, 'rgba(255,255,255,.18)');
  px(x - 2, y, w + 4, 1, 'rgba(255,255,255,.10)');
  px(x - 2, y + roofH, w + 4, 1, 'rgba(0,0,0,.38)');

  // rooftop machinery
  px(x + 4, y + 4, 10, 6, '#3d4560');
  px(x + 5, y + 5, 8, 3, '#7d86a8');
  px(x + 6, y + 6, 2, 2, '#2a3048');
  px(x + 10, y + 6, 2, 2, '#2a3048');
  px(x + 5, y + 9, 8, 1, '#2a3048');

  px(x + w - 12, y + 4, 6, 4, '#4a5270');
  px(x + w - 11, y + 5, 4, 1, '#2a3048');
  px(x + w - 11, y + 7, 4, 1, '#2a3048');

  if (b.w >= 4 && roofH >= 18) {
    px(x + w - 22, y + 6, 1, 6, '#8a93b8');
    px(x + w - 25, y + 6, 7, 1, '#8a93b8');
    px(x + w - 24, y + 9, 5, 1, 'rgba(138,147,184,.6)');
  }
  if (roofH >= 16) {
    px(Math.round(cx + 10), y - 2, 1, 6, '#8a93b8');
    px(Math.round(cx + 8), y, 5, 1, '#8a93b8');
  }

  // sign board (home gets a porch light instead)
  if (b.id === 'home') {
    px(dx + Math.floor(doorW / 2) - 1, dy - 6, 2, 2, '#ffe9a8');
    px(dx + Math.floor(doorW / 2) - 2, dy - 4, 4, 1, 'rgba(255,233,168,.25)');
    px(dx - 1, dy - 10, doorW + 2, 3, P.frame);
    px(dx, dy - 9, doorW, 1, b.sign);
  } else {
    const sw = Math.min(w - 8, 42);
    const sx = Math.round(cx - sw / 2);
    const sy = y + roofH - 8;
    px(sx - 1, sy - 1, sw + 2, 8, 'rgba(0,0,0,.35)');
    px(sx, sy, sw, 7, b.sign);
    px(sx, sy, sw, 1, 'rgba(255,255,255,.4)');
    px(sx, sy + 6, sw, 1, 'rgba(0,0,0,.25)');
    drawSignIcon(b.id, sx + 3, sy + 1);
    for (let i = 0; i < Math.min(5, Math.floor((sw - 14) / 4)); i++) {
      px(sx + 10 + i * 4, sy + 2, 2, 3, 'rgba(255,255,255,.85)');
    }
  }

  // entrance plants / props
  if (b.id !== 'home') {
    drawPot(dx - 5, y + h - 1);
    drawPot(dx + doorW + 3, y + h - 1);
  }
}

function drawBuildingFlat(b) {
  const x = b.x * ART;
  const y = b.y * ART;
  const w = b.w * ART;
  const h = b.h * ART;
  const cx = x + w / 2;
  const st = districtStyle(b.x + b.w / 2, b.y + b.h / 2);
  const district = districtAt(b.x + b.w / 2, b.y + b.h / 2);
  const roof = st.roof || b.roof;
  const roofDark = st.roofDark || b.roofDark;
  const sign = st.sign || b.sign;

  ctx.globalAlpha = 0.34;
  px(x + 2, y + 3, w, h, P.shadow);
  ctx.globalAlpha = 1;

  // flat roof footprint (top-down)
  px(x, y, w, h, roofDark);
  px(x + 1, y + 1, w - 2, h - 2, roof);
  for (let yy = y + 4; yy < y + h - 2; yy += 3) {
    px(x + 1, yy, w - 2, 1, 'rgba(0,0,0,.13)');
  }
  px(x + 1, y + 1, w - 2, 1, 'rgba(255,255,255,.16)');
  px(x + 1, y + 1, 1, h - 2, 'rgba(255,255,255,.08)');
  px(x + 1, y + h - 2, w - 2, 1, 'rgba(0,0,0,.30)');

  // rooftop machinery
  if (w >= 40) {
    px(x + 3, y + 3, 10, 6, '#3d4560');
    px(x + 4, y + 4, 8, 2, '#7d86a8');
  }
  if (w >= 56) {
    px(x + w - 13, y + 4, 8, 7, '#6f7899');
    px(x + w - 12, y + 5, 6, 2, '#9aa3c4');
  }
  if (b.w >= 4) {
    px(cx + 9, y + 3, 1, 5, '#8a93b8');
    px(cx + 7, y + 4, 5, 1, '#8a93b8');
  }

  if (district) {
    if (district.id === 'silom') {
      // antenna farm + roof AC + helipad ring
      px(cx + 3, y + 2, 1, 9, '#c9d6ff');
      px(cx + 2, y + 6, 3, 1, '#c9d6ff');
      for (let i = 0; i < 3; i++) {
        px(x + 5 + i * 9, y + h - 15, 7, 5, '#3d4560');
        px(x + 6 + i * 9, y + h - 14, 5, 2, '#7d86a8');
      }
      ctx.globalAlpha = 0.35;
      px(cx - 7, y + h / 2 - 7, 14, 1, '#7dd3fc');
      px(cx - 7, y + h / 2 + 6, 14, 1, '#7dd3fc');
      px(cx - 7, y + h / 2 - 7, 1, 14, '#7dd3fc');
      px(cx + 6, y + h / 2 - 7, 1, 14, '#7dd3fc');
      ctx.globalAlpha = 1;
    } else if (district.id === 'yaowarat') {
      // water tanks + lantern dots + sign frame
      px(x + 4, y + 4, 6, 5, '#8a93b8');
      px(x + 5, y + 3, 4, 2, '#c9d6ff');
      px(x + w - 11, y + 4, 7, 5, '#6f7899');
      for (let i = 0; i < 3; i++) {
        px(x + 6 + i * 9, y + h - 8, 3, 3, i % 2 ? '#ff5c6c' : '#ffd75e');
      }
      px(x + w - 18, y + h - 12, 3, 9, district.accent);
    } else if (district.id === 'pathumwan') {
      // rooftop billboard + neon
      px(cx - 16, y + 3, 32, 3, '#1a2038');
      px(cx - 14, y + 6, 28, 6, '#b06fd6');
      px(cx - 10, y + 8, 20, 2, '#ffd75e');
      px(cx - 16, y + 12, 1, 3, '#c9d6ff');
      px(cx + 15, y + 12, 1, 3, '#c9d6ff');
    } else if (district.id === 'chula') {
      // rooftop garden + water tank
      for (let i = 0; i < 4; i++) {
        px(x + 5 + i * 6, y + h - 12, 4, 4, '#2f5a3a');
        px(x + 6 + i * 6, y + h - 11, 2, 2, '#468a57');
      }
      px(x + w - 12, y + 4, 6, 6, '#8a93b8');
      px(x + w - 11, y + 3, 4, 2, '#c9d6ff');
    } else if (district.id === 'khlongtoei') {
      // containers + vents
      for (let i = 0; i < 2; i++) {
        px(x + 4 + i * 12, y + h - 14, 10, 6, i % 2 ? '#4f8a9a' : '#8a5a3a');
        px(x + 5 + i * 12, y + h - 13, 8, 1, '#c9d6ff');
      }
      px(x + w - 10, y + 4, 4, 4, '#6f7899');
    } else if (district.id === 'bangrak') {
      // water tank + clothesline
      px(x + 4, y + 4, 6, 5, '#8a93b8');
      px(x + 5, y + 3, 4, 2, '#c9d6ff');
      px(x + w - 20, y + h - 8, 1, 8, '#6b4a3a');
      px(x + w - 19, y + h - 8, 12, 1, '#8a6448');
      px(x + w - 16, y + h - 7, 3, 3, '#e8eefc');
      px(x + w - 11, y + h - 7, 3, 3, '#7dd3fc');
    } else if (district.id === 'samyan') {
      // book crates / roof vents
      for (let i = 0; i < 3; i++) {
        px(x + 5 + i * 8, y + h - 12, 6, 4, ['#d9c7a0', '#b04148', '#7a4a3a'][i]);
        px(x + 6 + i * 8, y + h - 11, 4, 1, '#e8eefc');
      }
    } else if (district.id === 'lumphini') {
      px(cx - 4, y + 4, 8, 8, '#2f5a3a');
      px(cx - 2, y + 6, 4, 4, '#468a57');
    }
  }

  // small sign strip facing the street (south edge)
  const sw = Math.min(w - 8, 42);
  const sx = Math.round(cx - sw / 2);
  const sy = y + h - 7;
  px(sx - 1, sy - 1, sw + 2, 7, 'rgba(0,0,0,.32)');
  px(sx, sy, sw, 5, sign);
  px(sx, sy, sw, 1, 'rgba(255,255,255,.35)');
  drawSignIcon(b.id, sx + 2, sy + 1);
  for (let i = 0; i < Math.min(4, Math.floor((sw - 12) / 4)); i++) {
    px(sx + 9 + i * 4, sy + 1, 2, 2, 'rgba(255,255,255,.85)');
  }

  // entrance step + curb shadow
  px(cx - 3, y + h, 6, 2, '#3c425c');
}

function drawHouseFlat(home) {
  const x = home.x * ART;
  const y = home.y * ART;
  const w = home.w * ART;
  const h = home.h * ART;
  const st = districtStyle(home.x + home.w / 2, home.y + home.h / 2);
  const roof = st.roof || home.roof;
  const roofDark = st.roofDark || home.roofDark;

  ctx.globalAlpha = 0.32;
  px(x + 2, y + 3, w, h, P.shadow);
  ctx.globalAlpha = 1;

  px(x, y, w, h, roofDark);
  px(x + 1, y + 1, w - 2, h - 2, roof);

  // roof tiles: rows + ridge
  for (let yy = y + 3; yy < y + h - 2; yy += 3) {
    px(x + 1, yy, w - 2, 1, 'rgba(0,0,0,.12)');
  }
  px(x + 2, y + Math.floor(h / 2), w - 4, 1, 'rgba(255,255,255,.16)');
  px(x + 1, y + 1, w - 2, 1, 'rgba(255,255,255,.14)');
  px(x + 1, y + h - 2, w - 2, 1, 'rgba(0,0,0,.28)');

  // chimney / vent
  px(x + w - 9, y + 3, 4, 4, '#5a4a40');
  px(x + w - 8, y + 4, 2, 1, '#3a2f28');

  // doorstep + tiny front garden strip
  px(x + Math.floor(w / 2) - 3, y + h, 6, 2, '#3a2a1e');
  px(x + 2, y + h - 2, 5, 2, '#2f5a3c');
  px(x + 8, y + h - 2, 3, 1, '#3d7d4d');
}

function drawWindowArt(x, y, w, h, lit, warm) {
  px(x - 1, y - 1, w + 2, h + 2, P.frame);
  px(x, y, w, h, lit ? (warm ? P.winLit2 : P.winLit) : P.winOff);
  if (lit) {
    px(x, y, w, 1, 'rgba(255,255,255,.75)');
    px(x + 1, y + 1, 1, h - 3, 'rgba(255,255,255,.35)');
    winGlows.push([x, y, w, h]);
  } else {
    px(x, y, 1, h, 'rgba(140,190,255,.14)');
    px(x + w - 2, y + 1, 1, h - 2, 'rgba(140,190,255,.10)');
  }
  px(x + Math.floor(w / 2), y, 1, h, P.frame);
  px(x, y + Math.floor(h / 2), w, 1, P.frame);
  px(x - 1, y + h + 1, w + 2, 1, 'rgba(0,0,0,.35)');
}

function drawSignIcon(id, x, y) {
  if (id === 'hospital') {
    px(x, y + 1, 4, 2, '#fff');
    px(x + 1, y, 2, 4, '#fff');
  } else if (id === 'office') {
    px(x, y, 4, 1, '#fff');
    px(x, y + 2, 4, 3, '#fff');
    px(x + 1, y + 3, 2, 1, '#2f4bb0');
  } else if (id === 'seven') {
    px(x, y, 4, 1, '#ff9f4a');
    px(x, y + 2, 4, 1, '#6ee7a8');
    px(x, y + 4, 4, 1, '#ff5c6c');
  } else if (id === 'gym') {
    px(x, y + 2, 1, 2, '#fff');
    px(x + 3, y + 2, 1, 2, '#fff');
    px(x + 1, y + 2, 2, 1, '#fff');
  } else if (id === 'bar') {
    px(x + 1, y, 2, 4, '#fff');
    px(x + 1, y + 4, 1, 1, '#fff');
  } else if (id === 'school') {
    px(x, y + 1, 5, 4, '#fff');
    px(x, y + 1, 1, 4, '#fff');
    px(x + 1, y + 2, 3, 1, '#8a5a3a');
    px(x + 1, y + 4, 3, 1, '#8a5a3a');
  } else if (id === 'market') {
    px(x, y + 1, 5, 3, '#fff');
    px(x, y, 1, 5, '#fff');
    px(x + 4, y, 1, 5, '#fff');
    px(x + 1, y + 2, 3, 1, '#8a5a3a');
  } else if (id === 'temple') {
    px(x, y, 5, 1, '#fff');
    px(x + 1, y + 1, 3, 1, '#fff');
    px(x + 2, y + 2, 1, 3, '#fff');
  } else if (id === 'factory') {
    px(x, y + 3, 5, 2, '#fff');
    px(x + 1, y + 1, 2, 2, '#fff');
    px(x + 3, y, 1, 3, '#fff');
  } else if (id === 'health') {
    px(x, y + 1, 4, 2, '#fff');
    px(x + 1, y, 2, 4, '#fff');
  } else if (id === 'coldstorage') {
    px(x, y, 4, 5, '#fff');
    px(x + 1, y + 1, 2, 3, '#8fd6ff');
  } else if (id === 'warehouse') {
    px(x, y + 1, 4, 4, '#fff');
    px(x + 1, y, 2, 1, '#fff');
    px(x + 1, y + 3, 2, 1, '#8a6448');
  } else {
    px(x, y, 4, 4, '#fff');
  }
}

function drawHouseArt(h, flat) {
  if (flat) { drawHouseFlat(h); return; }
  const st = artStyleOverride || districtStyle(h.x + h.w / 2, h.y + h.h / 2);
  h = Object.assign({}, h, {
    roof: st.roof || h.roof,
    roofDark: st.roofDark || h.roofDark
  });
  const x = h.x * ART;
  const y = h.y * ART;
  const w = h.w * ART;
  const hh = h.h * ART;
  const wallH = clamp(Math.round(hh * 0.52), 10, 18);
  const roofH = hh - wallH;
  const wallY = y + roofH;
  const cx = x + w / 2;

  ctx.globalAlpha = 0.34;
  px(x + 2, y + 3, w, hh, P.shadow);
  ctx.globalAlpha = 1;

  // wall with siding
  px(x, wallY, w, wallH, h.roofDark);
  for (let yy = wallY + 3; yy < y + hh; yy += 3) px(x, yy, w, 1, 'rgba(0,0,0,.14)');
  px(x, wallY, w, 1, 'rgba(255,255,255,.10)');

  // windows
  for (let i = 0; i < h.w; i++) {
    if (i === Math.floor(h.w / 2)) continue;
    drawWindowArt(x + i * ART + 6, wallY + 3, 5, 4, true, false);
  }

  // door
  const dw = 6;
  const dh = Math.min(9, wallH - 1);
  const dx = Math.round(cx - dw / 2);
  const dy = y + hh - dh;
  px(dx - 1, dy - 1, dw + 2, dh + 1, P.frame);
  px(dx, dy, dw, dh, '#2a1f17');
  px(dx + 1, dy + 1, dw - 2, dh - 3, '#4a3527');
  px(dx + dw - 2, dy + Math.floor(dh / 2), 1, 1, '#ffd75e');
  px(dx - 1, y + hh - 1, dw + 2, 1, '#3a2a1e');
  drawPot(dx - 4, y + hh - 1);
  drawPot(dx + dw + 2, y + hh - 1);

  // pyramid roof
  const halfTop = Math.max(2, Math.round(w * 0.14));
  const halfBase = w / 2 + 2;
  for (let i = 0; i < roofH; i++) {
    const t = roofH > 1 ? i / (roofH - 1) : 1;
    const half = halfTop + (halfBase - halfTop) * t;
    px(cx - half, y + i, half * 2, 1, i % 3 === 0 ? h.roofDark : h.roof);
  }
  px(cx - halfTop, y, halfTop * 2, 1, 'rgba(255,255,255,.20)');
  for (let i = 2; i < roofH; i += 3) {
    const t = roofH > 1 ? i / (roofH - 1) : 1;
    const half = halfTop + (halfBase - halfTop) * t;
    for (let xx = Math.round(cx - half) + 2; xx < cx + half - 1; xx += 4) {
      px(xx, y + i, 1, 1, 'rgba(0,0,0,.14)');
    }
  }

  // chimney
  if (roofH > 8) {
    px(cx + 3, y + 3, 4, 6, '#5a4a40');
    px(cx + 3, y + 2, 4, 2, '#3a2f28');
    px(cx + 4, y + 1, 2, 1, 'rgba(180,190,210,.20)');
  }

  // fence posts + garden
  px(x - 1, y + hh - 4, 2, 4, '#3f4a3a');
  px(x + w - 1, y + hh - 4, 2, 4, '#3f4a3a');
  px(x + w - 7, y + hh - 5, 5, 5, '#2f5a3c');
  px(x + w - 6, y + hh - 6, 3, 3, '#3d7d4d');
}

/* ---------- vegetation ---------- */

function drawTreeArt(cx, cy, variant) {
  const v = variant || 0;
  const lift = v === 1 ? 5 : 0;
  const base = cy - lift;
  shadowBlob(cx, cy - 1, 16);
  px(cx - 1, base - 9, 3, 9 + lift, '#4a3524');
  px(cx, base - 9, 1, 9 + lift, '#5f4630');
  px(cx - 2, base - 2, 5, 2, '#3a2a1c');

  px(cx - 7, base - 18, 14, 4, '#26482f');
  px(cx - 9, base - 16, 18, 3, '#26482f');
  px(cx - 8, base - 14, 16, 8, '#2f5a3a');
  px(cx - 10, base - 16, 5, 6, '#2f5a3a');
  px(cx + 5, base - 16, 5, 6, '#2f5a3a');
  px(cx - 6, base - 20, 12, 4, '#377048');
  px(cx - 4, base - 22, 8, 3, '#377048');
  px(cx - 5, base - 21, 4, 2, '#468a57');
  px(cx + 1, base - 18, 3, 2, '#468a57');
  px(cx - 9, base - 14, 2, 2, '#3d7d4d');
  px(cx + 7, base - 13, 2, 2, '#3d7d4d');
  px(cx - 6, base - 11, 12, 2, '#1e3b27');

  if (v === 2) {
    [[-6, -19], [-2, -17], [3, -20], [6, -15], [-8, -13], [1, -12]].forEach(function (p) {
      px(cx + p[0], base + p[1], 1, 1, '#ff8fb1');
      px(cx + p[0] + 1, base + p[1], 1, 1, '#ffd75e');
    });
  }
}

function drawPigeonArt(x, y) {
  px(x - 2, y - 3, 3, 2, '#6d7390');
  px(x - 1, y - 4, 2, 1, '#8a93b8');
  px(x + 1, y - 4, 1, 2, '#6d7390');
  px(x + 2, y - 4, 1, 1, '#ff9f4a');
  px(x - 2, y - 1, 1, 1, '#b04158');
  px(x, y - 1, 1, 1, '#b04158');
}

function drawBushArt(x, y) {
  px(x - 4, y - 3, 8, 4, '#2a5236');
  px(x - 5, y - 2, 10, 3, '#2a5236');
  px(x - 3, y - 4, 6, 2, '#356944');
  px(x - 1, y - 5, 3, 2, '#407c4f');
  px(x + 3, y - 3, 2, 1, '#356944');
}

/* ---------- street furniture ---------- */

function drawBenchArt(x, y) {
  ctx.globalAlpha = 0.3;
  px(x - 9, y + 2, 18, 2, P.shadow);
  ctx.globalAlpha = 1;
  px(x - 9, y - 3, 18, 2, '#8a6448');
  px(x - 9, y - 1, 18, 2, '#6b4a3a');
  px(x - 8, y - 6, 16, 2, '#8a6448');
  px(x - 8, y + 1, 2, 4, '#3a2f28');
  px(x + 6, y + 1, 2, 4, '#3a2f28');
}

function drawBinArt(x, y) {  ctx.globalAlpha = 0.3;
  px(x - 4, y + 3, 8, 2, P.shadow);
  ctx.globalAlpha = 1;
  px(x - 3, y - 4, 7, 9, '#3f6b52');
  px(x - 4, y - 6, 9, 2, '#558c6a');
  px(x - 2, y - 2, 1, 4, 'rgba(0,0,0,.18)');
  px(x + 1, y - 2, 1, 4, 'rgba(0,0,0,.18)');
}

function drawBarberPoleArt(x, y) {
  ctx.globalAlpha = 0.3;
  px(x - 3, y + 1, 8, 2, P.shadow);
  ctx.globalAlpha = 1;
  px(x - 1, y - 22, 3, 22, '#8a93b8');
  px(x - 3, y - 20, 7, 12, '#e8eefc');
  for (let i = 0; i < 4; i++) {
    px(x - 3, y - 20 + i * 3, 7, 1, '#c23a4a');
    px(x - 2, y - 19 + i * 3, 5, 1, '#2b3a7a');
  }
  px(x - 4, y - 23, 9, 3, '#c9d6ff');
  px(x - 4, y - 9, 9, 2, '#8a93b8');
  px(x + 2, y - 25, 1, 12, '#6b4a30');
  px(x + 3, y - 25, 4, 4, '#2b3a7a');
}

function drawClothesRackArt(x, y) {
  ctx.globalAlpha = 0.3;
  px(x - 10, y + 1, 20, 2, P.shadow);
  ctx.globalAlpha = 1;
  px(x - 9, y - 18, 2, 18, '#8a6448');
  px(x + 7, y - 18, 2, 18, '#8a6448');
  px(x - 10, y - 19, 20, 2, '#6b4a30');
  const cols = ['#c23a4a', '#2b3a7a', '#d9a441', '#3d7a5a', '#d98aa8'];
  for (let i = 0; i < 5; i++) {
    px(x - 8 + i * 4, y - 17, 3, 9, cols[i]);
    px(x - 8 + i * 4, y - 17, 3, 1, 'rgba(255,255,255,.3)');
  }
  px(x - 10, y - 11, 20, 1, '#6b4a30');
  // price sign
  px(x + 8, y - 22, 6, 5, '#ffd75e');
  px(x + 9, y - 21, 4, 1, '#3a2f28');
  px(x + 9, y - 19, 3, 1, '#3a2f28');
}

function drawHydrantArt(x, y) {
  px(x - 2, y - 5, 4, 6, '#b04158');
  px(x - 3, y - 2, 6, 2, '#c9526a');
  px(x - 2, y - 6, 4, 2, '#8f2f44');
  px(x - 3, y + 1, 6, 1, 'rgba(0,0,0,.3)');
}

function drawManholeArt(x, y) {
  px(x - 4, y - 1, 9, 3, '#2a3048');
  px(x - 3, y - 2, 7, 1, '#2a3048');
  px(x - 3, y + 2, 7, 1, '#2a3048');
  px(x - 2, y - 1, 5, 3, '#454b63');
  px(x - 1, y, 3, 1, '#2a3048');
}

function drawScooterArt(x, y, c) {
  ctx.globalAlpha = 0.3;
  px(x - 5, y + 2, 11, 2, P.shadow);
  ctx.globalAlpha = 1;
  px(x - 4, y - 1, 3, 3, '#20263f');
  px(x + 2, y - 1, 3, 3, '#20263f');
  px(x - 4, y - 6, 8, 4, c);
  px(x - 2, y - 9, 6, 3, c);
  px(x + 2, y - 10, 2, 5, '#c9d6ff');
  px(x - 3, y - 5, 5, 1, 'rgba(255,255,255,.35)');
}

function drawBusStopArt(x, y) {
  ctx.globalAlpha = 0.3;
  px(x - 3, y - 1, 7, 2, P.shadow);
  ctx.globalAlpha = 1;
  px(x - 1, y - 17, 2, 17, '#2a3050');
  px(x - 6, y - 25, 13, 9, '#2f4bb0');
  px(x - 5, y - 24, 11, 7, '#3b5cd0');
  px(x - 1, y - 22, 5, 4, '#e8eeff');
  px(x - 3, y - 20, 1, 1, '#2f4bb0');
  px(x + 1, y - 21, 1, 1, '#2f4bb0');
  px(x - 5, y - 17, 11, 1, 'rgba(255,255,255,.35)');
}

function drawLampPost(x, y) {
  px(x - 1, y - 14, 2, 14, '#262c48');
  px(x - 1, y - 15, 5, 2, '#262c48');
  px(x + 2, y - 14, 3, 2, '#4a5270');
  px(x + 2, y - 13, 2, 1, '#ffe9a8');
}

function drawPowerLine() {
  const poles = [
    [3.2, 7.9], [10.5, 7.9], [21.5, 7.9], [34.5, 7.9],
    [10.5, 22.9], [21.5, 22.9], [34.5, 22.9]
  ];
  poles.forEach(function (p) {
    const x = p[0] * ART;
    const y = p[1] * ART;
    px(x - 1, y - 21, 2, 21, '#3a3550');
    px(x - 3, y - 20, 7, 1, '#4a4568');
    px(x - 3, y - 17, 7, 1, '#4a4568');
    px(x - 3, y - 21, 1, 2, '#6a6488');
    px(x + 3, y - 21, 1, 2, '#6a6488');
  });
  // wires with a gentle sag
  drawWire(3.2 * ART, 7.9 * ART - 20, 10.5 * ART, 7.9 * ART - 20, 3);
  drawWire(10.5 * ART, 7.9 * ART - 20, 21.5 * ART, 7.9 * ART - 20, 4);
  drawWire(21.5 * ART, 7.9 * ART - 20, 34.5 * ART, 7.9 * ART - 20, 4);
  drawWire(10.5 * ART, 7.9 * ART - 17, 21.5 * ART, 7.9 * ART - 17, 3);
  drawWire(21.5 * ART, 7.9 * ART - 17, 34.5 * ART, 7.9 * ART - 17, 3);
  drawWire(10.5 * ART, 22.9 * ART - 20, 21.5 * ART, 22.9 * ART - 20, 4);
  drawWire(21.5 * ART, 22.9 * ART - 20, 34.5 * ART, 22.9 * ART - 20, 4);
}

function drawWire(x1, y1, x2, y2, sag) {
  for (let x = x1; x <= x2; x++) {
    const t = (x - x1) / Math.max(1, x2 - x1);
    const y = Math.round(y1 + (y2 - y1) * t + sag * 4 * t * (1 - t));
    px(x, y, 1, 1, 'rgba(8,12,26,.75)');
  }
}

function drawVendingArt(x, y) {
  ctx.globalAlpha = 0.3;
  px(x - 3, y, 9, 2, P.shadow);
  ctx.globalAlpha = 1;
  px(x - 4, y - 14, 9, 14, '#39415e');
  px(x - 3, y - 13, 7, 6, '#7dd3fc');
  px(x - 2, y - 9, 2, 1, '#ff8fb1');
  px(x + 1, y - 9, 2, 1, '#ffd75e');
  px(x - 2, y - 7, 2, 1, '#6ee7a8');
  px(x + 1, y - 7, 2, 1, '#e8eeff');
  px(x - 3, y - 5, 7, 3, '#2a3050');
  px(x - 1, y - 2, 3, 1, '#12162c');
}

function drawTrafficLight(x, y) {
  px(x - 1, y - 16, 2, 16, '#2a3050');
  px(x - 3, y - 22, 6, 10, '#1a2038');
  px(x - 2, y - 21, 4, 2, '#ff5c6c');
  px(x - 2, y - 18, 4, 2, '#5a5020');
  px(x - 2, y - 15, 4, 2, '#204a30');
  px(x - 1, y - 4, 3, 2, '#1a2038');
}

function drawPuddle(x, y, w, h) {
  px(x, y, w, h, 'rgba(70,110,150,.45)');
  px(x + 1, y - 1, w - 2, 1, 'rgba(70,110,150,.35)');
  px(x + 2, y + h, w - 4, 1, 'rgba(70,110,150,.3)');
  px(x + 2, y, Math.max(2, w - 6), 1, 'rgba(160,210,240,.25)');
}

function drawDrainArt(x, y) {
  px(x - 3, y - 1, 7, 3, '#22283c');
  px(x - 2, y, 5, 1, '#4a5370');
  px(x - 3, y, 1, 1, '#4a5370');
  px(x + 3, y, 1, 1, '#4a5370');
}

function drawPot(x, y) {
  px(x - 2, y - 4, 4, 4, '#7a4a3a');
  px(x - 3, y - 5, 6, 1, '#8f5a46');
  px(x - 2, y - 8, 3, 3, '#2f5a3a');
  px(x, y - 9, 2, 2, '#3d7d4d');
}

function drawLitter(x, y) {
  px(x, y, 2, 1, '#c9d6ff');
  px(x + 1, y + 1, 1, 1, '#9aa3c4');
}

function drawBags(x, y) {
  px(x - 3, y - 3, 5, 4, '#5a5f75');
  px(x - 2, y - 4, 3, 1, '#6d7390');
  px(x + 2, y - 2, 3, 3, '#4a4f64');
}

function drawMailbox(x, y) {
  px(x - 1, y - 6, 1, 6, '#3a3550');
  px(x - 3, y - 10, 6, 4, '#b04158');
  px(x - 2, y - 9, 4, 1, '#e85c6c');
}

function drawBikeArt(x, y) {
  px(x - 4, y - 3, 3, 3, '#2a3050');
  px(x + 2, y - 3, 3, 3, '#2a3050');
  px(x - 2, y - 4, 4, 1, '#7dd3fc');
  px(x - 4, y - 5, 1, 2, '#7dd3fc');
  px(x + 3, y - 5, 1, 2, '#7dd3fc');
  px(x - 1, y - 5, 3, 1, '#7dd3fc');
}

function drawVendorArt(x, y) {
  ctx.globalAlpha = 0.3;
  px(x - 10, y + 1, 20, 2, P.shadow);
  ctx.globalAlpha = 1;
  px(x - 9, y - 7, 18, 8, '#8a6448');
  px(x - 9, y - 9, 18, 3, '#a67c5a');
  px(x - 8, y - 6, 16, 1, 'rgba(0,0,0,.18)');
  px(x - 8, y + 1, 2, 3, '#2a3050');
  px(x + 6, y + 1, 2, 3, '#2a3050');
  px(x - 1, y - 20, 2, 12, '#2a3050');
  // striped umbrella
  for (let i = 0; i < 14; i++) {
    px(x - 14 + i * 2, y - 22, 2, 1, i % 2 ? '#ffd75e' : '#e85c6c');
  }
  for (let i = 0; i < 7; i++) {
    px(x - 12 + i * 2, y - 21, 2, 1, i % 2 ? '#e85c6c' : '#ffd75e');
  }
  // goods
  px(x - 7, y - 11, 3, 2, '#6ee7a8');
  px(x - 3, y - 11, 3, 2, '#ff8fb1');
  px(x + 1, y - 11, 3, 2, '#7dd3fc');
}

/* ---------- Yaowarat night-market detail pass ---------- */

const YAOWARAT_CANOPY = [
  { a: '#b83b3b', b: '#e05a4a', c: '#6e1f26', sign: '#ffd75e' },
  { a: '#b8862f', b: '#e0b04a', c: '#6e4a18', sign: '#ffe9a8' },
  { a: '#2f7d62', b: '#4fb08a', c: '#1b4a39', sign: '#d7ffe9' },
  { a: '#8a3f68', b: '#c05a8e', c: '#4f233c', sign: '#ffd0e6' },
  { a: '#3f5f9a', b: '#5f82c0', c: '#22355c', sign: '#d7e8ff' },
  { a: '#a34a2a', b: '#d06a3f', c: '#5c2818', sign: '#ffe0b0' }
];

function drawYaowaratArt(flat) {
  const stalls = YAOWARAT_STALLS.slice().sort(function (a, b) { return a[1] - b[1]; });
  stalls.forEach(function (s) {
    drawYaowaratStall(Math.round(s[0] * ART), Math.round(s[1] * ART), s[2], flat);
  });
  drawYaowaratLanterns(flat);
  YAOWARAT_NEON.forEach(function (n) {
    drawYaowaratNeon(Math.round(n[0] * ART), Math.round(n[1] * ART), n[2], n[3], flat);
  });
  drawYaowaratFacades(flat);
  const clutter = YAOWARAT_CLUTTER.slice().sort(function (a, b) { return a[2] - b[2]; });
  YAOWARAT_TABLES.forEach(function (t) {
    drawYaowaratTables(Math.round(t[0] * ART), Math.round(t[1] * ART));
  });
  YAOWARAT_LOCALS.forEach(function (l) {
    drawYaowaratLocal(Math.round(l[0] * ART), Math.round(l[1] * ART), l[2]);
  });
  clutter.forEach(function (c) {
    drawYaowaratClutter(Math.round(c[1] * ART), Math.round(c[2] * ART), c[0], flat);
  });
  drawYaowaratWet(flat);
}

function drawYaowaratStall(cx, cy, variant, flat) {
  if (variant % 3 === 1) { drawYaowaratUmbrellaStall(cx, cy, variant, flat); return; }
  if (variant % 3 === 2) { drawYaowaratTableStall(cx, cy, variant, flat); return; }
  const p = YAOWARAT_CANOPY[variant % YAOWARAT_CANOPY.length];
  ctx.globalAlpha = 0.34;
  px(cx - 12, cy + 1, 25, 3, P.shadow);
  ctx.globalAlpha = 1;

  if (flat) {
    px(cx - 12, cy - 8, 24, 12, p.c);
    px(cx - 11, cy - 7, 22, 10, p.a);
    for (let i = 0; i < 11; i += 2) px(cx - 11 + i * 2, cy - 7, 2, 10, p.b);
    px(cx - 11, cy - 7, 22, 1, 'rgba(255,255,255,.30)');
    px(cx - 7, cy - 5, 6, 4, p.sign);
    px(cx + 1, cy - 5, 5, 4, p.c);
    px(cx - 9, cy + 2, 18, 4, '#3d3a48');
    px(cx - 7, cy + 3, 4, 2, '#c9d0e0');
    px(cx - 1, cy + 3, 4, 2, p.sign);
    px(cx - 13, cy + 4, 3, 2, '#7a4a3a');
    px(cx + 10, cy + 4, 3, 2, '#7a4a3a');
    return;
  }

  // poles and canopy frame
  px(cx - 12, cy - 29, 1, 26, '#342b28');
  px(cx + 11, cy - 29, 1, 26, '#342b28');
  px(cx - 14, cy - 31, 29, 4, p.c);
  px(cx - 14, cy - 28, 29, 8, p.a);
  for (let i = 0; i < 14; i += 2) px(cx - 13 + i * 2, cy - 28, 2, 7, p.b);
  px(cx - 13, cy - 28, 27, 1, 'rgba(255,255,255,.32)');
  // scalloped canopy edge
  for (let i = 0; i < 14; i += 2) px(cx - 13 + i * 2, cy - 20, 2, 1, p.c);
  // center logo panel
  px(cx - 4, cy - 26, 8, 5, p.c);
  px(cx - 3, cy - 25, 6, 3, p.sign);
  px(cx - 2, cy - 24, 4, 1, p.c);
  // hanging menu strips
  for (let i = 0; i < 2; i++) {
    px(cx - 9 + i * 14, cy - 19, 5, 5, '#e7e0cc');
    px(cx - 8 + i * 14, cy - 18, 3, 1, '#3a3a46');
    px(cx - 8 + i * 14, cy - 16, 2, 1, '#b04158');
  }

  // cart body + glass display + food trays
  px(cx - 11, cy - 14, 23, 14, '#2c2b38');
  px(cx - 10, cy - 13, 21, 4, '#4a4a5e');
  px(cx - 10, cy - 13, 21, 1, '#8a93b8');
  px(cx - 9, cy - 9, 19, 5, '#7a7f96');
  px(cx - 8, cy - 8, 5, 3, '#ffcf6a');
  px(cx - 2, cy - 8, 6, 3, '#d8654a');
  px(cx + 5, cy - 8, 3, 3, '#6ee7a8');
  px(cx - 9, cy - 9, 19, 1, 'rgba(255,255,255,.45)');
  px(cx - 9, cy - 4, 19, 1, '#1e1d28');
  px(cx - 10, cy - 3, 21, 1, '#15141c');
  px(cx - 9, cy - 2, 4, 2, '#12121a');
  px(cx + 5, cy - 2, 4, 2, '#12121a');
  px(cx - 10, cy + 1, 21, 1, '#0e0d14');

  // pots / steam pot / bulb
  px(cx - 8, cy - 19, 6, 4, '#24232e');
  px(cx - 7, cy - 20, 4, 1, '#c9d0e0');
  px(cx - 7, cy - 19, 4, 1, '#4a2a22');
  px(cx + 1, cy - 19, 8, 4, '#3a3a46');
  px(cx + 2, cy - 19, 6, 1, '#ffb45c');
  px(cx + 9, cy - 24, 1, 5, '#342b28');
  px(cx + 8, cy - 20, 3, 2, '#ffe9a8');
  // red lantern at canopy corner
  px(cx + 10, cy - 24, 1, 2, '#342b28');
  px(cx + 9, cy - 22, 3, 4, '#c92f3e');
  px(cx + 9, cy - 22, 3, 1, '#ffd75e');
  px(cx + 10, cy - 18, 1, 2, '#ffd75e');

  // stools
  const stoolCols = ['#b83b3b', '#3f6f9a', '#2f7d62'];
  for (let i = 0; i < 3; i++) {
    const sx = cx - 13 + i * 6;
    px(sx, cy + 4, 4, 1, stoolCols[(variant + i) % stoolCols.length]);
    px(sx + 1, cy + 5, 1, 2, '#2a2a34');
    px(sx + 3, cy + 5, 1, 2, '#2a2a34');
  }
}

function drawYaowaratUmbrellaStall(cx, cy, variant, flat) {
  const p = YAOWARAT_CANOPY[(variant + 1) % YAOWARAT_CANOPY.length];
  ctx.globalAlpha = 0.32;
  px(cx - 10, cy + 1, 21, 3, P.shadow);
  ctx.globalAlpha = 1;
  if (flat) {
    px(cx - 10, cy - 8, 21, 10, p.c);
    px(cx - 9, cy - 7, 19, 8, p.a);
    for (let i = 0; i < 9; i += 2) px(cx - 9 + i * 2, cy - 7, 2, 8, p.b);
    px(cx - 6, cy + 1, 12, 4, '#3d3a48');
    px(cx - 4, cy + 2, 3, 2, p.sign);
    return;
  }
  // pole
  px(cx, cy - 29, 1, 28, '#342b28');
  // umbrella dome
  px(cx - 12, cy - 29, 25, 3, p.c);
  px(cx - 11, cy - 27, 23, 4, p.a);
  px(cx - 9, cy - 24, 19, 3, p.b);
  px(cx - 6, cy - 22, 13, 2, p.a);
  for (let i = 0; i < 12; i += 3) px(cx - 10 + i * 2, cy - 27, 1, 8, p.c);
  for (let i = 0; i < 12; i += 2) px(cx - 11 + i * 2, cy - 21, 1, 1, p.c);
  // small cart
  px(cx - 8, cy - 14, 17, 13, '#2c2b38');
  px(cx - 7, cy - 13, 15, 4, '#4a4a5e');
  px(cx - 7, cy - 9, 15, 4, '#7a7f96');
  px(cx - 5, cy - 8, 4, 2, '#ffcf6a');
  px(cx, cy - 8, 4, 2, '#d8654a');
  px(cx - 7, cy - 3, 15, 1, '#15141c');
  px(cx - 6, cy - 2, 3, 2, '#12121a');
  px(cx + 4, cy - 2, 3, 2, '#12121a');
  // pot + bulb
  px(cx - 6, cy - 18, 5, 4, '#24232e');
  px(cx - 5, cy - 18, 3, 1, '#4a2a22');
  px(cx + 7, cy - 20, 3, 2, '#ffe9a8');
  px(cx + 8, cy - 23, 1, 3, '#342b28');
  // stools
  px(cx - 10, cy + 4, 4, 1, '#b83b3b');
  px(cx - 6, cy + 4, 4, 1, '#3f6f9a');
}

function drawYaowaratTableStall(cx, cy, variant, flat) {
  const p = YAOWARAT_CANOPY[(variant + 2) % YAOWARAT_CANOPY.length];
  ctx.globalAlpha = 0.30;
  px(cx - 11, cy + 1, 23, 3, P.shadow);
  ctx.globalAlpha = 1;
  if (!flat) {
    // simple awning on two poles
    px(cx - 12, cy - 24, 25, 3, p.c);
    px(cx - 12, cy - 21, 25, 5, p.a);
    for (let i = 0; i < 12; i += 2) px(cx - 11 + i * 2, cy - 21, 2, 4, p.b);
    px(cx - 11, cy - 18, 1, 20, '#342b28');
    px(cx + 10, cy - 18, 1, 20, '#342b28');
  }
  // plastic tables + stools
  px(cx - 10, cy - 6, 10, 6, '#c9d0e0');
  px(cx - 9, cy - 5, 8, 1, '#7d86a8');
  px(cx + 1, cy - 1, 10, 6, '#c9d0e0');
  px(cx + 2, cy, 8, 1, '#7d86a8');
  // food trays/bottles
  px(cx - 8, cy - 8, 3, 2, '#ffcf6a');
  px(cx - 4, cy - 8, 2, 2, '#d8654a');
  px(cx + 4, cy - 3, 2, 2, '#6ee7a8');
  px(cx + 7, cy - 3, 2, 2, '#ffd75e');
  // stools
  const cols = ['#b83b3b', '#3f6f9a', '#2f7d62'];
  [[-12, -4], [-12, 1], [10, -4], [10, 1], [-1, 5], [5, 5]].forEach(function (o, i) {
    px(cx + o[0], cy + o[1], 3, 1, cols[i % 3]);
    px(cx + o[0] + 1, cy + o[1] + 1, 1, 2, '#2a2a34');
  });
  // sign
  px(cx - 5, cy - 13, 11, 4, '#e7e0cc');
  px(cx - 4, cy - 12, 3, 1, '#3a3a46');
  px(cx, cy - 12, 4, 1, '#b04158');
  px(cx + 2, cy - 10, 2, 1, '#3a3a46');
}

function drawYaowaratLocal(cx, cy, variant) {
  const shirts = ['#d8654a', '#3f6f9a', '#6ee7a8', '#ffd75e'];
  const skin = ['#e8b48a', '#c98d63', '#f0c9a0'][variant % 3];
  const shirt = shirts[variant % shirts.length];
  ctx.globalAlpha = 0.28;
  px(cx - 3, cy + 2, 7, 2, P.shadow);
  ctx.globalAlpha = 1;
  // legs
  px(cx - 2, cy - 1, 2, 4, '#2a2a34');
  px(cx + 1, cy - 1, 2, 4, '#2a2a34');
  // body
  px(cx - 3, cy - 8, 7, 7, shirt);
  px(cx - 3, cy - 8, 7, 1, 'rgba(255,255,255,.25)');
  px(cx - 4, cy - 7, 1, 4, shirt);
  px(cx + 4, cy - 7, 1, 4, shirt);
  // head
  px(cx - 2, cy - 12, 5, 4, skin);
  px(cx - 2, cy - 12, 5, 1, '#2a2230');
  px(cx - 1, cy - 10, 1, 1, '#2a2230');
  px(cx + 2, cy - 10, 1, 1, '#2a2230');
  // bag / umbrella
  if (variant % 2 === 0) {
    px(cx + 4, cy - 6, 3, 4, '#6b4a2f');
    px(cx + 5, cy - 7, 1, 1, '#8f6642');
  } else {
    px(cx - 6, cy - 11, 1, 10, '#3a3348');
    px(cx - 8, cy - 12, 5, 2, variant % 3 === 0 ? '#e05a4a' : '#3f6f9a');
  }
}

function drawYaowaratShopfront(h, flat) {
  const x = h.x * ART;
  const y = h.y * ART;
  const w = h.w * ART;
  const cols = ['#b83b3b', '#2f7d62', '#3f5f9a', '#b8862f'];
  const color = cols[(h.x + h.y) % cols.length];
  if (flat) {
    px(x + 1, y - 5, w - 2, 4, color);
    px(x + 2, y - 4, w - 4, 2, 'rgba(255,255,255,.18)');
    px(x + 4, y - 8, w - 8, 3, '#241d30');
    px(x + 5, y - 7, Math.floor((w - 10) / 3), 1, color);
    return;
  }
  // awning over the sidewalk
  px(x, y - 8, w, 4, color);
  px(x, y - 8, w, 1, 'rgba(255,255,255,.35)');
  for (let i = 2; i < w - 2; i += 4) px(x + i, y - 7, 2, 3, 'rgba(0,0,0,.16)');
  px(x, y - 4, w, 1, 'rgba(0,0,0,.4)');
  // sign board
  px(x + 3, y - 15, w - 6, 5, '#241d30');
  px(x + 4, y - 14, w - 8, 3, color);
  px(x + 5, y - 13, Math.floor((w - 10) / 3), 1, '#241d30');
  px(x + 5 + Math.floor((w - 10) / 3) + 2, y - 13, 2, 1, '#241d30');
  // windows + door
  px(x + 2, y + 1, 5, 6, '#ffe9a8');
  px(x + 3, y + 2, 1, 4, '#3a3348');
  px(x + 5, y + 2, 1, 4, '#3a3348');
  px(x + w - 7, y + 1, 5, 6, '#ffd75e');
  px(x + w - 6, y + 2, 1, 4, '#3a3348');
  px(x + w - 4, y + 2, 1, 4, '#3a3348');
  px(x + Math.floor(w / 2) - 2, y + 1, 4, 8, '#1a2038');
  px(x + Math.floor(w / 2) - 1, y + 2, 2, 6, '#252c4a');
  // hanging lanterns under the awning
  for (let i = 0; i < 3; i++) {
    const lx = x + 4 + i * Math.floor((w - 8) / 2);
    px(lx, y - 4, 1, 3, '#3a3348');
    px(lx - 1, y - 1, 3, 3, '#c92f3e');
    px(lx, y - 1, 1, 1, '#ffd75e');
  }
}

function drawYaowaratTables(cx, cy) {
  ctx.globalAlpha = 0.28;
  px(cx - 13, cy + 1, 27, 2, P.shadow);
  ctx.globalAlpha = 1;
  px(cx - 12, cy - 6, 10, 6, '#b9c2d6');
  px(cx - 12, cy - 6, 10, 1, '#e7eeff');
  px(cx, cy - 3, 10, 6, '#b9c2d6');
  px(cx, cy - 3, 10, 1, '#e7eeff');
  const cols = ['#b83b3b', '#3f6f9a', '#2f7d62'];
  [[-14, -2], [-14, 3], [-2, -8], [-2, 3]].forEach(function (o, i) {
    px(cx + o[0], cy + o[1], 3, 1, cols[i % 3]);
    px(cx + o[0] + 1, cy + o[1] + 1, 1, 2, '#2a2a34');
  });
  px(cx - 8, cy - 8, 2, 2, '#ffcf6a');
  px(cx - 4, cy - 8, 2, 2, '#d8654a');
  px(cx + 4, cy - 5, 2, 2, '#6ee7a8');
}


function drawYaowaratLanterns(flat) {
  const drawString = function (yTile, count, span, big) {
    const y = Math.round(yTile * ART);
    const x0 = Math.round(14.0 * ART);
    const x1 = Math.round(29.4 * ART);
    for (let x = x0; x <= x1; x++) {
      const sag = Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * (big ? 3 : 2));
      px(x, y + sag, 1, 1, '#2a2230');
    }
    for (let k = 0; k < count; k++) {
      const lx = Math.round((14.8 + k * span) * ART);
      const sag = Math.round(Math.sin(((lx - x0) / (x1 - x0)) * Math.PI) * (big ? 3 : 2));
      const ly = y + sag + 1;
      px(lx, ly, 1, 2, '#2a2230');
      px(lx - 1, ly + 2, 3, 1, '#ffd75e');
      px(lx - 1, ly + 3, 3, big ? 5 : 4, k % 2 ? '#e05a4a' : '#c92f3e');
      px(lx, ly + 3, 1, big ? 3 : 2, 'rgba(255,255,255,.30)');
      px(lx, ly + (big ? 8 : 7), 1, 2, '#ffd75e');
      if (!flat) px(lx, ly + (big ? 10 : 9), 1, 1, '#c92f3e');
    }
  };
  drawString(20.15, 6, 2.8, false);
  drawString(22.62, 7, 2.35, true);
}

function drawYaowaratNeon(cx, cy, color, variant, flat) {
  // pole/base on the sidewalk
  px(cx, cy - 2, 2, 2, '#2a2230');
  if (flat) {
    px(cx - 2, cy - 2, 5, 2, color);
    px(cx - 1, cy - 1, 3, 1, 'rgba(255,255,255,.6)');
    return;
  }
  // board
  px(cx - 4, cy - 22, 9, 21, '#15121f');
  px(cx - 3, cy - 21, 7, 19, color);
  px(cx - 2, cy - 20, 5, 17, color);
  px(cx - 3, cy - 21, 7, 1, 'rgba(255,255,255,.80)');
  px(cx - 3, cy - 3, 7, 1, 'rgba(0,0,0,.35)');
  // projecting horizontal sign
  if (variant % 2 === 0) {
    px(cx - 9, cy - 25, 13, 6, color);
    px(cx - 8, cy - 24, 11, 4, color);
    px(cx - 7, cy - 23, 3, 1, '#241d30');
    px(cx - 2, cy - 23, 4, 1, '#241d30');
    px(cx - 6, cy - 21, 3, 1, '#241d30');
    px(cx - 9, cy - 25, 13, 1, 'rgba(255,255,255,.55)');
  }
  // pseudo lettering bars
  const bars = variant % 2 === 0 ? 4 : 5;
  for (let i = 0; i < bars; i++) {
    const by = cy - 19 + i * 3;
    px(cx - 2, by, i % 3 === 0 ? 4 : 2, 1, '#241d30');
    if (i % 2 === 0) px(cx + 1, by, 1, 1, 'rgba(255,255,255,.85)');
  }
  // small icon
  px(cx - 1, cy - 18, 3, 2, '#241d30');
  // bracket
  px(cx - 4, cy - 23, 9, 1, '#3a3348');
  px(cx, cy - 24, 1, 2, '#3a3348');
}

function drawYaowaratFacades(flat) {
  const inYaowarat = function (x, y) { return x >= 14 && x < 30 && y >= 19 && y < 28; };
  HOUSES.forEach(function (h) {
    if (!inYaowarat(h.x, h.y)) return;
    if (h.y >= 22 && h.y <= 24) drawYaowaratShopfront(h, flat);
    const x = h.x * ART;
    const y = h.y * ART;
    const w = h.w * ART;
    const hh = h.h * ART;
    // roof tank
    px(x + 3, y + 3, 7, 4, '#3d4560');
    px(x + 4, y + 4, 5, 2, '#7d86a8');
    px(x + 4, y + 7, 5, 1, '#2a3048');
    // antenna
    px(x + w - 6, y - 4, 1, 8, '#8a93b8');
    px(x + w - 9, y - 4, 7, 1, '#8a93b8');
    if (flat) return;
    // wall AC + pipe + laundry
    const wallY = y + hh - 12;
    px(x + w - 13, wallY + 1, 5, 3, '#c9d0e0');
    px(x + w - 12, wallY + 2, 3, 1, '#7d86a8');
    px(x + w - 15, wallY, 1, 12, '#6a6f86');
    px(x + 5, wallY + 5, 10, 1, '#3a3348');
    const cloth = ['#e05a4a', '#ffd75e', '#6ee7a8'];
    for (let i = 0; i < 3; i++) px(x + 6 + i * 3, wallY + 6, 2, 3, cloth[i]);
  });
  BUILDINGS.forEach(function (b) {
    if (!inYaowarat(b.x, b.y)) return;
    const x = b.x * ART;
    const y = b.y * ART;
    const w = b.w * ART;
    if (!flat) {
      px(x + w - 10, y + 4, 1, 12, '#8a93b8');
      px(x + w - 13, y + 14, 7, 1, '#8a93b8');
    }
  });
}

function drawYaowaratClutter(x, y, kind, flat) {
  if (kind === 'crate') {
    px(x - 4, y - 5, 8, 5, '#6b4a2f');
    px(x - 4, y - 5, 8, 1, '#8f6642');
    px(x - 3, y - 3, 6, 1, '#3f2a1b');
  } else if (kind === 'gas') {
    px(x - 2, y - 6, 4, 5, '#c9d0e0');
    px(x - 2, y - 6, 4, 1, '#7d86a8');
    px(x - 1, y - 7, 2, 1, '#3a3a46');
  } else if (kind === 'bags') {
    px(x - 3, y - 4, 7, 4, '#22212a');
    px(x - 2, y - 5, 4, 2, '#34333e');
    px(x + 2, y - 3, 3, 3, '#1a1922');
  } else if (kind === 'bucket') {
    px(x - 2, y - 3, 4, 3, '#3f6f9a');
    px(x - 2, y - 4, 4, 1, '#7dd3fc');
  } else if (kind === 'menu') {
    px(x - 2, y - 10, 5, 9, '#e7e0cc');
    px(x - 1, y - 9, 3, 1, '#3a3a46');
    px(x - 1, y - 7, 3, 1, '#3a3a46');
    px(x - 1, y - 5, 2, 1, '#b04158');
    px(x - 1, y - 2, 3, 1, '#3a3a46');
    px(x, y - 1, 1, 2, '#3a3348');
  } else if (kind === 'coil') {
    px(x - 3, y - 3, 7, 2, '#2a2230');
    px(x - 3, y - 1, 7, 1, '#4a4058');
    px(x - 1, y - 4, 3, 1, '#2a2230');
  }
}

function drawYaowaratWet(flat) {
  // neon reflections on the wet road
  const streaks = [
    [15.2, '#ff5c6c'], [17.4, '#ffd75e'], [20.0, '#4ade80'],
    [23.2, '#ff8f3f'], [26.0, '#ff5c6c'], [28.4, '#ffd75e']
  ];
  streaks.forEach(function (s, i) {
    const x = Math.round(s[0] * ART);
    const y = Math.round((20.35 + (i % 3) * 0.28) * ART);
    ctx.globalAlpha = flat ? 0.14 : 0.22;
    px(x - 4, y, 9, 1, s[1]);
    px(x - 1, y + 1, 5, 1, s[1]);
    ctx.globalAlpha = 1;
  });
  drawPuddle(18.4 * ART, 20.7 * ART, 7, 2);
  drawPuddle(26.8 * ART, 21.4 * ART, 6, 2);
}



function drawCityDynamic(flat) {
  drawPondRipples();
  if (!flat) drawWindowGlow();
  drawLampGlow();
  drawYaowaratDynamic(flat);
}

function drawPondRipples() {
  const x = POND.x * ART;
  const y = POND.y * ART;
  for (let i = 0; i < 3; i++) {
    const yy = y + 9 + i * 7 + Math.round(Math.sin(anim * 1.4 + i) * 1);
    px(x + 6 + i * 8, yy, 12 - i * 2, 1, 'rgba(160,225,255,.35)');
  }
}

function drawWindowGlow() {
  const l = lightState();
  const night = l[1];
  if (night <= 0.15) return;
  ctx.globalAlpha = Math.min(0.85, night * 1.15);
  winGlows.forEach(function (g) {
    px(g[0] + 1, g[1] + 1, g[2] - 2, g[3] - 2, 'rgba(255,226,160,.5)');
    px(g[0] + Math.floor(g[2] / 2) - 1, g[1] + 1, 2, 2, '#fff2c0');
  });
  ctx.globalAlpha = 1;
}

function drawGlowPool(x, y, rx, ry, color, alpha) {
  for (let i = 0; i < ry; i++) {
    const t = i / ry;
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)));
    ctx.globalAlpha = alpha * (1 - t);
    px(x - w, y + i, w * 2, 1, color);
  }
  ctx.globalAlpha = 1;
}

function drawLampGlow() {
  const l = lightState();
  const night = l[1];
  if (night <= 0.15) return;
  LIGHTS.forEach(function (pt) {
    const x = Math.round(pt[0] * ART);
    const y = Math.round(pt[1] * ART);
    ctx.globalAlpha = Math.min(0.55, night * 0.8);
    px(x + 2, y - 14, 3, 3, '#ffe9a8');
    ctx.globalAlpha = 1;
    drawGlowPool(x + 2, y - 2, 15, 7, '#ffe9a8', Math.min(0.20, night * 0.3));
  });
  DISTRICTS.forEach(function (d) {
    if (d.id !== 'yaowarat' && d.id !== 'silom' && d.id !== 'pathumwan' && d.id !== 'chula') return;
    const x = Math.round(d.spot[0] * ART);
    const y = Math.round(d.spot[1] * ART);
    drawGlowPool(x, y - 2, 18, 8, d.accent, Math.min(0.16, night * 0.24));
    if (d.id === 'yaowarat') {
      px(x - 8, y - 10, 2, 2, '#ffd75e');
      px(x + 6, y - 8, 2, 2, '#ff5c6c');
    }
  });
}

function yaowaratInView(mapView) {
  if (mapView) return true;
  const d = districtById('yaowarat');
  if (!d) return false;
  const rx = d.rect[0] * ART;
  const ry = d.rect[1] * ART;
  const rw = d.rect[2] * ART;
  const rh = d.rect[3] * ART;
  const camAx = Math.round(cam.x / W2A);
  const camAy = Math.round(cam.y / W2A);
  return !(camAx + AW < rx - 8 || camAx > rx + rw + 8 || camAy + AH < ry - 8 || camAy > ry + rh + 8);
}

function drawYaowaratDynamic(flat) {
  if (!yaowaratInView(flat)) return;
  const night = lightState()[1];

  // steam from food pots
  if (!flat) {
    YAOWARAT_STALLS.forEach(function (s, i) {
      if (i % 2 === 0) return;
      const cx = s[0] * ART;
      const cy = s[1] * ART;
      for (let k = 0; k < 2; k++) {
        const t = (anim * 0.32 + i * 0.21 + k * 0.35) % 1;
        const sy = cy - 19 - t * 11;
        const sx = cx - 3 + Math.sin(anim * 2.1 + i + k) * 2;
        ctx.globalAlpha = (1 - t) * 0.24;
        px(Math.round(sx), Math.round(sy), 3, 2, '#e6e6f2');
        ctx.globalAlpha = 1;
      }
    });
  }

  if (night <= 0.15) {
    if (flat) return;
    // faint daylight reflections
    ctx.globalAlpha = 0.10;
    px(18.2 * ART, 20.6 * ART, 8, 1, '#ffd75e');
    px(26.4 * ART, 21.2 * ART, 7, 1, '#ff8f3f');
    ctx.globalAlpha = 1;
    return;
  }

  // warm ambient wash over the market
  if (!flat) {
    ctx.globalAlpha = Math.min(0.13, night * 0.17);
    px(14 * ART, 19 * ART, 16 * ART, 3.4 * ART, '#ffb45c');
    ctx.globalAlpha = 1;
    // warm bulbs under canopies
    YAOWARAT_STALLS.forEach(function (s) {
      drawGlowPool(Math.round(s[0] * ART), Math.round(s[1] * ART) - 7, 11, 6, '#ffd9a0', Math.min(0.20, night * 0.24));
    });
  }

  // neon glow pools + flicker
  YAOWARAT_NEON.forEach(function (n, i) {
    const x = Math.round(n[0] * ART);
    const y = Math.round(n[1] * ART);
    const fl = 0.66 + 0.34 * Math.sin(anim * 4.2 + i * 1.7);
    const drop = Math.sin(anim * 1.9 + i * 2.7) > 0.965 ? 0.35 : 1;
    const alpha = Math.min(0.42, night * 0.48) * fl * drop;
    drawGlowPool(x, y - 4, 16, 9, n[2], alpha);
    ctx.globalAlpha = Math.min(0.9, night * 1.1) * drop;
    px(x - 1, y - 20, 3, 2, n[2]);
    px(x - 2, y - 17, 5, 1, n[2]);
    ctx.globalAlpha = 1;
  });

  // warm lantern glow (two strings)
  for (let k = 0; k < 7; k++) {
    const lx = (14.8 + k * 2.35) * ART;
    const ly = (22.62 + 0.06) * ART;
    drawGlowPool(Math.round(lx), Math.round(ly), 6, 4, '#ff7a5c', Math.min(0.24, night * 0.30));
  }
  for (let k = 0; k < 6; k++) {
    const lx = (14.8 + k * 2.8) * ART;
    const ly = 20.15 * ART + 5;
    drawGlowPool(Math.round(lx), Math.round(ly), 5, 3, '#ff7a5c', Math.min(0.18, night * 0.24));
  }

  // shimmering wet reflections
  for (let i = 0; i < 6; i++) {
    const x = (15.2 + i * 2.4) * ART;
    const y = (20.3 + (i % 3) * 0.28) * ART;
    const wob = Math.round(Math.sin(anim * 1.6 + i) * 2);
    ctx.globalAlpha = Math.min(0.30, night * 0.34);
    px(Math.round(x + wob), Math.round(y), 8, 1, ['#ff5c6c', '#ffd75e', '#4ade80', '#ff8f3f', '#ff5c6c', '#ffd75e'][i]);
    ctx.globalAlpha = 1;
  }
}

function drawCarArt(c) {
  const x = Math.round(c.x / W2A);
  const y = Math.round(c.y / W2A);
  const dir = c.dir >= 0 ? 1 : -1;

  // shadow under the whole car
  ctx.globalAlpha = 0.30;
  if (c.axis === 'h') px(x - 16, y - 5, 32, 12, P.shadow);
  else px(x - 5, y - 16, 12, 32, P.shadow);
  ctx.globalAlpha = 1;

  if (c.shoutUntil > anim) {
    px(x - 1, y - 27, 2, 7, '#ff5c6c');
    px(x - 1, y - 19, 2, 2, '#ff5c6c');
  }

  if (c.axis === 'h') {
    // top-down: 30x12 art px (car > player)
    px(x - 15, y - 6, 30, 12, c.color);
    px(x - 15, y - 6, 30, 1, 'rgba(255,255,255,.32)');
    px(x - 15, y + 5, 30, 1, 'rgba(0,0,0,.28)');
    // side mirrors
    px(x + dir * 5, y - 8, 3, 2, c.color);
    px(x + dir * 5, y + 6, 3, 2, c.color);
    // wheels (front/rear pairs)
    px(x - 10, y - 7, 4, 2, '#12162c');
    px(x + 7, y - 7, 4, 2, '#12162c');
    px(x - 10, y + 5, 4, 2, '#12162c');
    px(x + 7, y + 5, 4, 2, '#12162c');
    // roof + glass
    px(x - 6, y - 4, 12, 8, '#1a2038');
    px(x - 5, y - 3, 10, 6, '#2a3150');
    px(x - 3, y - 3, 6, 1, 'rgba(125,211,252,.35)');
    // windshield near front, rear window near back
    px(x + dir * 3, y - 4, 4, 8, '#7dd3fc');
    px(x - dir * 9, y - 4, 3, 8, '#141a30');
    // headlights / taillights
    px(x + dir * 13, y - 5, 2, 3, '#fff2b0');
    px(x + dir * 13, y + 2, 2, 3, '#fff2b0');
    px(x - dir * 14, y - 5, 2, 3, '#ff5c6c');
    px(x - dir * 14, y + 2, 2, 3, '#ff5c6c');
  } else {
    // top-down: 12x30 art px — front/back clearly visible
    px(x - 6, y - 15, 12, 30, c.color);
    px(x - 6, y - 15, 1, 30, 'rgba(255,255,255,.32)');
    px(x + 5, y - 15, 1, 30, 'rgba(0,0,0,.28)');
    // side mirrors
    px(x - 8, y + dir * 5, 2, 3, c.color);
    px(x + 6, y + dir * 5, 2, 3, c.color);
    // wheels (front/rear pairs)
    px(x - 7, y - 10, 2, 4, '#12162c');
    px(x - 7, y + 7, 2, 4, '#12162c');
    px(x + 5, y - 10, 2, 4, '#12162c');
    px(x + 5, y + 7, 2, 4, '#12162c');
    // roof + glass
    px(x - 4, y - 6, 8, 12, '#1a2038');
    px(x - 3, y - 5, 6, 10, '#2a3150');
    px(x - 3, y - 3, 1, 6, 'rgba(125,211,252,.35)');
    // windshield near front, rear window near back
    px(x - 4, y + dir * 3, 8, 4, '#7dd3fc');
    px(x - 4, y - dir * 9, 8, 3, '#141a30');
    // headlights / taillights
    px(x - 5, y + dir * 13, 3, 2, '#fff2b0');
    px(x + 2, y + dir * 13, 3, 2, '#fff2b0');
    px(x - 5, y - dir * 14, 3, 2, '#ff5c6c');
    px(x + 2, y - dir * 14, 3, 2, '#ff5c6c');
  }
}

function drawPedArt(p) {
  const x = Math.round(p.x / W2A);
  const y = Math.round(p.y / W2A);
  const bob = Math.sin(p.phase) > 0 ? 1 : 0;
  shadowBlob(x, y - 1, 8);

  px(x - 2, y - 6 + bob, 2, 6, '#20263f');
  px(x + 1, y - 6 - bob, 2, 6, '#20263f');
  px(x - 3, y - 13 + bob, 6, 7, p.color);
  px(x - 3, y - 13 + bob, 6, 1, 'rgba(255,255,255,.2)');
  px(x - 4, y - 12 + bob, 1, 4, p.color);
  px(x + 3, y - 12 + bob, 1, 4, p.color);
  px(x - 3, y - 18 + bob, 6, 5, '#f0c9a0');
  px(x - 3, y - 19 + bob, 6, 2, '#161a2e');
  if (p.dir >= 0) px(x + 1, y - 16 + bob, 1, 1, '#12142a');
  else px(x - 2, y - 16 + bob, 1, 1, '#12142a');
  // shoulder bag
  px(x - (p.dir >= 0 ? 5 : 4), y - 11 + bob, 2, 4, '#4a5270');
}

/* ---------- ตัวละคร 32px (Phase 2) ---------- */

function playerLook32(): HumanLook {
  const app = life.appearance || Look.DEFAULT_APPEARANCE;
  const ac = Look.appearanceColors(app, ageYears());
  return {
    skin: ac.skin,
    skinDark: ac.skinDark,
    hair: ac.hair,
    hairDark: ac.hairDark,
    clothes: ac.clothes,
    clothesShade: ac.clothesShade,
    clothesDark: ac.clothesDark,
    eye: ac.eye,
    pants: '#2b3350',
    hat: !!ac.hat,
    glasses: app.glasses !== 'none',
    hairStyle: app.hair
  };
}

function drawPlayerArt32() {
  const x = Math.round(player.x / W2A_OUT);
  const y = Math.round(player.y / W2A_OUT);
  drawHuman32(ctx, x, y, playerLook32(), {
    dir: player.dir,
    moving: player.moving,
    phase: player.frame * 3
  });
}

function npcLook32(n): HumanLook {
  const c = n.type.color;
  return {
    skin: '#f0c9a0',
    skinDark: '#d9a97c',
    hair: '#161a2e',
    hairDark: '#0e1120',
    clothes: c,
    clothesShade: c,
    clothesDark: '#20263f',
    eye: '#12142a',
    pants: '#2b3350'
  };
}

function drawCars32() {
  cars.forEach(function (c) {
    const cx = c.axis === 'h' ? c.x / W2A_OUT + CAR_LEN / 2 : c.x / W2A_OUT;
    const cy = c.axis === 'h' ? c.y / W2A_OUT : c.y / W2A_OUT + CAR_LEN / 2;
    drawCar32(ctx, Math.round(cx), Math.round(cy), {
      color: c.color,
      axis: c.axis,
      dir: c.dir > 0 ? 1 : -1
    });
  });
}

function pedLook32(p): HumanLook {
  return {
    skin: '#f0c9a0',
    skinDark: '#d9a97c',
    hair: '#161a2e',
    hairDark: '#0e1120',
    clothes: p.color,
    clothesShade: p.color,
    clothesDark: '#20263f',
    eye: '#12142a',
    pants: '#2b3350'
  };
}

function drawPeds32() {
  peds.forEach(function (p) {
    drawHuman32(ctx, Math.round(p.x / W2A_OUT), Math.round(p.y / W2A_OUT), pedLook32(p), {
      dir: p.dir > 0 ? 'right' : 'left',
      moving: true,
      phase: p.phase
    });
  });
}

function drawNpcs32() {  npcs.forEach(function (n) {
    const x = Math.round(n.x / W2A_OUT);
    const y = Math.round(n.y / W2A_OUT);
    if (n.type.kind === 'human') {
      drawHuman32(ctx, x, y, npcLook32(n), { dir: n.dir, moving: true, phase: n.phase });
    } else {
      const kind = n.type.kind === 'wild' ? 'wild' : (n.type.id === 'cat' ? 'cat' : 'dog');
      drawAnimal32(ctx, x, y, kind, n.phase);
    }
  });
}

function drawMapMarker() {
  const x = Math.round(player.x / W2A);
  const y = Math.round(player.y / W2A);
  const pulse = (Math.sin(anim * 2.4) + 1) / 2;

  ctx.globalAlpha = 0.16 + pulse * 0.10;
  px(x - 5, y - 2, 11, 4, '#050817');
  ctx.globalAlpha = 1;

  // locator ring
  px(x - 3, y - 13, 7, 1, '#ffd75e');
  px(x - 3, y - 4, 7, 1, '#ffd75e');
  px(x - 5, y - 11, 1, 7, '#ffd75e');
  px(x + 5, y - 11, 1, 7, '#ffd75e');

  // tiny character head
  const mac = Look.appearanceColors(life.appearance || Look.DEFAULT_APPEARANCE, ageYears());
  px(x - 2, y - 9, 5, 5, mac.skin);
  px(x - 2, y - 10, 5, 2, mac.hair);
  px(x - 1, y - 8, 1, 1, mac.eye);
  px(x + 1, y - 8, 1, 1, mac.eye);
  px(x - 2, y - 4, 5, 3, mac.clothes);
  px(x - 1, y - 3, 2, 2, mac.clothesDark);
}

/* ---------- district labels (DOM overlay, crisp text) ---------- */

const MAP_LABELS = DISTRICTS.map(function (d) {
  return { x: d.label[0], y: d.label[1], text: d.name };
});
let mapLabelEls = [];

function buildMapLabels() {
  const wrap = document.getElementById('mapLabels');
  if (!wrap) return;
  wrap.innerHTML = '';
  mapLabelEls = MAP_LABELS.map(function (l) {
    const d = document.createElement('div');
    d.className = 'map-label';
    d.textContent = l.text;
    wrap.appendChild(d);
    return d;
  });
}

function layoutMapLabels(show) {
  const wrap = document.getElementById('mapLabels');
  if (!wrap) return;
  if (!show) {
    wrap.classList.add('hidden');
    return;
  }
  wrap.classList.remove('hidden');
  const offX = (CITY_AW - AW) / 2;
  const offY = (CITY_AH - AH) / 2;
  MAP_LABELS.forEach(function (l, i) {
    const el = mapLabelEls[i];
    if (!el) return;
    const lx = (l.x * ART - offX) * PIX16;
    const ly = (l.y * ART - offY) * PIX16;
    el.style.left = (lx / VW * 100) + '%';
    el.style.top = (ly / VH * 100) + '%';
  });
}

/* ---------- hotspot labels: บอกว่าจุดไหนกดได้ ---------- */
const HOTSPOT_SHORT = {
  'เข้าบ้าน': 'บ้าน',
  'เข้าออฟฟิศ': 'ออฟฟิศ',
  'ซื้อของที่ร้านสะดวกซื้อ': 'ร้านสะดวกซื้อ',
  'เดินตลาด': 'ตลาด',
  'ตรวจสุขภาพ': 'โรงพยาบาล',
  'ตัดผม': 'ตัดผม',
  'ซื้อเสื้อผ้า': 'ร้านเสื้อผ้า',
  'เข้ายิม': 'ยิม',
  'เข้าสถานีขนส่ง': 'สถานี',
  'นั่งร้านอาหาร': 'ร้านอาหาร',
  'ไหว้วัด/ศาลเจ้า': 'วัด',
  'เดินสวน': 'สวน',
  'เดินริมทะเล': 'ทะเล',
  'ขึ้นรถเมล์ไปออฟฟิศ': 'รถเมล์',
  'ทำงานที่โต๊ะ': 'ทำงาน',
  'คุยกับเพื่อนร่วมงาน': 'เพื่อนร่วมงาน',
  'ออกจากออฟฟิศ': 'ออก',
  'นอน': 'นอน',
  'ดูทีวี': 'ทีวี',
  'กินข้าว': 'กินข้าว',
  'ออกจากบ้าน': 'ออก',
  'ออกจากสถานี': 'ออก'
};

function shortHotspotLabel(label) {
  if (HOTSPOT_SHORT[label]) return HOTSPOT_SHORT[label];
  return label.length > 14 ? label.slice(0, 13) + '…' : label;
}

let hotspotLabelEls = [];
let hotspotLabelKey = '';

function buildHotspotLabels() {
  const wrap = document.getElementById('hotspotLabels');
  if (!wrap) return;
  const list = hotspots();
  // ใส่ id แผนที่ด้วย — ไม่งั้นย้ายไปแผนที่ใหม่ที่จำนวน hotspot เท่ากันจะใช้ป้ายของแผนที่เก่าค้าง
  const key = scene + ':' + (scene === 'district' && districtSpec ? districtSpec.id : '') + ':' + list.length;
  if (key === hotspotLabelKey) return;
  hotspotLabelKey = key;
  wrap.innerHTML = '';
  hotspotLabelEls = list.map(function (h) {
    const d = document.createElement('div');
    d.className = 'hotspot-label';
    const dot = document.createElement('span');
    dot.className = 'dot';
    const t = document.createElement('span');
    t.textContent = shortHotspotLabel(h.label);
    d.appendChild(dot);
    d.appendChild(t);
    wrap.appendChild(d);
    return { el: d, h: h };
  });
}

function layoutHotspotLabels() {
  const wrap = document.getElementById('hotspotLabels');
  if (!wrap) return;
  const mapView = scene === 'city' && viewMode === 'map';
  if (mapView || paused) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = '';
  buildHotspotLabels();
  const camAx = Math.round(cam.x / W2A);
  const camAy = Math.round(cam.y / W2A);
  hotspotLabelEls.forEach(function (item) {
    const hx = Math.round(item.h.x / W2A);
    const hy = Math.round(item.h.y / W2A);
    const sx = (hx - camAx) * PIX16;
    const sy = (hy - camAy) * PIX16;
    if (sx < -70 || sx > VW + 70 || sy < -50 || sy > VH + 60) {
      item.el.style.display = 'none';
      return;
    }
    item.el.style.display = '';
    item.el.style.left = (sx / VW * 100) + '%';
    item.el.style.top = ((sy - 9 * PIX16) / VH * 100) + '%';
    const dist = Math.hypot(player.x - item.h.x, player.y - item.h.y);
    item.el.classList.toggle('near', dist < 190);
  });
}

/* ==========================================================
   INTERIORS
   ========================================================== */

/* ==========================================================
   DISTRICT ART — บางขุนเทียน (coastal / canal / community)
   RESEARCH: docs/research/bangkok-bang-khun-thian.md
   ========================================================== */

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildDistrictArt(spec: DistrictSpec) {
  const p = spec.palette;
  const r = rngArt(hashSeed(spec.id));
  const W = spec.w * ART;
  const H = spec.h * ART;

  /* ---- grass base */
  px(0, 0, W, H, p.grass);
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(r() * W / 8) * 8;
    const y = Math.floor(r() * H / 8) * 8;
    ditherRect(x, y, 8 + Math.floor(r() * 24), 8 + Math.floor(r() * 16), p.grassDark, 2, 0.4);
  }
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(r() * W / 8) * 8;
    const y = Math.floor(r() * H / 8) * 8;
    ditherRect(x, y, 8 + Math.floor(r() * 20), 8 + Math.floor(r() * 12), p.grassLight, 2, 0.32);
  }
  for (let i = 0; i < 2600; i++) {
    px(Math.floor(r() * W), Math.floor(r() * H), 1, 1, r() < 0.55 ? p.grassDark : p.grassLight);
  }
  for (let i = 0; i < 420; i++) {
    const x = Math.floor(r() * (W - 2));
    const y = Math.floor(r() * (H - 3));
    px(x, y, 1, 2, P.blade);
    px(x + 1, y + 1, 1, 1, p.grassLight);
  }
  for (let i = 0; i < 90; i++) {
    px(Math.floor(r() * W), Math.floor(r() * H), 1, 1, [P.flowerA, P.flowerB, P.flowerC][Math.floor(r() * 3)]);
  }

  /* ---- sand / beach */
  spec.sand.forEach(function (s) {
    const sx = s.x * ART;
    const sy = s.y * ART;
    const sw = s.w * ART;
    const sh = s.h * ART;
    px(sx, sy, sw, sh, p.sand);
    // ขอบหญ้า→ทราย
    for (let x = 0; x < sw; x += 2) {
      const d = 2 + Math.floor(Math.abs(Math.sin(x * 0.09)) * 4);
      px(sx + x, sy, 2, d, r() < 0.5 ? p.sandDark : p.grassDark);
    }
    for (let i = 0; i < 900; i++) {
      px(sx + Math.floor(r() * sw), sy + Math.floor(r() * sh), 1, 1, r() < 0.5 ? p.sandDark : p.sandLight);
    }
    // ระลอกเศษเปลือก/หอย
    for (let i = 0; i < 40; i++) {
      const x = sx + Math.floor(r() * sw);
      const y = sy + Math.floor(r() * sh);
      px(x, y, 1, 1, '#efe0bb');
      px(x + 1, y + 1, 1, 1, p.sandDark);
    }
    // แนวน้ำขึ้นถึง
    px(sx, sy + sh - 3, sw, 1, 'rgba(80,60,30,.22)');
    px(sx, sy + sh - 2, sw, 1, 'rgba(80,60,30,.12)');
  });

  /* ---- sea */
  const seaRect = spec.water.filter(function (w) { return w.type === 'sea'; })[0];
  if (seaRect) {
    const sx = seaRect.x * ART;
    const sy = seaRect.y * ART;
    const sw = seaRect.w * ART;
    const sh = seaRect.h * ART;
    px(sx, sy, sw, sh, p.sea);
    // ไล่เฉดเข้มลงทะเล
    for (let i = 0; i < sh; i++) {
      const t = i / sh;
      ctx.globalAlpha = t * 0.55;
      px(sx, sy + i, sw, 1, t > 0.5 ? p.seaDeep : '#2a6a72');
      ctx.globalAlpha = 1;
    }
    // คลื่น/ประกาย
    for (let i = 0; i < 260; i++) {
      const x = sx + Math.floor(r() * sw);
      const y = sy + Math.floor(r() * sh);
      px(x, y, 2 + Math.floor(r() * 3), 1, r() < 0.6 ? 'rgba(150,215,220,.35)' : 'rgba(255,255,255,.22)');
    }
    // โฟมริมหาด
    for (let x = 0; x < sw; x += 2) {
      const wob = Math.round(Math.sin(x * 0.11) * 2 + Math.sin(x * 0.043) * 2);
      px(sx + x, sy + wob, 3, 1, 'rgba(238,246,244,.75)');
      if (x % 6 === 0) px(sx + x, sy + 2 + wob, 2, 1, 'rgba(238,246,244,.35)');
    }
    // แนวน้ำลึก
    for (let i = 0; i < 5; i++) {
      const yy = sy + 18 + i * 9;
      for (let x = 0; x < sw; x += 7) {
        const wob = Math.round(Math.sin(x * 0.07 + i) * 1);
        px(sx + x, yy + wob, 4, 1, 'rgba(120,190,200,.14)');
      }
    }
  }

  /* ---- canals + ponds */
  spec.water.forEach(function (w) {
    if (w.type === 'sea') return;
    const wx = w.x * ART;
    const wy = w.y * ART;
    const ww = w.w * ART;
    const wh = w.h * ART;
    const isCanal = w.type === 'canal';
    // ตลิ่งโคลน
    px(wx - 2, wy - 2, ww + 4, wh + 4, p.mud);
    px(wx - 1, wy - 1, ww + 2, wh + 2, '#4a3c2a');
    // น้ำ
    px(wx, wy, ww, wh, '#2f6a6a');
    for (let i = 0; i < wh; i += 2) {
      ctx.globalAlpha = 0.18;
      px(wx, wy + i, ww, 1, i % 4 === 0 ? '#3d7d82' : '#1f4f52');
      ctx.globalAlpha = 1;
    }
    // เงาสะท้อน/ระลอก
    for (let i = 0; i < (ww * wh) / 40; i++) {
      px(wx + Math.floor(r() * ww), wy + Math.floor(r() * wh), 3 + Math.floor(r() * 5), 1, r() < 0.5 ? 'rgba(150,220,220,.28)' : 'rgba(20,50,50,.30)');
    }
    if (isCanal) {
      // ผักตบชวา/หญ้าริมคลอง
      for (let i = 0; i < ww / 26; i++) {
        const x = wx + 4 + Math.floor(r() * (ww - 8));
        const yy = wy + (r() < 0.5 ? 1 : wh - 3);
        px(x, yy, 3, 2, '#2f6a3a');
        px(x + 1, yy - 1, 2, 1, '#3d8a4a');
      }
    } else {
      // คันบ่อ/หลักไม้
      px(wx - 1, wy - 1, ww + 2, 1, '#6b5539');
      px(wx - 1, wy + wh, ww + 2, 1, '#6b5539');
      for (let x = 0; x < ww; x += 10) px(wx + x, wy + wh, 1, 3, '#5a4630');
    }
  });

  /* ---- sidewalks (ก่อนถนนเพื่อให้ curb ทับ) */
  spec.sidewalks.forEach(function (s) { pave(s.x * ART, s.y * ART, s.w * ART, s.h * ART); });

  /* ---- roads */
  spec.roads.forEach(function (rd) {
    const horiz = rd.w > rd.h;
    const x = rd.x * ART;
    const y = rd.y * ART;
    const w = rd.w * ART;
    const h = rd.h * ART;
    roadSurface(x, y, w, h, horiz);
    if (horiz) {
      px(x, y - 1, w, 1, P.curb);
      px(x, y + h, w, 1, P.curb);
      px(x, y, w, 1, 'rgba(0,0,0,.32)');
      px(x, y + h - 1, w, 1, 'rgba(0,0,0,.32)');
    } else {
      px(x - 1, y, 1, h, P.curb);
      px(x + w, y, 1, h, P.curb);
      px(x, y, 1, h, 'rgba(0,0,0,.32)');
      px(x + w - 1, y, 1, h, 'rgba(0,0,0,.32)');
    }
  });

  // ทางม้าลายหน้าโรงเรียน/ตลาด/โรงงาน
  crosswalkH(11 * ART, 9 * ART, 16, 32);
  crosswalkV(24 * ART, 8 * ART, 32, 16);
  crosswalkH(39 * ART, 22 * ART, 16, 32);

  // สะพานข้ามคลอง (ถนนตัดคลอง)
  [[24, 16], [40, 16]].forEach(function (b) {
    const bx = b[0] * ART;
    const by = b[1] * ART;
    px(bx, by, 32, 32, '#6b5439');
    for (let yy = 0; yy < 32; yy += 3) px(bx, by + yy, 32, 1, 'rgba(0,0,0,.22)');
    px(bx, by, 1, 32, '#3a2f22');
    px(bx + 31, by, 1, 32, '#3a2f22');
    px(bx - 1, by, 2, 32, '#8a93b8');
    px(bx + 31, by, 2, 32, '#8a93b8');
    for (let yy = 2; yy < 32; yy += 8) {
      px(bx - 1, by + yy, 2, 2, '#5a6480');
      px(bx + 31, by + yy, 2, 2, '#5a6480');
    }
  });
  // สะพานเล็ก (ถนนหลักตัดคลองแนวตั้ง)
  px(8 * ART, 9 * ART, 32, 32, '#6b5439');
  for (let yy = 0; yy < 32; yy += 3) px(8 * ART, 9 * ART + yy, 32, 1, 'rgba(0,0,0,.20)');

  /* ---- buildings & houses */
  spec.buildings.forEach(function (b) {
    drawBuildingArt(b, false);
    if (b.id === 'temple') drawTempleDetail(b);
    else if (b.id === 'market') drawMarketDetail(b);
    else if (b.id === 'factory') drawFactoryDetail(b);
  });
  spec.houses.forEach(function (h) { drawHouseArt(h, false); });

  /* ---- trees */
  spec.trees.forEach(function (t, i) {
    drawTreeArt((t.x + 0.5) * ART, (t.y + 0.92) * ART, i % 3);
  });

  /* ---- mangroves */
  spec.mangroves.forEach(function (m) { drawMangroveArt(m.x * ART, m.y * ART, m.v || 0); });

  /* ---- pier */
  if (spec.pier) drawPierArt(spec);

  /* ---- props */
  spec.props.forEach(function (pr) {
    const x = pr.x * ART;
    const y = pr.y * ART;
    switch (pr.type) {
      case 'stall': drawMarketStallArt(x, y, pr.v || 0); break;
      case 'seafood': drawSeafoodArt(x, y); break;
      case 'crate': drawCrateArt(x, y); break;
      case 'sign': drawSignPostArt(x, y); break;
      case 'lamp': drawLampPost(x, y); break;
      case 'bin': drawBinArt(x, y); break;
      case 'bench': drawBenchArt(x, y); break;
      case 'power': drawPowerPoleArt(x, y); break;
      case 'dog': drawDogArt(x, y); break;
      case 'fishnet': drawFishnetArt(x, y); break;
      case 'crab': drawCrabArt(x, y); break;
      case 'palm': drawPalmArt(x, y, pr.v || 0); break;
      case 'buoy': drawBuoyArt(x, y); break;
      case 'tank': drawTankArt(x, y); break;
      case 'truck': drawTruckArt(x, y); break;
      case 'incense': drawIncenseArt(x, y); break;
      case 'lantern': drawLanternArt(x, y, pr.v || 0); break;
      case 'barber': drawBarberPoleArt(x, y); break;
      default: break;
    }
  });

  // เศษรายละเอียด: ทางเดินดิน, กองทราย, เปลือกหอย
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * 14 * ART);
    if (spec.grid[Math.floor(y / ART)] && spec.grid[Math.floor(y / ART)][Math.floor(x / ART)] === 0) {
      px(x, y, 1, 1, '#6b5539');
    }
  }
}

/* ---------- district art helpers ---------- */

function drawTempleDetail(b: any) {
  const x = b.x * ART;
  const y = b.y * ART;
  const w = b.w * ART;
  const h = b.h * ART;
  const wallH = clamp(Math.round(h * 0.46), 12, 30);
  const wallY = y + h - wallH;

  // ชายคาโค้งงอนแบบศาลเจ้า
  px(x - 5, y + 2, w + 10, 3, '#7a2c2c');
  for (let i = 0; i < 4; i++) {
    px(x - 5 + i, y + 1 + i, w + 10 - i * 2, 1, i === 0 ? '#a83a3a' : '#8a2f2f');
  }
  px(x + 2, y - 1, w - 4, 2, '#e0a13a');
  px(x - 7, y - 2, 5, 2, '#e0a13a');
  px(x + w + 2, y - 2, 5, 2, '#e0a13a');
  px(x - 8, y - 3, 2, 2, '#b8862f');
  px(x + w + 6, y - 3, 2, 2, '#b8862f');
  px(x - 3, y + 6, w + 6, 1, '#5a1f1f');

  // เสาแดง + ประตู
  px(x + 4, wallY, 3, h - (wallY - y) - 1, '#a83a3a');
  px(x + w - 7, wallY, 3, h - (wallY - y) - 1, '#a83a3a');
  const dx = Math.round(x + w / 2 - 5);
  px(dx - 1, wallY + 4, 12, 13, '#b8862f');
  px(dx, wallY + 5, 10, 12, '#5a1f1f');
  px(dx + 1, wallY + 6, 8, 10, '#7a2c2c');
  px(dx + 2, wallY + 8, 6, 1, 'rgba(224,161,58,.7)');
  px(dx + 2, wallY + 11, 6, 1, 'rgba(224,161,58,.7)');

  // ป้ายทอง + โคมแดง
  px(dx - 3, wallY - 1, 16, 4, '#e0a13a');
  px(dx - 2, wallY, 14, 2, '#b8862f');
  [x + 2, x + w - 4].forEach(function (lx) {
    px(lx, y + 8, 1, 4, '#5a4630');
    px(lx - 2, y + 12, 5, 5, '#d64b4b');
    px(lx - 2, y + 12, 5, 1, '#ff8f3f');
    px(lx, y + 17, 1, 2, '#e0a13a');
  });

  // กระถางธูป/สิงห์หน้า
  px(x + 2, y + h + 1, 5, 3, '#5a4630');
  px(x + 3, y + h - 1, 3, 2, '#8a7350');
  px(x + w - 8, y + h, 4, 4, '#8a7350');
  px(x + w - 7, y + h + 1, 2, 2, '#5a4630');
}

function drawMarketDetail(b: any) {
  const x = b.x * ART;
  const y = b.y * ART;
  const w = b.w * ART;
  const h = b.h * ART;
  const wallH = clamp(Math.round(h * 0.46), 12, 30);
  const wallY = y + h - wallH;

  // กันสาดลายทางคลุมทางเข้า
  const ay = wallY - 5;
  px(x + 2, ay, w - 4, 4, '#d64b4b');
  for (let i = 0; i < w - 4; i += 8) {
    px(x + 2 + i, ay, 4, 4, '#e8eefc');
    px(x + 2 + i, ay + 4, 4, 1, '#a83a3a');
  }
  px(x + 2, ay, w - 4, 1, 'rgba(255,255,255,.5)');
  px(x + 4, ay - 3, 2, 3, '#5a4630');
  px(x + w - 6, ay - 3, 2, 3, '#5a4630');

  // หลอดไฟ/ป้ายไฟ
  for (let i = 0; i < 6; i++) {
    px(x + 8 + i * 12, wallY - 2, 2, 2, '#ffe9a8');
  }
  px(x + 8, y + 3, w - 16, 1, 'rgba(255,233,168,.35)');

  // ตู้แช่/ลังน้ำแข็งหน้าร้าน
  px(x + 4, y + h, 10, 6, '#c9d6e6');
  px(x + 4, y + h, 10, 2, '#e8eefc');
  px(x + 5, y + h + 2, 8, 2, 'rgba(120,190,200,.5)');
  px(x + w - 14, y + h, 8, 5, '#3d6a8a');
  px(x + w - 14, y + h, 8, 2, '#5a8aaa');
}

function drawFactoryDetail(b: any) {
  const x = b.x * ART;
  const y = b.y * ART;
  const w = b.w * ART;
  const h = b.h * ART;
  const wallH = clamp(Math.round(h * 0.46), 12, 30);
  const wallY = y + h - wallH;

  // แถบเตือนภัย + ประตูม้วน
  for (let i = 0; i < w; i += 8) {
    px(x + i, y + h - 3, 4, 3, '#e0a13a');
  }
  const dw = 18;
  const dx = Math.round(x + w / 2 - dw / 2);
  px(dx, wallY + 3, dw, wallH - 4, '#3a3f4e');
  for (let yy = wallY + 4; yy < y + h - 2; yy += 3) {
    px(dx + 1, yy, dw - 2, 1, '#5a5f70');
  }
  px(dx, wallY + 3, dw, 1, '#8a90a2');

  // ท่อ/ปล่องเล็ก
  px(x + 3, y - 4, 5, 10, '#5a5f70');
  px(x + 3, y - 5, 5, 2, '#8a90a2');
  px(x + 3, y - 6, 5, 1, '#3a3f4e');
  px(x + w - 9, y - 3, 4, 9, '#5a5f70');
  px(x + w - 9, y - 4, 4, 2, '#8a90a2');

  // พัดลมผนัง
  px(x + 5, wallY + 6, 6, 6, '#3a3f4e');
  px(x + 6, wallY + 7, 4, 4, '#8a90a2');
  px(x + 7, wallY + 8, 2, 2, '#2a3048');
}

function drawMarketStallArt(x, y, v) {
  const awn = ['#d64b4b', '#e0a13a', '#3d8a4a', '#4f7fd6', '#b06fd6'][v % 5];
  shadowBlob(x, y - 1, 22);
  // โต๊ะ
  px(x - 9, y - 8, 18, 5, '#8a6448');
  px(x - 9, y - 8, 18, 1, '#a87c58');
  px(x - 8, y - 3, 2, 3, '#5a4630');
  px(x + 6, y - 3, 2, 3, '#5a4630');
  // ผ้า/ของ
  px(x - 7, y - 10, 6, 3, '#ffb45c');
  px(x + 1, y - 10, 5, 3, '#6ee7a8');
  px(x - 4, y - 11, 3, 2, '#e05a72');
  // กันสาด
  px(x - 11, y - 20, 22, 3, awn);
  px(x - 11, y - 20, 22, 1, 'rgba(255,255,255,.35)');
  px(x - 11, y - 17, 4, 2, awn);
  px(x + 7, y - 17, 4, 2, awn);
  px(x - 10, y - 17, 1, 9, '#5a4630');
  px(x + 9, y - 17, 1, 9, '#5a4630');
}

function drawSeafoodArt(x, y) {
  px(x - 8, y - 6, 16, 6, '#c9d6e6');
  px(x - 8, y - 6, 16, 1, '#e8eefc');
  px(x - 7, y - 4, 14, 3, 'rgba(120,190,200,.55)');
  for (let i = 0; i < 6; i++) {
    px(x - 6 + i * 2, y - 5, 1, 1, i % 2 ? '#ff8f3f' : '#e05a72');
  }
  px(x - 9, y - 8, 3, 2, '#8a6448');
}

function drawCrateArt(x, y) {
  px(x - 5, y - 8, 11, 8, '#8a6448');
  px(x - 5, y - 8, 11, 1, '#a87c58');
  px(x - 5, y - 4, 11, 1, '#6b4a30');
  px(x - 1, y - 8, 1, 8, '#6b4a30');
  px(x - 4, y - 7, 3, 3, 'rgba(255,255,255,.12)');
}

function drawSignPostArt(x, y) {
  px(x - 1, y - 16, 2, 16, '#6b5539');
  px(x - 10, y - 22, 20, 8, '#e0a13a');
  px(x - 10, y - 22, 20, 1, 'rgba(255,255,255,.4)');
  px(x - 8, y - 20, 6, 2, '#3a2f28');
  px(x - 8, y - 17, 10, 1, '#3a2f28');
  px(x + 5, y - 20, 3, 3, '#d64b4b');
}

function drawPowerPoleArt(x, y) {
  px(x - 1, y - 26, 3, 26, '#6b5539');
  px(x - 1, y - 26, 2, 26, '#8a7350');
  px(x - 7, y - 24, 15, 2, '#5a4630');
  px(x - 5, y - 21, 11, 1, '#5a4630');
  px(x - 7, y - 25, 1, 3, '#3a2f28');
  px(x + 7, y - 25, 1, 3, '#3a2f28');
  px(x - 6, y - 22, 1, 2, '#3d4560');
  px(x + 6, y - 22, 1, 2, '#3d4560');
}

function drawDogArt(x, y) {
  shadowBlob(x, y - 1, 10);
  px(x - 4, y - 6, 8, 4, '#c9a06a');
  px(x + 3, y - 7, 3, 3, '#c9a06a');
  px(x + 4, y - 8, 1, 2, '#a87c58');
  px(x + 5, y - 6, 1, 1, '#2a1f17');
  px(x - 4, y - 3, 1, 3, '#a87c58');
  px(x + 3, y - 3, 1, 3, '#a87c58');
  px(x + 6, y - 8, 1, 2, '#c9a06a');
}

function drawFishnetArt(x, y) {
  for (let i = 0; i < 5; i++) {
    px(x - 8 + i * 3, y - 6 + (i % 2), 2, 1, '#8a93b8');
  }
  for (let i = 0; i < 5; i++) {
    px(x - 8 + i * 3, y - 3 + (i % 2), 2, 1, '#8a93b8');
  }
  px(x - 9, y - 8, 3, 3, '#d64b4b');
  px(x + 5, y - 8, 3, 3, '#e0a13a');
  px(x - 2, y - 7, 1, 7, '#6b5539');
}

function drawCrabArt(x, y) {
  px(x - 2, y - 2, 5, 3, '#d64b4b');
  px(x - 1, y - 3, 3, 1, '#e06a5a');
  px(x - 3, y - 3, 1, 1, '#d64b4b');
  px(x + 3, y - 3, 1, 1, '#d64b4b');
  px(x - 3, y - 1, 1, 1, '#a83a3a');
  px(x + 3, y - 1, 1, 1, '#a83a3a');
}

function drawPalmArt(x, y, v) {
  const lean = v % 2 ? 1 : -1;
  shadowBlob(x, y - 1, 22);
  // ลำต้นโค้ง
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const tx = x + Math.round(lean * t * t * 7);
    px(tx, y - i, 3, 1, i % 4 === 0 ? '#6b5539' : '#8a7350');
    if (i % 4 === 0) px(tx + 1, y - i, 1, 1, '#5a4630');
  }
  const tx = x + Math.round(lean * 7);
  const ty = y - 26;
  // ใบมะพร้าวแผ่
  const fronds = [
    [-13, -5, -1], [-11, -9, -1], [-6, -12, -1], [0, -13, 0],
    [6, -12, 1], [11, -9, 1], [13, -5, 1],
    [-12, 0, -1], [-8, 3, -1], [8, 3, 1], [12, 0, 1]
  ];
  fronds.forEach(function (f, i) {
    const dx = f[0];
    const dy = f[1];
    const dir = f[2];
    for (let k = 0; k < 7; k++) {
      const px2 = tx + Math.round(dx * k / 6);
      const py2 = ty + Math.round(dy * k / 6) + (k > 3 ? 1 : 0);
      px(px2, py2, 2, 1, (i + k) % 3 === 0 ? '#2f6a3a' : '#3d8a4a');
    }
    px(tx + dx + dir, ty + dy + 1, 2, 1, '#2f6a3a');
  });
  px(tx - 2, ty - 1, 5, 3, '#3d8a4a');
  px(tx - 1, ty - 2, 3, 1, '#6ee7a8');
  // ลูกมะพร้าว
  px(tx + 2, ty + 3, 2, 2, '#6b5539');
  px(tx + 3, ty + 4, 1, 1, '#4a3524');
}

function drawBuoyArt(x, y) {
  px(x - 3, y - 4, 6, 4, '#d64b4b');
  px(x - 3, y - 4, 6, 1, '#ff8f3f');
  px(x - 1, y - 6, 2, 2, '#3a2f28');
  px(x - 4, y - 2, 1, 1, 'rgba(255,255,255,.5)');
}

function drawTankArt(x, y) {
  shadowBlob(x, y, 18);
  px(x - 7, y - 14, 14, 14, '#8a90a2');
  px(x - 7, y - 14, 14, 2, '#b0b6c6');
  px(x - 7, y - 8, 14, 1, 'rgba(0,0,0,.18)');
  px(x - 7, y - 4, 14, 1, 'rgba(0,0,0,.18)');
  px(x - 2, y - 16, 4, 2, '#5a5f70');
  px(x - 8, y - 2, 16, 2, '#3a3f4e');
}

function drawTruckArt(x, y) {
  shadowBlob(x, y + 1, 28);
  px(x - 14, y - 12, 20, 11, '#7a8092');
  px(x - 14, y - 12, 20, 1, '#a8b0c0');
  px(x - 14, y - 6, 20, 1, 'rgba(0,0,0,.2)');
  px(x + 7, y - 10, 7, 9, '#5a5f70');
  px(x + 8, y - 9, 5, 4, '#7dd3fc');
  px(x - 12, y - 2, 4, 3, '#2a2030');
  px(x + 6, y - 2, 4, 3, '#2a2030');
  px(x - 4, y - 15, 8, 3, '#e0a13a');
}

function drawIncenseArt(x, y) {
  px(x - 5, y - 6, 11, 5, '#5a4630');
  px(x - 5, y - 6, 11, 1, '#8a7350');
  for (let i = 0; i < 3; i++) {
    px(x - 3 + i * 3, y - 12, 1, 6, '#c9a06a');
    px(x - 3 + i * 3, y - 13, 1, 1, '#ff8f3f');
  }
  px(x - 2, y - 3, 5, 1, 'rgba(200,200,200,.5)');
}

function drawLanternArt(x, y, v) {
  px(x - 1, y - 18, 2, 8, '#6b5539');
  px(x - 5, y - 16, 10, 1, '#5a4630');
  px(x - 3, y - 14, 6, 6, '#d64b4b');
  px(x - 3, y - 14, 6, 1, '#ff8f3f');
  px(x - 3, y - 9, 6, 1, '#a83a3a');
  px(x - 1, y - 14, 2, 6, 'rgba(255,210,120,.35)');
  px(x - 1, y - 7, 1, 2, '#e0a13a');
  if (v % 2) px(x + 4, y - 17, 1, 5, '#e0a13a');
}

function drawMangroveArt(x, y, v) {
  // รากโผล่
  for (let i = 0; i < 5; i++) {
    const dx = -6 + i * 3;
    px(x + dx, y - 3, 1, 4, '#4a3524');
    px(x + dx - (i % 2), y - 1, 3, 1, '#4a3524');
  }
  // พุ่ม
  px(x - 6, y - 10, 13, 6, '#2c5537');
  px(x - 8, y - 8, 5, 4, '#2c5537');
  px(x + 4, y - 8, 5, 4, '#2c5537');
  px(x - 4, y - 13, 9, 4, '#356b44');
  px(x - 2, y - 15, 5, 3, '#3d8a4a');
  px(x - 5, y - 9, 4, 2, '#4a9a58');
  px(x + 2, y - 12, 3, 2, '#4a9a58');
  px(x - 7, y - 4, 15, 1, 'rgba(20,45,28,.6)');
}

function drawPierArt(spec: DistrictSpec) {
  // ท่าเทียบเรือไม้ x=24..25, y=24..29
  const x = 24 * ART;
  const y = 24 * ART;
  const w = 2 * ART;
  const h = 6 * ART;
  // เสาเข็ม
  for (let yy = 0; yy <= h; yy += 12) {
    px(x - 1, y + yy, 2, 6, '#4a3524');
    px(x + w - 1, y + yy, 2, 6, '#4a3524');
  }
  // แผ่นไม้
  px(x, y, w, h, '#8a6448');
  for (let yy = 0; yy < h; yy += 4) {
    px(x, y + yy, w, 1, 'rgba(0,0,0,.22)');
    px(x, y + yy + 1, w, 1, 'rgba(255,255,255,.08)');
  }
  px(x - 1, y, 1, h, '#5a4630');
  px(x + w, y, 1, h, '#5a4630');
  // ราวกันตก
  for (let yy = 0; yy <= h; yy += 10) {
    px(x - 1, y + yy, 1, 6, '#5a4630');
    px(x + w, y + yy, 1, 6, '#5a4630');
  }
  px(x - 1, y, 1, h, 'rgba(90,70,48,.55)');
  px(x + w, y, 1, h, 'rgba(90,70,48,.55)');
  // เชือก/ห่วงยาง
  px(x + 2, y + 10, 3, 3, '#e0a13a');
  px(x + 2, y + 11, 3, 1, '#3a2f28');
  px(x + w - 5, y + 44, 4, 2, '#d64b4b');
}

function drawDistrictDynamic() {
  const spec = districtSpec;
  if (!spec) return;
  const p = spec.palette;

  // คลื่นริมหาด
  const sea = spec.water.filter(function (w) { return w.type === 'sea'; })[0];
  if (sea) {
    for (let i = 0; i < 3; i++) {
      const y = sea.y * ART + 2 + i * 7;
      for (let x = 0; x < sea.w * ART; x += 9) {
        const t = anim * 0.7 + i * 1.3 + x * 0.05;
        const wob = Math.round(Math.sin(t) * 2);
        const a = 0.10 + 0.06 * (Math.sin(t * 1.7) + 1) / 2;
        ctx.globalAlpha = a;
        px(x + wob, y, 5, 1, '#dff3ef');
        ctx.globalAlpha = 1;
      }
    }
    // ประกายกลางแดด
    for (let i = 0; i < 18; i++) {
      const x = (i * 53) % (sea.w * ART);
      const y = sea.y * ART + 10 + ((i * 29) % (sea.h * ART - 10));
      const a = (Math.sin(anim * 3 + i * 1.7) + 1) / 2;
      ctx.globalAlpha = 0.05 + a * 0.10;
      px(x, y, 2, 1, '#ffffff');
      ctx.globalAlpha = 1;
    }
  }

  // ประกายน้ำในคลอง
  spec.water.forEach(function (w, wi) {
    if (w.type !== 'canal') return;
    const wx = w.x * ART;
    const wy = w.y * ART;
    const ww = w.w * ART;
    const wh = w.h * ART;
    for (let i = 0; i < 12; i++) {
      const t = anim * 0.35 + i * 0.7 + wi * 1.3;
      const x = wx + ((i * 41 + Math.sin(t) * 6) % ww);
      const y = wy + 2 + ((i * 13) % Math.max(2, wh - 3));
      ctx.globalAlpha = 0.10 + 0.08 * (Math.sin(t * 1.6) + 1) / 2;
      px(x, y, 4, 1, '#bfeef0');
      ctx.globalAlpha = 1;
    }
  });

  // เรือโยก + ไอเรือ
  spec.props.forEach(function (pr, i) {
    if (pr.type === 'boat') {
      const bob = Math.sin(anim * 1.4 + i * 1.9) * 1.5;
      drawBoatArt(pr.x * ART, pr.y * ART + bob, pr.v || 0);
    } else if (pr.type === 'buoy') {
      const bob = Math.sin(anim * 1.8 + i) * 1;
      px(pr.x * ART - 3, pr.y * ART - 4 + bob, 6, 4, '#d64b4b');
      px(pr.x * ART - 3, pr.y * ART - 4 + bob, 6, 1, '#ff8f3f');
      px(pr.x * ART - 1, pr.y * ART - 6 + bob, 2, 2, '#3a2f28');
    }
  });

  // ควันโรงงาน
  const fac = spec.buildings.filter(function (b) { return b.id === 'factory'; })[0];
  if (fac) {
    const cx = (fac.x + fac.w * 0.72) * ART;
    const cy = fac.y * ART;
    for (let k = 0; k < 4; k++) {
      const t = (anim * 0.22 + k * 0.25) % 1;
      const sy = cy - 6 - t * 26;
      const sx = cx + Math.sin(t * 4 + k) * 4;
      ctx.globalAlpha = (1 - t) * 0.30;
      px(sx - 2 - t * 4, sy, 5 + t * 10, 3 + t * 4, '#c9d0dd');
      ctx.globalAlpha = 1;
    }
  }

  // ไอน้ำตลาด/หม้ออาหาร
  spec.props.forEach(function (pr, i) {
    if (pr.type !== 'stall') return;
    const x = pr.x * ART;
    const y = pr.y * ART;
    for (let k = 0; k < 2; k++) {
      const t = (anim * 0.4 + i * 0.27 + k * 0.4) % 1;
      ctx.globalAlpha = (1 - t) * 0.18;
      px(x - 2 + Math.sin(t * 6 + i) * 2, y - 12 - t * 9, 3, 2, '#e8eefc');
      ctx.globalAlpha = 1;
    }
  });

  // นกทะเล
  const birdA = Math.sin(anim * 0.9) * 20;
  drawBirdArt(9 * ART + birdA, 20 * ART + Math.sin(anim * 1.3) * 3);
  drawBirdArt(11 * ART + birdA * 0.6, 18 * ART + Math.cos(anim * 1.1) * 3);
}

function drawBoatArt(x, y, v) {
  const hull = v === 1 ? '#3d6a8a' : v === 2 ? '#8a4a3a' : '#4a6a5a';
  // เงาในน้ำ
  ctx.globalAlpha = 0.22;
  px(x - 12, y + 2, 24, 2, '#0a2026');
  ctx.globalAlpha = 1;
  // ลำเรือ
  px(x - 12, y - 4, 24, 5, hull);
  px(x - 12, y - 4, 24, 1, 'rgba(255,255,255,.25)');
  px(x - 12, y - 1, 24, 1, '#2a2018');
  px(x - 13, y - 5, 4, 6, hull);
  px(x + 9, y - 6, 4, 3, hull);
  // ห้องโดยสาร/กันสาด
  px(x - 5, y - 10, 10, 6, '#e8eefc');
  px(x - 5, y - 10, 10, 1, '#c9d6e6');
  px(x - 6, y - 11, 12, 2, '#d64b4b');
  px(x - 2, y - 8, 2, 2, '#3a2f28');
  px(x + 1, y - 8, 2, 2, '#3a2f28');
  // เสา/ธง
  px(x + 8, y - 16, 1, 12, '#5a4630');
  px(x + 9, y - 16, 3, 3, '#e0a13a');
}

function drawBirdArt(x, y) {
  const flap = Math.sin(anim * 6) > 0 ? 1 : 0;
  px(x - 2, y - flap, 2, 1, '#2a3048');
  px(x, y, 2, 1, '#2a3048');
  px(x + 2, y - flap, 2, 1, '#2a3048');
}

function buildOfficeArt() {
  const W = OFFICE_AW;
  const H = OFFICE_AH;

  // carpet
  px(0, 0, W, H, '#2a3150');
  for (let y = 16; y < H - 16; y += 4) {
    for (let x = 16; x < W - 16; x += 4) {
      if ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0) px(x, y, 3, 3, '#2f3759');
    }
  }
  // coffee stain
  px(7 * ART, 7 * ART, 5, 3, 'rgba(60,40,40,.25)');

  // walls
  px(0, 0, W, 16, '#151b36');
  px(0, H - 16, W, 16, '#151b36');
  px(0, 0, 16, H, '#151b36');
  px(W - 16, 0, 16, H, '#151b36');
  px(16, 14, W - 32, 2, '#232b52');
  px(16, H - 18, W - 32, 2, '#0e1430');

  // windows with town silhouette
  for (let i = 2; i < OFFICE.w - 2; i += 3) {
    const wx = i * ART + 2;
    const wy = 3;
    px(wx - 1, wy - 1, 12, 11, '#0f1428');
    px(wx, wy, 10, 9, '#0b1630');
    px(wx + 1, wy + 1, 8, 7, '#18294f');
    px(wx + 1, wy + 5, 2, 3, '#0d1934');
    px(wx + 4, wy + 4, 2, 4, '#0d1934');
    px(wx + 7, wy + 3, 2, 5, '#0d1934');
    if (i % 2) {
      px(wx + 2, wy + 2, 1, 1, '#c9d6ff');
      px(wx + 6, wy + 2, 1, 1, '#c9d6ff');
    }
    px(wx - 1, wy + 9, 12, 1, '#0f1428');
  }

  // ceiling light panels (inside the room)
  [3, 9, 15].forEach(function (c) {
    const lx = c * ART + 1;
    px(lx - 1, 21, 15, 6, '#10152a');
    px(lx, 22, 13, 4, '#e8eeff');
    px(lx + 1, 23, 11, 2, '#fff7d8');
    ctx.globalAlpha = 0.06;
    px(lx - 4, 26, 21, 5, '#fff3c4');
    ctx.globalAlpha = 1;
  });

  // clock
  px(W - 34, 4, 8, 8, '#0f1428');
  px(W - 33, 5, 6, 6, '#e8eeff');
  px(W - 30, 6, 1, 3, '#1a2038');
  px(W - 30, 8, 2, 1, '#1a2038');

  // door
  px(9 * ART, H - 16, 16, 16, '#2a3150');
  px(9 * ART + 3, H - 16 + 2, 10, 14, '#1a2038');
  px(9 * ART + 4, H - 16 + 3, 8, 11, '#38456b');
  px(9 * ART + 10, H - 16 + 8, 1, 1, '#ffd75e');
  px(9 * ART + 2, H - 3, 12, 2, '#0e1430');

  // desks
  DESKS.forEach(function (d) {
    const x = d[0] * ART;
    const y = d[1] * ART;
    ctx.globalAlpha = 0.3;
    px(x + 2, y + 18, 34, 4, P.shadow);
    ctx.globalAlpha = 1;

    px(x + 1, y + 8, 30, 10, '#6b4a3a');
    px(x + 1, y + 8, 30, 2, '#8a6448');
    px(x + 2, y + 18, 2, 4, '#4a3226');
    px(x + 28, y + 18, 2, 4, '#4a3226');

    // monitor + chart
    px(x + 9, y - 2, 12, 9, '#12162c');
    px(x + 10, y - 1, 10, 7, '#16324a');
    px(x + 11, y + 2, 2, 3, '#7dd3fc');
    px(x + 14, y + 1, 2, 4, '#6ee7a8');
    px(x + 17, y + 3, 2, 2, '#ffd75e');
    px(x + 14, y + 7, 2, 2, '#12162c');

    // keyboard + mug + papers
    px(x + 9, y + 12, 12, 3, '#2a3050');
    px(x + 10, y + 13, 10, 1, '#0e1430');
    px(x + 23, y + 11, 3, 3, '#ffd75e');
    px(x + 26, y + 12, 1, 1, '#ffd75e');
    px(x + 2, y + 13, 4, 2, '#dce4ff');

    // chair
    px(x + 9, y + 22, 12, 4, '#2a3050');
    px(x + 8, y + 26, 14, 3, '#232b52');
    px(x + 13, y + 29, 4, 1, '#12162c');
  });

  // whiteboard / notice board on the right wall
  px(W - 17, 30, 2, 24, '#39304a');
  px(W - 19, 32, 1, 20, '#e8eeff');
  px(W - 19, 36, 1, 1, '#ff8fb1');
  px(W - 19, 40, 1, 1, '#7dd3fc');

  // water cooler
  px(15 * ART, 4 * ART + 2, 9, 14, '#39415e');
  px(15 * ART + 1, 4 * ART - 6, 7, 9, '#7dd3fc');
  px(15 * ART + 2, 4 * ART - 4, 5, 5, '#c9e9ff');
  px(15 * ART + 1, 4 * ART + 14, 7, 2, '#2a3050');

  // filing cabinets along the right wall
  px(257, 32, 13, 26, '#39415e');
  px(258, 33, 11, 7, '#4a5270');
  px(258, 41, 11, 7, '#4a5270');
  px(258, 49, 11, 6, '#4a5270');
  px(262, 45, 2, 1, '#ffd75e');
  px(262, 53, 2, 1, '#ffd75e');

  // meeting table + chairs
  px(96, 100, 48, 16, '#6b4a3a');
  px(96, 100, 48, 3, '#8a6448');
  px(98, 116, 3, 6, '#4a3226');
  px(139, 116, 3, 6, '#4a3226');
  px(104, 90, 10, 6, '#2a3050');
  px(106, 88, 6, 3, '#39415e');
  px(122, 90, 10, 6, '#2a3050');
  px(124, 88, 6, 3, '#39415e');
  px(108, 120, 10, 5, '#2a3050');
  px(122, 120, 10, 5, '#2a3050');
  px(102, 104, 7, 4, '#dce4ff');
  px(124, 105, 5, 3, '#e8eeff');
  px(132, 103, 3, 3, '#ffd75e');
  px(136, 104, 1, 1, '#ffd75e');

  // coat rack near the door
  px(163, 136, 2, 20, '#3a2f28');
  px(158, 136, 12, 2, '#4a3f36');
  px(160, 138, 2, 7, '#7dd3fc');
  px(166, 138, 2, 5, '#ff8fb1');

  // cardboard boxes
  px(252, 146, 8, 8, '#8a6448');
  px(253, 147, 6, 2, '#a67c5a');
  px(254, 150, 4, 1, '#6b4a3a');

  // plants
  [[2, 2], [16, 8], [2, 8]].forEach(function (p) {
    const x = p[0] * ART;
    const y = p[1] * ART;
    px(x + 1, y + 8, 6, 5, '#5a4433');
    px(x + 2, y + 3, 4, 5, '#2f5a3a');
    px(x + 1, y + 4, 2, 3, '#3d7d4d');
    px(x + 5, y + 5, 2, 2, '#3d7d4d');
  });

  // printer + paper stacks
  px(16 * ART + 4, 6 * ART, 10, 8, '#4a5270');
  px(16 * ART + 5, 6 * ART + 1, 8, 2, '#dce4ff');
  px(16 * ART + 5, 6 * ART + 5, 8, 2, '#2a3048');
  px(13 * ART, 8 * ART + 4, 6, 3, '#dce4ff');
  px(13 * ART + 1, 8 * ART + 3, 5, 1, '#e8eeff');
}

function buildShopArt(kind) {
  const def = SHOP_DEFS[kind] || SHOP_DEFS.foodshop;
  const W = SHOP.w * ART;
  const H = SHOP.h * ART;
  const accent = def.accent;

  // floor
  px(0, 0, W, H, '#2f3448');
  for (let y = 16; y < H - 16; y += 8) {
    for (let x = 16; x < W - 16; x += 8) {
      if ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0) px(x, y, 7, 7, '#343a50');
    }
  }

  // walls
  px(0, 0, W, 16, '#1a2038');
  px(0, H - 16, W, 16, '#1a2038');
  px(0, 0, 16, H, '#1a2038');
  px(W - 16, 0, 16, H, '#1a2038');
  px(16, 14, W - 32, 2, '#2a3152');
  px(16, H - 18, W - 32, 2, '#12182c');

  // accent sign band
  px(16, 16, W - 32, 5, accent);
  px(16, 16, W - 32, 1, 'rgba(255,255,255,.35)');

  // door
  px(7 * ART, H - 16, 16, 16, '#2f3448');
  px(7 * ART + 2, H - 14, 12, 12, '#1a2038');
  px(7 * ART + 4, H - 8, 8, 1, '#ffd75e');

  // counter
  px(5 * ART, 4 * ART, 3 * ART, 12, '#5a4433');
  px(5 * ART, 4 * ART, 3 * ART, 4, '#7a5a42');
  px(5 * ART + 4, 4 * ART + 12, 3 * ART - 8, 2, 'rgba(0,0,0,.3)');

  // shelves
  [2, 10].forEach(function (sx) {
    px(sx * ART, 2 * ART, 2 * ART, 10, '#4a3b2e');
    px(sx * ART + 2, 2 * ART + 2, 2 * ART - 4, 3, '#6b5240');
    px(sx * ART + 2, 2 * ART + 6, 2 * ART - 4, 3, '#6b5240');
    for (let i = 0; i < 4; i++) {
      px(sx * ART + 4 + i * 6, 2 * ART + 3, 3, 2, accent);
      px(sx * ART + 6 + i * 6, 2 * ART + 7, 3, 2, '#c9d6ff');
    }
  });

  // type-specific prop
  if (kind === 'gym') {
    px(3 * ART, 6 * ART, 3 * ART, 8, '#3a2f4e');
    px(3 * ART + 4, 6 * ART + 2, 3 * ART - 8, 4, '#6b4fb0');
    px(10 * ART, 6 * ART, 10, 12, '#2a3050');
    px(10 * ART + 2, 6 * ART + 2, 6, 8, '#8a93b8');
  } else if (kind === 'hospital') {
    px(2 * ART, 6 * ART, 3 * ART, 10, '#c9d6ff');
    px(2 * ART, 6 * ART, 3 * ART, 4, '#e8eeff');
    px(2 * ART + 6, 6 * ART + 5, 3 * ART - 12, 4, '#ff5c6c');
    px(10 * ART, 6 * ART, 8, 10, '#5a6280');
  } else if (kind === 'temple') {
    px(4 * ART, 5 * ART, 5 * ART, 8, '#7a5418');
    px(4 * ART, 5 * ART, 5 * ART, 3, '#b8862f');
    px(5 * ART + 8, 5 * ART + 4, 6, 6, '#ffd75e');
    px(2 * ART, 3 * ART, 3, 3, '#ff9f4a');
    px(2 * ART - 2, 3 * ART + 3, 7, 1, '#ffd75e');
  } else if (kind === 'bar') {
    px(2 * ART, 6 * ART, 2 * ART, 8, '#5a3622');
    px(10 * ART, 6 * ART, 2 * ART, 8, '#5a3622');
    px(2 * ART, 6 * ART, 2 * ART, 2, '#8a5a3a');
    px(10 * ART, 6 * ART, 2 * ART, 2, '#8a5a3a');
  } else if (kind === 'clothes') {
    [2, 10].forEach(function (sx) {
      px(sx * ART, 5 * ART, 2 * ART, 4, '#3a2f44');
      px(sx * ART + 3, 5 * ART + 2, 4, 10, accent);
      px(sx * ART + 9, 5 * ART + 2, 4, 10, '#c9d6ff');
    });
  } else if (kind === 'landmark') {
    px(3 * ART, 5 * ART, 4 * ART, 3, '#2a3050');
    px(3 * ART + 2, 5 * ART + 2, 4 * ART - 4, 3 * ART - 4, '#7dd3fc');
    px(10 * ART, 5 * ART, 3 * ART, 3, '#2a3050');
  } else if (kind === 'market') {
    [2, 10].forEach(function (sx) {
      px(sx * ART, 6 * ART, 2 * ART, 8, '#8a5a3a');
      px(sx * ART + 2, 6 * ART + 2, 2 * ART - 4, 3, '#ffb45c');
      px(sx * ART + 2, 6 * ART + 6, 2 * ART - 4, 2, '#6aa84f');
    });
  }
}

function buildStationArt() {
  const W = STATION_AW;
  const H = STATION_AH;
  px(0, 0, W, H, '#242a45');
  for (let y = 2 * ART; y < H - ART; y += 8) {
    for (let x = 2 * ART; x < W - 2 * ART; x += 8) {
      if ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0) px(x, y, 7, 7, '#292f4d');
    }
  }
  px(0, 0, W, 16, '#151b36');
  px(0, H - 16, W, 16, '#151b36');
  px(0, 0, 16, H, '#151b36');
  px(W - 16, 0, 16, H, '#151b36');

  // departure board
  px(4 * ART, 3, 10 * ART, 9, '#0b1630');
  for (let i = 0; i < 5; i++) {
    px(4 * ART + 4, 5 + i * 2, 4 * ART, 2, ['#ffd75e', '#7dd3fc', '#6ee7a8', '#ff9f4a', '#c9d6ff'][i]);
  }
  px(4 * ART - 1, 2, 10 * ART + 2, 1, '#3b4a86');

  // ticket counters
  STATION_COUNTERS.forEach(function (c, i) {
    const x = c.x * ART;
    const y = 2 * ART;
    px(x - 8, y - 2, 18, 14, '#1a2038');
    px(x - 7, y - 1, 16, 10, '#30395f');
    px(x - 6, y, 14, 3, i % 2 ? '#7dd3fc' : '#ffd75e');
    px(x - 5, y + 5, 12, 4, '#46558c');
    px(x - 3, y + 12, 8, 2, '#0f1428');
    ctx.globalAlpha = 0.25;
    px(x - 7, y + 14, 16, 3, P.shadow);
    ctx.globalAlpha = 1;
  });

  // benches
  [4, 12].forEach(function (bx) {
    px(bx * ART, 6 * ART, 3 * ART, 6, '#3a3150');
    px(bx * ART, 6 * ART, 3 * ART, 2, '#5a4b77');
    px(bx * ART + 4, 6 * ART + 8, 4, 4, '#241d33');
    px(bx * ART + 3 * ART - 8, 6 * ART + 8, 4, 4, '#241d33');
  });

  // door
  px(9 * ART, H - 16, 16, 16, '#242a45');
  px(9 * ART + 3, H - 16 + 2, 10, 14, '#1a2038');
  px(9 * ART + 4, H - 16 + 3, 8, 11, '#38456b');
  px(9 * ART + 10, H - 16 + 8, 1, 1, '#ffd75e');

  // signs above counters (icons, no text)
  for (let i = 0; i < 8; i++) {
    px(2 * ART + i * 2 * ART + 4, 1 * ART + 2, 8, 4, i % 2 ? '#6ee7a8' : '#ff8fb1');
  }
}

function buildHomeArt() {
  const W = HOME_AW;
  const H = HOME_AH;

  // wooden floor — long planks with staggered joints
  px(0, 0, W, H, '#4a3a2c');
  for (let y = 16; y < H - 16; y += 6) {
    px(16, y, W - 32, 1, 'rgba(0,0,0,.22)');
    px(16, y + 1, W - 32, 1, 'rgba(255,255,255,.035)');
    const off = (Math.floor(y / 6) % 2) ? 16 : 0;
    for (let x = 16 + off; x < W - 16; x += 32) {
      px(x, y, 1, 6, 'rgba(0,0,0,.16)');
    }
    for (let x = 20 + off; x < W - 20; x += 11) {
      px(x, y + 3, 4, 1, 'rgba(0,0,0,.07)');
    }
  }
  px(0, 0, W, H, 'rgba(80,52,30,.10)');

  // walls (darker + wallpaper stripes + baseboard)
  px(0, 0, W, 16, '#2e2118');
  px(0, H - 16, W, 16, '#2e2118');
  px(0, 0, 16, H, '#2e2118');
  px(W - 16, 0, 16, H, '#2e2118');
  for (let x = 18; x < W - 18; x += 8) px(x, 1, 3, 13, 'rgba(255,255,255,.035)');
  px(16, 14, W - 32, 2, '#6b5240');
  px(16, H - 18, W - 32, 2, '#6b5240');
  px(14, 16, 2, H - 32, '#6b5240');
  px(W - 18, 16, 2, H - 32, '#6b5240');
  px(16, 16, W - 32, 1, 'rgba(0,0,0,.35)');
  px(16, H - 18, W - 32, 1, 'rgba(0,0,0,.35)');

  // window with curtains
  const wx = 9 * ART + 2;
  px(wx - 3, 2, 16, 12, '#2a1f18');
  px(wx - 2, 3, 14, 10, '#8a4a5a');
  px(wx, 4, 10, 8, '#0b1a36');
  px(wx + 1, 5, 8, 6, '#1b2b52');
  px(wx + 3, 6, 1, 1, '#ffe9a8');
  px(wx + 7, 8, 1, 1, '#ffe9a8');
  px(wx + 5, 4, 1, 8, '#0b1a36');
  px(wx - 3, 3, 2, 10, '#a05a70');
  px(wx + 11, 3, 2, 10, '#a05a70');
  px(wx - 4, 2, 18, 1, '#5a4433');

  // door
  px(7 * ART, H - 16, 16, 16, '#4a3a2c');
  px(7 * ART + 3, H - 16 + 2, 10, 14, '#543c2a');
  px(7 * ART + 4, H - 16 + 3, 8, 11, '#6b4f36');
  px(7 * ART + 10, H - 16 + 8, 1, 1, '#ffd75e');
  px(7 * ART + 2, H - 3, 12, 2, '#2a1f18');

  // rug
  px(5 * ART, 4 * ART, 4 * ART, 2 * ART, '#7a3f58');
  px(5 * ART + 2, 4 * ART + 2, 4 * ART - 4, 2 * ART - 4, '#8f4a66');
  for (let i = 0; i < 5; i++) {
    px(5 * ART + 8 + i * 12, 4 * ART + 8, 4, 4, '#a05a78');
    px(5 * ART + 12 + i * 12, 4 * ART + 16, 4, 4, '#a05a78');
  }
  px(5 * ART + 2, 4 * ART + 2, 4 * ART - 4, 1, 'rgba(255,255,255,.12)');

  // bed
  const bx = 2 * ART;
  const by = 2 * ART;
  px(bx - 2, by - 3, 36, 3, '#5a4433');
  px(bx - 2, by - 3, 3, 36, '#5a4433');
  px(bx, by, 32, 32, '#c9d6ff');
  px(bx + 1, by + 1, 30, 9, '#e8eefc');
  px(bx + 3, by + 2, 26, 6, '#f4f7ff');
  px(bx, by + 12, 32, 20, '#ff8fb1');
  for (let i = 0; i < 3; i++) px(bx + 3 + i * 10, by + 14, 6, 16, '#ff9fbf');
  px(bx, by + 11, 32, 1, '#c95a7f');
  px(bx - 1, by + 31, 34, 2, '#3a2a1e');

  // TV + stand
  px(6 * ART, 1 * ART + 6, 32, 10, '#2a3050');
  px(6 * ART + 2, 1 * ART + 8, 28, 6, '#12162c');
  px(6 * ART + 4, 1 * ART + 9, 24, 4, '#7dd3fc');
  px(6 * ART + 6, 1 * ART + 10, 3, 2, '#c9e9ff');
  px(6 * ART + 4, 1 * ART + 16, 3, 3, '#1a2038');
  px(6 * ART + 25, 1 * ART + 16, 3, 3, '#1a2038');

  // sofa
  px(9 * ART, 5 * ART + 4, 32, 12, '#4a5a7a');
  px(9 * ART + 1, 5 * ART + 5, 30, 5, '#5a6e8f');
  px(9 * ART + 3, 5 * ART + 10, 12, 5, '#63789b');
  px(9 * ART + 17, 5 * ART + 10, 12, 5, '#63789b');
  px(9 * ART - 1, 5 * ART + 4, 2, 12, '#3a4a66');
  px(9 * ART + 31, 5 * ART + 4, 2, 12, '#3a4a66');
  px(9 * ART + 2, 5 * ART + 16, 2, 2, '#2a3048');
  px(9 * ART + 28, 5 * ART + 16, 2, 2, '#2a3048');

  // coffee table
  px(8 * ART + 6, 6 * ART + 10, 20, 6, '#6b4a3a');
  px(8 * ART + 6, 6 * ART + 10, 20, 2, '#8a6448');
  px(8 * ART + 8, 6 * ART + 16, 2, 3, '#4a3226');
  px(8 * ART + 22, 6 * ART + 16, 2, 3, '#4a3226');
  px(8 * ART + 12, 6 * ART + 11, 4, 1, '#dce4ff');

  // kitchen counter + sink + stove
  px(10 * ART, 2 * ART, 3 * ART, 12, '#5a4433');
  px(10 * ART, 2 * ART, 3 * ART, 3, '#8a6448');
  px(11 * ART, 2 * ART + 4, 10, 4, '#39415e');
  px(11 * ART + 2, 2 * ART + 5, 6, 2, '#7dd3fc');
  px(12 * ART + 4, 2 * ART + 4, 8, 4, '#2a3048');
  px(12 * ART + 6, 2 * ART + 6, 4, 1, '#ff5c6c');
  px(11 * ART, 2 * ART + 8, 2, 2, '#a3abcd');
  px(10 * ART + 4, 2 * ART + 12, 8, 1, 'rgba(0,0,0,.2)');

  // fridge with magnets
  px(13 * ART + 2, 2 * ART + 2, 12, 24, '#8a93b8');
  px(13 * ART + 3, 2 * ART + 3, 10, 9, '#a3abcd');
  px(13 * ART + 3, 2 * ART + 13, 10, 11, '#a3abcd');
  px(13 * ART + 11, 2 * ART + 6, 1, 5, '#39415e');
  px(13 * ART + 5, 2 * ART + 14, 1, 1, '#ffd75e');
  px(13 * ART + 8, 2 * ART + 16, 1, 1, '#ff8fb1');
  px(13 * ART + 6, 2 * ART + 19, 2, 1, '#6ee7a8');

  // wall art
  px(3 * ART + 2, 3, 12, 10, '#5a4433');
  px(3 * ART + 3, 4, 10, 8, '#2f5a3a');
  px(3 * ART + 4, 5, 3, 5, '#6b4a3a');
  px(3 * ART + 8, 8, 4, 2, '#3d7d4d');

  // mirror (แต่งตัวที่บ้าน)
  const mx = 12 * ART + 2;
  px(mx - 2, 1, 18, 20, '#5a4433');
  px(mx, 3, 14, 16, '#8fa3c8');
  px(mx + 1, 4, 12, 14, '#b9c8e8');
  px(mx + 2, 5, 3, 9, '#dce8ff');
  px(mx + 6, 5, 1, 11, '#8fa3c8');
  px(mx + 1, 16, 12, 2, '#6b7a9a');
  px(mx - 3, 21, 20, 2, '#3a2a1e');
  // reflection silhouette
  ctx.globalAlpha = 0.45;
  px(mx + 4, 7, 6, 8, '#c98a5c');
  px(mx + 3, 6, 8, 3, '#2a1f18');
  px(mx + 5, 10, 1, 1, '#2a1f18');
  px(mx + 8, 10, 1, 1, '#2a1f18');
  ctx.globalAlpha = 1;

  // bookshelf
  px(17, 92, 18, 34, '#3a2a1e');
  px(18, 93, 16, 32, '#241a12');
  for (let s = 0; s < 3; s++) {
    px(18, 98 + s * 10, 16, 1, '#5a4433');
    for (let b = 0; b < 4; b++) {
      px(19 + b * 4, 94 + s * 10, 2, 4, ['#ff8fb1', '#7dd3fc', '#ffd75e', '#6ee7a8'][(b + s) % 4]);
    }
  }

  // floor lamp beside the sofa
  px(134, 84, 6, 2, '#2a3050');
  px(136, 72, 1, 12, '#2a3050');
  px(133, 68, 7, 4, '#d8a63a');
  px(134, 69, 5, 2, '#ffe9a8');
  ctx.globalAlpha = 0.18;
  px(131, 74, 11, 8, '#ffe9a8');
  ctx.globalAlpha = 1;

  // plant
  px(W - 30, H - 32, 6, 5, '#5a4433');
  px(W - 29, H - 38, 4, 6, '#2f5a3a');
  px(W - 31, H - 36, 2, 4, '#3d7d4d');
}

function drawOfficeDynamic() {
  const t = (Math.sin(anim * 2.2) + 1) / 2;
  ctx.globalAlpha = 0.05 + t * 0.04;
  px(2 * ART, 16, 3 * ART, 6, '#fff3c4');
  ctx.globalAlpha = 1;
}

function drawHomeDynamic() {
  const t = (Math.sin(anim * 5.3) + Math.sin(anim * 2.1)) * 0.5;
  ctx.globalAlpha = 0.10 + (t + 1) * 0.05;
  px(6 * ART + 4, 1 * ART + 9, 24, 4, '#7dd3fc');
  ctx.globalAlpha = 1;
}

/* ==========================================================
   LIGHTING
   ========================================================== */

function lightState() {
  const h = world.minutes / 60;
  if (h < 4.5) return ['#050a24', 0.62];
  if (h < 6.5) return ['#0a1338', 0.62 - (h - 4.5) / 2 * 0.62];
  if (h < 16.5) return ['#000000', 0];
  if (h < 19) return ['#3a1a3a', (h - 16.5) / 2.5 * 0.30];
  if (h < 21) return ['#0a1030', 0.30 + (h - 19) / 2 * 0.18];
  return ['#050a24', 0.62];
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

function drawLightBlob(x, y, r, color, a) {
  if (a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexA(color, a));
  g.addColorStop(0.55, hexA(color, a * 0.45));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function drawLighting(scale?: number) {
  const S = scale || 1;
  const AWa = AW * S;
  const AHa = AH * S;
  const ARTa = ART * S;
  const W2Aa = W2A / S;
  const l = lightState();
  const indoor = (scene === 'office' || scene === 'home' || scene === 'station') ? 0.4 : 1;
  if (l[1] > 0.01) {
    ctx.globalAlpha = l[1] * indoor;
    px(0, 0, AWa, AHa, l[0]);
    ctx.globalAlpha = 1;
  }
  // Yaowarat night market: additive local lights AFTER the night tint
  if (scene === 'city' && l[1] > 0.12 && yaowaratInView(viewMode === 'map')) {
    const mapView = viewMode === 'map';
    const camAx = mapView ? Math.round((CITY_AW * S - AWa) / 2) : Math.round(cam.x / W2Aa);
    const camAy = mapView ? Math.round((CITY_AH * S - AHa) / 2) : Math.round(cam.y / W2Aa);
    const offX = -camAx;
    const offY = -camAy;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    YAOWARAT_STALLS.forEach(function (s) {
      drawLightBlob(s[0] * ARTa + offX, s[1] * ARTa - 6 * S + offY, 30 * S, '#ffb45c', 0.16 * l[1]);
    });
    YAOWARAT_NEON.forEach(function (n, i) {
      const fl = 0.72 + 0.28 * Math.sin(anim * 4.2 + i * 1.7);
      drawLightBlob(n[0] * ARTa + offX, n[1] * ARTa - 12 * S + offY, 34 * S, n[2], 0.20 * l[1] * fl);
    });
    for (let k = 0; k < 7; k++) {
      drawLightBlob((14.8 + k * 2.35) * ARTa + offX, 22.7 * ARTa + offY, 14 * S, '#ff6b4a', 0.14 * l[1]);
    }
    const d = districtAt(Math.floor(player.x / TILE), Math.floor(player.y / TILE));
    if (d && d.id === 'yaowarat') {
      drawLightBlob(AWa / 2, AHa / 2, AHa * 0.62, '#ff9a55', 0.10 * l[1]);
    }
    ctx.restore();
  }
  // District night lights: ไฟถนน ตลาด ศาลเจ้า โรงงาน
  if (scene === 'district' && l[1] > 0.12 && districtSpec) {
    const offX = -Math.round(cam.x / W2Aa);
    const offY = -Math.round(cam.y / W2Aa);
    if (districtNight) {
      ctx.globalAlpha = clamp((l[1] - 0.08) / 0.5, 0, 1);
      ctx.drawImage(districtNight, offX, offY, districtNight.width * S, districtNight.height * S);
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    districtLights.forEach(function (g) {
      drawLightBlob(g.x * S + offX, g.y * S + offY, g.r * S, g.c, g.a * l[1] / 0.62);
    });
    districtSpec.props.forEach(function (p) {
      const lx = p.x * ARTa + offX;
      const ly = p.y * ARTa + offY;
      if (p.type === 'lamp') {
        drawLightBlob(lx + 2 * S, ly - 14 * S, 38 * S, '#ffe9a8', 0.34 * l[1]);
        drawGlowPool(lx + 2 * S, ly - 3 * S, 22 * S, 8 * S, '#ffe9a8', Math.min(0.22, 0.30 * l[1]));
      }
      else if (p.type === 'stall') drawLightBlob(lx, ly - 10 * S, 30 * S, '#ffb45c', 0.30 * l[1]);
      else if (p.type === 'lantern') drawLightBlob(lx, ly - 4 * S, 22 * S, '#ff5c6c', 0.32 * l[1]);
      else if (p.type === 'incense') drawLightBlob(lx, ly - 6 * S, 18 * S, '#ffd75e', 0.22 * l[1]);
    });
    if (!districtSpec.style) districtSpec.buildings.forEach(function (b) {
      const bx = (b.x + b.w / 2) * ARTa + offX;
      const by = (b.y + b.h) * ARTa + offY;
      if (b.id === 'temple') drawLightBlob(bx, by - 10 * S, 50 * S, '#ffcf5e', 0.34 * l[1]);
      if (b.id === 'market') drawLightBlob(bx, by - 6 * S, 54 * S, '#ffb45c', 0.30 * l[1]);
      if (b.id === 'factory') drawLightBlob(bx, by - 8 * S, 44 * S, '#ff8f3f', 0.16 * l[1]);
      if (b.id === 'school' || b.id === 'health') drawLightBlob(bx, by - 8 * S, 40 * S, '#9fd6ff', 0.14 * l[1]);
    });
    ctx.restore();
  }
  const g = ctx.createRadialGradient(AWa / 2, AHa / 2, AHa * 0.30, AWa / 2, AHa / 2, AHa * 0.85);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.72, 'rgba(0,0,0,.10)');
  g.addColorStop(1, 'rgba(0,0,0,.46)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, AWa, AHa);
}

/* ---------- minimap ---------- */

function drawMini() {
  const el = document.getElementById('mini');
  const c = el.getContext('2d');
  const MW = el.width;
  const MH = el.height;

  c.fillStyle = '#0b1030';
  c.fillRect(0, 0, MW, MH);

  if (scene === 'district' && districtSpec) {
    const d = districtSpec;
    const s = Math.min(MW / d.w, MH / d.h);
    const ox = (MW - d.w * s) / 2;
    const oy = (MH - d.h * s) / 2;
    c.fillStyle = '#2b4a33';
    c.fillRect(ox, oy, d.w * s, d.h * s);
    c.fillStyle = '#1d3b28';
    d.mangroveZones.forEach(function (r) { c.fillRect(ox + r.x * s, oy + r.y * s, r.w * s, r.h * s); });
    c.fillStyle = '#c8b07a';
    d.sand.forEach(function (r) { c.fillRect(ox + r.x * s, oy + r.y * s, r.w * s, r.h * s); });
    d.water.forEach(function (r) {
      c.fillStyle = r.type === 'sea' ? '#1f5560' : '#2f6a6a';
      c.fillRect(ox + r.x * s, oy + r.y * s, r.w * s, r.h * s);
    });
    c.fillStyle = '#3a4058';
    d.roads.forEach(function (r) { c.fillRect(ox + r.x * s, oy + r.y * s, r.w * s, r.h * s); });
    d.houses.forEach(function (b) {
      c.fillStyle = b.roof;
      c.fillRect(ox + b.x * s, oy + b.y * s, b.w * s, b.h * s);
    });
    d.buildings.forEach(function (b) {
      c.fillStyle = b.roof;
      c.fillRect(ox + b.x * s, oy + b.y * s, b.w * s, b.h * s);
    });
    c.fillStyle = '#ffd75e';
    c.fillRect(ox + (player.x / TILE) * s - 2, oy + (player.y / TILE) * s - 2, 4, 4);
  } else if (scene === 'city') {
    const s = MW / MAP_W;
    // ground
    c.fillStyle = '#22452e';
    c.fillRect(0, 0, MW, MH);
    // roads
    c.fillStyle = '#3a4058';
    c.fillRect(0, 8 * s, MW, 2 * s);
    c.fillRect(0, 20 * s, MW, 2 * s);
    c.fillRect(12 * s, 0, 2 * s, MH);
    c.fillRect(30 * s, 0, 2 * s, MH);
    // buildings
    BUILDINGS.forEach(function (b) {
      c.fillStyle = b.roof;
      c.fillRect(b.x * s, b.y * s, b.w * s, b.h * s);
    });
    // pond
    c.fillStyle = '#1d4a6b';
    c.fillRect(POND.x * s, POND.y * s, POND.w * s, POND.h * s);
    // player
    c.fillStyle = '#ffd75e';
    c.fillRect((player.x / TILE) * s - 2, (player.y / TILE) * s - 2, 4, 4);
    // viewport (not meaningful in the zoomed-out map view)
    if (viewMode !== 'map') {
      c.strokeStyle = 'rgba(232,238,255,.5)';
      c.lineWidth = 1;
      c.strokeRect(cam.x / TILE * s, cam.y / TILE * s, VW / TILE * s, VH / TILE * s);
    }
  } else {
    const info = sceneInfo[scene];
    const pad = 8;
    const mw = MW - pad * 2;
    const mh = MH - 20;
    const sx = mw / info.w;
    const sy = mh / info.h;
    const tx = function (v) { return pad + v * sx; };
    const ty = function (v) { return 8 + v * sy; };

    c.fillStyle = '#0b1030';
    c.fillRect(0, 0, MW, MH);
    c.fillStyle = '#232b52';
    c.fillRect(pad, 8, mw, mh);
    c.fillStyle = '#2b3352';
    c.fillRect(pad + 2, 10, mw - 4, mh - 4);
    c.strokeStyle = '#39415e';
    c.lineWidth = 2;
    c.strokeRect(pad + 1, 9, mw - 2, mh - 2);

    if (scene === 'office') {
      c.fillStyle = '#6b4a3a';
      DESKS.forEach(function (d) {
        c.fillRect(tx(d[0] * TILE), ty((d[1] + 0.9) * TILE), 2 * TILE * sx, 10);
      });
      c.fillRect(tx(6 * TILE), ty(6.4 * TILE), 3 * TILE * sx, 12);
      c.fillStyle = '#7dd3fc';
      c.fillRect(tx(15 * TILE), ty(4 * TILE), 6, 8);
      c.fillStyle = '#ffd75e';
      c.fillRect(tx(9 * TILE) + 2, ty(10.5 * TILE), 8, 4);
    } else {
      c.fillStyle = '#c9d6ff';
      c.fillRect(tx(2 * TILE), ty(2 * TILE), 2 * TILE * sx, 2 * TILE * sy);
      c.fillStyle = '#ff8fb1';
      c.fillRect(tx(2 * TILE), ty(3 * TILE), 2 * TILE * sx, 1 * TILE * sy);
      c.fillStyle = '#7a3f58';
      c.fillRect(tx(5 * TILE), ty(4 * TILE), 4 * TILE * sx, 2 * TILE * sy);
      c.fillStyle = '#4a5a7a';
      c.fillRect(tx(9 * TILE), ty(5 * TILE), 2 * TILE * sx, 1 * TILE * sy);
      c.fillStyle = '#8a6448';
      c.fillRect(tx(10 * TILE), ty(2 * TILE), 3 * TILE * sx, 12);
      c.fillStyle = '#a3abcd';
      c.fillRect(tx(13 * TILE), ty(2 * TILE), 12, 20);
      c.fillStyle = '#ffd75e';
      c.fillRect(tx(7 * TILE) + 2, ty(8.6 * TILE), 8, 4);
    }

    c.fillStyle = '#ffd75e';
    c.fillRect(tx(player.x) - 2, ty(player.y) - 2, 4, 4);
  }
}

/* ---------- main render ---------- */

function render() {
  const mapView = scene === 'city' && viewMode === 'map';
  setPixelScale(currentPixelScale());

  ctx = bctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  px(0, 0, AW, AH, mapView ? '#101c14' : '#080d22');

  let camAx;
  let camAy;
  if (mapView) {
    camAx = Math.round((CITY_AW - AW) / 2);
    camAy = Math.round((CITY_AH - AH) / 2);
  } else {
    camAx = Math.round(cam.x / W2A);
    camAy = Math.round(cam.y / W2A);
  }

  if (shake > 0) {
    camAx += Math.round(Math.sin(anim * 78) * shake * 5);
    camAy += Math.round(Math.cos(anim * 91) * shake * 4);
  }

  ctx.save();
  ctx.translate(-camAx, -camAy);

  if (scene === 'city') {
    ctx.drawImage(mapView ? cityMapStatic : cityStatic, 0, 0);
    if (mapView) {
      ctx.globalAlpha = 0.04;
      px(0, 0, CITY_AW, CITY_AH, '#e8d9a0');
      ctx.globalAlpha = 1;
      px(-1, 0, 1, CITY_AH, '#33452f');
      px(CITY_AW, 0, 1, CITY_AH, '#33452f');
      px(0, -1, CITY_AW, 1, '#33452f');
      px(0, CITY_AH, CITY_AW, 1, '#33452f');
    }
    drawCityDynamic(mapView);
    if (mapView) drawMapMarker();
  } else if (scene === 'office') {
    ctx.drawImage(officeStatic, 0, 0);
    drawOfficeDynamic();
  } else if (scene === 'district') {
    if (districtStatic) ctx.drawImage(districtStatic, 0, 0);
    drawDistrictDynamic();
  } else if (scene === 'shop') {
    if (shopStatic) ctx.drawImage(shopStatic, 0, 0);
  } else if (scene === 'station') {
    ctx.drawImage(stationStatic, 0, 0);
  } else {
    ctx.drawImage(homeStatic, 0, 0);
    drawHomeDynamic();
  }

  drawMoveMarker();

  ctx.restore();

  // ขยายเลกาซี 16px → 32px art (nearest)
  ctx = b32ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, AW32, AH32);
  ctx.drawImage(buffer, 0, 0, AW, AH, 0, 0, AW32, AH32);

  // ตัวละคร/NPC/สัตว์ วาดที่ 32px art ทับ (Phase 2)
  const mapViewNow = scene === 'city' && viewMode === 'map';
  if (!mapViewNow) {
    ctx.save();
    ctx.translate(-camAx * OUT_SCALE, -camAy * OUT_SCALE);
    if (scene === 'city') { drawCars32(); drawPeds32(); }
    if (scene === 'district') drawNpcs32();
    drawPlayerArt32();
    ctx.restore();
  }

  drawLighting(OUT_SCALE);

  ctx = mainCtx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buffer32, 0, 0, AW32, AH32, 0, 0, VW, VH);

  drawMini();
  layoutMapLabels(mapView);
  layoutHotspotLabels();
}

/* ==========================================================
   BOOT
   ========================================================== */

// debug: ?scene=office&x=9&y=9
const bootQuery = new URLSearchParams(location.search);
if (bootQuery.get('new') === '1') clearSave();
const loaded = loadGame();
life.appearance = Look.normaliseAppearance(life.appearance || Look.DEFAULT_APPEARANCE);
if (life.phase === 'adult') ensureWardrobe();
// migrate เซฟเก่า: ถ้ามีแค่ life.district (โซนเมือง) ให้เติมเขต/ย่าน
if (life.district && !life.neighborhood) {
  const found = geoFindByZone(life.province || 'กรุงเทพฯ', life.district);
  if (found) {
    life.khet = found.district.id;
    life.khetName = found.district.name;
    life.neighborhood = found.neighborhood.id;
    life.neighborhoodName = found.neighborhood.name;
  }
}
if (life.khet && !life.khetName) {
  const kd = geoDistrict(life.province || 'กรุงเทพฯ', life.khet);
  if (kd) life.khetName = kd.name;
}
if (life.neighborhood && !life.neighborhoodName) {
  const hd = geoNeighborhood(life.province || 'กรุงเทพฯ', life.neighborhood);
  if (hd) life.neighborhoodName = hd.name;
}
if (scene === 'district' && life.currentMap) {
  if (String(life.currentMap).indexOf('district:') === 0) {
    prepareDistrict(String(life.currentMap).slice(9), false);
  } else if (String(life.currentMap).indexOf('city:') === 0) {
    prepareCityMap(life.province, life.khet, life.neighborhood, false, true);
  }
} else if (life.activeMap && scene === 'district') {
  prepareCityMap(life.province, life.khet, life.neighborhood, false, true);
} else if (life.activeDistrict && getDistrictMap(life.activeDistrict) && scene === 'district') {
  prepareDistrict(life.activeDistrict, false);
} else if (scene === 'district') {
  scene = 'city';
}
// เปิดเซฟค้างในบ้าน/ออฟฟิศ/สถานี แต่มีแผนที่หลัก: เตรียมจุดกลับให้ถูก
if ((scene === 'home' || scene === 'office' || scene === 'station') && life.currentMap) {
  if (String(life.currentMap).indexOf('district:') === 0) {
    prepareDistrict(String(life.currentMap).slice(9), false);
  } else {
    prepareCityMap(life.province, life.khet, life.neighborhood, false, true);
  }
  interiorSource = 'district';
}
if (bootQuery.get('scene') && sceneInfo[bootQuery.get('scene')]) scene = bootQuery.get('scene');
if (bootQuery.get('x') && isFinite(Number(bootQuery.get('x')))) player.x = Number(bootQuery.get('x')) * TILE;
if (bootQuery.get('y') && isFinite(Number(bootQuery.get('y')))) player.y = Number(bootQuery.get('y')) * TILE;
if (bootQuery.get('t') !== null && isFinite(Number(bootQuery.get('t')))) world.minutes = Number(bootQuery.get('t'));
if (bootQuery.get('view') === 'street') viewMode = 'street';
else if (bootQuery.get('view') === 'map') viewMode = 'map';

buildStats();
setupHudClicks();
drawPortrait();
setPixelScale(currentPixelScale());
if (scene === 'shop') {
  shopKind = shopKind || 'foodshop';
  buildShopStatic(shopKind);
  if (SHOP_DEFS[shopKind]) sceneInfo.shop.name = SHOP_DEFS[shopKind].name;
}
buildStatics();
buildMapLabels();
layoutMapLabels(scene === 'city' && viewMode === 'map');
// debug hooks เปิดเฉพาะ dev server หรือ URL ?debug=1 (B-005) — e2e ใส่ debug=1 เอง (code.md §8)
const DEBUG_HOOKS = import.meta.env.DEV || /[?&]debug=1(&|$)/.test(location.search);
const GEO_ZONES = DISTRICTS.map(function (d) { return d.id; });
if (DEBUG_HOOKS) {
  window.__layoutAudit = auditLayout;
  window.__districtAudit = districtAudit;
  window.__appearanceAudit = function () { return Look.appearanceAudit(life.appearance); };
  window.__geoAudit = function () { return geoAudit(GEO_ZONES); };
}
auditLayout();
if (districtSpec) districtAudit();
if (geoAudit(GEO_ZONES).length) console.warn('[OpenLife] geo issues:', geoAudit(GEO_ZONES));
else console.info('[OpenLife] geo audit: OK (' + GEO_ZONES.length + ' zones)');
fitStage();
updateHud();

const skipMenu =
  bootQuery.get('new') === '1' ||
  bootQuery.get('adult') === '1' ||
  !!bootQuery.get('scene') ||
  !!bootQuery.get('district') ||
  !!bootQuery.get('modal') ||
  bootQuery.get('skipmenu') === '1';

if (bootQuery.get('adult') === '1') {
  profile.name = 'สมชาย ใจดี';
  life.backgroundId = 'mid';
  life.dreamId = 'free';
  life.gender = 'ชาย';
  // ไม่ระบุจังหวัดใน URL = ยึดตำแหน่งจากเซฟเดิม (กันเด้งไปบางรัก)
  if (!bootQuery.get('province') && life.province && life.khet) {
    life.province = life.province || 'กรุงเทพฯ';
  } else {
    life.province = 'กรุงเทพฯ';
    life.khet = '';
    life.khetName = '';
    life.neighborhood = '';
    life.neighborhoodName = '';
    life.district = '';
  }
  applyBackground('mid');
  enterAdulthood();
  if (bootQuery.get('scene') && sceneInfo[bootQuery.get('scene')]) scene = bootQuery.get('scene');
  if (bootQuery.get('x') && isFinite(Number(bootQuery.get('x')))) player.x = Number(bootQuery.get('x')) * TILE;
  if (bootQuery.get('y') && isFinite(Number(bootQuery.get('y')))) player.y = Number(bootQuery.get('y')) * TILE;
  if (bootQuery.get('t') !== null && isFinite(Number(bootQuery.get('t')))) world.minutes = Number(bootQuery.get('t'));
  if (bootQuery.get('view') === 'street') viewMode = 'street';
  else if (bootQuery.get('view') === 'map') viewMode = 'map';
  const bp = bootQuery.get('province');
  if (bp) {
    const bk = bootQuery.get('khet') || '';
    const bh = bootQuery.get('hood') || '';
    const kd = geoDistrict(bp, bk);
    const hd = geoNeighborhood(bp, bh);
    life.province = bp;
    life.khet = bk;
    life.neighborhood = bh;
    life.khetName = kd ? kd.name : '';
    life.neighborhoodName = hd ? hd.name : '';
    enterCityMap(true, true);
  }
  layoutMapLabels(scene === 'city' && viewMode === 'map');
  updateHud();
} else if (loaded) {
  // ถ้าเปิดด้วย debug flag ให้เข้าเกมทันที; ไม่งั้นรอผู้เล่นกด “เล่นต่อ” ในเมนู
  if (skipMenu) {
    toast('โหลดเซฟเดิม · ' + dateLabel());
    resumeLife();
  }
} else if (bootQuery.get('new') === '1') {
  openLifeCreation();
  if (bootQuery.get('appearance') === '1') showAppearanceStep();
}

// debug: ?district=bangkhunthian
const bootDistrict = bootQuery.get('district');
if (bootDistrict) {
  prepareDistrict(bootDistrict, true);
  if (bootQuery.get('x') && isFinite(Number(bootQuery.get('x')))) player.x = Number(bootQuery.get('x')) * TILE;
  if (bootQuery.get('y') && isFinite(Number(bootQuery.get('y')))) player.y = Number(bootQuery.get('y')) * TILE;
  if (bootQuery.get('t') !== null && isFinite(Number(bootQuery.get('t')))) world.minutes = Number(bootQuery.get('t'));
  camScene = '';
}

// เมนูหลัก ( animated background ) — ข้ามเมื่อใช้ debug flags
if (!skipMenu) {
  paused = true;
  const saveInfo = loaded
    ? profile.name + ' · ' + Math.round(profile.age) + ' ปี · ' + (chapterData() ? chapterData().name : '')
    : '';
  openStartMenu({
    hasSave: loaded,
    saveInfo: saveInfo,
    onNew: function () {
      paused = false;
      if (loaded) {
        clearSave();
        location.replace(location.pathname + '?new=1');
        return;
      }
      closeModal();
      openLifeCreation();
    },
    onContinue: function () {
      paused = false;
      resumeLife();
      updateHud();
    }
  });
}

const bootModal = bootQuery.get('modal');
if (life.phase === 'adult') {
  if (bootModal === 'finance') openFinance();
  else if (bootModal === 'bed') openSleep();
  else if (bootModal === 'time') openTimeAdvance();
  else if (bootModal === 'help') openHelp();
  else if (bootModal === 'assets') openAssets();
  else if (bootModal === 'quick') openQuickActions();
  else if (bootModal === 'month') startMonthEnd();
  else if (bootModal === 'payslip') resolveMonth(null);
}

window.addEventListener('pagehide', function () {
  if (!gameOver && life.phase !== 'creation') saveGame();
});
document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    if (!gameOver && life.phase !== 'creation') saveGame();
    setPageVisible(false);
  } else {
    setPageVisible(true);
    pausedRendered = false;
  }
});

let last = 0;
let lastFrame = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  if (ts - lastFrame < 15) return;
  lastFrame = ts;
  if (!last) last = ts;
  const dt = Math.min(0.05, (ts - last) / 1000);
  last = ts;

  if (document.hidden) return;

  if (!paused) {
    pausedRendered = false;
    update(dt);
    render();
  } else {
    // keep prompt hidden while paused; repaint once, then idle
    document.getElementById('prompt').classList.add('hidden');
    if (!pausedRendered) {
      render();
      pausedRendered = true;
    }
  }
}
requestAnimationFrame(loop);

/* ---------- normalize declarative ops ---------- */
normalizePoolOps(ADULT_EVENTS);
normalizePoolOps(EXTRA_EVENTS);
normalizePoolOps(MORE_EVENTS);
normalizePoolOps(ARC_EVENTS);
normalizePoolOps(RANDOM_EVENTS);
normalizePoolOps(VARIANT_EVENTS);
normalizePoolOps(FAMILY_EVENTS);
normalizePoolOps(EARLY_EVENTS);
normalizeEventOps(MONTH_EVENTS);
normalizeEventOps(SEASON_EVENTS);
normalizeEventOps(DISTRICT_EVENTS);

/* ---------- debug ---------- */
if (DEBUG_HOOKS) window.__ol = {
  stats: stats,
  profile: profile,
  world: world,
  player: player,
  flags: flags,
  life: life,
  finance: finance,
  debts: debts,
  career: career,
  get viewMode() { return viewMode; },
  get cam() { return cam; },
  get scene() { return scene; },
  get paused() { return paused; },
  get zoomLevel() { return zoomLevel; },
  get walkPath() { return walkPath; },
  get moveMarker() { return moveMarker; },
  tapWorld: handleWorldTap,
  worldFromScreen: screenToWorld,
  mapSpec: function () { return districtSpec; },
  npcs: function () { return npcs; },
  walkable: function (tx, ty) { return walkableTile(scene, tx, ty); },
  findPath: function (tx, ty) { return findPathTiles(scene, Math.floor(player.x / TILE), Math.floor(player.y / TILE), tx, ty); },
  keys: keys,
  tp: function (tx, ty) { player.x = tx * TILE; player.y = ty * TILE; },
  setScene: function (s) { scene = s; },
  tick: function (dt) { update(dt); render(); },
  zoom: adjustZoom,
  doAction: function () { interact(); },
  fireEvent: function () { triggerOvertimeEvent(); },
  forceEvent: forceEvent,
  sleep: function () { sleep(); },
  save: saveGame,
  clearSave: clearSave,
  endMonth: startMonthEnd,
  endTurn: startAdultTurn,
  openFinance: openFinance,
  bills: openBills,
  business: openBusiness,
  assets: openAssets,
  homeUpgrade: openHomeUpgrade,
  quick: openQuickActions,
  district: districtActivity,
  enterDistrict: enterDistrict,
  leaveDistrict: leaveDistrict,
  enterMap: function (province: string, khet: string, hood: string) {
    life.province = province;
    life.khet = khet;
    life.neighborhood = hood;
    const kd = geoDistrict(province, khet);
    const hd = geoNeighborhood(province, hood);
    life.khetName = kd ? kd.name : '';
    life.neighborhoodName = hd ? hd.name : '';
    enterCityMap(true, true);
  },
  districtAudit: districtAudit,
  geoAudit: function () { return geoAudit(GEO_ZONES); },
  appearanceAudit: function () { return Look.appearanceAudit(life.appearance); },
  mirror: openMirror,
  salon: openSalon,
  clothingShop: openClothingShop,
  idCard: openIdCard,
  job: openJobSearch,
  travel: openTravel,
  migration: openMigration,
  simAdult: simNewAdult,
  narrativeAudit: narrativeAudit,
  dataAudit: dataAudit,
  invariantAudit: invariantAudit,
  eventPool: adultEventPool,
  seenEvents: seenCount,
  resetSeen: resetSeenMemory
};


