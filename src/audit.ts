/* OpenLife — content and state audits */
export interface AuditContext {
  ADULT_EVENTS: any;
  EXTRA_EVENTS: any;
  MORE_EVENTS: any;
  FAMILY_EVENTS: any;
  ARC_EVENTS: any;
  RANDOM_EVENTS: any;
  VARIANT_EVENTS: any;
  MONTH_EVENTS: any;
  SEASON_EVENTS: any;
  DISTRICT_EVENTS: any;
  EARLY_EVENTS: any;
  stats: any;
  life: any;
  finance: any;
  debts: any;
  career: any;
  profile: any;
  gameOver: boolean;
  ageYears: () => number;
  actionsPerTurn: number;
}

export function dataAudit(ctx: AuditContext) {
  const groups = [
    ['adult', ctx.ADULT_EVENTS],
    ['extra', ctx.EXTRA_EVENTS],
    ['more', ctx.MORE_EVENTS],
    ['family', ctx.FAMILY_EVENTS],
    ['arc', ctx.ARC_EVENTS],
    ['random', ctx.RANDOM_EVENTS],
    ['variant', ctx.VARIANT_EVENTS],
    ['month', { 5: ctx.MONTH_EVENTS }],
    ['season', { all: ctx.SEASON_EVENTS }],
    ['district', { all: ctx.DISTRICT_EVENTS }],
    ['early', ctx.EARLY_EVENTS]
  ];
  const allowedFx = ['health', 'heart', 'energy', 'money', 'kpi', 'credit', 'smarts', 'social', 'rel', 'flags', 'trait', 'child'];
  const allowedRel = ['family', 'friend', 'love', 'boss'];
  const issues: string[] = [];
  const titles: Record<string, string> = {};
  let count = 0;

  groups.forEach(function (g) {
    const gname = g[0];
    const obj: any = g[1];
    Object.keys(obj).forEach(function (ch) {
      (obj[ch] || []).forEach(function (ev: any) {
        count += 1;
        const label = gname + ':' + ch + ' · ' + (ev.title || '?');
        if (!ev.title || !ev.text) issues.push(label + ' ขาด title/text');
        if (!ev.choices || !ev.choices.length) issues.push(label + ' ไม่มี choices');
        if (ev.title) {
          if (titles[ev.title]) issues.push(label + ' title ซ้ำกับ ' + titles[ev.title]);
          else titles[ev.title] = label;
        }
        if (ev.cond) {
          try {
            ev.cond();
          } catch (e: any) {
            issues.push(label + ' cond throw: ' + e.message);
          }
        }
        (ev.choices || []).forEach(function (c: any, i: number) {
          if (!c.label) issues.push(label + ' choice ' + i + ' ไม่มี label');
          if (!c.apply && !c.fx && !(c.random && c.random.length)) issues.push(label + ' choice ' + i + ' ไม่มีผล (fx/apply)');
          if (c.fx) {
            Object.keys(c.fx).forEach(function (k) {
              if (allowedFx.indexOf(k) < 0) issues.push(label + ' choice ' + i + ' fx key ไม่รู้จัก: ' + k);
            });
            if (c.fx.rel) {
              Object.keys(c.fx.rel).forEach(function (k) {
                if (allowedRel.indexOf(k) < 0) issues.push(label + ' choice ' + i + ' rel key ไม่รู้จัก: ' + k);
              });
            }
          }
          (c.random || []).forEach(function (b: any, bi: number) {
            if (!b.fx && !b.ops) issues.push(label + ' choice ' + i + ' random ' + bi + ' ไม่มีผล');
            if (b.fx) {
              Object.keys(b.fx).forEach(function (k) {
                if (allowedFx.indexOf(k) < 0) issues.push(label + ' choice ' + i + ' random ' + bi + ' fx key ไม่รู้จัก: ' + k);
              });
              if (b.fx.rel) {
                Object.keys(b.fx.rel).forEach(function (k) {
                  if (allowedRel.indexOf(k) < 0) issues.push(label + ' choice ' + i + ' random ' + bi + ' rel key ไม่รู้จัก: ' + k);
                });
              }
            }
          });
        });
      });
    });
  });

  return { count: count, issues: issues };
}

