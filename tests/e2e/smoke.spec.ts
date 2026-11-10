/* e2e smoke: เปิดเกมจริง → console ไม่มี error, audit ทั้งหมด = [], เซฟ/โหลดได้, ทุกแผนที่ render ไม่พัง
   และถ่ายภาพฉากหลักไว้ให้คนตรวจด้วยตาที่ test-results/screens/<project>/
   กฎ: docs/rules/quality.md */
import { test, expect, Page } from '@playwright/test';
import geo from '../../src/data/geo.json' with { type: 'json' };

/** ใช้ในนิพจน์ string ที่รันในเบราว์เซอร์ (ต้องเป็น JS ล้วน ไม่มี syntax ของ TS) */
const W = 'window';

/** เก็บ console error / page error ระหว่าง test */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', function (m) { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', function (e) { errors.push(String(e)); });
  return errors;
}

async function boot(page: Page, query: string) {
  await page.goto('/?' + query + '&debug=1'); // debug hooks เปิดเฉพาะ ?debug=1 ใน production build
  await page.waitForFunction('(' + W + ').__ol && (' + W + ').__ol.life', null, { timeout: 30000 });
  await page.waitForTimeout(600);
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: 'test-results/screens/' + test.info().project.name + '/' + name + '.png' });
}

async function audits(page: Page) {
  return page.evaluate(function () {
    const w = window as any;
    return {
      layout: w.__layoutAudit ? w.__layoutAudit() : [],
      district: w.__districtAudit ? w.__districtAudit() : [],
      data: w.__ol.dataAudit().issues,
      narrative: w.__ol.narrativeAudit(),
      invariant: w.__ol.invariantAudit(),
      geo: w.__ol.geoAudit(),
      appearance: w.__ol.appearanceAudit()
    };
  });
}

const CLEAN = { layout: [], district: [], data: [], narrative: [], invariant: [], geo: [], appearance: [] };

test.beforeEach(async function ({ page }) {
  await page.goto('/');
  await page.evaluate(function () { try { localStorage.clear(); } catch (e) { /* ignore */ } });
});

test('production build ไม่เปิด debug hooks ถ้าไม่มี ?debug=1 (B-005)', async function ({ page }) {
  await page.goto('/?skipmenu=1&notour=1');
  await page.waitForTimeout(800);
  const hooks = await page.evaluate(function () { const w = window as any; return [typeof w.__ol, typeof w.__layoutAudit, typeof w.__districtAudit]; });
  expect(hooks).toEqual(['undefined', 'undefined', 'undefined']);
});

test('ชื่อผู้เล่นที่มี HTML ถูกแสดงเป็นข้อความ ไม่ถูกตีความ (B-004)', async function ({ page }) {
  const errors = watchErrors(page);
  await boot(page, 'adult=1&notour=1&new=1');
  const name = '<img src=x onerror="window.__pwned=1">ทดสอบ';
  await page.evaluate(function (n: string) {
    const w = window as any;
    w.__ol.profile.name = n;
    w.__ol.idCard();
  }, name);
  await page.waitForTimeout(300);
  const r = await page.evaluate(function () {
    const m = document.getElementById('modal') as HTMLElement;
    return { imgs: m.querySelectorAll('img').length, text: m.textContent || '', pwned: (window as any).__pwned };
  });
  expect(r.imgs).toBe(0);
  expect(r.text).toContain('<img src=x');
  expect(r.pwned).toBeUndefined();
  expect(errors).toEqual([]);
});

test('Responsive: โลกเกมใช้พื้นที่จอคุ้มและภาพไม่ยืด (B-001)', async function ({ page }) {
  const errors = watchErrors(page);
  await boot(page, 'adult=1&notour=1&new=1&t=600');
  const r = await page.evaluate(function () {
    const world = (document.getElementById('world') as HTMLElement).getBoundingClientRect();
    const cv = document.getElementById('game') as HTMLCanvasElement;
    return { wh: world.height, ww: world.width, vh: window.innerHeight, vw: window.innerWidth, cw: cv.width, ch: cv.height };
  });
  // ใช้พื้นที่: กว้างเต็มจอ หรือสูงอย่างน้อย 45% ของจอ (แนวตั้ง)
  expect(r.ww >= r.vw - 2 || r.wh >= r.vh * 0.45).toBe(true);
  if (r.vh > r.vw) expect(r.wh).toBeGreaterThanOrEqual(r.vh * 0.45);
  // canvas สัดส่วนตรงกับพื้นที่จริง (ยืดได้ไม่เกิน 3%)
  expect(Math.abs((r.cw / r.ch) / (r.ww / r.wh) - 1)).toBeLessThan(0.03);
  expect(errors).toEqual([]);
});

test('toast ไม่ทับหน้าต่าง modal (B-006)', async function ({ page }) {
  const errors = watchErrors(page);
  await boot(page, 'adult=1&notour=1&new=1&t=600');
  await page.evaluate(function () { (window as any).__ol.bills(); });
  await page.waitForTimeout(450);
  await page.locator('#billAuto').click(); // ปิด modal → toast → เปิดใหม่ (toast ยังค้างอยู่)
  await page.waitForTimeout(450);
  const r = await page.evaluate(function () {
    const t = (Array.prototype.slice.call(document.querySelectorAll('#toast .toast-item')) as HTMLElement[]).filter(function (el) { return el.offsetParent !== null; });
    const m = (document.getElementById('modal') as HTMLElement).getBoundingClientRect();
    const overlaps = t.some(function (el) {
      const a = el.getBoundingClientRect();
      return a.left < m.right && m.left < a.right && a.top < m.bottom && m.top < a.bottom;
    });
    return { toasts: t.length, overlaps: overlaps };
  });
  expect(r.toasts).toBeGreaterThan(0);
  expect(r.overlaps).toBe(false);
  await shot(page, '09b-bills-toast');
  expect(errors).toEqual([]);
});

