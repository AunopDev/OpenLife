/* OpenLife — small pure utilities */
let seed = 987654321;

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function rnd(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

export function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** escape ข้อความที่ผู้เล่นพิมพ์ (ชื่อ ฯลฯ) ก่อนใส่ใน HTML — กันหน้าจอพัง/สคริปต์แทรก (B-004, code.md §5) */
export function escapeHtml(s: unknown): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