export function invariantAudit(ctx: AuditContext) {
  const issues: string[] = [];
  const caps: Record<string, number> = { health: 100, heart: 100, energy: 100, kpi: 100, credit: 100, smarts: 100, social: 100 };
  Object.keys(caps).forEach(function (k) {
    if (!isFinite(ctx.stats[k]) || ctx.stats[k] < 0 || ctx.stats[k] > caps[k]) issues.push('stat ' + k + ' = ' + ctx.stats[k]);
  });
  if (!isFinite(ctx.stats.money) || ctx.stats.money < 0) issues.push('money = ' + ctx.stats.money);
  if (ctx.life.chapter < 1 || ctx.life.chapter > 10) issues.push('chapter = ' + ctx.life.chapter);
  if (ctx.life.turn < 0) issues.push('turn = ' + ctx.life.turn);
  if (ctx.life.ageMonths < 0 || !isFinite(ctx.life.ageMonths)) issues.push('ageMonths = ' + ctx.life.ageMonths);
  if (ctx.profile.age !== ctx.ageYears()) issues.push('profile.age mismatch');
  if (ctx.finance.salary < 0 || !isFinite(ctx.finance.salary)) issues.push('salary = ' + ctx.finance.salary);
  ['credit', 'car', 'student', 'personal'].forEach(function (k) {
    if (ctx.debts[k].balance < 0 || !isFinite(ctx.debts[k].balance)) issues.push('debt ' + k + ' = ' + ctx.debts[k].balance);
  });
  if (ctx.life.flags.kid && ctx.life.child.ageMonths < 0) issues.push('kid flag but child age < 0');
  if (!ctx.life.flags.kid && ctx.life.child.ageMonths >= 0) issues.push('no kid flag but child exists');
  if (ctx.life.child.relation < 0 || ctx.life.child.relation > 100) issues.push('child relation = ' + ctx.life.child.relation);
  if (ctx.life.parents.alive && (ctx.life.parents.health <= 0 || ctx.life.parents.health > 100)) issues.push('parent health = ' + ctx.life.parents.health);
  if (!ctx.life.parents.alive && ctx.life.parents.health > 0) issues.push('parents dead but health > 0');
  if (ctx.career.rank < 0 || ctx.career.rank > 4) issues.push('career rank = ' + ctx.career.rank);
  if (typeof ctx.life.actionsThisTurn !== 'number' || ctx.life.actionsThisTurn < 0 || ctx.life.actionsThisTurn > ctx.actionsPerTurn) issues.push('actionsThisTurn = ' + ctx.life.actionsThisTurn);
  if (typeof ctx.life.grooming === 'number' && (ctx.life.grooming < 0 || ctx.life.grooming > 100 || !isFinite(ctx.life.grooming))) {
    issues.push('grooming = ' + ctx.life.grooming);
  }
  if (ctx.gameOver && ctx.life.phase !== 'ended') issues.push('gameOver but phase = ' + ctx.life.phase);
  if (!ctx.gameOver && ctx.life.phase === 'ended') issues.push('phase ended but game not over');
  return issues;
}

export function narrativeAudit(ctx: AuditContext) {
  const groups = [
    ['adult', ctx.ADULT_EVENTS],
    ['extra', ctx.EXTRA_EVENTS],
    ['more', ctx.MORE_EVENTS],
    ['family', ctx.FAMILY_EVENTS],
    ['arc', ctx.ARC_EVENTS],
    ['random', ctx.RANDOM_EVENTS],
    ['variant', ctx.VARIANT_EVENTS],
    ['month', { 5: ctx.MONTH_EVENTS }],
    ['season', { all: ctx.SEASON_EVENTS }],
    ['district', { all: ctx.DISTRICT_EVENTS }]
  ];
  const parentRe = /พ่อแม่|พ่อ|แม่|ปู่ย่า|ตายาย|คุณปู่|คุณย่า/;
  const childRe = /ลูก(?!ค้า)|หลาน/;
  const loveRe = /คู่รัก|แฟน|แต่งงาน/;
  const issues: string[] = [];
  groups.forEach(function (g) {
    const gname = g[0];
    const obj: any = g[1];
    Object.keys(obj).forEach(function (ch) {
      if (Number(ch) < 5 && (gname === 'extra' || gname === 'more')) return;
      (obj[ch] || []).forEach(function (ev: any) {
        const text = ev.title + ' ' + ev.text + ' ' + (ev.choices || []).map(function (c: any) { return c.label; }).join(' ');
        const cond = (ev.cond ? ev.cond.toString() : '') + ' ' + (ev.requires ? JSON.stringify(ev.requires) : '');
        const title = ev.title;
        const grandparentRole = /หลาน/.test(title);
        const childOwnLove = /^ลูก/.test(title);
        if (parentRe.test(text) && !grandparentRole) {
          if (!cond.trim()) issues.push(gname + ':' + ch + ' · ' + title + ' [parent] ไม่มี cond');
          else if (!/parents|parentHealth/.test(cond)) issues.push(gname + ':' + ch + ' · ' + title + ' [parent] cond ไม่ครอบคลุม');
        }
        if (childRe.test(text)) {
          if (!cond.trim()) issues.push(gname + ':' + ch + ' · ' + title + ' [child] ไม่มี cond');
          else if (!/kid|childAge/.test(cond)) issues.push(gname + ':' + ch + ' · ' + title + ' [child] cond ไม่ครอบคลุม');
        }
        if (loveRe.test(text) && !childOwnLove && !grandparentRole) {
          if (!cond.trim()) issues.push(gname + ':' + ch + ' · ' + title + ' [love] ไม่มี cond');
          else if (!/married|love/.test(cond)) issues.push(gname + ':' + ch + ' · ' + title + ' [love] cond ไม่ครอบคลุม');
        }
      });
    });
  });
  return issues;
}
