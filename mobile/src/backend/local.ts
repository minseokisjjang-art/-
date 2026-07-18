import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeEarn, todayKey } from '../logic/earn';
import { openBoxLocal } from '../logic/gacha';
import { ITEMS } from '../data/items';
import { EARN } from '../data/items';
import type {
  CatColor, ClassroomSnapshot, InventoryEntry, JoinResult, Member,
  OpenBoxResult, PatEntry, PresenceState, Profile, Wallet,
} from '../types';
import { dayLabelOf, timeBucketOf } from '../types';
import type { Backend } from './types';
import { Emitter } from './types';
import { pick, rand } from '../theme';

/*
 * LocalBackend — Supabase 없이 동작하는 오프라인 모드.
 * 규칙(적립 상한·가챠 확률·쿨다운)은 서버 SQL과 동일하게 유지한다.
 * 데모 친구 기능으로 폰 1대에서도 전체 루프를 체험/검증할 수 있다.
 */

const KEY = 'jaljinyang-local-v1';

interface DemoFriend {
  id: string;
  nickname: string;
  catColor: CatColor;
  state: Exclude<PresenceState, 'private'> | 'private';
  totalCount: number;
  equipped: string[];
  until: number;
}

interface Store {
  profile: Profile | null;
  classroomCode: string | null;
  myState: Exclude<PresenceState, 'private'>;
  pats: { id: string; fromNickname: string; at: number; isDemo?: boolean }[];
  wallet: { balance: number; earnedToday: number; lastEarnedDate: string | null; commonStreak: number };
  inventory: InventoryEntry[];
  demoFriendsJoined: boolean;
  patCooldowns: Record<string, number>;
}

const DEMO_FRIENDS: Omit<DemoFriend, 'state' | 'until'>[] = [
  { id: 'demo-1', nickname: '민지', catColor: 'cheese', totalCount: 48210, equipped: ['hat_beret', 'neck_ribbon'] },
  { id: 'demo-2', nickname: '준호', catColor: 'gray', totalCount: 31580, equipped: ['desk_gameboy'] },
];

function freshStore(): Store {
  return {
    profile: null,
    classroomCode: null,
    myState: 'idle',
    pats: [],
    wallet: { balance: 0, earnedToday: 0, lastEarnedDate: null, commonStreak: 0 },
    inventory: [],
    demoFriendsJoined: false,
    patCooldowns: {},
  };
}

function genCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

export class LocalBackend implements Backend {
  readonly kind = 'local' as const;
  private store: Store = freshStore();
  private emitter = new Emitter();
  private friends: DemoFriend[] = [];
  private simTimer: ReturnType<typeof setInterval> | null = null;

