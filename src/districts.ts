/* OpenLife — districts and block identity */
import districtData from './data/districts.json';

export interface District {
  id: string;
  name: string;
  rect: [number, number, number, number];
  label: [number, number];
  spot: [number, number];
  accent: string;
  roof: string;
  roofDark: string;
  sign: string;
  vibe: string;
  activity: string;
  activityText: string;
  activityFx: any;
  nightActivity?: string;
  nightFx?: any;
}

export const DISTRICTS: District[] = districtData as District[];

export function districtAt(tx: number, ty: number): District | null {
  for (let i = 0; i < DISTRICTS.length; i += 1) {
    const d = DISTRICTS[i];
    const r = d.rect;
    if (tx >= r[0] && ty >= r[1] && tx < r[0] + r[2] && ty < r[1] + r[3]) return d;
  }
  return null;
}

export function districtStyle(tx: number, ty: number): { roof?: string; roofDark?: string; sign?: string; accent?: string } {
  const d = districtAt(tx, ty);
  if (!d) return {};
  return { roof: d.roof, roofDark: d.roofDark, sign: d.sign, accent: d.accent };
}

export function districtById(id: string): District | null {
  for (let i = 0; i < DISTRICTS.length; i += 1) {
    if (DISTRICTS[i].id === id) return DISTRICTS[i];
  }
  return null;
}
