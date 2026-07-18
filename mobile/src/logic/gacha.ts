import { BOX_PRICE, DUP_REFUND, ITEMS, PITY_AFTER_COMMONS } from '../data/items';
import type { Item, OpenBoxResult, Rarity } from '../types';

/*
 * 가챠 추첨 로직 — 로컬(오프라인) 모드 전용.
 * Supabase 연결 시에는 이 코드가 아니라 서버(open_box SQL 함수)가 추첨한다.
 * 규칙은 반드시 SQL과 동일하게 유지할 것: 60/30/8/2, 천장 10, 중복 20% 환급.
 */

export interface GachaState {
  balance: number;
  commonStreak: number;
  ownedIds: string[];
}

function rollRarity(rng: () => number, pity: boolean): Rarity {
  if (pity) {
    const r = rng() * 40; // 레어 이상에서 30/8/2 비율 유지
    if (r < 2) return 'legendary';
    if (r < 10) return 'epic';
    return 'rare';
  }
  const r = rng() * 100;
  if (r < 2) return 'legendary';
  if (r < 10) return 'epic';
  if (r < 40) return 'rare';
  return 'common';
}

export function openBoxLocal(
  state: GachaState,
  rng: () => number = Math.random,
): { result: OpenBoxResult; next: GachaState } {
  if (state.balance < BOX_PRICE) {
    return { result: { result: 'insufficient' }, next: state };
  }
  let rarity = rollRarity(rng, false);
  if (rarity === 'common' && state.commonStreak >= PITY_AFTER_COMMONS) {
    rarity = rollRarity(rng, true);
  }
  const pool = ITEMS.filter(i => i.rarity === rarity);
  const item: Item = pool[Math.floor(rng() * pool.length)];
  const duplicate = state.ownedIds.includes(item.id);
  const refund = duplicate ? DUP_REFUND[item.rarity] : 0;

  return {
    result: {
      result: 'ok',
      itemId: item.id,
      name: item.name,
      slot: item.slot,
      rarity: item.rarity,
      duplicate,
      refund,
    },
    next: {
      balance: state.balance - BOX_PRICE + refund,
      commonStreak: item.rarity === 'common' ? state.commonStreak + 1 : 0,
      ownedIds: duplicate ? state.ownedIds : [...state.ownedIds, item.id],
    },
  };
}
