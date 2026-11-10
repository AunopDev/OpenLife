/* OpenLife — state กลางของเกม (stats/world/flags/profile/finance/career/debts/life)
   ย้ายออกมาจาก game.ts เพื่อให้มี type ชัดเจน — ค่าเริ่มต้นต้องตรงกับของเดิมทุกตัว
   object ทั้งหมดเป็น const: แก้ค่าได้ แต่ห้าม reassign (ทุกโมดูลถือ reference เดียวกัน) */
import financeSeed from '../data/finance.json';
import debtsSeed from '../data/debts.json';
import type { Appearance } from '../character/appearance';

/* ---------- types ---------- */

export interface Stats {
  health: number;
  heart: number;
  energy: number;
  money: number;
  kpi: number;
  credit: number;
  smarts: number;
  social: number;
}

export interface World {
  minutes: number;
  day: number;
  speed: number; // game minutes per real second
}

/** flag รายวัน/ชั่วคราวของฉากเมือง (ไม่ใช่ life.flags) */
export interface DayFlags {
  workedToday: boolean;
  otEvent: boolean;
  usedBus: boolean;
  [key: string]: any;
}

export interface Profile {
  name: string;
  age: number;
  chapter: string;
  job: string;
}

export interface Finance {
  salary: number;
  rent: number;
  transport: number;
}

export interface Career {
  rank: number;
  yearsInRank: number;
  lastReviewAge: number; // หน่วยเป็นเดือน (264 = 22 ปี)
  reviews: number;
  promotions: number;
  bonusTotal: number;
}

export interface Debt {
  label: string;
  balance: number;
  rate: number;
  min: number;
  dueDay: number;
  missed: number;
  lastPaidKey: string | null;
  repossessed: boolean;
  collector: boolean;
  lawsuit: boolean;
  grace: boolean;
}

export type DebtKey = 'credit' | 'car' | 'student' | 'personal';
export type Debts = Record<DebtKey, Debt> & Record<string, Debt>;

export type LifePhase = 'creation' | 'early' | 'adult' | 'ended';

export interface Rel {
  family: number;
  friend: number;
  love: number;
  boss: number;
}

export interface Needs {
  fun: number;
  social: number;
  rest: number;
  hygiene: number;
  hunger: number;
}

export interface Skills {
  communication: number;
  tech: number;
  finance: number;
  fitness: number;
  cooking: number;
  creativity: number;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  rel: number;
  note: string;
}

export interface Business {
  active: boolean;
  type: string;
  level: number;
  monthly: number;
  invested: number;
}

export interface Assets {
  carTier: number;
  trips: number;
  donated: number;
  invest: number;
  rentals: number;
  [key: string]: number;
}

export interface Collections {
  books: number;
  food: number;
  music: number;
  stamps: number;
}

export interface LifeLogEntry {
  age: number;
  chapter: number;
  title: string;
  choice: string;
}

export interface Milestone {
  id: string;
  label: string;
  age: number;
}

/** flag ถาวรของชีวิต — key ที่รู้จักระบุไว้เพื่อ autocomplete, ที่เหลือยังเปิดไว้ */
export interface LifeFlags {
  kid?: boolean;
  grandchild?: boolean;
  married?: boolean;
  house?: boolean;
  car?: boolean;
  condo?: boolean;
  retired?: boolean;
  unemployed?: boolean;
  laidoff?: boolean;
  business?: boolean;
  sideBiz?: boolean;
  studentLoan?: boolean;
  inheritance?: boolean;
  movedBack?: boolean;
  crime?: boolean;
  autoBills?: boolean;
  tutorialSeen?: boolean;
  looksCareer?: boolean;
  path?: string;
  [key: string]: any;
}

