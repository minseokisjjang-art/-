/* 교실 낮/밤(스탠바이) 팔레트 */

export const DAY = {
  wall: '#F4EAD6',           // 교실 벽
  floor: '#C9995E',          // 나무 바닥
  floorLine: 'rgba(122,79,38,0.35)',
  boardBg: '#2F4F3E',        // 칠판
  boardFrame: '#8A5A2B',     // 칠판 나무 프레임
  chalk: '#F2F5EA',          // 분필 글씨
  deskTop: '#A9764A',        // 책상 상판
  deskBody: '#8A5A2B',       // 책상 앞판
  ink: '#3D3345',
  card: 'rgba(255,255,255,0.9)',
  clock: '#3D3345',
};

export const NIGHT = {
  wall: '#232936',
  floor: '#4E3A28',
  floorLine: 'rgba(0,0,0,0.3)',
  boardBg: '#24352C',
  boardFrame: '#5C4322',
  chalk: '#E8EDDF',
  deskTop: '#6B4E33',
  deskBody: '#523B26',
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
