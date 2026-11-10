import { defineConfig } from 'vitest/config';

// unit test: ตรรกะที่ไม่แตะ DOM (แผนที่ event เซฟ ภูมิศาสตร์ เนื้อหา) — ดู docs/rules/quality.md
export default defineConfig({
  test: {
    // tests/unit = test รวมทั้งระบบ · src/**/*.test.ts = test คู่ไฟล์ใน feature (architecture.md §7)
    include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node'
  }
});
