/* 잘지냥 — 교실 팔레트 & 공용 상수 */

export const T = {
  wall: '#F6EDDD',
  wallShade: '#EFE3CD',
  floor: '#C9995E',
  floorLine: 'rgba(122,79,38,0.30)',
  boardBg: '#31513F',
  boardFrame: '#8A5A2B',
  chalk: '#F2F5EA',
  deskTop: '#B07C42',
  deskFront: '#8A5A2B',
  deskShadow: 'rgba(80,50,20,0.18)',
  ink: '#3D3345',
  sub: '#8A8296',
  card: '#FFFFFF',
  cardLine: '#EAE3D4',
  bg: '#FBF7EE',
  accent: '#E8A93C',
  accentSoft: '#FFF3D6',
  heart: '#F16A8B',
  star: '#F0B429',
  green: '#5B8A5E',
  danger: '#C0392B',
  curtain: '#9AB8D8',
  curtainDark: '#7797B8',
} as const;

export const CAT_COLORS: Record<string, { fur: string; belly: string; label: string }> = {
  cream:  { fur: '#F7EEDC', belly: '#FFFFFF', label: '크림' },
  cheese: { fur: '#F2CE8B', belly: '#FBE9C8', label: '치즈' },
  gray:   { fur: '#CDD2DC', belly: '#E8EBF0', label: '회색' },
};

export const RARITY_META: Record<string, { label: string; color: string; glow: string }> = {
  common:    { label: '커먼',     color: '#9AA5B1', glow: 'rgba(154,165,177,0.35)' },
  rare:      { label: '레어',     color: '#4DABF7', glow: 'rgba(77,171,247,0.4)' },
  epic:      { label: '에픽',     color: '#B197FC', glow: 'rgba(177,151,252,0.45)' },
  legendary: { label: '레전더리', color: '#FFD43B', glow: 'rgba(255,212,59,0.55)' },
};

export const LINE = '#4A3222';

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <Type,>(arr: readonly Type[]): Type =>
  arr[Math.floor(Math.random() * arr.length)];
