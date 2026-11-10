/* TEMP balance simulator driver — remove before shipping */
window.__sim = function (step, cap) {
  var W = window.__ol;
  function settle() {
    for (var i = 0; i < 14; i++) {
      if (W.life.phase === 'ended') return;
      var ov = document.getElementById('overlay');
      if (ov.classList.contains('hidden')) return;
      var ch = document.querySelectorAll('#modal [data-choice]');
      if (ch.length) { ch[Math.min(1, ch.length - 1)].click(); continue; }
      var pc = document.getElementById('payContinue');
      if (pc) { pc.click(); continue; }
      var rv = document.getElementById('reviewNext');
      if (rv) { rv.click(); continue; }
      var bp = document.querySelector('#modal .btn-primary');
      if (bp) { bp.click(); continue; }
      var bg = document.querySelector('#modal .btn-ghost');
      if (bg) { bg.click(); continue; }
      return;
    }
  }
  function quick(kind) {
    if (W.paused) return false;
    W.quick();
    var b = document.querySelector('[data-quick="' + kind + '"]');
    if (!b || b.disabled) {
      var c = document.getElementById('quickClose');
      if (c) c.click();
      return false;
    }
    b.click();
    return true;
  }
  function pay() {
    if (W.life.phase === 'ended') return;
    W.openFinance(true);
    ['credit', 'car', 'student', 'personal'].forEach(function (k) {
      var inp = document.getElementById('pay-' + k);
      if (!inp) return;
      var bal = W.debts[k].balance || 0;
      var amt = Math.min(bal, Math.max(0, W.stats.money - 15000));
      if (amt < 100) return;
      inp.value = String(Math.floor(amt));
      var btn = document.querySelector('[data-pay="' + k + '"]');
      if (btn) btn.click();
    });
    var c = document.getElementById('finClose');
    if (c) c.click();
  }

  W.simAdult('mid', 'uni', 55);
  W.life.flags.autoBills = true;
  var turns = 0;
  var acts = 0;
  var maxTurns = cap || Math.ceil((90 - 22) * 12 / step) + 3;
  var pool = ['work', 'gym', 'tv', 'chat', 'checkup', 'gym', 'gym', 'drink', 'checkup'];
  while (W.life.phase === 'adult' && turns < maxTurns) {
    pool.forEach(function (k) {
      if (W.life.actionsThisTurn >= 9) return;
      quick(k);
      settle();
    });
    acts += (W.life.actionsThisTurn || 0);
    pay();
    W.life.plannedMonths = step;
    W.endTurn();
    settle();
    turns++;
  }
  var log = W.life.log || [];
  var uniq = {};
  log.forEach(function (x) { uniq[x.title] = 1; });
  return {
    step: step,
    turns: turns,
    acts: acts,
    apt: +(acts / Math.max(1, turns)).toFixed(1),
    age: Math.floor(W.life.ageMonths / 12),
    money: Math.round(W.stats.money),
    debt: Math.round(Object.keys(W.debts).reduce(function (s, k) { return s + (W.debts[k].balance || 0); }, 0)),
    health: Math.round(W.stats.health),
    heart: Math.round(W.stats.heart),
    salary: W.finance.salary,
    rank: W.career.rank,
    promos: W.career.promotions,
    reviews: W.career.reviews,
    kpi: Math.round(W.stats.kpi),
    social: Math.round(W.stats.social),
    boss: Math.round(W.life.rel.boss),
    retired: !!W.life.flags.retired,
    married: !!W.life.flags.married,
    kid: !!W.life.flags.kid,
    house: !!W.life.flags.house,
    car: !!W.life.flags.car,
    events: log.length,
    uniq: Object.keys(uniq).length,
    phase: W.life.phase,
    ending: (document.querySelector('.ev-title') || {}).textContent || ''
  };
};
