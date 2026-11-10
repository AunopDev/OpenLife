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
