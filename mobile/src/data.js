/* 아이템 카탈로그 / 대사 기본값 / 포인트 경제 상수 — PWA의 CATALOG를 계승 */

export const HATS = [
  { id: 'hat-cap',    emoji: '🧢', name: '야구모자', price: 80 },
  { id: 'hat-ribbon', emoji: '🎀', name: '리본',     price: 80 },
  { id: 'hat-clover', emoji: '🍀', name: '클로버',   price: 100 },
  { id: 'hat-head',   emoji: '🎧', name: '헤드폰',   price: 150 },
  { id: 'hat-top',    emoji: '🎩', name: '신사모자', price: 200 },
  { id: 'hat-crown',  emoji: '👑', name: '황금왕관', price: 500 },
];

export const FURS = [
  { id: 'fur-cream',  color: '#F7EEDC', name: '크림',  price: 0 },
  { id: 'fur-golden', color: '#F0D3A0', name: '골든',  price: 120 },
  { id: 'fur-gray',   color: '#CDD2DC', name: '회색',  price: 120 },
  { id: 'fur-choco',  color: '#A47148', name: '초코',  price: 200 },
  { id: 'fur-pink',   color: '#F5C6D0', name: '핑크',  price: 300 },
  { id: 'fur-mint',   color: '#BFE6CF', name: '민트',  price: 300 },
];

export const furById = id => FURS.find(f => f.id === id) || FURS[0];
export const hatById = id => HATS.find(h => h.id === id) || null;

/* 대사: 8초마다 각 대사의 확률(%)로 등장. 합이 100을 넘으면 비율대로 축소 */
export const SPEAK_TICK_MS = 8000;
export const DEFAULT_LINES = [
  { id: 'l1', text: '야옹~', p: 30 },
  { id: 'l2', text: '오늘도 열심히!', p: 20 },
  { id: 'l3', text: '간식 주세요 🐟', p: 15 },
];

/* 포인트 경제: 1,000포인트 = 별가루 10 — 받기 버튼이 하루 여러 번 켜지는 마이크로 클레임 */
export const POINT_UNIT = 1000;
export const STARDUST_PER_UNIT = 10;
export const BONUS_TAP = 1;      // 내 고양이 탭
export const BONUS_PET = 5;      // 내가 쓰다듬기
export const BONUS_FRIEND_PET = 10;  // 친구가 내 고양이를 쓰다듬어 줌

export function relTime(t) {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return '방금';
  if (s < 3600) return Math.floor(s / 60) + '분 전';
  if (s < 86400) return Math.floor(s / 3600) + '시간 전';
  return Math.floor(s / 86400) + '일 전';
}