export interface Life {
  phase: LifePhase;
  chapter: number;
  turn: number;
  ageMonths: number;
  backgroundId: string | null;
  dreamId: string | null;
  gender: string;
  province: string;
  homeProvince: string;
  /** โซนแผนที่เมืองกรุงเทพฯ (districts.ts) */
  district: string;
  traits: string[];
  rel: Rel;
  flags: LifeFlags;
  log: LifeLogEntry[];
  eventIndex: Record<string, number>;
  lastEventTitle: string;
  child: { name: string; ageMonths: number; relation: number };
  parents: { health: number; alive: boolean };
  actionsThisTurn: number;
  careerTrack: string;
  recentEvents: string[];
  brokeTurns: number;
  milestones: Milestone[];
  needs: Needs;
  mood: string;
  skills: Skills;
  people: Person[];
  business: Business;
  assets: Assets;
  collections: Collections;
  homeLevel: number;
  weather: string;
  achievements: string[];
  legacy: number;
  /** ค่าชั่วคราวของการเดินเวลารอบเดียว — ไม่เก็บข้ามเซฟ */
  plannedMonths: number;
  periodMonths: number;
  activityUses: Record<string, number>;

  /* ---------- ฟิลด์ที่ถูกเติมภายหลัง (creation / ย้ายถิ่น / แต่งตัว / แผนที่) ---------- */
  appearance?: Appearance;
  grooming?: number;
  wardrobe?: Record<string, any>;
  wardrobeActive?: string;
  khet?: string;
  khetName?: string;
  neighborhood?: string;
  neighborhoodName?: string;
  districtName?: string;
  homeKhet?: string;
  homeKhetName?: string;
  homeNeighborhood?: string;
  homeNeighborhoodName?: string;
  lastMoveAge?: number;
  activeMap?: string;
  /** 'city:<id>' หรือ 'district:<id>' */
  currentMap?: string;
  activeDistrict?: string;
  npcRel?: Record<string, number>;
}

/* ---------- state ---------- */

export const stats: Stats = {
  health: 82,
  heart: 41,
  energy: 62,
  money: 4500,
  kpi: 54,
  credit: 65,
  smarts: 55,
  social: 50
};

export const world: World = {
  minutes: 7 * 60 + 30,
  day: 0,
  speed: 4.8
};

export const flags: DayFlags = {
  workedToday: false,
  otEvent: false,
  usedBus: false
};

/* ---------- career / economy (vertical slice: อายุ 22, บทสร้างตัว) ---------- */

export const profile: Profile = {
  name: 'สมชาย ใจดี',
  age: 22,
  chapter: 'สร้างตัว',
  job: 'พนักงานเงินเดือน · เด็กใหม่'
};

export const finance: Finance = Object.assign({}, financeSeed);

export const career: Career = {
  rank: 0,
  yearsInRank: 0,
  lastReviewAge: 264,
  reviews: 0,
  promotions: 0,
  bonusTotal: 0
};

// หนี้ 4 ก้อน — ผู้เล่นต้องจ่ายเอง ไม่หักเงินเดือนอัตโนมัติ
export const debts: Debts = JSON.parse(JSON.stringify(debtsSeed));

export const SAVE_KEY = 'openlife.save.v3';

/* ---------- full life ---------- */

export const life: Life = {
  phase: 'creation',
  chapter: 1,
  turn: 0,
  ageMonths: 0,
  backgroundId: null,
  dreamId: null,
  gender: 'ชาย',
  province: 'กรุงเทพฯ',
  homeProvince: 'กรุงเทพฯ',
  district: 'bangrak',
  traits: [],
  rel: { family: 70, friend: 50, love: 0, boss: 50 },
  flags: {},
  log: [],
  eventIndex: {},
  lastEventTitle: '',
  child: { name: 'ลูก', ageMonths: -1, relation: 70 },
  parents: { health: 75, alive: true },
  actionsThisTurn: 0,
  careerTrack: 'corporate',
  recentEvents: [],
  brokeTurns: 0,
  milestones: [],
  needs: { fun: 70, social: 65, rest: 70, hygiene: 75, hunger: 75 },
  mood: 'ปกติ',
  skills: { communication: 20, tech: 15, finance: 15, fitness: 20, cooking: 20, creativity: 15 },
  people: [],
  business: { active: false, type: '', level: 0, monthly: 0, invested: 0 },
  assets: { carTier: 0, trips: 0, donated: 0, invest: 0, rentals: 0 },
  collections: { books: 0, food: 0, music: 0, stamps: 0 },
  homeLevel: 0,
  weather: 'แดดดี',
  achievements: [],
  legacy: 0,
  plannedMonths: 1,
  periodMonths: 1,
  activityUses: {}
};
