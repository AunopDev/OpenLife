/* OpenLife — calendar helpers */
export const WEEK = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
export const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function dateParts(day: number): { d: number; m: number; y: number } {
  let d = day;
  let m = 0;
  let y = 2569;
  while (d >= MDAYS[m]) {
    d -= MDAYS[m];
    m += 1;
    if (m >= 12) {
      m = 0;
      y += 1;
    }
  }
  return { d: d + 1, m: m, y: y };
}

export function nextMonthStart(day: number): number {
  const p = dateParts(day);
  return day + (MDAYS[p.m] - p.d + 1);
}

export function isMonthEnd(day: number): boolean {
  const p = dateParts(day);
  return p.d === MDAYS[p.m];
}
