/* event: โครงข้อมูล (dataAudit), ความต่อเนื่องของเรื่อง (narrativeAudit) และ ops engine
   กฎ: docs/rules/event-flow.md, story-flow.md §6 */
import { describe, it, expect } from 'vitest';
import eventsData from '../../src/data/events.json';
import { createEventPools } from '../../src/content/event-pools';
import { buildJsonEvents, runOps, JsonEventContext } from '../../src/content/events';
import { dataAudit, narrativeAudit } from '../../src/content/audit';

function freshState() {
  return {
    stats: { health: 80, heart: 50, energy: 60, money: 1000, kpi: 50, credit: 60, smarts: 50, social: 50 } as any,
    life: {
      phase: 'adult', chapter: 5, ageMonths: 22 * 12, rel: { family: 70, friend: 50, love: 0, boss: 50 },
      flags: {} as any, parents: { health: 75, alive: true }, child: { name: 'ลูก', ageMonths: -1, relation: 70 },
      district: 'bangrak', province: 'กรุงเทพฯ', careerTrack: 'corporate'
    } as any,
    finance: { salary: 22000, rent: 5500, transport: 3000 } as any,
    profile: { name: 'ทดสอบ', age: 22, chapter: 'สร้างตัว', job: 'พนักงาน' } as any,
    debts: { credit: { balance: 1000 }, car: { balance: 5000 } } as any
  };
}

function opCtx(s: ReturnType<typeof freshState>): JsonEventContext {
  return {
    life: s.life, stats: s.stats, finance: s.finance, profile: s.profile, debts: s.debts,
    lifeDateParts: function () { return { m: 0 }; },
    childAgeYears: function () { return 0; },
    applyLifeFx: function () { /* no-op */ },
    toast: function () { /* no-op */ }
  };
}

function buildAuditContext() {
  const s = freshState();
  const pools = createEventPools({
    life: s.life, stats: s.stats, finance: s.finance, world: { minutes: 0, day: 0, speed: 1 },
    ageYears: function () { return 22; },
    chapterData: function () { return {}; },
    childAgeYears: function () { return 0; },
    clamp: function (v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); },
    totalDebt: function () { return 0; },
    toast: function () { /* no-op */ }
  });
  const ctx = opCtx(s);
  const data: any = eventsData;
  const adult: any = Object.assign({}, pools.ADULT_EVENTS);
  adult[5] = (adult[5] || []).concat(buildJsonEvents(data.chapter5 || [], ctx));
  adult[8] = (adult[8] || []).concat(buildJsonEvents(data.chapter8 || [], ctx));
  return {
    ADULT_EVENTS: adult,
    EXTRA_EVENTS: pools.EXTRA_EVENTS,
    MORE_EVENTS: pools.MORE_EVENTS,
    FAMILY_EVENTS: pools.FAMILY_EVENTS,
    ARC_EVENTS: pools.ARC_EVENTS,
    RANDOM_EVENTS: pools.RANDOM_EVENTS,
    VARIANT_EVENTS: pools.VARIANT_EVENTS,
    MONTH_EVENTS: buildJsonEvents(data.months || [], ctx),
    SEASON_EVENTS: buildJsonEvents(data.seasons || [], ctx),
    DISTRICT_EVENTS: buildJsonEvents(data.district || [], ctx),
    EARLY_EVENTS: pools.EARLY_EVENTS,
    stats: s.stats, life: s.life, finance: s.finance, debts: s.debts, career: { rank: 0 },
    profile: s.profile, gameOver: false, ageYears: function () { return 22; }, actionsPerTurn: 3
  };
}

describe('ข้อมูล event', function () {
  const ctx = buildAuditContext();

  it('dataAudit ไม่มีปัญหา (title/text/choices/fx key)', function () {
    const r = dataAudit(ctx as any);
    expect(r.count).toBeGreaterThan(100);
    expect(r.issues).toEqual([]);
  });

  it('narrativeAudit ไม่มีปัญหา (พ่อแม่/ลูก/คู่รักมีเงื่อนไข)', function () {
    expect(narrativeAudit(ctx as any)).toEqual([]);
  });

  it('ทุก event มีตัวเลือก 2–4 ข้อ', function () {
    const bad: string[] = [];
    const groups: any[] = [ctx.ADULT_EVENTS, ctx.EXTRA_EVENTS, ctx.MORE_EVENTS, ctx.FAMILY_EVENTS, ctx.ARC_EVENTS,
      ctx.RANDOM_EVENTS, ctx.VARIANT_EVENTS, ctx.EARLY_EVENTS, { m: ctx.MONTH_EVENTS }, { s: ctx.SEASON_EVENTS }, { d: ctx.DISTRICT_EVENTS }];
    groups.forEach(function (g) {
      Object.keys(g).forEach(function (k) {
        (g[k] || []).forEach(function (ev: any) {
          const n = (ev.choices || []).length;
          if (n < 2 || n > 4) bad.push(ev.title + ' (' + n + ')');
        });
      });
    });
    expect(bad).toEqual([]);
  });
});

describe('ops engine', function () {
  it('stat ถูกจำกัด 0–100 และเงินไม่ติดลบ', function () {
    const s = freshState();
    runOps([{ stat: 'health', delta: 500 }, { stat: 'heart', delta: -500 }, { stat: 'money', delta: -999999 }], opCtx(s));
    expect(s.stats.health).toBe(100);
    expect(s.stats.heart).toBe(0);
    expect(s.stats.money).toBe(0);
  });

  it('debt add / zero + shiftTo ย้ายยอด', function () {
    const s = freshState();
    runOps([{ debt: 'credit', add: 500 }], opCtx(s));
    expect(s.debts.credit.balance).toBe(1500);
    runOps([{ debt: 'car', zero: true, shiftTo: 'credit', reserve: 1000 }], opCtx(s));
    expect(s.debts.car.balance).toBe(0);
    expect(s.debts.credit.balance).toBe(1500 + 4000);
  });

  it('ifFlag แตกกิ่งตาม flag', function () {
    const s = freshState();
    runOps([{ ifFlag: 'married', then: [{ rel: 'love', delta: 10 }], else: [{ rel: 'friend', delta: 5 }] }], opCtx(s));
    expect(s.life.rel.friend).toBe(55);
    s.life.flags.married = true;
    runOps([{ ifFlag: 'married', then: [{ rel: 'love', delta: 10 }], else: [] }], opCtx(s));
    expect(s.life.rel.love).toBe(10);
  });

  it('salary ops', function () {
    const s = freshState();
    runOps([{ salaryMul: 1.1 }], opCtx(s));
    expect(s.finance.salary).toBe(24200);
    runOps([{ salaryAtLeast: 30000 }], opCtx(s));
    expect(s.finance.salary).toBe(30000);
  });
});
