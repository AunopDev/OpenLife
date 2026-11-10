/* job-search.service — unit test (สูตรล้วน ไม่พึ่งเบราว์เซอร์) */
import { describe, it, expect } from 'vitest';
import {
  officeChance, officeSalary, freeSalary, looksEligible, looksSalary, looksChance, evaluateJobSearch, rollPass
} from './job-search.service';
import type { JobSearchInput } from './job-search.types';

function input(over: Partial<JobSearchInput> = {}): JobSearchInput {
  return {
    age: 22,
    smarts: 50,
    social: 50,
    grooming: 70,
    formal: true,
    connection: false,
    communication: 0,
    tech: 0,
    creativity: 0,
    ...over
  };
}

describe('โอกาสสัมภาษณ์ออฟฟิศ', () => {
  it('ค่าฐาน (อายุ 22, ปัญญา/สังคม 50, แต่งตัวสุภาพ) = 57%', function () {
    expect(officeChance(input())).toBe(57);
  });
  it('อายุ 50 ลดโอกาส', function () {
    expect(officeChance(input({ age: 50 }))).toBe(45);
  });
  it('แต่งตัวลำลอง −10', function () {
    expect(officeChance(input({ formal: false }))).toBe(47);
  });
  it('มีคอนเนคชัน +10', function () {
    expect(officeChance(input({ connection: true }))).toBe(67);
  });
  it(' clamp 10–90', function () {
    expect(officeChance(input({ age: 80, smarts: 0, social: 0, grooming: 0, formal: false }))).toBe(10);
    expect(officeChance(input({ smarts: 100, social: 100, grooming: 100, connection: true, communication: 100 }))).toBe(90);
  });
});

describe('เงินเดือน', () => {
  it('ออฟฟิศ/ฟรีแลนซ์/บันเทิง ตามสูตร', function () {
    expect(officeSalary(input())).toBe(22000);
    expect(freeSalary(input())).toBe(11000);
    expect(looksSalary(input())).toBe(21800);
  });
  it('ทักษะเทคโนโลยีเพิ่มเงินเดือนออฟฟิศ', function () {
    expect(officeSalary(input({ tech: 10 }))).toBe(22300);
  });
});

describe('สายบันเทิง', () => {
  it('ต้อง grooming ≥55 และ social ≥40', function () {
    expect(looksEligible(input())).toBe(true);
    expect(looksEligible(input({ grooming: 54 }))).toBe(false);
    expect(looksEligible(input({ social: 30 }))).toBe(false);
  });
  it('โอกาสแคสติ้งฐาน 40% และลดตามอายุ', function () {
    expect(looksChance(input())).toBe(40);
    expect(looksChance(input({ age: 45 }))).toBe(34);
  });
});

describe('ทอยผล', () => {
  it('ผ่านเมื่อ rng < chance/100', function () {
    expect(rollPass(50, 0.49)).toBe(true);
    expect(rollPass(50, 0.5)).toBe(false);
    expect(rollPass(10, 0.05)).toBe(true);
  });
});

describe('evaluateJobSearch', () => {
  it('คืนค่าครบทุกช่อง', function () {
    const o = evaluateJobSearch(input());
    expect(o).toEqual({
      chance: 57,
      officeSalary: 22000,
      freeSalary: 11000,
      looksOk: true,
      looksSalary: 21800,
      looksChance: 40
    });
  });
});