test('เมนูหลักแสดงก่อนเข้าเกม', async function ({ page }) {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.waitForTimeout(1200);
  await shot(page, '01-menu');
  expect(errors).toEqual([]);
});

test('เริ่มชีวิตใหม่ → หน้าสร้างตัวละคร', async function ({ page }) {
  const errors = watchErrors(page);
  await boot(page, 'new=1');
  expect(await page.evaluate('(' + W + ').__ol.life.phase')).toBe('creation');
  await shot(page, '02-creation');
  expect(errors).toEqual([]);
});

test('แผนที่เมือง กลางวัน/กลางคืน + audit ทั้งหมด', async function ({ page }) {
  const errors = watchErrors(page);
  await boot(page, 'adult=1&notour=1&new=1&t=600');
  expect(await page.evaluate('(' + W + ').__ol.life.phase')).toBe('adult');
  expect(await audits(page)).toEqual(CLEAN);
  await shot(page, '03-city-day');
  await boot(page, 'adult=1&notour=1&new=1&t=1260');
  await shot(page, '04-city-night');
  expect(errors).toEqual([]);
});

test('ฉากภายใน: ออฟฟิศ และบ้าน', async function ({ page }) {
  const errors = watchErrors(page);
  await boot(page, 'adult=1&notour=1&new=1&scene=office&x=9&y=9&t=600');
  await shot(page, '05-office');
  await boot(page, 'adult=1&notour=1&new=1&scene=home&t=1260');
  await shot(page, '06-home-night');
  expect(errors).toEqual([]);
});

test('บางขุนเทียน กลางวัน/กลางคืน + district audit', async function ({ page }) {
  const errors = watchErrors(page);
  await boot(page, 'adult=1&notour=1&new=1&district=bangkhunthian&t=600');
  expect(await page.evaluate('(' + W + ').__districtAudit()')).toEqual([]);
  await shot(page, '07-bangkhunthian-day');
  await boot(page, 'adult=1&notour=1&new=1&district=bangkhunthian&t=1260');
  await shot(page, '08-bangkhunthian-night');
  expect(errors).toEqual([]);
});

test('feature บิล: เปิดหน้าบิล → จ่ายเงินสด → เงินลดและขึ้นว่าจ่ายแล้ว', async function ({ page }) {
  const errors = watchErrors(page);
  await boot(page, 'adult=1&notour=1&new=1&t=600');
  const before = await page.evaluate(function () {
    const w = window as any;
    w.__ol.stats.money = 100000;
    w.__ol.bills();
    return w.__ol.stats.money;
  });
  await expect(page.locator('#billPayCash')).toBeVisible();
  await page.waitForTimeout(450); // รอแอนิเมชันเปิด modal จบก่อนถ่ายภาพ
  await shot(page, '09-bills');
  await page.locator('#billPayCash').click();
  const after = await page.evaluate(function () { return (window as any).__ol.stats.money; });
  expect(after).toBeLessThan(before);
  await page.evaluate(function () { (window as any).__ol.bills(); });
  await expect(page.locator('#billPayCash')).toHaveCount(0);
  await expect(page.locator('#modal')).toContainText('จ่ายแล้วเทิร์นนี้');
  expect(errors).toEqual([]);
});

test('เซฟแล้วรีโหลดได้ค่าเดิม', async function ({ page }) {
  const errors = watchErrors(page);
  await boot(page, 'adult=1&notour=1&new=1');
  await page.evaluate(function () {
    const w = window as any;
    w.__ol.stats.money = 54321;
    w.__ol.life.flags.e2eFlag = true;
    window.dispatchEvent(new Event('pagehide'));
  });
  await boot(page, 'skipmenu=1&notour=1');
  const r = await page.evaluate(function () {
    const w = window as any;
    return { money: w.__ol.stats.money, flag: w.__ol.life.flags.e2eFlag, phase: w.__ol.life.phase };
  });
  expect(r).toEqual({ money: 54321, flag: true, phase: 'adult' });
  expect(errors).toEqual([]);
});

test('ทุกแผนที่จังหวัด/อำเภอ render ได้และผ่าน district audit', async function ({ page }) {
  test.skip(test.info().project.name !== 'desktop', 'ตรวจทุกแผนที่บนเดสก์ท็อปรอบเดียวพอ');
  const errors = watchErrors(page);
  await boot(page, 'adult=1&notour=1&new=1&t=600');
  const problems: string[] = [];
  for (const p of geo as any[]) {
    for (const d of p.districts) {
      const hood = d.neighborhoods[0];
      const issues = await page.evaluate(function (a: string[]) {
        const w = window as any;
        w.__ol.enterMap(a[0], a[1], a[2]);
        return w.__districtAudit();
      }, [p.name, d.id, hood.id]);
      if (issues.length) problems.push(p.id + '/' + d.id + ': ' + issues.join(', '));
      await page.waitForTimeout(80);
    }
    await shot(page, '10-map-' + p.id);
  }
  expect(problems).toEqual([]);
  expect(errors).toEqual([]);
});
