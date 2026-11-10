/* เซฟ: บันทึก → โหลดได้ค่าเดิม, เซฟเก่าที่ขาด field ได้ค่า default, เวอร์ชันไม่ตรงไม่พัง
   กฎ: docs/rules/code.md §4 · ไฟล์เซฟตัวอย่าง: tests/saves/ */
import { describe, it, expect, beforeEach } from 'vitest';
import { saveGame, loadGame, SaveContext } from '../../src/core/save';
import { stats, world, flags, profile, finance, career, debts, life, SAVE_KEY } from '../../src/core/state';
import v3Minimal from '../saves/v3-minimal.json';

class MemoryStorage {
  data: Record<string, string> = {};
  getItem(k: string) { return Object.prototype.hasOwnProperty.call(this.data, k) ? this.data[k] : null; }
  setItem(k: string, v: string) { this.data[k] = String(v); }
  removeItem(k: string) { delete this.data[k]; }
  clear() { this.data = {}; }
}

const storage = new MemoryStorage();
(globalThis as any).localStorage = storage;

let monthsPlayed = 0;
let scene = 'city';
const player = { x: 0, y: 0, dir: 'down' };

function ctx(): SaveContext {
  return {
    saveKey: SAVE_KEY, stats, world, flags, profile, finance, debts, career, life, player,
    scene: scene, viewMode: 'map',
    getMonthsPlayed: function () { return monthsPlayed; },
    setMonthsPlayed: function (v: number) { monthsPlayed = v; },
    sceneExists: function () { return true; },
    setPlayer: function (x: number, y: number, dir: string) { player.x = x; player.y = y; player.dir = dir; },
    setScene: function (n: string) { scene = n; },
    setViewMode: function () { /* no-op */ }
  };
}

beforeEach(function () { storage.clear(); });

describe('save / load', function () {
  it('บันทึกแล้วโหลดได้ค่าเดิม', function () {
    stats.money = 12345;
    life.flags.testFlag = true;
    life.ageMonths = 300;
    monthsPlayed = 7;
    saveGame(ctx());
    stats.money = 1;
    life.flags.testFlag = false;
    monthsPlayed = 0;
    expect(loadGame(ctx())).toBe(true);
    expect(stats.money).toBe(12345);
    expect(life.flags.testFlag).toBe(true);
    expect(monthsPlayed).toBe(7);
  });

  it('ไม่มีเซฟ → false', function () {
    expect(loadGame(ctx())).toBe(false);
  });

  it('เซฟเวอร์ชันอื่น → false และไม่ throw', function () {
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 2, stats: {} }));
    expect(loadGame(ctx())).toBe(false);
  });

  it('เซฟเสีย (JSON พัง) → false และไม่ throw', function () {
    storage.setItem(SAVE_KEY, '{not json');
    expect(loadGame(ctx())).toBe(false);
  });

  it('เซฟ v3 รุ่นเก่าที่ขาด field ใหม่ ได้ค่า default ครบ', function () {
    storage.setItem(SAVE_KEY, JSON.stringify(v3Minimal));
    expect(loadGame(ctx())).toBe(true);
    expect(Array.isArray(life.milestones)).toBe(true);
    expect(typeof life.needs.fun).toBe('number');
    expect(typeof life.skills.tech).toBe('number');
    expect(typeof life.grooming).toBe('number');
    expect(life.plannedMonths).toBe(1);
    expect(life.parents.alive).toBe(true);
  });
});
