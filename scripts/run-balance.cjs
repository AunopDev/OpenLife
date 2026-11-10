/* รัน balance simulation ผ่าน Playwright (headless) — ใช้ชั่วคราวสำหรับวัดผล economy
   วิธีใช้: node scripts/run-balance.cjs 1,3,6,12   (ต้องมี `npx vite preview` ที่ port 4173) */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async function () {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', function (e) { errors.push(String(e)); });
  await page.goto('http://127.0.0.1:4173/?debug=1&adult=1&notour=1', { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.addScriptTag({ path: path.join(__dirname, 'balance-sim.js') });

  const steps = (process.argv[2] || '1,3,6,12').split(',').map(Number);
  const out = [];
  for (let i = 0; i < steps.length; i++) {
    const r = await page.evaluate(function (step) { return window.__sim(step); }, steps[i]);
    out.push(r);
    console.log(JSON.stringify(r));
  }
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/balance.json', JSON.stringify({ out: out, errors: errors }, null, 2));
  await browser.close();
})();
