/* OpenLife — event data loader (data lives in src/data/event-pools.json) */
import rawPools from './data/event-pools.json';
import rawArcs from './data/arc-events.json';
import rawRandom from './data/random-events.json';
import rawVariants from './data/variant-events.json';

export function createEventPools(ctx: any) {
  const {
    life, stats, finance, world,
    ageYears, chapterData, childAgeYears, clamp, totalDebt, toast
  } = ctx;

  function matchRequires(req: any): boolean {
    if (!req) return true;
    if (req.all) return req.all.every(function (r: any) { return matchRequires(r); });
    if (req.any) return req.any.some(function (r: any) { return matchRequires(r); });
    if (req.flag && !life.flags[req.flag]) return false;
    if (req.noFlag && life.flags[req.noFlag]) return false;
    if (req.parentsAlive !== undefined && life.parents.alive !== req.parentsAlive) return false;
    if (req.parentHealthBelow !== undefined && life.parents.health >= req.parentHealthBelow) return false;
    if (req.childAgeMin !== undefined && (!life.flags.kid || childAgeYears() < req.childAgeMin)) return false;
    if (req.childAgeMax !== undefined && (!life.flags.kid || childAgeYears() > req.childAgeMax)) return false;
    if (req.minAge !== undefined && ageYears() < req.minAge) return false;
    if (req.maxAge !== undefined && ageYears() > req.maxAge) return false;
    if (req.minCredit !== undefined && stats.credit < req.minCredit) return false;
    if (req.maxCredit !== undefined && stats.credit > req.maxCredit) return false;
    if (req.minMoney !== undefined && stats.money < req.minMoney) return false;
    if (req.minSalary !== undefined && finance.salary < req.minSalary) return false;
    if (req.minDebt !== undefined && totalDebt() < req.minDebt) return false;
    if (req.provinceNot && life.province === req.provinceNot) return false;
    if (req.backgroundNot && life.backgroundId === req.backgroundNot) return false;
    if (req.track && life.careerTrack !== req.track) return false;
    if (req.district && life.district !== req.district) return false;
    if (req.minRel) {
      const keys = Object.keys(req.minRel);
      for (let i = 0; i < keys.length; i += 1) {
        if ((life.rel[keys[i]] || 0) < req.minRel[keys[i]]) return false;
      }
    }
    if (req.maxRel) {
      const keys = Object.keys(req.maxRel);
      for (let i = 0; i < keys.length; i += 1) {
        if ((life.rel[keys[i]] || 0) > req.maxRel[keys[i]]) return false;
      }
    }
    return true;
  }

  const data: any = JSON.parse(JSON.stringify(rawPools));
  const EARLY_EVENTS = data.early;
  const ADULT_EVENTS = data.adult;
  const EXTRA_EVENTS = data.extra;
  const MORE_EVENTS = data.more;
  const FAMILY_EVENTS = data.family;
  const ARC_EVENTS = JSON.parse(JSON.stringify(rawArcs));
  const RANDOM_EVENTS = JSON.parse(JSON.stringify(rawRandom));
  const VARIANT_EVENTS = JSON.parse(JSON.stringify(rawVariants));

  [EARLY_EVENTS, ADULT_EVENTS, EXTRA_EVENTS, MORE_EVENTS, FAMILY_EVENTS, ARC_EVENTS, RANDOM_EVENTS, VARIANT_EVENTS].forEach(function (pool: any) {
    Object.keys(pool).forEach(function (ch) {
      (pool[ch] || []).forEach(function (ev: any) {
        if (ev.requires && !ev.cond) {
          ev.cond = function () { return matchRequires(ev.requires); };
        }
        if (pool === ARC_EVENTS && ev.weight === undefined) ev.weight = 2.5;
        if (pool === RANDOM_EVENTS && ev.weight === undefined) ev.weight = 1.25;
        if (pool === VARIANT_EVENTS && ev.weight === undefined) ev.weight = 1.1;
      });
    });
  });

  return { EARLY_EVENTS, ADULT_EVENTS, EXTRA_EVENTS, MORE_EVENTS, FAMILY_EVENTS, ARC_EVENTS, RANDOM_EVENTS, VARIANT_EVENTS };
}
