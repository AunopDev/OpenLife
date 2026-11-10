import { describe, it, expect } from 'vitest';
import { escapeHtml, clamp, fmt } from './util';

describe('escapeHtml (B-004)', function () {
  it('แปลงอักขระพิเศษของ HTML', function () {
    expect(escapeHtml('<img src=x onerror="a">')).toBe('&lt;img src=x onerror=&quot;a&quot;&gt;');
    expect(escapeHtml("ก & ข 'ค'")).toBe('ก &amp; ข &#39;ค&#39;');
  });
  it('ข้อความไทยธรรมดาไม่เปลี่ยน', function () {
    expect(escapeHtml('สมชาย ใจดี')).toBe('สมชาย ใจดี');
  });
});

describe('clamp / fmt', function () {
  it('clamp ในช่วง', function () {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-3, 0, 100)).toBe(0);
  });
  it('fmt คั่นหลักพันและปัดเศษ', function () {
    expect(fmt(23100.4)).toBe('23,100');
  });
});