  async init(): Promise<Profile | null> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) this.store = { ...freshStore(), ...JSON.parse(raw) };
    } catch {}
    this.rolloverIfNeeded();
    if (this.store.demoFriendsJoined) this.startDemoFriends();
    return this.store.profile;
  }

  private async save() {
    try { await AsyncStorage.setItem(KEY, JSON.stringify(this.store)); } catch {}
  }

  private rolloverIfNeeded() {
    if (this.store.wallet.lastEarnedDate !== todayKey()) {
      this.store.wallet.earnedToday = 0;
      this.store.wallet.lastEarnedDate = todayKey();
    }
  }

  on(event: string, cb: () => void) { return this.emitter.on(event, cb); }

  /* ── 프로필 ── */

  async createProfile(nickname: string, catColor: CatColor): Promise<Profile> {
    this.store.profile = {
      id: 'me', nickname, catColor,
      shareStatus: true, shareCounter: true, totalCount: 0,
    };
    await this.save();
    return this.store.profile;
  }

  async updateProfile(patch: Partial<Profile>): Promise<Profile> {
    if (!this.store.profile) throw new Error('no profile');
    this.store.profile = { ...this.store.profile, ...patch };
    await this.save();
    this.emitter.emit('members');
    return this.store.profile;
  }

  /* ── 교실 ── */

  async createClassroom(): Promise<string> {
    this.store.classroomCode = genCode();
    await this.save();
    this.emitter.emit('members');
    return this.store.classroomCode;
  }

  async joinClassroom(code: string): Promise<JoinResult> {
    // 로컬 모드엔 다른 교실이 없다 — 데모용으로 어떤 코드든 새 교실 취급
    if (!code.trim()) return 'not_found';
    this.store.classroomCode = code.trim().toUpperCase();
    await this.save();
    this.emitter.emit('members');
    return 'ok';
  }

  async leaveClassroom(): Promise<void> {
    this.store.classroomCode = null;
    this.store.demoFriendsJoined = false;
    this.friends = [];
    if (this.simTimer) { clearInterval(this.simTimer); this.simTimer = null; }
    await this.save();
    this.emitter.emit('members');
  }

  async getSnapshot(): Promise<ClassroomSnapshot> {
    const p = this.store.profile;
    if (!p || !this.store.classroomCode) return { code: null, members: [] };
    const me: Member = {
      id: p.id, nickname: p.nickname, catColor: p.catColor,
      totalCount: p.totalCount, state: this.store.myState,
      equipped: this.store.inventory.filter(i => i.equipped).map(i => i.itemId),
      isMe: true,
    };
    const friends: Member[] = this.friends.map(f => ({
      id: f.id, nickname: f.nickname, catColor: f.catColor,
      totalCount: f.totalCount, state: f.state,
      equipped: f.equipped, isMe: false, isDemo: true,
    }));
    return { code: this.store.classroomCode, members: [me, ...friends] };
  }

  async setMyState(state: Exclude<PresenceState, 'private'>): Promise<void> {
    if (this.store.myState !== state) {
      this.store.myState = state;
      await this.save();
      this.emitter.emit('members');
    }
  }

  /* ── 쓰다듬 ── */

  async sendPat(toId: string): Promise<'ok' | 'cooldown' | 'error'> {
    const last = this.store.patCooldowns[toId] ?? 0;
    if (Date.now() - last < 10 * 60 * 1000) return 'cooldown';
    this.store.patCooldowns[toId] = Date.now();
    await this.save();
    return 'ok';
  }

  async getPats(): Promise<PatEntry[]> {
    const cutoff = Date.now() - 7 * 86400000;
    return this.store.pats
      .filter(e => e.at > cutoff)
      .sort((a, b) => b.at - a.at)
      .map(e => ({
        id: e.id, fromNickname: e.fromNickname,
        bucket: timeBucketOf(new Date(e.at)), dayLabel: dayLabelOf(e.at),
        at: e.at, isDemo: e.isDemo,
      }));
  }

  /* ── 별가루/사물함 ── */

  async recordActivity(steps: number, touches: number): Promise<{ granted: number }> {
    this.rolloverIfNeeded();
    const granted = computeEarn(steps, touches, this.store.wallet.earnedToday);
    this.store.wallet.balance += granted;
    this.store.wallet.earnedToday += granted;
    if (this.store.profile) {
      this.store.profile.totalCount +=
        Math.min(Math.max(steps, 0), EARN.stepsSanityCap) + Math.max(touches, 0);
    }
    await this.save();
    if (granted > 0) this.emitter.emit('wallet');
    this.emitter.emit('members');
    return { granted };
  }

  async getWallet(): Promise<Wallet> {
    this.rolloverIfNeeded();
    return {
      balance: this.store.wallet.balance,
      earnedToday: this.store.wallet.earnedToday,
      dailyCap: EARN.dailyCap,
    };
  }

  async openBox(): Promise<OpenBoxResult> {
    this.rolloverIfNeeded();
    const { result, next } = openBoxLocal({
      balance: this.store.wallet.balance,
      commonStreak: this.store.wallet.commonStreak,
      ownedIds: this.store.inventory.map(i => i.itemId),
    });
    if (result.result === 'ok') {
      this.store.wallet.balance = next.balance;
      this.store.wallet.commonStreak = next.commonStreak;
      if (!result.duplicate && result.itemId) {
        this.store.inventory.push({ itemId: result.itemId, equipped: false });
      }
      await this.save();
      this.emitter.emit('wallet');
      this.emitter.emit('inventory');
    }
    return result;
  }

  async getInventory(): Promise<InventoryEntry[]> {
    return [...this.store.inventory];
  }

  async equip(itemId: string): Promise<void> {
    const item = ITEMS.find(i => i.id === itemId);
    if (!item) return;
    if (!this.store.inventory.some(i => i.itemId === itemId)) return;
    for (const e of this.store.inventory) {
      const s = ITEMS.find(i => i.id === e.itemId)?.slot;
      if (s === item.slot) e.equipped = false;
    }
    const target = this.store.inventory.find(i => i.itemId === itemId);
    if (target) target.equipped = true;
    await this.save();
    this.emitter.emit('inventory');
    this.emitter.emit('members');
  }

  async unequip(slot: string): Promise<void> {
    for (const e of this.store.inventory) {
      const s = ITEMS.find(i => i.id === e.itemId)?.slot;
      if (s === slot) e.equipped = false;
    }
    await this.save();
    this.emitter.emit('inventory');
    this.emitter.emit('members');
  }

  /* ── 데모 도우미 (웹 검증/체험용) ── */

  demo = {
    addFriends: async () => {
      if (this.store.demoFriendsJoined) return;
      this.store.demoFriendsJoined = true;
      await this.save();
      this.startDemoFriends();
      this.emitter.emit('members');
    },
    receivePat: async () => {
      const from = pick(DEMO_FRIENDS).nickname;
      this.store.pats.unshift({
        id: String(Date.now()), fromNickname: from, at: Date.now(), isDemo: true,
      });
      this.store.pats = this.store.pats.slice(0, 100);
      await this.save();
      this.emitter.emit('pats');
      this.emitter.emit('patReceived');
    },
    grantStars: async (n: number) => {
      this.store.wallet.balance += n;
      await this.save();
      this.emitter.emit('wallet');
    },
  };

  private startDemoFriends() {
    if (this.friends.length === 0) {
      this.friends = DEMO_FRIENDS.map(f => ({
        ...f, state: 'idle' as const, until: 0,
      }));
    }
    if (this.simTimer) return;
    this.simTimer = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const f of this.friends) {
        if (now < f.until) {
          if (f.state === 'walking') f.totalCount += Math.floor(rand(8, 20));
          if (f.state === 'active') f.totalCount += Math.floor(rand(3, 9));
          changed = true;
          continue;
        }
        const r = Math.random();
        f.state = r < 0.3 ? 'walking' : r < 0.6 ? 'active' : 'idle';
        f.until = now + rand(20000, 45000);
        changed = true;
      }
      if (changed) this.emitter.emit('members');
      // 이따금 데모 친구가 나를 쓰다듬는다
      if (Math.random() < 0.06) void this.demo.receivePat();
    }, 3000);
  }
}
