/* OpenLife — static world data (tile coordinates) */
export const MAP_W = 40;
export const MAP_H = 28;

export const BUILDINGS = [
  { id: 'school', name: 'โรงเรียน', x: 2, y: 2, w: 4, h: 3, roof: '#5a6e8a', roofDark: '#3e4e66', wall: '#2f3a52', sign: '#2f3f66', door: 4 },
  { id: 'hospital', name: 'โรงพยาบาล', x: 33, y: 3, w: 4, h: 3, roof: '#8a4a5a', roofDark: '#5e2f3d', wall: '#3a2030', sign: '#a13a52', door: 35 },
  { id: 'office', name: 'บริษัท สยามเทค', x: 16, y: 3, w: 5, h: 4, roof: '#39477e', roofDark: '#28325c', wall: '#232b52', sign: '#2f4bb0', door: 18 },
  { id: 'home', name: 'บ้าน', x: 3, y: 12, w: 4, h: 3, roof: '#7a5240', roofDark: '#553327', wall: '#3d2419', sign: '#8a5f47', door: 5 },
  { id: 'seven', name: '7-Eleven', x: 24, y: 13, w: 3, h: 2, roof: '#2f7d52', roofDark: '#1f5537', wall: '#1d3d2c', sign: '#2f9d62', door: 25 },
  { id: 'gym', name: 'ฟิตเนส', x: 34, y: 12, w: 4, h: 3, roof: '#4b3a6e', roofDark: '#33264c', wall: '#241a3a', sign: '#6b4fb0', door: 36 },
  { id: 'bar', name: 'ร้านเหล้า', x: 23, y: 25, w: 3, h: 2, roof: '#6e3a4e', roofDark: '#4c2736', wall: '#33202a', sign: '#b04158', door: 24 }
];

export const TREES = [
  [7, 3], [9, 3], [27, 3], [38, 3],
  [7, 11], [9, 11], [27, 11], [39, 11],
  [7, 17], [23, 17], [37, 17],
  [0, 6], [39, 5], [22, 24], [37, 24],
  [2, 18], [22, 6]
];

export const BUSHES = [
  [7.4, 5.4], [9.6, 5.4],
  [4.6, 11.2], [8.4, 11.2],
  [19.2, 11.4], [23.2, 11.4], [27.6, 11.4],
  [22.4, 13.4], [22.4, 16.4],
  [8.4, 18.2], [21.4, 18.4],
  [35.4, 11.4], [38.4, 16.4],
  [22.4, 23.4], [22.4, 26.4],
  [2.4, 23.4], [9.9, 25.5],
  [24.4, 5.4], [28.4, 5.4], [26.6, 6.4], [38.6, 6.4], [8.2, 6.4]
];

export const SCOOTERS = [
  [7.9, 10.55, '#c9d6ff'],
  [25.4, 7.45, '#ff8fb1'],
  [22.6, 10.5, '#ffd75e'],
  [33.6, 7.5, '#7dd3fc'],
  [27.4, 10.5, '#6ee7a8']
];

export const LIGHTS = [
  [9, 7.4], [16, 7.4], [24, 7.4], [33, 7.4],
  [9, 10.6], [16, 10.6], [24, 10.6], [33, 10.6],
  [9.6, 26.3]
];

export const POND = { x: 6, y: 24, w: 2, h: 2 };

export const HOUSES = [
  { x: 15, y: 12, w: 3, h: 2, roof: '#5a6e8a', roofDark: '#3e4e66' },
  { x: 19, y: 12, w: 3, h: 2, roof: '#7a5240', roofDark: '#553327' },
  { x: 15, y: 15, w: 3, h: 2, roof: '#6e5a3a', roofDark: '#4a3c26' },
  { x: 19, y: 15, w: 3, h: 2, roof: '#4b5a7a', roofDark: '#333f58' },
  { x: 33, y: 16, w: 3, h: 2, roof: '#6e4a5a', roofDark: '#4c2736' },
  { x: 33, y: 23, w: 3, h: 2, roof: '#5a6e8a', roofDark: '#3e4e66' },
  { x: 15, y: 23, w: 3, h: 2, roof: '#7a5240', roofDark: '#553327' },
  { x: 26, y: 16, w: 2, h: 2, roof: '#6e5a3a', roofDark: '#4a3c26' },
  { x: 0, y: 16, w: 2, h: 2, roof: '#4b5a7a', roofDark: '#333f58' },
  { x: 26, y: 23, w: 2, h: 2, roof: '#6e5a3a', roofDark: '#4a3c26' }
];

export const OFFICE = { w: 18, h: 11 };
export const HOME = { w: 14, h: 9 };
export const DESKS = [[4, 3], [8, 3], [12, 3]];
