import type { Item, Rarity } from '../types';

/* 아이템 카탈로그 24종 — supabase/migrations/0001_init.sql의 시드와 반드시 일치 */

export const ITEMS: Item[] = [
  // 커먼 10
  { id: 'hat_straw',    name: '밀짚모자',        slot: 'hat',    rarity: 'common' },
  { id: 'hat_cap',      name: '야구모자',        slot: 'hat',    rarity: 'common' },
  { id: 'hat_paper',    name: '종이배 모자',     slot: 'hat',    rarity: 'common' },
  { id: 'neck_ribbon',  name: '빨간 리본',       slot: 'neck',   rarity: 'common' },
  { id: 'neck_bell',    name: '방울 목걸이',     slot: 'neck',   rarity: 'common' },
  { id: 'neck_scarf_y', name: '노란 손수건',     slot: 'neck',   rarity: 'common' },
  { id: 'desk_pencil',  name: '연필 한 자루',    slot: 'desk',   rarity: 'common' },
  { id: 'desk_mug',     name: '무지 머그컵',     slot: 'desk',   rarity: 'common' },
  { id: 'desk_apple',   name: '사과',            slot: 'desk',   rarity: 'common' },
  { id: 'desk_eraser',  name: '지우개',          slot: 'desk',   rarity: 'common' },
  // 레어 8
  { id: 'hat_beret',    name: '베레모',          slot: 'hat',    rarity: 'rare' },
  { id: 'hat_beanie',   name: '털모자',          slot: 'hat',    rarity: 'rare' },
  { id: 'neck_muffler', name: '체크 목도리',     slot: 'neck',   rarity: 'rare' },
  { id: 'neck_star',    name: '별 목걸이',       slot: 'neck',   rarity: 'rare' },
  { id: 'desk_plant',   name: '미니 화분',       slot: 'desk',   rarity: 'rare' },
  { id: 'desk_bento',   name: '도시락',          slot: 'desk',   rarity: 'rare' },
  { id: 'desk_gameboy', name: '게임보이',        slot: 'desk',   rarity: 'rare' },
  { id: 'fx_sparkle',   name: '연필 반짝임',     slot: 'effect', rarity: 'rare' },
  // 에픽 4
  { id: 'hat_wizard',   name: '마법사 모자',     slot: 'hat',    rarity: 'epic' },
  { id: 'neck_bowtie',  name: '나비넥타이 카라', slot: 'neck',   rarity: 'epic' },
  { id: 'desk_fishbowl',name: '금붕어 어항',     slot: 'desk',   rarity: 'epic' },
  { id: 'desk_laptop',  name: '노트북',          slot: 'desk',   rarity: 'epic' },
  // 레전더리 2
  { id: 'hat_crown',    name: '반짝이는 왕관',   slot: 'hat',    rarity: 'legendary' },
  { id: 'fx_stars',     name: '별이 흩날림',     slot: 'effect', rarity: 'legendary' },
];

export const itemById = (id: string): Item | undefined => ITEMS.find(i => i.id === id);

export const SLOT_LABEL: Record<string, string> = {
  hat: '모자', neck: '목 장식', desk: '책상 소품', effect: '이펙트',
};

/* 확률 — 상자 화면에 항상 표시 (SQL open_box와 일치) */
export const BOX_PRICE = 500;
export const BOX_RATES: { rarity: Rarity; pct: number }[] = [
  { rarity: 'common', pct: 60 },
  { rarity: 'rare', pct: 30 },
  { rarity: 'epic', pct: 8 },
  { rarity: 'legendary', pct: 2 },
];
export const PITY_AFTER_COMMONS = 10;
export const DUP_REFUND: Record<Rarity, number> = {
  common: 20, rare: 60, epic: 160, legendary: 400,
};

/* 적립 규칙 (SQL record_activity와 일치) */
export const EARN = {
  perSteps: { unit: 100, star: 10 },   // 걸음 100보 = ⭐10
  perTouches: { unit: 100, star: 5 },  // 터치 100회 = ⭐5
  dailyCap: 300,
  stepsSanityCap: 2000,                // 10분당 상식 상한
} as const;
