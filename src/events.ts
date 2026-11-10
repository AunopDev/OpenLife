/* OpenLife — declarative JSON event compiler */

export interface JsonEventContext {
  life: any;
  stats: any;
  finance: any;
  profile: any;
  debts: any;
  lifeDateParts: () => { m: number };
  childAgeYears: () => number;
  applyLifeFx: (fx: any) => void;
  toast: (message: string) => void;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export function runOps(ops: any[], ctx: JsonEventContext): void {
  (ops || []).forEach(function (op) {
    if (op.stat) {
      const key = op.stat;
      const value = (ctx.stats[key] || 0) + (op.delta || 0);
      ctx.stats[key] = key === 'money' ? Math.max(0, value) : clamp01(value);
    }
    if (op.rel) {
      ctx.life.rel[op.rel] = clamp01((ctx.life.rel[op.rel] || 0) + (op.delta || 0));
    }
    if (op.flag) {
      ctx.life.flags[op.flag] = op.value === undefined ? true : op.value;
    }
    if (op.salarySet !== undefined) ctx.finance.salary = op.salarySet;
    if (op.salaryMul !== undefined) ctx.finance.salary = Math.round(ctx.finance.salary * op.salaryMul);
    if (op.salaryAtLeast !== undefined) ctx.finance.salary = Math.max(op.salaryAtLeast, ctx.finance.salary);
    if (op.rent !== undefined) ctx.finance.rent = op.rent;
    if (op.job !== undefined) ctx.profile.job = op.job;
    if (op.jobAppend) ctx.profile.job = ctx.profile.job + op.jobAppend;
    if (op.debt) {
      const d = ctx.debts[op.debt];
      if (d) {
        if (op.add) d.balance += op.add;
        if (op.set !== undefined) d.balance = op.set;
        if (op.zero) {
          const remain = Math.max(0, d.balance - (op.reserve || 0));
          d.balance = 0;
          if (op.shiftTo && ctx.debts[op.shiftTo]) ctx.debts[op.shiftTo].balance += remain;
        }
      }
    }
    if (op.ifFlag) {
      runOps(ctx.life.flags[op.ifFlag] ? op.then : op.else, ctx);
    }
    if (op.toast) ctx.toast(op.toast);
  });
}

function buildCond(e: any, ctx: JsonEventContext) {
  return function () {
    if (e.month !== undefined && ctx.lifeDateParts().m !== e.month) return false;
    const r = e.requires;
    if (!r) return true;
    if (r.parentsAlive !== undefined && ctx.life.parents.alive !== r.parentsAlive) return false;
    if (r.minMoney !== undefined && ctx.stats.money < r.minMoney) return false;
    if (r.maxHealth !== undefined && ctx.stats.health > r.maxHealth) return false;
    if (r.flag && !ctx.life.flags[r.flag]) return false;
    if (r.noFlag && ctx.life.flags[r.noFlag]) return false;
    if (r.childAgeMin !== undefined && (!ctx.life.flags.kid || ctx.childAgeYears() < r.childAgeMin)) return false;
    if (r.childAgeMax !== undefined && (!ctx.life.flags.kid || ctx.childAgeYears() > r.childAgeMax)) return false;
    if (r.careerTrack && ctx.life.careerTrack !== r.careerTrack) return false;
    if (r.district && ctx.life.district !== r.district) return false;
    if (r.minRel) {
      const keys = Object.keys(r.minRel);
      for (let i = 0; i < keys.length; i += 1) {
        if ((ctx.life.rel[keys[i]] || 0) < r.minRel[keys[i]]) return false;
      }
    }
    return true;
  };
}

export function buildJsonEvents(list: any[], ctx: JsonEventContext) {
  return (list || []).map(function (e: any) {
    return {
      id: e.id,
      month: e.month,
      title: e.title,
      text: e.text,
      requires: e.requires,
      cond: buildCond(e, ctx),
      choices: (e.choices || []).map(function (c: any) {
        const out: any = { label: c.label, fx: c.fx, hint: c.hint };
        if (c.ops) {
          out.apply = function () { runOps(c.ops, ctx); };
        }
        if (c.random) {
          out.apply = function () {
            const roll = Math.random();
            let acc = 0;
            let picked = c.random[c.random.length - 1];
            for (let i = 0; i < c.random.length; i += 1) {
              const b = c.random[i];
              if (b.chance === undefined) {
                picked = b;
                break;
              }
              acc += b.chance;
              if (roll < acc) {
                picked = b;
                break;
              }
            }
            if (picked.ops) runOps(picked.ops, ctx);
            else ctx.applyLifeFx(picked.fx);
            if (picked.toast) ctx.toast(picked.toast);
          };
        }
        return out;
      })
    };
  });
}
