/* 잘지냥 — 공용 타입 */

export type CatColor = 'cream' | 'cheese' | 'gray';
export type PresenceState = 'active' | 'walking' | 'idle' | 'private';
export type Slot = 'hat' | 'neck' | 'desk' | 'effect';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Item {
  id: string;
  name: string;
  slot: Slot;
  rarity: Rarity;
}

export interface Profile {
  id: string;
  nickname: string;
  catColor: CatColor;
  shareStatus: boolean;
  shareCounter: boolean;
  totalCount: number;
}

/** 교실 화면에 그려지는 한 명 */
export interface Member {
  id: string;
  nickname: string;
  catColor: CatColor;
  /** null이면 카운터 비공개 */
  totalCount: number | null;
  state: PresenceState;
  equipped: string[]; // item ids
  isMe: boolean;
  isDemo?: boolean;
}

export type TimeBucket = '아침에' | '낮에' | '저녁에' | '밤에';

export interface PatEntry {
  id: string;
  fromNickname: string;
  bucket: TimeBucket;
  dayLabel: string; // '오늘' | '어제' | 'n일 전'
  at: number;
  isDemo?: boolean;
}

export interface Wallet {
  balance: number;
  earnedToday: number;
  dailyCap: number;
}

export interface InventoryEntry {
  itemId: string;
  equipped: boolean;
}

export interface OpenBoxResult {
  result: 'ok' | 'insufficient';
  itemId?: string;
  name?: string;
  slot?: Slot;
  rarity?: Rarity;
  duplicate?: boolean;
  refund?: number;
}

export type JoinResult = 'ok' | 'not_found' | 'full';

export interface ClassroomSnapshot {
  code: string | null;
  members: Member[];
}

export function timeBucketOf(d: Date): TimeBucket {
  const h = d.getHours();
  if (h >= 5 && h < 12) return '아침에';
  if (h >= 12 && h < 18) return '낮에';
  if (h >= 18 && h < 23) return '저녁에';
  return '밤에';
}

export function dayLabelOf(at: number, now = Date.now()): string {
  const d = new Date(at);
  const n = new Date(now);
  const dayDiff = Math.floor(
    (new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000,
  );
  if (dayDiff <= 0) return '오늘';
  if (dayDiff === 1) return '어제';
  return `${dayDiff}일 전`;
}

/** 1.2만 식 축약 */
export function abbreviate(n: number): string {
  if (n >= 10000) {
    const v = n / 10000;
    return `${v >= 100 ? Math.round(v) : Math.round(v * 10) / 10}만`;
  }
  return n.toLocaleString();
}
