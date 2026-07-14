/* 낮/밤(스탠바이) 팔레트 — 기존 PWA 잠금화면 장면의 색을 가져왔다 */

export const DAY = {
  sky: '#BFE3F7',
  skyDeep: '#A9D7F2',
  sun: '#FFD93D',
  cloud: '#FFFFFF',
  grass: '#A8CB8E',
  grassDeep: '#7FAF6B',
  fence: '#E9DFC8',
  ink: '#3D3345',
  card: 'rgba(255,255,255,0.88)',
  clock: '#3D3345',
};

export const NIGHT = {
  sky: '#1C2740',
  skyDeep: '#141D31',
  sun: '#F4EBC3',          // 달
  cloud: 'rgba(255,255,255,0.14)',
  grass: '#2E4630',
  grassDeep: '#24391F',
  fence: '#4A4433',
  ink: '#E7ECF5',
  card: 'rgba(20,29,49,0.85)',
  clock: '#F2F5FB',
};

export const CAT = {
  fur: '#F7EEDC',
  line: '#4A3222',
  innerEar: '#FFB3C1',
  nose: '#E8899E',
};

export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
