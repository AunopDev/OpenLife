/* architecture.test — กันกฎสถาปัตยกรรมถอยหลัง (docs/rules/architecture.md)
   1) feature ห้าม import จาก game.ts
   2) feature ห้ามใช้ @ts-nocheck
   3) feature ต้องมี index.ts + controller/service
   4) core/sim ห้าม import จาก ui/render/features/game
   อ่านไฟล์ผ่าน import.meta.glob (ไม่ต้องใช้ node types) */
import { describe, it, expect } from 'vitest';

const files = import.meta.glob('../../src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

function rel(key: string): string {
  return key.replace('../../src/', '');
}

function importsOf(text: string): string[] {
  const re = /from\s+['"]([^'"]+)['"]/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[1]);
  return out;
}

const featureFiles = Object.keys(files).filter(function (k) { return rel(k).startsWith('features/'); });

describe('feature module hygiene', function () {
  const dirs = new Set<string>();
  featureFiles.forEach(function (k) {
    const parts = rel(k).split('/');
    if (parts.length > 2) dirs.add(parts[1]);
  });

  it('มี feature อย่างน้อย 4 ตัว และแต่ละตัวมี index.ts', function () {
    expect(dirs.size).toBeGreaterThanOrEqual(4);
    dirs.forEach(function (d) {
      const hasIndex = featureFiles.some(function (k) { return rel(k) === 'features/' + d + '/index.ts'; });
      expect(hasIndex, d + ' missing index.ts').toBe(true);
    });
  });

  it('ทุก feature มี controller หรือ service (แยกบทบาท)', function () {
    dirs.forEach(function (d) {
      const ok = Array.from(dirs).length > 0 && featureFiles.some(function (k) {
        const r = rel(k);
        return r.startsWith('features/' + d + '/') &&
          (r.endsWith('.controller.ts') || r.endsWith('.service.ts'));
      });
      expect(ok, d + ' ต้องมี controller/service').toBe(true);
    });
  });

  it('feature ห้าม import จาก game.ts และห้ามใช้ @ts-nocheck', function () {
    expect(featureFiles.length).toBeGreaterThan(0);
    featureFiles.forEach(function (k) {
      const text = files[k];
      expect(text.indexOf('@ts-nocheck'), rel(k)).toBe(-1);
      importsOf(text).forEach(function (spec) {
        expect(/game$/.test(spec), rel(k) + ' imports game.ts').toBe(false);
      });
    });
  });
});

describe('shared layer direction', function () {
  it('core/sim ห้าม import จาก ui/render/features/game', function () {
    const shared = Object.keys(files).filter(function (k) {
      const r = rel(k);
      return r.startsWith('core/') || r.startsWith('sim/');
    });
    expect(shared.length).toBeGreaterThan(0);
    shared.forEach(function (k) {
      importsOf(files[k]).forEach(function (spec) {
        expect(/^(\.\.\/)+(ui|render|features|game)/.test(spec), rel(k) + ' → ' + spec).toBe(false);
      });
    });
  });
});
