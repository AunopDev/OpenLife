import { defineConfig } from '@playwright/test';

// e2e smoke: เปิดเกมจริง (production build ผ่าน vite preview) บน 4 ขนาดจอ (มือถือ 2 แนว, แท็บเล็ต, เดสก์ท็อป)
// รันผ่าน `npm run check` (build ก่อน) หรือ `npm run build && npm run e2e`
// ภาพหน้าจอสำหรับตรวจด้วยตา: test-results/screens/<project>/*.png — ดู docs/rules/quality.md
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium'
  },
  projects: [
    { name: 'mobile-portrait', use: { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } },
    { name: 'mobile-landscape', use: { viewport: { width: 812, height: 375 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } }
  ],
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 60000
  }
});
