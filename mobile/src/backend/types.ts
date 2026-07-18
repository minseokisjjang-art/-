import type {
  CatColor, ClassroomSnapshot, InventoryEntry, JoinResult,
  OpenBoxResult, PatEntry, PresenceState, Profile, Wallet,
} from '../types';

/*
 * 백엔드 인터페이스 — 구현체 2개:
 *  - LocalBackend:    오프라인/데모. AsyncStorage에 저장, 같은 규칙으로 동작.
 *  - SupabaseBackend: 실서버. .env에 EXPO_PUBLIC_SUPABASE_URL/ANON_KEY가 있으면 자동 선택.
 */

export type BackendEvent = 'members' | 'pats' | 'wallet' | 'inventory' | 'patReceived';

export interface Backend {
  readonly kind: 'local' | 'supabase';

  /** 세션 준비 + 저장된 프로필 로드 (없으면 null) */
  init(): Promise<Profile | null>;

  createProfile(nickname: string, catColor: CatColor): Promise<Profile>;
  updateProfile(patch: Partial<Pick<Profile, 'nickname' | 'catColor' | 'shareStatus' | 'shareCounter'>>): Promise<Profile>;

  createClassroom(): Promise<string>;           // invite code
  joinClassroom(code: string): Promise<JoinResult>;
  leaveClassroom(): Promise<void>;
  getSnapshot(): Promise<ClassroomSnapshot>;

  setMyState(state: Exclude<PresenceState, 'private'>): Promise<void>;
  sendPat(toId: string): Promise<'ok' | 'cooldown' | 'error'>;
  getPats(): Promise<PatEntry[]>;

  /** 서버 검증 적립. granted = 실제 적립된 별가루 */
  recordActivity(steps: number, touches: number): Promise<{ granted: number }>;
  getWallet(): Promise<Wallet>;
  openBox(): Promise<OpenBoxResult>;
  getInventory(): Promise<InventoryEntry[]>;
  equip(itemId: string): Promise<void>;
  unequip(slot: string): Promise<void>;

  on(event: BackendEvent, cb: () => void): () => void;

  /** 데모 도우미 (LocalBackend + 웹에서만 의미 있음) */
  demo?: {
    addFriends(): Promise<void>;
    receivePat(): Promise<void>;
    grantStars(n: number): Promise<void>;
  };
}

export class Emitter {
  private subs = new Map<string, Set<() => void>>();
  on(event: string, cb: () => void): () => void {
    if (!this.subs.has(event)) this.subs.set(event, new Set());
    this.subs.get(event)!.add(cb);
    return () => this.subs.get(event)?.delete(cb);
  }
  emit(event: string) {
    this.subs.get(event)?.forEach(cb => { try { cb(); } catch {} });
  }
}
