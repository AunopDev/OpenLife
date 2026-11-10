/* OpenLife — save/load (v3) */
export interface SaveContext {
  saveKey: string;
  stats: any;
  world: any;
  flags: any;
  profile: any;
  finance: any;
  debts: any;
  career: any;
  life: any;
  player: any;
  scene: string;
  viewMode: string;
  getMonthsPlayed: () => number;
  setMonthsPlayed: (v: number) => void;
  sceneExists: (name: string) => boolean;
  setPlayer: (x: number, y: number, dir: string) => void;
  setScene: (name: string) => void;
  setViewMode: (mode: string) => void;
}

function snapshot(ctx: SaveContext) {
  return {
    version: 3,
    savedAt: Date.now(),
    stats: JSON.parse(JSON.stringify(ctx.stats)),
    world: { minutes: ctx.world.minutes, day: ctx.world.day, speed: ctx.world.speed },
    flags: JSON.parse(JSON.stringify(ctx.flags)),
    profile: JSON.parse(JSON.stringify(ctx.profile)),
    finance: JSON.parse(JSON.stringify(ctx.finance)),
    debts: JSON.parse(JSON.stringify(ctx.debts)),
    career: JSON.parse(JSON.stringify(ctx.career)),
    life: JSON.parse(JSON.stringify(ctx.life)),
    monthsPlayed: ctx.getMonthsPlayed(),
    player: { x: ctx.player.x, y: ctx.player.y, dir: ctx.player.dir },
    scene: ctx.scene,
    viewMode: ctx.viewMode
  };
}

export function saveGame(ctx: SaveContext): void {
  try {
    localStorage.setItem(ctx.saveKey, JSON.stringify(snapshot(ctx)));
  } catch (e) {
    /* ignore */
  }
}

export function loadGame(ctx: SaveContext): boolean {
  try {
    const raw = localStorage.getItem(ctx.saveKey);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (!s || s.version !== 3) return false;
    Object.assign(ctx.stats, s.stats);
    Object.assign(ctx.world, s.world);
    Object.assign(ctx.flags, s.flags);
    Object.assign(ctx.profile, s.profile);
    Object.assign(ctx.finance, s.finance);
    if (s.career) Object.assign(ctx.career, s.career);
    if (s.life) {
      Object.assign(ctx.life, s.life);
      ctx.life.rel = Object.assign({ family: 70, friend: 50, love: 0, boss: 50 }, s.life.rel || {});
      ctx.life.traits = s.life.traits || [];
      ctx.life.log = s.life.log || [];
      ctx.life.eventIndex = s.life.eventIndex || {};
      ctx.life.lastEventTitle = s.life.lastEventTitle || '';
      ctx.life.flags = s.life.flags || {};
      ctx.life.child = Object.assign({ name: 'ลูก', ageMonths: -1, relation: 70 }, s.life.child || {});
      ctx.life.parents = Object.assign({ health: 75, alive: true }, s.life.parents || {});
      if (!ctx.life.homeProvince) ctx.life.homeProvince = ctx.life.province || 'กรุงเทพฯ';
      if (typeof ctx.life.actionsThisTurn !== 'number') ctx.life.actionsThisTurn = 0;
      if (typeof ctx.life.brokeTurns !== 'number') ctx.life.brokeTurns = 0;
      if (!Array.isArray(ctx.life.recentEvents)) ctx.life.recentEvents = [];
      if (!Array.isArray(ctx.life.milestones)) ctx.life.milestones = [];
      if (!Array.isArray(ctx.life.achievements)) ctx.life.achievements = [];
      ctx.life.needs = Object.assign({ fun: 70, social: 65, rest: 70, hygiene: 75, hunger: 75 }, ctx.life.needs || {});
      if (typeof ctx.life.grooming !== 'number') ctx.life.grooming = 70;
      if (!ctx.life.wardrobeActive) ctx.life.wardrobeActive = 'casual';
      ctx.life.skills = Object.assign({ communication: 20, tech: 15, finance: 15, fitness: 20, cooking: 20, creativity: 15 }, ctx.life.skills || {});
      ctx.life.collections = Object.assign({ books: 0, food: 0, music: 0, stamps: 0 }, ctx.life.collections || {});
      ctx.life.business = Object.assign({ active: false, type: '', level: 0, monthly: 0, invested: 0 }, ctx.life.business || {});
      ctx.life.assets = Object.assign({ carTier: 0, trips: 0, donated: 0, invest: 0, rentals: 0 }, ctx.life.assets || {});
      if (!Array.isArray(ctx.life.people)) ctx.life.people = [];
      if (typeof ctx.life.homeLevel !== 'number') ctx.life.homeLevel = 0;
      if (!ctx.life.weather) ctx.life.weather = 'แดดดี';
      if (typeof ctx.life.legacy !== 'number') ctx.life.legacy = 0;
      // plannedMonths เป็นค่าชั่วคราวของการเดินเวลารอบเดียว — ไม่เก็บข้ามเซฟ
      ctx.life.plannedMonths = 1;
      if (typeof ctx.life.periodMonths !== 'number' || ctx.life.periodMonths < 1) ctx.life.periodMonths = 1;
      if (!ctx.life.activityUses) ctx.life.activityUses = {};
      if (ctx.life.flags.kid && ctx.life.child.ageMonths < 0) ctx.life.child.ageMonths = 0;
    }
    if (!ctx.stats.smarts && ctx.stats.smarts !== 0) ctx.stats.smarts = 55;
    if (!ctx.stats.social && ctx.stats.social !== 0) ctx.stats.social = 50;
    if (s.debts) {
      Object.keys(ctx.debts).forEach(function (k) {
        if (s.debts[k]) Object.assign(ctx.debts[k], s.debts[k]);
      });
    }
    ctx.setMonthsPlayed(s.monthsPlayed || 0);
    if (s.player) ctx.setPlayer(s.player.x, s.player.y, s.player.dir || 'down');
    if (s.scene && ctx.sceneExists(s.scene)) ctx.setScene(s.scene);
    if (s.viewMode) ctx.setViewMode(s.viewMode);
    return true;
  } catch (e) {
    return false;
  }
}

export function clearSave(ctx: SaveContext): void {
  try {
    localStorage.removeItem(ctx.saveKey);
  } catch (e) {
    /* ignore */
  }
}
