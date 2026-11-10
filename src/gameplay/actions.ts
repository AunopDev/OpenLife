/* OpenLife — world actions (scene entry, daily activities, work) */
import { clamp } from '../core/util';

export interface ActionContext {
  stats: any;
  world: any;
  life: any;
  flags: any;
  finance: any;
  tile: number;
  getScene: () => string;
  setScene: (s: string) => void;
  getPlayer: () => any;
  toast: (text: string) => void;
  addMinutes: (m: number) => void;
  spendActivity: () => boolean;
  beginActivity: (key: string) => number;
  addNeed: (key: string, amount: number) => void;
  gainSkill: (key: string, amount: number) => void;
  currentTurnKey: () => string;
  openModal: (html: string) => void;
  closeModal: () => void;
  bindChoices: (fn: (i: number) => void) => void;
  openJobSearch: () => void;
  exitInterior: (kind: string) => void;
  enterInterior: (kind: string) => void;
}

export function createActions(ctx: ActionContext) {
  const { stats, world, life, flags, finance, tile } = ctx;

  function enterHome() {
    ctx.enterInterior('home');
    ctx.setScene('home');
    const p = ctx.getPlayer();
    p.x = 7 * tile;
    p.y = 7.2 * tile;
    p.dir = 'up';
    ctx.toast('เข้าบ้าน');
  }
  function leaveHome() {
    ctx.exitInterior('home');
  }
  function enterStation() {
    ctx.enterInterior('station');
    ctx.setScene('station');
    const p = ctx.getPlayer();
    p.x = 9 * tile;
    p.y = 8.6 * tile;
    p.dir = 'up';
    ctx.toast('สถานีขนส่ง · เลือกจุดหมายที่เคาน์เตอร์');
  }
  function leaveStation() {
    ctx.exitInterior('station');
  }
  function enterOffice() {
    ctx.enterInterior('office');
    ctx.setScene('office');
    const p = ctx.getPlayer();
    p.x = 9 * tile;
    p.y = 9.2 * tile;
    p.dir = 'up';
    ctx.toast('เข้าออฟฟิศ · 08:00');
  }
  function leaveOffice() {
    ctx.exitInterior('office');
    if (flags.workedToday && !flags.otEvent) {
      flags.otEvent = true;
      setTimeout(triggerOvertimeEvent, 300);
    }
  }

  function buyFood() {
    if (stats.money < 30) { ctx.toast('เงินไม่พอ'); return; }
    stats.money -= 30;
    stats.energy = clamp(stats.energy + 10, 0, 100);
    ctx.addNeed('hunger', 15);
    ctx.addNeed('fun', 2);
    ctx.addMinutes(15);
    ctx.toast('ซื้อข้าวกล่อง 30฿ · พลังงาน +10');
  }

  function gotoGym() {
    if (stats.money < 60) { ctx.toast('เงินไม่พอ'); return; }
    if (!ctx.spendActivity()) return;
    const m = ctx.beginActivity('gym');
    stats.money -= 60;
    stats.health = clamp(stats.health + Math.round(2 * m), 0, 100);
    stats.heart = clamp(stats.heart + Math.round(4 * m), 0, 100);
    stats.energy = clamp(stats.energy - 12, 0, 100);
    ctx.gainSkill('fitness', 1);
    ctx.addNeed('fun', 2);
    ctx.addNeed('hygiene', -5);
    ctx.addMinutes(60);
    ctx.toast('ออกกำลังกาย 1 ชั่วโมง · สุขภาพ +2 ใจ +4');
  }

  function drink() {
    if (stats.money < 350) { ctx.toast('เงินไม่พอ'); return; }
    if (!ctx.spendActivity()) return;
    const m = ctx.beginActivity('drink');
    stats.money -= 350;
    stats.heart = clamp(stats.heart + Math.round(10 * m), 0, 100);
    stats.health = clamp(stats.health - 2, 0, 100);
    stats.energy = clamp(stats.energy - 5, 0, 100);
    ctx.addNeed('social', 8);
    ctx.addNeed('fun', 5);
    ctx.addMinutes(90);
    ctx.toast('นั่งร้านเหล้ากับเพื่อน · ใจ +10 สุขภาพ −2');
  }

  function checkup() {
    if (stats.money < 150) { ctx.toast('เงินไม่พอ'); return; }
    if (!ctx.spendActivity()) return;
    const m = ctx.beginActivity('checkup');
    stats.money -= 150;
    stats.health = clamp(stats.health + Math.round(8 * m), 0, 100);
    ctx.addMinutes(60);
    ctx.toast('ตรวจสุขภาพ · สุขภาพ +8');
  }

  function busToOffice() {
    if (stats.money < 15) { ctx.toast('เงินไม่พอ'); return; }
    stats.money -= 15;
    ctx.addMinutes(20);
    const p = ctx.getPlayer();
    p.x = 18.5 * tile;
    p.y = 10.4 * tile;
    ctx.toast('รถเมล์ · ถึงหน้าออฟฟิศ (−15฿, 20 นาที)');
  }

  function sleep() {
    world.day += 1;
    world.minutes = 7 * 60;
    stats.energy = clamp(stats.energy + 45, 0, 100);
    ctx.addNeed('rest', 35);
    ctx.addNeed('hygiene', 5);
    flags.workedToday = false;
    const key = ctx.currentTurnKey();
    let note = 'เช้าวันใหม่ · พลังงานเต็มขึ้น';
    if (life.flags.sleepTurn !== key) {
      life.flags.sleepTurn = key;
      stats.heart = clamp(stats.heart + 6, 0, 100);
      stats.health = clamp(stats.health + 1, 0, 100);
      note = 'เช้าวันใหม่ · พลังงานเต็มขึ้น · ใจ +6';
    }
    ctx.closeModal();
    ctx.toast(note);
  }

  function watchTv() {
    const key = ctx.currentTurnKey();
    if (life.flags.tvTurn === key) {
      ctx.toast('ดูซีรีส์ซ้ำเรื่องเดิม · ใจไม่เพิ่ม');
      return;
    }
    if (!ctx.spendActivity()) return;
    ctx.addMinutes(45);
    life.flags.tvTurn = key;
    const m = ctx.beginActivity('tv');
    stats.heart = clamp(stats.heart + Math.round(5 * m), 0, 100);
    stats.energy = clamp(stats.energy + Math.round(3 * m), 0, 100);
    ctx.addNeed('fun', 8);
    ctx.addNeed('rest', 3);
    ctx.gainSkill('creativity', 1);
    ctx.toast('ดูซีรีส์ 45 นาที · ใจ +5');
  }

  function eatAtHome() {
    if (stats.money < 25) { ctx.toast('เงินไม่พอ'); return; }
    stats.money -= 25;
    const m = ctx.beginActivity('eat');
    stats.energy = clamp(stats.energy + Math.round(12 * m), 0, 100);
    ctx.addNeed('hunger', Math.round(20 * m));
    ctx.addNeed('fun', 2);
    ctx.gainSkill('cooking', 1);
    ctx.addMinutes(30);
    ctx.toast('กินข้าวที่บ้าน · พลังงาน +12');
  }

  function chatCoworker() {
    const key = ctx.currentTurnKey();
    if (life.flags.chatTurn === key) {
      ctx.toast('คุยเรื่องเดิม ๆ อีกครั้ง · ใจไม่เพิ่ม');
      return;
    }
    if (!ctx.spendActivity()) return;
    ctx.addMinutes(10);
    life.flags.chatTurn = key;
    const m = ctx.beginActivity('chat');
    stats.heart = clamp(stats.heart + Math.round(3 * m), 0, 100);
    stats.social = clamp(stats.social + Math.round(1 * m), 0, 100);
    life.rel.friend = clamp((life.rel.friend || 0) + Math.round(1 * m), 0, 100);
    ctx.addNeed('social', 10);
    ctx.gainSkill('communication', 1);
    ctx.toast('เม้าท์กับเพื่อนร่วมงาน · ใจ +3');
  }

  function openWork() {
    if (finance.salary <= 0) { ctx.openJobSearch(); return; }
    if (flags.workedToday) { ctx.toast('วันนี้ทำงานแล้ว · กลับบ้านเถอะ'); return; }
    if (world.minutes > 16 * 60) { ctx.toast('เลยเวลาเข้างานแล้ว'); return; }
    if (!ctx.spendActivity()) return;

    const html =
      '<div class="ev-head"><span class="ev-chip">ออฟฟิศ</span><span>08:10 · ถึงโต๊ะทำงาน</span></div>' +
      '<div class="ev-title">วันนี้จะทำงานยังไง?</div>' +
      '<div class="ev-text">กองงานบนโต๊ะสูงเท่าหัว หัวหน้าอยู่ในห้องประชุม และวันนี้มีเดดไลน์ตอน 5 โมงเย็น</div>' +
      '<div class="choices">' +
      '<button class="choice" data-choice="0"><span class="c-label">1. โหมงานหนัก</span>' +
      '<span class="c-hint"><span class="hint up">ผลงาน ++</span><span class="hint down">พลังงาน −−</span><span class="hint down">ใจ −</span></span></button>' +
      '<button class="choice" data-choice="1"><span class="c-label">2. ทำงานพอดี ๆ</span>' +
      '<span class="c-hint"><span class="hint up">ผลงาน +</span><span class="hint down">พลังงาน −</span></span></button>' +
      '<button class="choice" data-choice="2"><span class="c-label">3. ชิล ๆ วันนี้</span>' +
      '<span class="c-hint"><span class="hint up">ใจ +</span><span class="hint down">ผลงาน −</span></span></button>' +
      '</div>' +
      '<div class="work-preview">เวลา <b>→ 17:00</b></div>';

    ctx.openModal(html);
    ctx.bindChoices(function (i) {
      if (i === 0) {
        const m = ctx.beginActivity('work');
        stats.kpi = clamp(stats.kpi + Math.round(8 * m), 0, 100);
        stats.energy = clamp(stats.energy - 22, 0, 100);
        stats.heart = clamp(stats.heart - 9, 0, 100);
        ctx.toast('โหมงานหนัก · ผลงาน +' + Math.round(8 * m) + ' พลังงาน −22 ใจ −9');
      } else if (i === 1) {
        const m = ctx.beginActivity('work');
        stats.kpi = clamp(stats.kpi + Math.round(4 * m), 0, 100);
        stats.energy = clamp(stats.energy - 13, 0, 100);
        stats.heart = clamp(stats.heart - 5, 0, 100);
        ctx.toast('ทำงานปกติ · ผลงาน +' + Math.round(4 * m));
      } else {
        const m = ctx.beginActivity('work');
        stats.kpi = clamp(stats.kpi - 2, 0, 100);
        stats.energy = clamp(stats.energy - 6, 0, 100);
        stats.heart = clamp(stats.heart + Math.round(4 * m), 0, 100);
        ctx.toast('วันชิล ๆ · ใจ +' + Math.round(4 * m) + ' ผลงาน −2');
      }
      world.minutes = 17 * 60;
      flags.workedToday = true;
      life.rel.boss = clamp((life.rel.boss || 0) + 1, 0, 100);
      stats.social = clamp(stats.social + 0.5, 0, 100);
      ctx.gainSkill('communication', 1);
      ctx.gainSkill('tech', 1);
      ctx.addNeed('rest', -3);
      ctx.closeModal();
    });
  }

  function triggerOvertimeEvent() {
    const html =
      '<div class="ev-head"><span class="ev-chip">เหตุการณ์ · 17:55</span><span>หน้าออฟฟิศ</span></div>' +
      '<div class="ev-title">งานด่วนก่อนเลิกงาน</div>' +
      '<div class="ev-text">หัวหน้าเดินตามออกมาถึงหน้าตึก — “น้อง ช่วยทำสไลด์ชุดนี้ให้พี่ก่อนพรุ่งนี้เช้านะ” ทั้งที่คุณนัดเพื่อนไว้แล้ว และวันนี้คุณก็ทำงานเต็มวันมาแล้ว</div>' +
      '<div class="choices">' +
      '<button class="choice" data-choice="0"><span class="c-label">1. กลับเข้าไปทำต่อ</span>' +
      '<span class="c-hint"><span class="hint up">ผลงาน +</span><span class="hint down">ใจ −</span><span class="hint down">พลังงาน −</span><span class="hint time">เวลา −2 ชม.</span></span></button>' +
      '<button class="choice" data-choice="1"><span class="c-label">2. บอกว่ามีนัดสำคัญ</span>' +
      '<span class="c-hint"><span class="hint up">ใจ +</span><span class="hint down">หัวหน้า −</span><span class="hint down">ผลงาน −</span></span></button>' +
      '<button class="choice" data-choice="2" disabled><span class="c-label">3. ขอให้เพื่อนช่วยแบ่งงาน</span>' +
      '<span class="c-hint"><span class="hint req">ต้องมีมนุษยสัมพันธ์ 50</span></span></button>' +
      '</div>';

    ctx.openModal(html);
    ctx.bindChoices(function (i) {
      if (i === 0) {
        const m = ctx.beginActivity('ot');
        stats.kpi = clamp(stats.kpi + Math.round(6 * m), 0, 100);
        stats.heart = clamp(stats.heart - 10, 0, 100);
        stats.energy = clamp(stats.energy - 14, 0, 100);
        ctx.addMinutes(120);
        ctx.toast('กลับไปทำต่อ · ผลงาน +' + Math.round(6 * m) + ' ใจ −10');
      } else if (i === 1) {
        stats.heart = clamp(stats.heart + 5, 0, 100);
        stats.kpi = clamp(stats.kpi - 2, 0, 100);
        ctx.toast('ปฏิเสธอย่างสุภาพ · ใจ +5 ผลงาน −2');
      }
      ctx.closeModal();
    });
  }

  function readBook() {
    if (!ctx.spendActivity()) return;
    const m = ctx.beginActivity('read');
    stats.energy = clamp(stats.energy - 5, 0, 100);
    stats.smarts = clamp(stats.smarts + Math.round(2 * m), 0, 100);
    stats.heart = clamp(stats.heart + Math.round(2 * m), 0, 100);
    ctx.addMinutes(45);
    ctx.toast('อ่านหนังสือ 45 นาที · ปัญญา +' + Math.round(2 * m));
  }

  function walkPark() {
    if (!ctx.spendActivity()) return;
    const m = ctx.beginActivity('walk');
    stats.health = clamp(stats.health + Math.round(1 * m), 0, 100);
    stats.heart = clamp(stats.heart + Math.round(3 * m), 0, 100);
    stats.energy = clamp(stats.energy - 3, 0, 100);
    ctx.addNeed('fun', Math.round(5 * m));
    ctx.addMinutes(30);
    ctx.toast('เดินเล่นสวน 30 นาที · ใจ +' + Math.round(3 * m));
  }

  function cookMeal() {
    if (stats.money < 30) { ctx.toast('เงินไม่พอซื้อวัตถุดิบ'); return; }
    if (!ctx.spendActivity()) return;
    const m = ctx.beginActivity('cook');
    stats.money -= 30;
    stats.energy = clamp(stats.energy + Math.round(2 * m), 0, 100);
    ctx.addNeed('hunger', Math.round(18 * m));
    ctx.gainSkill('cooking', 1);
    ctx.addMinutes(30);
    ctx.toast('ทำอาหารเอง · อิ่ม +' + Math.round(18 * m) + ' · ทำอาหาร +1');
  }

  function callParents() {
    if (!life.parents.alive) { ctx.toast('ไม่มีใครรับสายแล้ว'); return; }
    const key = ctx.currentTurnKey();
    if (life.flags.callTurn === key) { ctx.toast('โทรไปแล้วช่วงนี้ · แม่บอกให้พักผ่อน'); return; }
    if (!ctx.spendActivity()) return;
    const m = ctx.beginActivity('call');
    life.flags.callTurn = key;
    life.rel.family = clamp((life.rel.family || 0) + Math.round(2 * m), 0, 100);
    stats.heart = clamp(stats.heart + Math.round(2 * m), 0, 100);
    ctx.addMinutes(15);
    ctx.toast('โทรหาพ่อแม่ · ครอบครัว +' + Math.round(2 * m));
  }

  function sideGig() {
    const key = ctx.currentTurnKey();
    if (life.flags.gigTurn === key) { ctx.toast('รับงานเสริมไปแล้วช่วงนี้'); return; }
    if (!ctx.spendActivity()) return;
    const m = ctx.beginActivity('gig');
    life.flags.gigTurn = key;
    stats.money += Math.round(900 * m);
    stats.energy = clamp(stats.energy - 10, 0, 100);
    ctx.gainSkill('tech', 1);
    ctx.addMinutes(90);
    ctx.toast('รับงานเสริม · เงิน +' + Math.round(900 * m));
  }

  function dateNight() {
    if (!(life.flags.married || life.rel.love > 0)) { ctx.toast('ยังไม่มีคนให้ออกเดทด้วย'); return; }
    const key = ctx.currentTurnKey();
    if (life.flags.dateTurn === key) { ctx.toast('ออกเดทไปแล้วช่วงนี้'); return; }
    if (stats.money < 500) { ctx.toast('เงินไม่พอออกเดท'); return; }
    if (!ctx.spendActivity()) return;
    const m = ctx.beginActivity('date');
    life.flags.dateTurn = key;
    stats.money -= 500;
    stats.heart = clamp(stats.heart + Math.round(4 * m), 0, 100);
    life.rel.love = clamp((life.rel.love || 0) + Math.round(3 * m), 0, 100);
    ctx.addMinutes(60);
    ctx.toast('ออกเดท · ใจ +' + Math.round(4 * m) + ' · ความรัก +' + Math.round(3 * m));
  }

  return {
    enterHome, leaveHome, enterStation, leaveStation,
    enterOffice, leaveOffice, buyFood, gotoGym, drink, checkup,
    busToOffice, sleep, watchTv, eatAtHome, chatCoworker,
    openWork, triggerOvertimeEvent,
    readBook, walkPark, cookMeal, callParents, sideGig, dateNight
  };
}
